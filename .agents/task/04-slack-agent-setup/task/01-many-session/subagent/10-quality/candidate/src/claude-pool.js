import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { realpathSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { connectClaude } from './claude.js';

// Each Claude Channel belongs to one interactive process and has its own Unix socket.
export function claudePool({ db, onEvent, onClose, connect = connectClaude }) {
  const live = new Map();
  async function get(threadId, socketPath, project) {
    if (live.has(threadId)) return live.get(threadId);
    const saved = db.prepare('SELECT * FROM claudeEndpoints WHERE threadId=?').get(threadId);
    const path =
      socketPath ??
      saved?.socketPath ??
      process.env.CLAUDE_BRIDGE_SOCKET ??
      join(homedir(), '.slack-codex-bridge', 'claude.sock');
    const c = await connect({
      threadId,
      socketPath: path,
      onEvent,
      onClose: () => {
        live.delete(threadId);
        onClose?.(threadId);
      },
    });
    try {
      const t = await c.readThread(threadId);
      const cwd = realpathSync(t.cwd);
      if (project && realpathSync(project) !== cwd) throw Error('Claude project mismatch');
      db.prepare('INSERT OR REPLACE INTO claudeEndpoints VALUES(?,?,?)').run(threadId, path, cwd);
      live.set(threadId, c);
      return c;
    } catch (err) {
      c.close();
      throw err;
    }
  }
  async function startThread(project) {
    const id = randomUUID(),
      tag = 'ethan-' + id.slice(0, 8);
    const dir = join(homedir(), '.slack-codex-bridge');
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const socketPath = join(dir, tag + '.sock');
    const launcher = fileURLToPath(new URL('../scripts/claude-launch.js', import.meta.url));
    const cmd = spawnSync(
      'tmux',
      [
        'new-session',
        '-d',
        '-s',
        tag,
        '-c',
        project,
        '-e',
        'CLAUDE_BRIDGE_NEW_ID=' + id,
        '-e',
        'CLAUDE_BRIDGE_SOCKET=' + socketPath,
        process.execPath,
        launcher,
        project,
      ],
      { stdio: 'ignore' },
    );
    if (cmd.status !== 0)
      throw Object.assign(Error('Cannot start Claude team terminal'), {
        publicMessage: '无法启动独立 Claude 终端。请在共享项目中运行 Claude Channel 启动器。',
      });
    db.prepare('INSERT OR REPLACE INTO claudeEndpoints VALUES(?,?,?)').run(id, socketPath, project);
    for (let i = 0; i < 40; i++) {
      try {
        const c = await get(id, socketPath, project);
        return await c.readThread(id);
      } catch (err) {
        if (!['ENOENT', 'ECONNREFUSED'].includes(err.code)) break;
        await delay(250);
      }
    }
    throw Object.assign(Error('Claude channel needs local attention'), {
      publicMessage:
        'Claude 终端尚未就绪。在本机运行 tmux attach -t ' + tag + ' 查看启动提示；会话 ID ' + id + '。',
    });
  }
  const api = { startThread };
  for (const name of ['readThread', 'resumeThread', 'latestTurn', 'startTurn', 'steerTurn', 'interruptTurn'])
    api[name] = async (id, ...args) => (await get(id))[name](id, ...args);
  return {
    api,
    async prepare(req) {
      const c = await get(req.threadId, req.socketPath, req.project);
      return { ...c, startThread };
    },
    close() {
      for (const c of live.values()) c.close();
    },
  };
}
