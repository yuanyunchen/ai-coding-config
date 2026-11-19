import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { connectCodex } from './experimental-client.mjs';

async function waitFor(check, message) {
  for (let n = 0; n < 100; n++) {
    const result = await check();
    if (result) return result;
    await delay(50);
  }
  assert.fail(message);
}

test('thread/sample reads exact live context without invoking tools or mutating turns', {
  skip: process.platform === 'win32' || spawnSync('codex', ['--version']).status !== 0,
  timeout: 15_000,
}, async (t) => {
  const root = await mkdtemp('/tmp/slack-codex-test-');
  const cwd = join(root, 'workspace');
  const home = join(root, 'home');
  const socketPath = join(root, 'codex.sock');
  await Promise.all([mkdir(cwd), mkdir(home)]);
  const mcpPath = join(root, 'fixture.cjs');
  await writeFile(mcpPath, `
const readline = require('node:readline');
const { writeFileSync } = require('node:fs');
readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const msg = JSON.parse(line);
  if (msg.id === undefined) return;
  if (msg.method === 'tools/call') writeFileSync(${JSON.stringify(join(root, 'mcp-calls.log'))}, 'called');
  const result = {
    initialize: {
      protocolVersion: msg.params?.protocolVersion ?? '2025-03-26',
      capabilities: { tools: {} },
      serverInfo: { name: 'fixture', version: '0.0.1' },
    },
    'tools/list': { tools: [{
      name: 'synthetic_marker',
      description: 'Returns a synthetic fixture marker',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    }] },
    'tools/call': { content: [{ type: 'text', text: 'MCP_MARKER_EXECUTED' }] },
  }[msg.method];
  if (result) console.log(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }));
  else console.log(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Unknown method' } }));
});
`);
  const callsPath = join(root, 'mcp-calls.log');
  const requests = [];
  const { promise: releaseLiveResponse, resolve: finishLiveResponse } = Promise.withResolvers();
  t.after(finishLiveResponse);
  const model = createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/v1/responses') {
      res.writeHead(404).end();
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push({ headers: req.headers, payload: JSON.parse(Buffer.concat(chunks)) });
    const id = 'response-' + requests.length;
    const events = [
      { type: 'response.created', response: { id } },
      {
        type: 'response.output_item.done',
        item: {
          id: 'message-' + requests.length, type: 'message', role: 'assistant',
          content: [{ type: 'output_text', text: 'Synthetic response ' + requests.length }],
        },
      },
      { type: 'response.completed', response: { id } },
    ];
    if (requests.length === 2) events[1].item = {
      type: 'function_call', call_id: 'call-mcp', namespace: 'mcp__fixture',
      name: 'synthetic_marker', arguments: '{}',
    };
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    if (requests.length === 5) {
      res.flushHeaders();
      await releaseLiveResponse;
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

[mcp_servers.fixture]
command = ${JSON.stringify(process.execPath)}
args = [${JSON.stringify(mcpPath)}]
`);
  const server = spawn('codex', ['app-server', '--listen', 'unix://' + socketPath], {
    cwd,
    env: {
      HOME: home,
      CODEX_HOME: home,
      CODEX_APP_SERVER_DISABLE_MANAGED_CONFIG: '1',
      PATH: process.env.PATH,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  server.stderr.setEncoding('utf8').on('data', (data) => { stderr += data; });
  const serverClosed = once(server, 'close');
  const clients = [];
  t.after(async () => {
    for (const client of clients) client.close();
    server.kill();
    await serverClosed;
    model.closeAllConnections();
    await new Promise((resolve) => model.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  await waitFor(async () => {
    if (server.exitCode !== null) assert.fail(stderr);
    return stat(socketPath).catch(() => null);
  }, 'Codex app-server did not create its test socket');

  const desktopEvents = [];
  const desktop = await connectCodex({ socketPath, onEvent: (method, params) => desktopEvents.push({ method, params }) });
  clients.push(desktop);
  const { thread } = await desktop.rpc('thread/start', { cwd, approvalPolicy: 'never' });
  const first = await desktop.startTurn(thread.id, 'Remember this synthetic project label: MOCK_PROJECT_LABEL.');
  await waitFor(() => desktopEvents.find(({ method, params }) =>
    method === 'turn/completed' && params.turn.id === first.id),
    'First desktop turn did not complete');

  const events = [];
  const slack = await connectCodex({ socketPath, onEvent: (method, params) => events.push({ method, params }) });
  clients.push(slack);
  const resumed = await slack.rpc('thread/resume', {
    threadId: thread.id, excludeTurns: true,
    config: { mcp_servers: { fixture: { enabled: false } }, features: { apps: false, plugins: false } },
  });
  assert.equal(resumed.thread.id, thread.id);


  const args = {
    threadId: thread.id,
    expectedTurnId: first.id,
    prompt: 'SLACK_SAMPLE_ASK',
    disableMcp: true,
    allowInProgressTurn: true,
  };
  const toolSample = await slack.rpc('thread/sample', args);
  const tools = requests[1].payload.tools.map(({ name }) => name);
  assert.ok(tools.includes('mcp__fixture'));
  await assert.rejects(stat(callsPath), { code: 'ENOENT' });
  t.diagnostic(JSON.stringify({ sampledToolReply: toolSample.text, offeredMcp: tools.includes('mcp__fixture'), toolExecuted: false }));
  assert.equal(toolSample.text, null);
  assert.equal(toolSample.sourceTurnId, first.id);
  assert.equal(requests.length, 2);
  assert.match(JSON.stringify(requests[1].payload.input), /MOCK_PROJECT_LABEL/);
  assert.match(JSON.stringify(requests[1].payload.input), /Synthetic response 1/);
  assert.match(JSON.stringify(requests[1].payload.input), /SLACK_SAMPLE_ASK/);

  const textSample = await slack.rpc('thread/sample', { ...args, prompt: 'SLACK_SECOND_SAMPLE' });
  assert.equal(textSample.text, 'Synthetic response 3');
  assert.equal(textSample.sourceTurnId, first.id);
  const { thread: inspected } = await desktop.rpc('thread/read', { threadId: thread.id, includeTurns: true });
  assert.equal(inspected.turns.length, 1);
  assert.doesNotMatch(JSON.stringify(inspected.turns), /Synthetic response 3|SLACK_SECOND_SAMPLE/);
  const followup = await desktop.startTurn(thread.id, 'AFTER_SAMPLING');
  await waitFor(() => desktopEvents.find(({ method, params }) =>
    method === 'turn/completed' && params.turn.id === followup.id),
    'Followup desktop turn did not complete');
  assert.doesNotMatch(JSON.stringify(requests[3].payload.input), /Synthetic response 3|SLACK_SECOND_SAMPLE/);
  t.diagnostic(JSON.stringify({ textSample: textSample.text, turnsAfterSamples: inspected.turns.length, samplePersisted: false }));

  const live = await desktop.startTurn(thread.id, 'ORIGINAL_CLIENT_ACTIVE_TURN');
  try {
    await waitFor(() => requests.length === 5, 'Active provider request did not start');
    const liveSample = await slack.rpc('thread/sample', {
      ...args, expectedTurnId: live.id, prompt: 'SLACK_LIVE_SAMPLE',
    });
    assert.equal(liveSample.text, 'Synthetic response 6');
    assert.equal(liveSample.sourceTurnId, live.id);
    assert.match(JSON.stringify(requests[5].payload.input), /ORIGINAL_CLIENT_ACTIVE_TURN/);
    assert.match(JSON.stringify(requests[5].payload.input), /SLACK_LIVE_SAMPLE/);
    t.diagnostic(JSON.stringify({ activeSourceRead: true, sampledWhileSourceInProgress: liveSample.text }));
  } finally {
    finishLiveResponse();
  }
  await waitFor(() => desktopEvents.find(({ method, params }) =>
    method === 'turn/completed' && params.turn.id === live.id),
    'Active desktop turn did not complete after allowing its response');
});
