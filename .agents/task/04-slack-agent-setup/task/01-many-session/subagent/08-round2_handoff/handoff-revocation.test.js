import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const root = pathToFileURL(process.cwd() + '/');
const { Bridge } = await import(new URL('./src/bridge.js', root));
const { SessionRouter } = await import(new URL('./src/routes.js', root));
const { Store } = await import(new URL('./src/store.js', root));

async function pendingHandoff(t) {
  const store = new Store(':memory:');
  const workers = new Map();
  const scope = { teamId: 'T1', channelId: 'C1', threadTs: '1.000001' };
  const config = { teamId: scope.teamId, ownerId: 'U1', project: process.cwd() };
  const received = [], hydrated = [], errors = [];
  let release = false;
  const clients = { codex: {
    async ensureLoaded(id) {
      if (id === 'new-owner' && !release)
        throw Object.assign(new Error('thread already has an active writer'), { code: -32600 });
      return { id, cwd: config.project };
    },
    async turnHead() {},
    async startTurn(id, prompt) {
      received.push([id, JSON.parse(prompt.split('\n').at(-1))]);
      return { id: 'turn-' + received.length };
    },
  } };
  const channel = { hydrateFiles: async (files) => {
    hydrated.push(files.map((file) => file.id));
    return files;
  } };
  const options = {
    store, config, clients,
    slack: {
      resolveLinkTarget: async () => scope,
      registerChannel: async () => {},
      forChannel: () => channel,
    },
    makeBridge: ({ dbKey }) => {
      if (!workers.has(dbKey)) workers.set(dbKey, new Store(':memory:'));
      return new Bridge({
        store: workers.get(dbKey), config, clients, slack: channel,
        prepare: async (refs) => ({
          text: refs.map((file) => file.name).join(', '),
          images: [], cleanup: async () => {},
        }),
      });
    },
    report: (error) => errors.push(error),
  };
  let router = new SessionRouter(options);
  t.after(() => {
    for (const workerStore of workers.values()) workerStore.close();
    store.close();
  });
  const link = (threadId) => router.link({ operation: 'grant-exact', threadId, target: 'fixture' });
  await link('old-owner');
  assert.match((await link('new-owner')).reply, /等待/u);
  return {
    received, hydrated, errors,
    message: (ts, text, files = []) => ({ ...scope, ts, id: 'mention-' + ts, userId: 'U1', kind: 'mention', text, files }),
    dispatch: (event) => router.dispatch(event),
    revokeFile: (fileId) => router.dispatch({ ...scope, id: 'revoke-' + fileId, kind: 'file_revoke', fileId }),
    finish: async () => {
      router = new SessionRouter(options);
      release = true;
      await router.retryExactLinks();
      await router.drain();
    },
    drain: () => router.drain(),
  };
}

const replay = (event) => ({ ...event, id: 'message-' + event.ts, kind: 'message', mentioned: true });
const remove = (event) => ({
  ...event, id: 'delete-' + event.ts, kind: 'delete', threadTs: event.ts,
  userId: undefined, text: '', files: [],
});

test('a withdrawn queued message stays withdrawn when Slack redelivers it during and after handoff', async (t) => {
  const f = await pendingHandoff(t);
  const withdrawn = f.message('2.000001', 'Withdrawn before transfer');
  await f.dispatch(withdrawn);
  await f.dispatch(remove(withdrawn));
  await f.dispatch(replay(withdrawn));
  await f.dispatch(f.message('3.000001', 'Valid queued request'));
  await f.finish();
  await f.dispatch(withdrawn);
  await f.drain();
  assert.deepEqual(f.received, [['new-owner', { priorSlackThread: '', currentOwnerMessage: 'Valid queued request' }]]);
  assert.deepEqual(f.errors, []);
});

test('a first-arriving deletion or edit suppresses stale delivery and stale commands during handoff', async (t) => {
  const f = await pendingHandoff(t);
  const deleted = f.message('2.000001', 'Deleted before arrival');
  const edited = f.message('3.000001', 'Stale version before edit');
  const mute = f.message('4.000001', '/mute');
  await f.dispatch(remove(deleted));
  await f.dispatch({ ...edited, id: 'edit', kind: 'edit', revision: '3.000003', text: 'Edited in Slack' });
  await f.dispatch(remove(mute));
  await f.dispatch(replay(deleted));
  await f.dispatch(edited);
  await f.dispatch(replay(mute));
  await f.dispatch(f.message('5.000001', 'Valid request after withdrawn command'));
  await f.finish();
  await f.dispatch(f.message('6.000001', 'Valid request after transfer'));
  await f.drain();
  assert.deepEqual(f.received.map(([id, input]) => [id, input.currentOwnerMessage]), [
    ['new-owner', 'Valid request after withdrawn command'],
    ['new-owner', 'Valid request after transfer'],
  ]);
  assert.deepEqual(f.errors, []);
});

test('attachments revoked before or during handoff cannot reach the replacement session', async (t) => {
  const f = await pendingHandoff(t);
  const before = { id: 'FBEFORE', name: 'before.txt' };
  const after = { id: 'FAFTER', name: 'after.txt' };
  const keep = { id: 'FKEEP', name: 'keep.txt' };
  const queued = f.message('2.000001', 'Review the remaining file', [before, after, keep]);
  await f.revokeFile(before.id);
  await f.dispatch(queued);
  await f.dispatch(f.message('3.000001', '', [after]));
  await f.revokeFile(after.id);
  await f.dispatch(replay(queued));
  await f.finish();
  await f.dispatch(f.message('4.000001', 'A later request', [before, after, keep]));
  await f.drain();
  assert.deepEqual(f.hydrated, [['FKEEP'], ['FKEEP']]);
  assert.deepEqual(f.received.map(([id, input]) => [id, input.currentOwnerMessage, input.attachmentEvidence]), [
    ['new-owner', 'Review the remaining file', 'keep.txt'],
    ['new-owner', 'A later request', 'keep.txt'],
  ]);
  assert.deepEqual(f.errors, []);
});
