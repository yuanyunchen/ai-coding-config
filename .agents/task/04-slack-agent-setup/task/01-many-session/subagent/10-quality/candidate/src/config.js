import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdirSync, realpathSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash } from 'node:crypto';

export function configuration(env = process.env) {
  const teamId = env.BRIDGE_TEAM_ID || 'T0B2PK88RJ5',
    ownerId = env.BRIDGE_OWNER_ID || 'U0B2EAU2WN8';
  const state = resolve(
    env.BRIDGE_STATE_DIR || join(homedir(), 'Library/Application Support/slack-coding-bridge', teamId),
  );
  mkdirSync(state, { recursive: true, mode: 0o700 });
  let project = env.BRIDGE_PROJECT;
  if (!project) {
    project = join(state, 'team-project');
    mkdirSync(project, { recursive: true, mode: 0o700 });
  }
  project = realpathSync(project);
  if ([realpathSync(homedir()), '/', state].includes(project))
    throw new Error('Use a dedicated shared project directory');
  return {
    state,
    teamId,
    ownerId,
    project,
    locale: env.BRIDGE_LANGUAGE || 'zh',
    contextBudget: 12000,
    channelId: env.BRIDGE_CHANNEL_ID,
    botToken: env.SLACK_BOT_TOKEN,
    appToken: env.SLACK_APP_TOKEN,
  };
}
const hash = (value) => createHash('sha256').update(value).digest('hex');
export function registry(config) {
  const db = new DatabaseSync(join(config.state, 'settings.sqlite'));
  db.exec(
    'PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY,v TEXT); CREATE TABLE IF NOT EXISTS pairs(k TEXT PRIMARY KEY,target TEXT,expires INTEGER)',
  );
  const get = (k) => db.prepare('SELECT v FROM settings WHERE k=?').get(k)?.v;
  return {
    channel: () => get('channel'),
    enrollCode() {
      if (get('channel')) throw new Error('Channel already enrolled');
      const code = randomBytes(12).toString('hex');
      db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run('enrollment', hash(code));
      return code;
    },
    enroll(team, channel, user, text) {
      if (team !== config.teamId || user !== config.ownerId) return false;
      db.exec('BEGIN IMMEDIATE');
      try {
        const code = text.trim().split(/\s+/u)[1] ?? '';
        if (get('channel') || hash(code) !== get('enrollment')) {
          db.exec('ROLLBACK');
          return false;
        }
        db.prepare('INSERT INTO settings VALUES(?,?)').run('channel', channel);
        db.exec("DELETE FROM settings WHERE k='enrollment'; COMMIT");
        return true;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    issue(target) {
      const code = randomBytes(12).toString('hex');
      db.prepare('INSERT INTO pairs VALUES(?,?,?)').run(
        hash(code),
        JSON.stringify(target),
        Date.now() + 10 * 60 * 1000,
      );
      return code;
    },
    consume(code) {
      const r = db.prepare('DELETE FROM pairs WHERE k=? RETURNING target,expires').get(hash(code));
      if (!r || r.expires < Date.now()) throw new Error('Invalid or expired pairing');
      return JSON.parse(r.target);
    },
    close: () => db.close(),
  };
}
