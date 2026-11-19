import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cases, owner, member, bot } from './fixtures.mjs';
import { realModel, modelId, effort } from './model.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const variant = process.argv[2] ?? 'candidate';
assert.match(variant, /^(candidate|baseline|patched)$/);
const ids = process.argv.slice(3);
if (!ids.length) ids.push(...Object.keys(cases));
assert(ids.every((id) => Object.hasOwn(cases, id)));
const controlledReceipt = process.env.QUALITY_O08_RECEIPT_STATE === '1';
assert(!controlledReceipt || (ids.length === 1 && ids[0] === 'O08'));
const [{ Bridge }, { Store }, { SessionRouter }, { splitSlackText }, { slackMessage }, { createCatchup }, { sendSlackAnswer }] = await Promise.all(
  ['bridge', 'store', 'routes', 'slack', 'slack-format', 'catchup', 'slack-answer'].map((name) => import('./' + variant + '/src/' + name + '.js')),
);
const dir = join(here, controlledReceipt ? 'runs-controlled-receipt' : 'runs', variant);
mkdirSync(dir, { recursive: true });
const log = createWriteStream(join(dir, 'app-' + randomUUID() + '.stderr'));
const model = await realModel(log);
const rootA = '1.000000', rootB = '2.000000';
const activeTurn = 'simulated-active-build';
const teamId = 'TQA', channelId = 'CQA';
const scope = (threadTs = rootA) => ({ teamId, channelId, threadTs });
const alias = (thread) => 'codex-' + createHash('sha256').update(thread).digest('hex').slice(0, 8);
const fileRef = (name) => ({ id: name, name: name + (name === 'invoice' ? '.pdf' : '.png') });
const png = (bytes) => Buffer.from(bytes).subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a','hex'));

