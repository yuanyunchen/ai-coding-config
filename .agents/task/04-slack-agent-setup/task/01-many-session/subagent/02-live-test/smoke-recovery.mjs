import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = pathToFileURL(process.argv[2].replace(/\/?$/, '/'));
const [{ connectCodex }, { Bridge }, { Store }, { splitSlackText }] = await Promise.all(
  ['codex', 'bridge', 'store', 'slack'].map((name) => import(new URL('src/' + name + '.js', repo))),
);
const scratch = await mkdtemp(fileURLToPath(new URL('./.rpc-state-', import.meta.url)));
const project = '/private/var/empty';
const db = join(scratch, 'store.sqlite');
const fakeSlackPosts = [];
const errors = [];
const slack = {
  post: async (thread, text, key) => {
    fakeSlackPosts.push({ thread, text, key });
    return String(fakeSlackPosts.length + 1000) + '.000000';
  },
};
const scope = { teamId: 'TSYNTH', channelId: 'CSYNTH', threadTs: '1.000000', userId: 'USYNTH' };
const request = {
  ...scope, id: 'offline-completion', kind: 'mention', ts: '2.000000', receivedAt: Date.now(),
  text: 'Reply with the single token RECOVERY_SMOKE_OK. No tools.', files: [],
};
let bridge, store, first, observer, second, threadId;
let submissions = 0;
let summary;
const newBridge = (client) => new Bridge({
  store, slack, clients: { codex: client }, config: { locale: 'en', project, contextBudget: 4000 },
  split: splitSlackText, report: (error) => errors.push(error),
});
async function drain() {
  while (bridge.lanes.size || bridge.controls.size)
    await Promise.all([...bridge.lanes.values(), ...bridge.controls]);
}

try {
  first = await connectCodex();
  observer = await connectCodex();
  const send = async (id, text, opts) => {
    ++submissions;
    return (await first.rpc('turn/start', {
      threadId: id, input: [{ type: 'text', text }], clientUserMessageId: opts.messageId,
      model: 'gpt-6.2-sol', effort: 'high',
    })).turn;
  };
  store = new Store(db);
  bridge = newBridge({ ...first, startTurn: send });
  bridge.dispatch(request);
  await drain();
  threadId = store.binding(scope)?.threadId;
  assert.deepEqual(errors, []);
  assert.equal(store.receipt(request.id).state, 'running');
  const turnId = store.receipt(request.id).turnId;
  assert.equal(fakeSlackPosts.length, 0);

  first.close();
  store.close();
  store = undefined;
  bridge = undefined;
  const cutoff = Date.now() + 90_000;
  let turn;
  do {
    turn = await observer.latestTurn(threadId);
    if (turn?.status !== 'inProgress') break;
    await setTimeout(150);
  } while (Date.now() < cutoff);
  assert.equal(turn?.id, turnId);
  assert.equal(turn?.status, 'completed');
  const answer = turn.items.find((item) => item.type === 'agentMessage' && item.phase !== 'commentary');
  assert.equal(answer?.text.trim(), 'RECOVERY_SMOKE_OK');

  const startTurn = () => { ++submissions; throw Error('Unexpected resubmission'); };
  second = await connectCodex({ onEvent: (method, params) => bridge?.event('codex', method, params) });
  store = new Store(db);
  bridge = newBridge({ ...second, startTurn });
  await bridge.recover('codex');
  await drain();
  assert.equal(store.receipt(request.id).state, 'completed');
  assert.equal(store.desktopCheckpoint(store.binding(scope)), turnId);
  assert.equal(fakeSlackPosts.length, 1);
  assert.deepEqual(fakeSlackPosts[0], {
    thread: scope.threadTs, text: answer.text, key: 'answer/' + threadId + '/' + turnId + '/' + answer.id + '/0',
  });

  bridge.dispatch(request);
  await bridge.recover('codex');
  await drain();
  assert.deepEqual(errors, []);
  assert.equal(fakeSlackPosts.length, 1);
  assert.equal(submissions, 1);
  const history = await second.turnsAfter(threadId, '@new');
  assert.deepEqual(history.map(({ id }) => id), [turnId]);
  summary = {
    transport: 'real local Codex RPC', model: 'gpt-6.2-sol', effort: 'high',
    sqliteReopenedAfterDrain: true, recoveredSameThread: true,
    state: store.receipt(request.id).state, modelSubmissions: submissions,
    turnsInThread: history.length, syntheticSlackFinals: fakeSlackPosts.length, externalSlackPosts: 0,
  };
} finally {
  if (bridge) await drain();
  bridge = undefined;
  if (threadId && observer) await observer.rpc('thread/archive', { threadId });
  for (const client of [first, observer, second]) client?.close();
  store?.close();
  await rm(scratch, { recursive: true, force: true });
}
console.log(JSON.stringify(summary, null, 2));
