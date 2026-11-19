import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { lstat, chmod, mkdir } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';
import { once } from 'node:events';
import { createInterface } from 'node:readline';

async function privateSocket(socketPath, create = false) {
  if (!isAbsolute(socketPath)) throw new Error('Claude socket path must be absolute');
  const dir = dirname(socketPath);
  if (create) await mkdir(dir, { recursive: true, mode: 0o700 });
  const st = await lstat(dir);
  if (!st.isDirectory() || st.uid !== process.getuid() || st.mode & 0o077)
    throw new Error('Claude socket directory must be private (0700) and owned by this user');
}
function send(socket, msg) {
  socket.write(JSON.stringify(msg) + '\n');
}

// This server is created inside Claude Code's own MCP process. Its peer is the team bridge.
export async function startClaudeChannel({ socketPath, threadId, notify, cwd = process.cwd() }) {
  await privateSocket(socketPath, true);
  if (!threadId) throw new Error('Claude session ID required');
  const peers = new Set();
  let active = null,
    previous = null;
  const snapshot = () => ({
    id: threadId,
    cwd,
    status: { type: active ? 'active' : 'idle' },
    turns: [previous, active].filter(Boolean),
  });
  function emit(method, params) {
    for (const socket of peers) send(socket, { method, params: { threadId, ...params } });
  }
  async function handle(method, p) {
    if (p.threadId !== threadId) throw new Error('Claude session ID mismatch');
    if (method === 'read') return snapshot();
    if (method === 'interrupt')
      throw new Error(
        'Claude Channels cannot confirm a turn interrupt. Press Escape in the bound Claude terminal.',
      );
    if (method !== 'start' && method !== 'steer') throw new Error('unknown request');
    if (typeof p.text !== 'string' || !p.text.trim()) throw new Error('empty input');
    const newTurn = method === 'start';
    if (newTurn && active) throw new Error('Claude already has an active turn');
    if (!newTurn && (!active || active.id !== p.turnId)) throw new Error('active turn mismatch');
    const turn = active || { id: randomUUID(), status: 'inProgress', items: [] };
    active = turn;
    try {
      let content = p.text;
      if (p.images?.length)
        content +=
          '\nAttached images available to Claude Read:\n' +
          p.images.map((path, i) => JSON.stringify({ image: i + 1, path })).join('\n');
      await notify({ content, meta: { turn_id: turn.id } });
    } catch (error) {
      if (newTurn) active = null;
      throw error;
    }
    if (newTurn) emit('turn/started', { turn });
    return { id: turn.id };
  }
  const server = net.createServer((socket) => {
    peers.add(socket);
    socket.on('error', () => {});
    socket.once('close', () => peers.delete(socket));
    const lines = createInterface({ input: socket, crlfDelay: Infinity });
    lines.on('line', async (line) => {
      let req;
      try {
        req = JSON.parse(line);
        send(socket, { id: req.id, result: await handle(req.method, req.params) });
      } catch (error) {
        send(socket, { id: req?.id, error: error.message });
      }
    });
  });
  // bind() refuses existing live listeners. Operators may unlink a stale socket after verifying ownership.
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, resolve);
  });
  await chmod(socketPath, 0o600);
  function report({ turn_id, kind, text }) {
    if (!active || turn_id !== active.id) throw new Error('active Claude turn mismatch');
    if (!['progress', 'final', 'failed'].includes(kind) || typeof text !== 'string' || !text.trim())
      throw new Error('invalid report');
    const item = {
      id: randomUUID(),
      type: 'agentMessage',
      phase: kind === 'progress' ? 'commentary' : 'final_answer',
      text,
    };
    active.items.push(item);
    emit('item/completed', { turnId: active.id, item });
    if (kind !== 'progress') {
      previous = {
        ...active,
        status: kind === 'failed' ? 'failed' : 'completed',
        ...(kind === 'failed' ? { error: { message: text } } : {}),
      };
      active = null;
      emit('turn/completed', { turn: previous });
    }
  }
  async function close() {
    for (const socket of peers) socket.destroy();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  }
  return { report, close };
}

export async function connectClaude({ socketPath, threadId, onEvent = () => {}, onClose = () => {} }) {
  await privateSocket(socketPath);
  const st = await lstat(socketPath);
  if (!st.isSocket() || st.uid !== process.getuid() || st.mode & 0o077)
    throw new Error('unexpected Claude socket owner or permissions');
  const socket = net.createConnection(socketPath);
  await once(socket, 'connect');
  const pending = new Map();
  let idx = 0;
  socket.on('error', () => {});
  socket.once('close', () => {
    for (const r of pending.values())
      r.reject(new Error('Claude channel connection closed; reconcile turn before retry'));
    pending.clear();
    onClose();
  });
  createInterface({ input: socket, crlfDelay: Infinity }).on('line', (line) => {
    let m;
    try {
      m = JSON.parse(line);
    } catch {
      socket.destroy();
      return;
    }
    if (m.method) {
      if (m.params?.threadId === threadId) onEvent(m.method, m.params);
      return;
    }
    const r = pending.get(m.id);
    if (!r) return;
    pending.delete(m.id);
    if (m.error) r.reject(new Error(m.error));
    else r.resolve(m.result);
  });
  function request(method, id, params = {}) {
    if (id !== threadId) return Promise.reject(new Error('Claude session ID mismatch'));
    if (socket.destroyed) return Promise.reject(new Error('Claude channel offline'));
    return new Promise((resolve, reject) => {
      const seq = ++idx;
      const timeout = setTimeout(() => {
        pending.delete(seq);
        reject(new Error('Claude acknowledgement timed out; reconcile before retry'));
      }, 10000);
      pending.set(seq, {
        resolve: (r) => {
          clearTimeout(timeout);
          resolve(r);
        },
        reject: (e) => {
          clearTimeout(timeout);
          reject(e);
        },
      });
      send(socket, { id: seq, method, params: { ...params, threadId: id } });
    });
  }
  try {
    await request('read', threadId);
  } catch (err) {
    socket.destroy();
    throw err;
  }
  return {
    readThread: (id) => request('read', id),
    resumeThread: (id) => request('read', id),
    latestTurn: async (id) => (await request('read', id)).turns.at(-1),
    startTurn: (id, text, { images = [], messageId } = {}) =>
      request('start', id, { text, images, messageId }),
    steerTurn: (id, turnId, text, { images = [], messageId } = {}) =>
      request('steer', id, { text, turnId, images, messageId }),
    interruptTurn: (id, turnId) => request('interrupt', id, { turnId }),
    close: () => socket.destroy(),
  };
}
