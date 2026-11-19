// The desktop owns its live turn. Ask that owner to deliver input over its user-local IPC router.
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { lstat } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const endpoint = join(homedir(), '.codex', 'ipc', 'ipc.sock');

export async function desktopOwner(threadId, inputText, messageId, socketPath = endpoint, authorize, { imageUrls = [] } = {}) {
  const [dir, file] = await Promise.all([lstat(dirname(socketPath)), lstat(socketPath)]);
  if (!dir.isDirectory() || !file.isSocket() ||
      [dir, file].some((s) => s.uid !== process.getuid() || (s.mode & 0o077) !== 0))
    throw Error('Unsafe desktop IPC endpoint');
  const socket = createConnection(socketPath);
  const timer = setTimeout(() => socket.destroy(Error('Desktop IPC timed out')), 30000);
  let sourceClientId = 'initializing-client';
  let owner;
  function write(message) {
    const body = Buffer.from(JSON.stringify(message));
    const header = Buffer.alloc(4);
    header.writeUInt32LE(body.length);
    socket.write(Buffer.concat([header, body]));
  }
  try {
    await once(socket, 'connect');
    const stream = socket[Symbol.asyncIterator]();
    let buffer = Buffer.alloc(0);
    async function take(count) {
      while (buffer.length < count) {
        const { value, done } = await stream.next();
        if (done) throw Error('Desktop IPC disconnected');
        buffer = Buffer.concat([buffer, value]);
      }
      const result = buffer.subarray(0, count);
      buffer = buffer.subarray(count);
      return result;
    }
    async function request(method, version, params) {
      const requestId = randomUUID();
      write({ type: 'request', method, version, params, requestId, sourceClientId,
        targetClientId: owner, timeoutMs: 12000 });
      for (;;) {
        const size = (await take(4)).readUInt32LE();
        const msg = JSON.parse((await take(size)).toString());
        if (msg.type === 'client-discovery-request')
          write({ type: 'client-discovery-response', requestId: msg.requestId, response: { canHandle: false } });
        if (msg.type !== 'response' || msg.requestId !== requestId) continue;
        if (owner && msg.handledByClientId && msg.handledByClientId !== owner)
          throw Error('Desktop owner changed');
        if (msg.resultType !== 'success')
          throw Object.assign(Error(String(msg.error || 'Desktop declined input')), { desktopRejection: true });
        if (owner && msg.handledByClientId !== owner) throw Error('Desktop owner receipt missing');
        return msg;
      }
    }
    const hello = await request('initialize', 0, { clientType: 'ethan-slack-bridge' });
    sourceClientId = hello.result?.clientId;
    if (!sourceClientId) throw Error('Desktop registration failed');
    const discovery = await request('thread-owner-discovery', 1, { hostId: 'local', conversationId: threadId });
    owner = discovery.handledByClientId;
    if (!owner) throw Error('No live desktop owner');
    if (inputText === undefined) return { reachable: true };
    const input = [
      { type: 'text', text: inputText, text_elements: [] },
      ...imageUrls.map((url) => ({ type: 'image', url })),
    ];
    let receipt;
    try {
      authorize?.();
      receipt = await request('thread-follower-steer-turn', 1, {
        conversationId: threadId, clientUserMessageId: messageId, input, attachments: [],
        restoreMessage: {
          id: messageId, text: inputText, attachments: [],
          context: { workspaceRoots: [], prompt: inputText },
          responsesapiClientMetadata: {},
        },
      });
    } catch (error) {
      // Start only on an explicit idle rejection. A transport failure can mean input arrived.
      if (!error.desktopRejection || !/active turn already ended|no active turn|no turn in progress/i.test(error.message))
        throw error;
      authorize?.();
      receipt = await request('thread-follower-start-turn', 2, {
        conversationId: threadId,
        turnStart: {
          request: { threadId, input, clientUserMessageId: messageId },
          context: { inheritThreadSettings: true },
        },
      });
    }
    const result = receipt.result?.result;
    const turnId = result?.turnId ?? result?.turn?.id;
    if (typeof turnId !== 'string' || !turnId) throw Error('Desktop turn receipt missing');
    return { accepted: true, turnId };
  } finally {
    clearTimeout(timer);
    socket.destroy();
  }
}