async function replay(id, actions) {
  const start = Date.now();
  const observed = { id, modelId, effort, transport: 'local Slack substitute', turns: [], events: [], outbound: [], errors: [], externalSlackCalls: 0 };
  const scratch = join(dir, id);
  mkdirSync(scratch, { recursive: true });
  const stores = [];
  const open = () => { const store = new Store(':memory:'); stores.push(store); return store; };
  const routeStore = open();
  const author = id.startsWith('O') ? owner : member;
  const config = { teamId, ownerId: owner, project: scratch, contextBudget: 10000, locale: Number(id.slice(1)) <= 6 ? 'zh' : 'en' };
  const replies = [], turns = new Map();
  let active = false, modelThread, sequence = 10, stage = 0, modelTurnId = 0, syntheticTurn, syntheticThread;
  const sourceId = 'fixture-source-' + id;
  const error = (why) => observed.errors.push({ stage, message: String(why?.message ?? why) });
  const fakeTransport = {
    post: async (thread, text, key, authorize, publicBody) => {
      authorize?.();
      const ts = (++sequence) + '.000000';
      const blocks = slackMessage(text, key, publicBody)?.blocks;
      observed.outbound.push({ stage, operation: 'post', thread, text, ts, receipt: 'synthetic_confirmed', ...(blocks ? { blocks } : {}) });
      replies.push({ thread, text, ts });
      return ts;
    },
    update: async (ts, text, authorize) => {
      authorize?.();
      const thread = replies.find((p) => p.ts === ts)?.thread;
      observed.outbound.push({ stage, operation: 'update', thread, text, ts, receipt: 'synthetic_confirmed' });
      return ts;
    },
    hydrateFiles: async (files) => files,
    upload: async (thread, file, title, authorize) => {
      authorize?.();
      const { bytes, filename } = file;
      assert(png(bytes));
      const media = 'output-' + observed.outbound.length + '-' + filename;
      writeFileSync(join(scratch, media), bytes);
      const row = { stage, operation: 'upload', thread, title, file: media, bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        receipt: id === 'O08' ? 'synthetic_timeout_unknown' : 'synthetic_confirmed' };
      observed.outbound.push(row);
      if (id === 'O08') throw Error('Synthetic Slack upload receipt timed out');
      return 'FQA' + (++sequence);
    },
  };
  const slack = {
    forChannel: () => fakeTransport,
    resolveLinkTarget: async (target) => ({ ...scope(target === 'discussion-b' ? rootB : rootA), permalink: target }),
    registerChannel: async () => {},
  };
  const prepare = async (files) => ({
    text: files.some(({ id: ref }) => ref === 'invoice') ? 'invoice.pdf is unavailable (withdrawn).' : '',
    images: files.filter(({ id: ref }) => /^(status|env|failure)$/.test(ref)).map(({ id: ref }) => join(here, ref + '.png')),
    cleanup: async () => {},
  });
  const sourceHead = (logical) => active && logical === sourceId ? { id: activeTurn, status: 'inProgress' } : turns.get(logical);
  const history = (store) => ({
    revalidate: async () => {},
    threadContext: createCatchup({ slack: { historyScope: () => scope() }, store }).threadContext,
  });
  const pending = [];
  async function answer(logical, prompt, media, path, turnId) {
    if (!modelThread) modelThread = await model.thread();
    const entry = { stage, path, logicalThread: logical, turnId, modelThread, prompt, inputImageCount: (media?.images?.length ?? 0) + (media?.imageUrls?.length ?? 0) };
    observed.turns.push(entry);
    try {
      const result = await model.ask(modelThread, prompt, media);
      entry.modelTurn = result.id;
      entry.status = result.status;
      entry.items = (result.items ?? []).map(({ id: itemId, type, phase, text }) => ({ id: itemId, type, phase, text }));
      if (result.error) entry.error = result.error.message;
      return (result.items ?? []).filter((i) => i.type === 'agentMessage');
    } catch (why) {
      entry.error = String(why?.message ?? why);
      error(why);
      return [];
    }
  }
  function launch(logical, prompt, media, path, turnId = 'fixture-turn-' + (++modelTurnId)) {
    if (path !== 'owner-steer') turns.set(logical, { id: turnId, status: 'inProgress' });
    pending.push(async () => {
      if (logical === sourceId) {
        const match = prompt.match(/\[\[SLACK_REPLY:(steer-[\da-f-]+)\]\]/u);
        const adapter = match
          ? '\n\nThe reply helper is unavailable in this isolated transport. Use the exact fallback marker above as the first line of your returned response. The bridge reads your response as the commentary transport. Preserve the normal reply contents.'
          : '';
        const items = await answer(logical, prompt + adapter, media, path, turnId);
        for (const item of items) {
          const reply = item.text?.match(/^\[\[SLACK_REPLY:(steer-[\da-f-]+)\]\]\r?\n([\s\S]+)$/u);
          if (reply && reply[1] === match?.[1]) {
            try {
              const receipt = await router.reportFromSource({ target: reply[1], threadId: logical, text: reply[2] });
              observed.events.push({ stage, sideEffect: 'owner_reply_helper', receipt: Boolean(receipt.link) });
            } catch (why) { error(why); }
          }
        }
        if (path === 'owner-steer') observed.events.push({ stage, sideEffect: 'original_build_remained_active', sameSyntheticTurn: sourceHead(logical)?.id === turnId });
      } else {
        const items = await answer(logical, prompt, media, path, turnId);
        const turn = { id: turnId, status: items.length ? 'completed' : 'failed', items };
        turns.set(logical, turn);
        router.event('codex', 'turn/completed', { threadId: logical, turn });
        await router.drain();
      }
    });
    return { id: turnId, turnId };
  }
  const client = {
    startThread: async () => ({ id: 'fixture-team-' + (++modelTurnId) }),
    latestTurn: async (logical) => sourceHead(logical),
    turnHead: async (logical) => sourceHead(logical),
    ensureLoaded: async (logical) => ({ id: logical }),
    interruptTurn: async (logical, turnId) => {
      observed.events.push({ stage, sideEffect: 'interrupt', logical, turnId });
      active = false;
    },
    startTurn: async (...args) => launch(...args, 'team-or-owner-new'),
    steerTurn: async (logical, turnId, prompt, media) => launch(logical, prompt, media, 'owner-steer', turnId),
  };
  const clients = { codex: client };
  const router = new SessionRouter({
    store: routeStore, config, slack, clients, report: error,
    makeBridge: ({ project }) => {
      const store = open();
      return new Bridge({
        store, slack: fakeTransport, clients, config: { ...config, project }, split: splitSlackText,
        prepare, history: history(store), report: error,
      });
    },
  });
  function input(a) {
    const ts = (++sequence) + '.000000';
    return { ...scope(a.root), ...(a.private ? { channelId: 'CPRIVATE' } : {}), ts, id: (a.seed ? 'history/' : 'event/') + id + '/' + ts,
      receivedAt: Date.now(), kind: a.tag ? 'mention' : 'message', userId: a.sender ?? author,
      displayName: a.display, text: a.text, files: a.file ? [fileRef(a.file)] : [], isBot: a.sender === bot };
  }
  const base = () => router.base(channelId);
  const exact = () => routeStore.db.prepare("SELECT * FROM links WHERE mode='native-inbox'").get();
  const exactSeed = () => routeStore.db.prepare('INSERT INTO links VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run('fixture-exact', 'codex', sourceId, channelId, rootA, sourceId, scratch, alias(sourceId), 'discussion-a', 'native-inbox');
  try {
    for (const a of actions) {
      stage++;
      const before = observed.outbound.length;
      if (!a.action) {
        const e = input(a);
        if (a.seed) {
          base().store.remember({ ...e, revisionTs: e.ts, bot: e.isBot });
          if (a.activate) routeStore.db.prepare('INSERT OR REPLACE INTO choices VALUES(?,?,?,?,?,?)')
            .run(channelId, e.threadTs, e.userId, 'default', 'active', 0);
        } else {
          observed.events.push({ stage, inbound: e.kind, thread: e.threadTs, sender: e.userId, text: e.text, file: a.file, display: a.display });
          await router.dispatch(e);
          await router.drain();
          while (pending.length) await pending.shift()();
        }
      } else {
        observed.events.push({ stage, fixture: a.action, value: a.value });
        if (a.action === 'exactBuild' || a.action === 'oldLink') {
          exactSeed();
          const bridge = router.worker('fixture-exact', channelId, scratch);
          for (const seed of actions.slice(0, stage - 1).filter((v) => v.seed)) {
            const e = input(seed);
            bridge.store.remember({ ...e, revisionTs: e.ts, bot: e.isBot });
          }
          active = a.action === 'exactBuild';
        } else if (a.action === 'unbind') {
          router.retireExact(exact());
        } else if (a.action === 'lateSuccess') {
          try {
            await router.reportFromSource({ threadId: sourceId, target: 'discussion-a', text: 'The build succeeded.' });
            observed.events.push({ stage, sideEffect: 'late_report_accepted' });
          } catch (why) {
            observed.events.push({ stage, sideEffect: 'late_report_rejected', reason: why.message });
          }
        } else if (a.action === 'running') {
          const bridge = base(), s = scope();
          syntheticThread = bridge.store.binding(s)?.threadId ?? 'fixture-running-' + id;
          if (!bridge.store.binding(s)) bridge.store.bind(s, { project: scratch, backend: 'codex', threadId: syntheticThread });
          bridge.trusted.add(syntheticThread);
          syntheticTurn = 'fixture-milestone-turn';
          const e = input({ text: 'Prior task agreed in thread.' });
          bridge.store.accept({ ...e, eventId: e.id, revisionTs: e.ts });
          bridge.store.setState(e.id, 'running', { turnId: syntheticTurn });
        } else if (a.action === 'milestone') {
          const item = { id: a.value, type: 'agentMessage', phase: 'commentary', text: a.value };
          router.event('codex', 'item/completed', { threadId: syntheticThread, turnId: syntheticTurn, item });
          await router.drain();
        } else if (a.action === 'withdrawInvoice') {
          const e = input({ seed: true, text: 'Attached: invoice.pdf', file: 'invoice' });
          base().store.remember({ ...e, eventId: e.id, revisionTs: e.ts });
          await router.dispatch({ ...e, id: 'withdraw-' + id, kind: 'file_revoke', fileId: 'invoice' });
          await router.drain();
        } else if (a.action === 'seedTimeoutReceipt') {
          routeStore.db.prepare('INSERT OR REPLACE INTO choices VALUES(?,?,?,?,?,?)')
            .run(channelId, rootA, author, 'default', 'active', 0);
          const text = [
            'Slack requests go through the bridge to team Codex, then replies return to the original Slack thread.',
            '',
            '```bridge-diagram',
            JSON.stringify({ title: 'Fixture architecture', nodes: ['Slack', 'Bridge', 'Team Codex', 'Original Slack thread'], edges: [[0, 1], [1, 2], [2, 3]] }),
            '```',
          ].join('\n');
          await sendSlackAnswer(base(), scope(), 'fixture-receipt-seed', text);
        } else if (a.action === 'deliveryLedger') {
          const textConfirmed = observed.outbound.some((o) => o.operation === 'post' && o.receipt === 'synthetic_confirmed');
          const pngTimedOut = observed.outbound.some((o) => o.operation === 'upload' && o.receipt === 'synthetic_timeout_unknown');
          const e = input({ seed: true, sender: owner, text: 'Synthetic service receipt ledger: reply text confirmation = ' +
            textConfirmed + '; PNG upload receipt timed out = ' + pngTimedOut + '.' });
          base().store.remember({ ...e, revisionTs: e.ts });
          observed.events.push({ stage, sideEffect: 'receipt_observed', textConfirmed, pngTimedOut });
        }
      }
      // Feed bot deliveries to the project history as Slack history echoes.
      for (const o of observed.outbound.slice(before).filter((v) => v.operation === 'post')) {
        const e = { ...scope(o.thread), ts: o.ts, revisionTs: o.ts, kind: 'message', userId: bot, bot: true, text: o.text, files: [] };
        for (const b of router.bridges.values()) b.store.remember(e);
      }
    }
  } catch (why) {
    error(why);
  } finally {
    for (const store of stores.reverse()) store.close();
  }
  observed.windowMs = Date.now() - start;
  writeFileSync(join(dir, id + '.json'), JSON.stringify(observed, null, 2) + '\n');
  console.log(id, observed.turns.length, observed.outbound.length, observed.errors.length);
}

try {
  const workers = Array.from({ length: Math.min(ids.length, Number(process.env.QUALITY_CONCURRENCY) || 8) }, async () => {
    while (ids.length) {
      const id = ids.shift();
      const actions = controlledReceipt
        ? [cases[id][0], { action: 'seedTimeoutReceipt' }, ...cases[id].slice(2)]
        : cases[id];
      await replay(id, actions);
    }
  });
  await Promise.all(workers);
} finally {
  model.close();
  log.end();
}
