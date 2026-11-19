import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { chmodSync, lstatSync, mkdirSync, realpathSync, unlinkSync } from 'node:fs';
import { createConnection, createServer } from 'node:net';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';

const sessionId = /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const requestLimit = 16 * 1024;
const uid = process.getuid();

export function linkControlSocketPath(env = process.env) {
  return env.LINK_CONTROL_SOCKET || join(homedir(), '.slack-codex-bridge', 'link.sock');
}

function isTarget(value) {
  if (typeof value !== 'string') return false;
  if (/^#?[a-z0-9_-]+$|^[CG][A-Z0-9]+$/.test(value)) return true;
  if (!value.startsWith('https://') || /[\s\\]/.test(value)) return false;
  const url = URL.parse(value);
  if (!url || url.port || url.username || url.password || url.hash) return false;
  if (url.hostname === 'app.slack.com' && /^\/client\/T[A-Z0-9]+\/[CG][A-Z0-9]+\/?$/.test(url.pathname)) {
    return true;
  }
  return (
    /^[a-z0-9-]+\.slack\.com$/.test(url.hostname) &&
    /^\/archives\/[CG][A-Z0-9]+(?:\/p\d{7,})?\/?$/.test(url.pathname)
  );
}

function validateRequest(request) {
  if (
    !request ||
    typeof request !== 'object' ||
    Array.isArray(request) ||
    Object.keys(request).some(
      (key) => !['operation', 'threadId', 'target', 'project', 'backend', 'socketPath', 'text'].includes(key),
    )
  ) {
    throw new Error('The link request contains an unexpected field.');
  }
  const { backend = 'codex', operation = 'link' } = request;
  if (!['link', 'report', 'grant-exact', 'replace-exact', 'retry-mention'].includes(operation))
    throw new Error('Expected a link or report operation.');
  if (!['codex', 'claude'].includes(backend)) throw new Error('Expected a codex or claude backend.');
  if (typeof request.threadId !== 'string' || !sessionId.test(request.threadId)) {
    throw new Error('Expected an exact session UUID from the selected backend or --session.');
  }
  if (!isTarget(request.target))
    throw new Error('Expected a Slack #channel, channel ID, or channel/thread link.');
  if (operation === 'report') {
    if (typeof request.text !== 'string' || !request.text.trim()) throw new Error('Report text is required.');
    if (request.project !== undefined || request.socketPath !== undefined) {
      throw new Error('Reports use the existing binding. Remove --project or --claude-socket.');
    }
    return;
  }
  if (request.text !== undefined) throw new Error('Text is only accepted for a report.');
  if (
    request.project !== undefined &&
    (typeof request.project !== 'string' || !isAbsolute(request.project) || request.project.includes('\0'))
  ) {
    throw new Error('The optional project must be an absolute directory path.');
  }
  if (
    request.socketPath !== undefined &&
    (backend !== 'claude' ||
      typeof request.socketPath !== 'string' ||
      !isAbsolute(request.socketPath) ||
      request.socketPath.includes('\0'))
  ) {
    throw new Error('An absolute Claude channel socket path requires the claude backend.');
  }
}

function socketAddress(socketPath, create = false) {
  if (!isAbsolute(socketPath) || socketPath.includes('\0'))
    throw new Error('The operator socket path must be absolute.');
  const parent = dirname(socketPath);
  if (create) {
    try {
      mkdirSync(parent, { mode: 0o700 });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  const directory = realpathSync(parent);
  const info = lstatSync(directory);
  if (!info.isDirectory() || info.uid !== uid || (info.mode & 0o777) !== 0o700) {
    throw new Error('The operator socket needs a private directory owned by this OS user (0700).');
  }
  // An extended macOS ACL can grant access even when the POSIX mode is 0700.
  if (
    process.platform === 'darwin' &&
    /^\s+\d+:/m.test(execFileSync('/bin/ls', ['-ldBe', directory], { encoding: 'utf8' }))
  ) {
    throw new Error('The private operator socket directory must have no ACL entries.');
  }
  // Bind and connect using the same canonical path so a symlink cannot redirect a later lookup.
  for (let ancestor = dirname(directory); ; ancestor = dirname(ancestor)) {
    const entry = lstatSync(ancestor);
    if (
      !entry.isDirectory() ||
      ![uid, 0].includes(entry.uid) ||
      (entry.mode & 0o022 && !(entry.uid === 0 && entry.mode & 0o1000))
    ) {
      throw new Error('The operator socket needs trusted, owner-controlled parent directories.');
    }
    if (ancestor === dirname(ancestor)) break;
  }
  const address = join(directory, basename(socketPath));
  if (Buffer.byteLength(address) > 103)
    throw new Error('The operator socket path is too long for a Unix socket.');
  return address;
}

function socketInfo(address) {
  const info = lstatSync(address, { throwIfNoEntry: false });
  if (info && (!info.isSocket() || info.uid !== uid)) {
    throw new Error('Expected a Unix socket owned by this OS user.');
  }
  return info;
}

async function removeStaleSocket(address) {
  const previous = socketInfo(address);
  if (!previous) return;
  const probe = createConnection(address);
  probe.setTimeout(1000, () =>
    probe.destroy(new Error('Could not confirm the operator socket is inactive.')),
  );
  try {
    await once(probe, 'connect');
    throw new Error('The operator socket is already in use.');
  } catch (error) {
    if (error.code !== 'ECONNREFUSED' && error.code !== 'ENOENT') throw error;
  } finally {
    probe.destroy();
  }
  const current = socketInfo(address);
  if (current && current.dev === previous.dev && current.ino === previous.ino) unlinkSync(address);
}

export async function startLinkControl({ socketPath = linkControlSocketPath(), onLink, onReport }) {
  const address = socketAddress(socketPath, true);
  await removeStaleSocket(address);
  const sockets = new Set();
  const pending = new Set();
  const server = createServer({ allowHalfOpen: true }, (socket) => {
    sockets.add(socket);
    socket.on('error', () => socket.destroy());
    socket.on('close', () => sockets.delete(socket));
    socket.setTimeout(10_000, () => socket.destroy());
    const chunks = [];
    let bytes = 0;
    socket.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > requestLimit) {
        if (socket.writable) socket.end(JSON.stringify({ ok: false, error: 'Link request exceeds 16 KiB.' }));
        return;
      }
      chunks.push(chunk);
    });
    socket.on('end', () => {
      socket.setTimeout(0);
      if (!socket.writable || bytes > requestLimit) return;
      let request;
      try {
        request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        validateRequest(request);
      } catch (error) {
        socket.end(
          JSON.stringify({
            ok: false,
            error: error instanceof SyntaxError ? 'Invalid link request JSON.' : error.message,
          }),
        );
        return;
      }
      const reporting = request.operation === 'report';
      const handler = reporting ? onReport : onLink;
      if (!handler) {
        socket.end(JSON.stringify({ ok: false, error: 'The local bridge does not support this operation.' }));
        return;
      }
      async function forward() {
        let response;
        try {
          const { link, reply } = await handler(request);
          if (typeof link !== 'string' || !link || typeof reply !== 'string' || !reply) throw new Error();
          response = { ok: true, result: { link, reply } };
        } catch (error) {
          const failure = reporting
            ? 'The bridge could not confirm the report. Check the Slack destination before retrying.'
            : 'Could not link the session.';
          response = {
            ok: false,
            error: typeof error?.publicMessage === 'string' ? error.publicMessage : failure,
          };
          if (typeof error?.publicMessage === 'string' && typeof error.code === 'string')
            response.code = error.code;
        }
        if (socket.writable) socket.end(JSON.stringify(response));
      }
      const operation = forward();
      pending.add(operation);
      void operation.finally(() => pending.delete(operation));
    });
  });
  const listening = once(server, 'listening');
  server.listen(address);
  await listening;
  try {
    chmodSync(address, 0o600);
  } catch (error) {
    server.close();
    throw error;
  }
  let closing;
  return {
    close() {
      if (!closing) {
        closing = new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
          for (const socket of sockets) socket.destroy();
        }).then(() => Promise.allSettled(pending));
      }
      return closing;
    },
  };
}

