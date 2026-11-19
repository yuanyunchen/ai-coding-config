import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const repo = process.cwd();
const [{ connectCodex }, { SessionRouter }, { Store }, { startLinkControl }] = await Promise.all(
  ['codex', 'routes', 'store', 'link-control'].map((name) =>
    import(pathToFileURL(join(repo, 'src', name + '.js')))),
);

async function waitFor(check, message) {
  for (let n = 0; n < 100; n++) {
    const result = check();
    if (result) return result;
    await delay(50);
  }
  assert.fail(message);
}

for (const sandboxMode of ['danger-full-access', 'read-only']) {
  test('owner Slack interruption replies and continues its original turn with ' + sandboxMode,
    { timeout: 20_000 }, (t) => runOwnerInterruption(t, sandboxMode));
}

async function runOwnerInterruption(t, sandboxMode) {
  const root = await mkdtemp('/tmp/slack-codex-owner-test-');
  const cwd = join(root, 'workspace');
  const home = join(root, 'home');
  const socketPath = join(root, 'codex.sock');
  const linkSocket = join(root, 'operator', 'link.sock');
  const helperDirectory = join(home, '.local', 'bin');
  await Promise.all([mkdir(cwd), mkdir(helperDirectory, { recursive: true })]);
  await symlink(join(repo, 'scripts', 'link-session.js'), join(helperDirectory, 'slack-bot'));

  const ownerText = '请先回我这个合成问题，再继续原来的工作。FIXTURE_OWNER_STEER';
  const reportText = '已核对合成上下文，继续原任务。';
  const receiptText = 'Slack 已确认送达。';
  const originalMarker = 'FIXTURE_ORIGINAL_SHELL_DONE';
  const completeText = 'FIXTURE_ORIGINAL_TURN_DONE';
  const fallback = sandboxMode === 'read-only';
  const requests = [];
  const sent = [];
  const problems = [];
  const desktopEvents = [];
  const bridgeEvents = [];
  const releaseOriginal = Promise.withResolvers();
  const releaseSlackReceipt = Promise.withResolvers();
  const store = new Store(':memory:');
  const workerStore = new Store(':memory:');
  const clients = {};
  const scope = { teamId: 'T1', channelId: 'C1', threadTs: '12345.100000' };
  const router = new SessionRouter({
    store,
    config: { teamId: scope.teamId, ownerId: 'UOWNER', project: cwd },
    clients,
    slack: {},
    report: (err) => problems.push(err),
    makeBridge: () => ({
      store: workerStore,
      trusted: new Set(),
      split: (value) => [value],
      send: async (dest, key, text) => {
        sent.push({ dest, key, text });
        await releaseSlackReceipt.promise;
        return '12345.300000';
      },
    }),
  });
  const operator = await startLinkControl({
    socketPath: linkSocket,
    onReport: (req) => router.reportFromSource(req),
  });

  const model = createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/v1/responses') {
      res.writeHead(404).end();
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const payload = JSON.parse(Buffer.concat(chunks));
    const input = JSON.stringify(payload.input);
    const reportOutput = payload.input.find((i) => i.type === 'function_call_output' && i.call_id === 'owner-report');
    const originalOutput = payload.input.find((i) => i.type === 'function_call_output' && i.call_id === 'original-tool');
    const stage = originalOutput ? 'finish'
      : reportOutput ? 'continue'
      : input.includes(ownerText) ? 'steered'
      : input.includes('FIXTURE_ORIGINAL_TASK') ? 'original' : 'context';
    requests.push({ stage, payload, reportOutput, originalOutput, authorization: req.headers.authorization });
    const id = 'response-' + requests.length;
    let item = {
      id: 'message-' + requests.length,
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: stage === 'context' ? 'FIXTURE_CONTEXT_REMEMBERED' : completeText }],
    };
    const shell = (callId, cmd) => ({
      type: 'function_call',
      name: 'exec_command',
      call_id: callId,
      arguments: JSON.stringify({ cmd, login: false }),
    });
    if (stage === 'steered') {
      const token = input.match(/steer-[\da-f-]{36}/u)?.[0];
      const threadId = input.match(/--session ([\da-f-]{36})/u)?.[1];
      item = shell('owner-report', '"$HOME/.local/bin/slack-bot" ' + token + ' --session ' + threadId + " --report='" + reportText + "'");
    }
    const output = [];
    if (stage === 'continue') {
      if (fallback) {
        const token = input.match(/steer-[\da-f-]{36}/u)?.[0];
        output.push({
          id: 'fallback-commentary', type: 'message', role: 'assistant', phase: 'commentary',
          content: [{ type: 'output_text', text: '[[SLACK_REPLY:' + token + ']]\n' + reportText }],
        });
      }
      item = shell('original-tool', "printf '%s' " + originalMarker);
    }
    output.push(item);
    const events = [
      { type: 'response.created', response: { id } },
      ...output.map((part) => ({ type: 'response.output_item.done', item: part })),
      { type: 'response.completed', response: { id } },
    ];
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    if (stage === 'original') {
      res.flushHeaders();
      await releaseOriginal.promise;
    }
    res.end(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''));
  });
  model.listen(0, '127.0.0.1');
  await once(model, 'listening');
  await writeFile(join(home, 'config.toml'), `
model = "mock-model"
model_provider = "loopback_fixture"

[model_providers.loopback_fixture]
name = "Loopback fixture"
base_url = "http://127.0.0.1:${model.address().port}/v1"
wire_api = "responses"
request_max_retries = 0
stream_max_retries = 0
`);
  const server = spawn('codex', ['app-server', '--listen', 'unix://' + socketPath], {
    cwd,
    env: {
      HOME: home,
      CODEX_HOME: home,
      CODEX_APP_SERVER_DISABLE_MANAGED_CONFIG: '1',
      LINK_CONTROL_SOCKET: linkSocket,
      PATH: process.env.PATH,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  server.stderr.setEncoding('utf8').on('data', (data) => { stderr += data; });
  const serverClosed = once(server, 'close');
  let desktop;
  t.after(async () => {
    releaseSlackReceipt.resolve();
    releaseOriginal.resolve();
    desktop?.close();
    clients.codex?.close();
    server.kill();
    await serverClosed;
    model.closeAllConnections();
    await Promise.all([new Promise((resolve) => model.close(resolve)), operator.close()]);
    store.close();
    workerStore.close();
    await rm(root, { recursive: true, force: true });
  });
  for (let n = 0; n < 100; n++) {
    if (server.exitCode !== null) assert.fail(stderr);
    if (await stat(socketPath).catch(() => null)) break;
    await delay(50);
  }
  assert.ok(await stat(socketPath), 'Codex app-server did not create its socket');

  desktop = await connectCodex({
    socketPath,
    onEvent: (method, params) => desktopEvents.push({ method, params }),
  });
  clients.codex = await connectCodex({ socketPath, onEvent: (method, params) => {
    bridgeEvents.push({ method, params });
    router.event('codex', method, params);
  } });
  const { thread, sandbox } = await desktop.rpc('thread/start', {
    cwd,
    approvalPolicy: 'never',
    sandbox: sandboxMode,
  });
  t.diagnostic(JSON.stringify({ sandbox }));
  const completed = (turnId) => desktopEvents.find(({ method, params }) =>
    method === 'turn/completed' && params.threadId === thread.id && params.turn.id === turnId);
  const first = await desktop.startTurn(thread.id, 'Remember FIXTURE_CONTEXT_LABEL.');
  await waitFor(() => completed(first.id), 'Context-setting turn did not complete');
  const active = await desktop.startTurn(thread.id, 'FIXTURE_ORIGINAL_TASK: run the original shell marker.');
  await waitFor(() => requests.find(({ stage }) => stage === 'original'), 'Original model request did not start');

  store.db.prepare('INSERT INTO links VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run('fixture-route', 'codex', thread.id, scope.channelId, scope.threadTs, thread.id, cwd, 'fixture', 'url', 'native-inbox');
  const sourceTs = '12345.200000';
  await router.dispatch({ ...scope, kind: 'mention', id: 'fixture-slack-event', ts: sourceTs, userId: 'UOWNER', text: ownerText, files: [] });
  await router.drain();
  assert.deepEqual(problems, []);
  const steering = await waitFor(() => requests.find(({ stage }) => stage === 'steered'), 'Owner steering text did not reach the model');
  assert.match(JSON.stringify(steering.payload.input), /FIXTURE_CONTEXT_LABEL/);
  assert.match(JSON.stringify(steering.payload.input), /FIXTURE_ORIGINAL_TASK/);
  assert.ok(steering.payload.tools.some(({ name }) => name === 'exec_command'));
  try {
    await waitFor(() => sent.length || (!fallback && requests.find(({ stage }) => stage === 'continue')), 'No reply reached the mock Slack sender');
  } catch (error) {
    const messages = (events) => events.filter(({ method }) => method === 'item/completed').map(({ params }) => params.item);
    t.diagnostic(JSON.stringify({ stages: requests.map(({ stage }) => stage), problems: problems.map(String), desktop: messages(desktopEvents), bridge: messages(bridgeEvents) }));
    throw error;
  }
  const earlyReport = requests.find(({ stage }) => stage === 'continue')?.reportOutput;
  assert.equal(sent.length, 1, JSON.stringify(earlyReport));
  assert.deepEqual(sent[0].dest, scope);
  assert.equal(sent[0].text, reportText);
  if (!fallback) {
    assert.equal(requests.some(({ stage }) => stage === 'continue'), false);
    assert.equal(completed(active.id), undefined);
    releaseSlackReceipt.resolve();
  }

  const done = await waitFor(() => completed(active.id), 'The original turn did not complete');
  assert.equal(done.params.turn.status, 'completed', JSON.stringify(done.params.turn.error));
  assert.deepEqual(requests.map(({ stage }) => stage), ['context', 'original', 'steered', 'continue', 'finish']);
  const continued = requests.find(({ stage }) => stage === 'continue');
  if (fallback) {
    assert.match(JSON.stringify(continued.reportOutput), /Access to the local operator socket was denied/);
    assert.ok(bridgeEvents.some(({ method, params }) => method === 'item/completed' &&
      params.turnId === active.id && params.item.phase === 'commentary'));
    assert.notEqual(store.db.prepare('SELECT state FROM exactInbox').get().state, 'answered');
    releaseSlackReceipt.resolve();
    await waitFor(() => store.db.prepare('SELECT state FROM exactInbox').get().state === 'answered', 'Fallback Slack delivery did not resolve');
  } else {
    assert.ok(JSON.stringify(continued.reportOutput).includes(receiptText));
  }
  const finished = requests.find(({ stage }) => stage === 'finish');
  assert.ok(JSON.stringify(finished.originalOutput).includes(originalMarker));
  const inbox = store.db.prepare('SELECT state FROM exactInbox WHERE k=?')
    .get([scope.teamId, scope.channelId, sourceTs].join('/'));
  assert.equal(inbox.state, 'answered');
  assert.deepEqual(desktopEvents.filter(({ method }) => method === 'turn/started').map(({ params }) => params.turn.id), [first.id, active.id]);
  const { thread: recorded } = await desktop.rpc('thread/read', { threadId: thread.id, includeTurns: true });
  assert.deepEqual(recorded.turns.map(({ id }) => id), [first.id, active.id]);
  assert.match(JSON.stringify(recorded.turns.at(-1)), /FIXTURE_ORIGINAL_TURN_DONE/);
  assert.ok(requests.every(({ authorization }) => authorization === undefined));
  t.diagnostic(JSON.stringify({
    ownerTextReachedOriginalTurn: true,
    replyPath: fallback ? 'commentary' : 'shell-helper',
    originalToolWaitedForSlackReceipt: !fallback,
    shellReceivedSlackReceipt: !fallback,
    sameTurnCompleted: true,
    modelStages: requests.map(({ stage }) => stage),
    mockedSlackPosts: sent.length,
  }));
}
