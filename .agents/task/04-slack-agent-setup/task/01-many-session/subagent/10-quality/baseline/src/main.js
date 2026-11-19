import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { mkdirSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Metrics } from './metrics.js';
import { createCatchup } from './catchup.js';
import { configuration, registry } from './config.js';
import { Store } from './store.js';
import { Bridge } from './bridge.js';
import { createSlack, splitSlackText } from './slack.js';
import { connectCodex } from './codex.js';
import { claudePool } from './claude-pool.js';
import { startLinkControl, linkControlSocketPath } from './link-control.js';
import { SessionRouter } from './routes.js';

process.umask(0o077);
const config = configuration(),
  reg = registry(config);
if (!config.botToken || !config.appToken)
  throw Error('Use slack run or supply SLACK_BOT_TOKEN and SLACK_APP_TOKEN.');
const lock = new DatabaseSync(join(config.state, 'daemon-lock.sqlite'));
lock.exec('BEGIN EXCLUSIVE');
const store = new Store(join(config.state, 'memory.sqlite')),
  metrics = new Metrics(join(config.state, 'metrics.sqlite'));
store.db.exec(
  'CREATE TABLE IF NOT EXISTS linkedChannels(channel TEXT PRIMARY KEY);CREATE TABLE IF NOT EXISTS claudeEndpoints(threadId TEXT PRIMARY KEY,socketPath TEXT,project TEXT)',
);
const channelIds = store.db
  .prepare('SELECT channel FROM linkedChannels')
  .all()
  .map((r) => r.channel);
const first = config.channelId ?? reg.channel();
const clients = {},
  syncs = new Map(),
  stores = new Set([store]);
let router,
  quitting = false,
  connected = false,
  generation = 0,
  recovery = Promise.resolve(),
  control,
  reconnectTimer;
const report = (e) =>
  console.error(new Date().toISOString(), 'bridge failure', e?.code ?? e?.name ?? 'error');
const dir = join(config.state, 'routes');
mkdirSync(dir, { recursive: true, mode: 0o700 });
const stateStore = (key) => {
  const s = new Store(join(dir, createHash('sha256').update(key).digest('hex') + '.sqlite'));
  stores.add(s);
  return s;
};
function syncFor(ch) {
  if (syncs.has(ch)) return syncs.get(ch).catchup;
  const journal = stateStore('history/' + ch);
  // Seed pre-upgrade message coverage once. Full bodies are never fed to a runner from this journal.
  if (!journal.revision() && ch === first) {
    for (const v of store.db
      .prepare('SELECT * FROM messages WHERE teamId=? AND channelId=? AND deleted=0 ORDER BY seq')
      .iterate(config.teamId, ch))
      journal.remember({ ...v, files: JSON.parse(v.files), bot: v.userId === 'bot', revisionTs: v.revision });
  }
  const catchup = createCatchup({ slack: slack.forChannel(ch), store: journal, onEvent: ingest, report });
  syncs.set(ch, { journal, catchup });
  if (connected) catchup.setOnline(true);
  return catchup;
}
async function ingest(e) {
  syncFor(e.channelId);
  const { journal } = syncs.get(e.channelId);
  if (e.kind === 'file_revoke') journal.revokeFile(e.teamId, e.channelId, e.fileId);
  else if (e.kind === 'revoke') journal.revokeChannel(e.teamId, e.channelId);
  else if (e.kind !== 'enroll' && !/^(?:bind|连接|connect|绑定)\s+/iu.test(e.text ?? '')) {
    journal.remember({ ...e, bot: e.isBot, deleted: e.kind === 'delete', revisionTs: e.revision });
  }
  return router.dispatch(e);
}
function recover(name) {
  const ver = generation;
  const job = recovery.then(async () => {
    if (quitting || generation !== ver || !connected) return;
    // A restricted channel's unavailable API must not block unrelated project sessions.
    await Promise.allSettled(
      [...router.bridges.values()].map(async (b) => {
        await b.history.ready();
        if (connected && !quitting && ver === generation) await b.recover(name);
      }),
    );
    router.recoverIntake();
  });
  recovery = job.catch(report);
  return job;
}
const slack = createSlack({
  ...config,
  channelId: first,
  channelIds,
  resolveChannel: reg.enroll,
  onEvent: ingest,
  onConnection: (online, enrolledAt, ch) => {
    connected = online;
    generation++;
    for (const scope of slack.historyScopes()) syncFor(scope.channelId);
    for (const [id, s] of syncs) if (!ch || id === ch) s.catchup.setOnline(online, enrolledAt);
    if (online) void recover();
  },
});
const pool = claudePool({
  db: store.db,
  onEvent: (m, p) => router.event('claude', m, p),
  onClose: (id) => {
    for (const b of router.bridges.values()) b.trusted.delete(id);
    if (!quitting)
      setTimeout(() => {
        if (!quitting) void recover('claude');
      }, 1500).unref();
  },
});
const prepareClaude = (req) => pool.prepare(req);
clients.claude = pool.api;
function makeBridge({ dbKey, scope, project }) {
  const db = dbKey === 'base/' + first ? store : stateStore(dbKey);
  return new Bridge({
    config: { ...config, channelId: scope.channelId, project },
    store: db,
    clients,
    slack: slack.forChannel(scope.channelId),
    split: splitSlackText,
    resolvePair: (r) => reg.consume(r),
    metrics,
    report,
    history: syncFor(scope.channelId),
  });
}
router = new SessionRouter({ store, config, slack, clients, makeBridge, prepareClaude, report });
for (const ch of new Set([first, ...channelIds].filter(Boolean))) router.base(ch);
async function attach() {
  try {
    clients.codex = await connectCodex({
      onEvent: (m, p) => router.event('codex', m, p),
      onClose: () => {
        delete clients.codex;
        router.offline('codex');
        retry();
      },
    });
    await recover('codex');
    console.log('Codex connected');
  } catch (e) {
    report(e);
    retry();
  }
}
function retry() {
  if (!quitting && !reconnectTimer)
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void attach();
    }, 1500);
}
await slack.start();
connected = true;
console.log(
  'Socket Mode online',
  slack
    .historyScopes()
    .map((s) => s.channelId)
    .join(',') || 'awaiting enrollment',
);
await attach();
if (process.env.CLAUDE_BRIDGE_THREAD_ID)
  void prepareClaude({ threadId: process.env.CLAUDE_BRIDGE_THREAD_ID })
    .then(() => recover('claude'))
    .catch(report);
control = await startLinkControl({
  socketPath: linkControlSocketPath(),
  onLink: (req) => router.link(req),
  onReport: (req) => router.reportFromSource(req),
});
console.log('Session linking ready');
let retryingLinks = false;
const linkTimer = setInterval(async () => {
  if (quitting || !connected || !clients.codex || retryingLinks) return;
  retryingLinks = true;
  try {
    await router.retryExactLinks();
  } catch (error) {
    report(error);
  } finally {
    retryingLinks = false;
  }
}, 10000);
async function stop() {
  if (quitting) return;
  quitting = true;
  clearTimeout(reconnectTimer);
  clearInterval(linkTimer);
  await control?.close();
  await slack.stop();
  clients.codex?.close();
  pool.close();
  await router.drain();
  await recovery.catch(() => {});
  for (const s of stores) s.close();
  metrics.close();
  reg.close();
  lock.close();
  process.exit(0);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