export async function requestLink(request, socketPath = linkControlSocketPath()) {
  validateRequest(request);
  const payload = JSON.stringify(request);
  if (Buffer.byteLength(payload) > requestLimit) throw new Error('Link request exceeds 16 KiB.');
  const address = socketAddress(socketPath);
  const info = socketInfo(address);
  if (!info) throw Object.assign(new Error('The local operator socket does not exist.'), { code: 'ENOENT' });
  if ((info.mode & 0o777) !== 0o600)
    throw new Error('The operator socket must use owner-only permissions (0600).');
  const socket = createConnection(address);
  const uncertain = 'Check the Slack destination before retrying.';
  socket.setTimeout(60_000, () => socket.destroy(new Error(`The link response timed out. ${uncertain}`)));
  socket.setEncoding('utf8');
  let response = '';
  socket.on('data', (chunk) => {
    response += chunk;
  });
  const ended = once(socket, 'end');
  socket.end(payload);
  try {
    await ended;
  } catch (error) {
    if (!['ECONNRESET', 'EPIPE'].includes(error.code)) throw error;
    throw new Error(`The bridge disconnected before confirming the link. ${uncertain}`);
  }
  if (!response) throw new Error(`The bridge disconnected before confirming the link. ${uncertain}`);
  let message;
  try {
    message = JSON.parse(response);
  } catch {
    throw new Error(`The bridge returned an invalid link response. ${uncertain}`);
  }
  if (!message.ok) throw Object.assign(new Error(message.error), { code: message.code });
  return message.result;
}
