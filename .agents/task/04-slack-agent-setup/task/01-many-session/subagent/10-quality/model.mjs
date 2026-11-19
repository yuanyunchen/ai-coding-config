import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

export const modelId = 'gpt-6.2-sol';
export const effort = 'low';
export const project = '/private/var/empty';

export async function realModel(log) {
  const process = spawn('codex', [
    'app-server', '--stdio',
    '-c', 'features.apps=false', '-c', 'features.plugins=false',
    '-c', 'features.multi_agent=false', '-c', 'features.computer_use=false',
    '-c', 'mcp_servers.node_repl.enabled=false', '-c', 'mcp_servers.computer-use.enabled=false',
  ], { cwd: project, stdio: ['pipe', 'pipe', 'pipe'] });
  const requests = new Map(), turns = new Map(), threadWaiters = new Map();
  let next = 0;
  process.stderr.on('data', (chunk) => log.write(chunk));
  process.on('exit', (code) => {
    for (const resolve of requests.values()) resolve({ error: { message: 'App server exited ' + code } });
    for (const waiter of threadWaiters.values()) waiter.reject(Error('App server exited ' + code));
  });
  createInterface({ input: process.stdout }).on('line', (line) => {
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    if (msg.method && msg.id !== undefined) {
      process.stdin.write(JSON.stringify({ id: msg.id, error: { code: -32000, message: 'Synthetic run does not allow tool approvals' } }) + '\n');
      return;
    }
    if (msg.method === 'item/completed') {
      const { threadId, turnId, item } = msg.params;
      const items = turns.get(turnId) ?? [];
      items.push(item);
      turns.set(turnId, items);
    }
    if (msg.method === 'turn/completed') {
      const { threadId, turn } = msg.params;
      threadWaiters.get(threadId)?.resolve({ ...turn, items: turns.get(turn.id) ?? turn.items });
      turns.delete(turn.id);
    }
    requests.get(msg.id)?.(msg);
  });
  async function rpc(method, params) {
    const id = ++next;
    const answer = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { requests.delete(id); reject(Error('RPC timeout ' + method)); }, 45_000);
      requests.set(id, (value) => { clearTimeout(timer); requests.delete(id); resolve(value); });
    });
    process.stdin.write(JSON.stringify({ id, method, params }) + '\n');
    const answerEnvelope = await answer;
    if (answerEnvelope.error) throw Error(answerEnvelope.error.message);
    return answerEnvelope.result;
  }
  await rpc('initialize', { clientInfo: { name: 'local_qa_fixture', version: '1.0' }, capabilities: { experimentalApi: true } });
  process.stdin.write('{"method":"initialized"}\n');
  const thread = async () => (await rpc('thread/start', {
    cwd: project, model: modelId, ephemeral: true, approvalPolicy: 'never', sandbox: 'read-only',
    baseInstructions: 'You are the conversational assistant on the bridge. Work from the conversation and explicitly provided artifacts. This isolated evaluation has no shell or remote services. Do not call any tools. Return only the response for the bridge or the explicitly defined bridge reply marker.',
    config: { model_reasoning_effort: effort, service_tier: 'default', shell_environment_policy: { inherit: 'none' } },
  })).thread.id;
  async function ask(threadId, prompt, media = {}) {
    const result = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Model turn timeout')), 105_000);
      threadWaiters.set(threadId, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });
    });
    try {
      await rpc('turn/start', {
        threadId, effort, model: modelId,
        input: [
          { type: 'text', text: prompt },
          ...(media.images ?? []).map((path) => ({ type: 'localImage', path })),
          ...(media.imageUrls ?? []).map((url) => ({ type: 'image', url })),
        ],
      });
      return await result;
    } catch (error) {
      threadWaiters.get(threadId)?.reject(error);
      return await result;
    } finally {
      threadWaiters.delete(threadId);
    }
  }
  return { thread, ask, close: () => process.stdin.end() };
}
