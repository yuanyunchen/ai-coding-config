import { DatabaseSync } from 'node:sqlite';
import { chmodSync, mkdirSync, openSync, closeSync } from 'node:fs';
import { dirname } from 'node:path';

const words = new Intl.Segmenter('zh', { granularity: 'word' });
const scopeOf = ({ teamId, channelId, threadTs }) => {
  if (!teamId || !channelId || !threadTs) throw new Error('Expected teamId, channelId and threadTs');
  return [teamId, channelId, threadTs];
};
const terms = (text) => [
  ...new Set([...words.segment(text)].filter((v) => v.isWordLike).map((v) => v.segment.toLowerCase())),
];
const receiptRow = (r) => (r ? { ...r, event: JSON.parse(r.event) } : null);
export const terminalStates = ['completed', 'failed', 'interrupted', 'cancelled', 'done', 'observed', 'deleted'];
function category(text, bot) {
  if (
    bot &&
    /\b(I will|I'll|we will|promise|by (?:Monday|Tuesday|Wednesday|Thursday|Friday|tomorrow))\b|我会|我将|我负责|我承诺|我(?:周[一二三四五六日]|明[天早晚]|下周|稍后)(?:前|会)?(?:给|发|整理|提供)|我们会|答应|予定です/iu.test(
      text,
    )
  )
    return 'commitment';
  if (
    /\b(decision|decided|deadline|approved|milestone)\b|决定|已定|改到|改期|排期|截止|批准|決定/iu.test(text)
  )
    return 'decision candidate';
  if (/\b(blocked|unresolved|pending)\b|阻塞|待确认|待办|未解决/iu.test(text)) return 'open item';
  return bot ? 'delivered reply' : 'discussion';
}
function filesFor(event) {
  return (event.files || []).map(
    ({
      id,
      name,
      mimetype,
      title,
      size,
      url_private,
      url_private_download,
      updated,
      timestamp,
      created,
    }) => ({
      id,
      name,
      mimetype,
      title,
      size,
      url_private,
      url_private_download,
      updated,
      timestamp,
      created,
    }),
  );
}
function rev(value) {
  // Slack timestamps are decimal strings. Lexical comparison of fixed-width components is exact.
  const [seconds, fraction = ''] = String(value).split('.');
  if (!/^\d+$/.test(seconds) || !/^\d*$/.test(fraction)) throw new Error('Invalid Slack timestamp');
  return seconds.padStart(16, '0') + '.' + fraction.padEnd(6, '0');
}
export class Store {
  constructor(filename) {
    if (filename !== ':memory:') {
      mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
      closeSync(openSync(filename, 'a', 0o600));
      chmodSync(filename, 0o600);
    }
    this.db = new DatabaseSync(filename);
    this.db.exec(`
      PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA secure_delete=ON;
      CREATE TABLE IF NOT EXISTS bindings(teamId TEXT,channelId TEXT,threadTs TEXT,backend TEXT,threadId TEXT,project TEXT,PRIMARY KEY(teamId,channelId,threadTs));
      CREATE TABLE IF NOT EXISTS audiences(backend TEXT,threadId TEXT,teamId TEXT,channelId TEXT,threadTs TEXT,project TEXT,PRIMARY KEY(backend,threadId));
      CREATE TABLE IF NOT EXISTS inbox(eventId TEXT PRIMARY KEY,teamId TEXT,channelId TEXT,threadTs TEXT,ts TEXT,event TEXT,state TEXT,turnId TEXT,error TEXT);
      CREATE INDEX IF NOT EXISTS by_turn ON inbox(turnId);
      CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,teamId TEXT,channelId TEXT,threadTs TEXT,text TEXT,state TEXT,slackTs TEXT);
      CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,teamId TEXT,channelId TEXT,threadTs TEXT,ts TEXT,userId TEXT,revision TEXT,text TEXT,files TEXT,kind TEXT,deleted INTEGER,seq INTEGER,UNIQUE(teamId,channelId,ts));
      CREATE INDEX IF NOT EXISTS thread_messages ON messages(teamId,channelId,threadTs,seq);
      CREATE INDEX IF NOT EXISTS channel_facts ON messages(teamId,channelId,kind,seq);
      CREATE INDEX IF NOT EXISTS channel_recent ON messages(teamId,channelId,seq);
      CREATE TABLE IF NOT EXISTS topics(teamId TEXT,channelId TEXT,threadTs TEXT,
        kind TEXT,msgId INTEGER,PRIMARY KEY(teamId,channelId,threadTs,kind));
      CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(terms);
      CREATE TABLE IF NOT EXISTS fileDeliveries(id TEXT PRIMARY KEY,teamId TEXT,channelId TEXT,threadTs TEXT,fileId TEXT);
      CREATE TABLE IF NOT EXISTS channelRetention(teamId TEXT,channelId TEXT,cutoff TEXT,PRIMARY KEY(teamId,channelId));
      CREATE TABLE IF NOT EXISTS revokedSessions(backend TEXT,threadId TEXT,PRIMARY KEY(backend,threadId));
      CREATE TABLE IF NOT EXISTS cursors(backend TEXT,threadId TEXT,pos INTEGER,PRIMARY KEY(backend,threadId));
      CREATE TABLE IF NOT EXISTS authored(backend TEXT,threadId TEXT,teamId TEXT,channelId TEXT,ts TEXT,PRIMARY KEY(teamId,channelId,ts));
      CREATE INDEX IF NOT EXISTS authored_session ON authored(backend,threadId);
      CREATE TABLE IF NOT EXISTS consumedSources(backend TEXT,threadId TEXT,teamId TEXT,channelId TEXT,sort TEXT,source TEXT,
        PRIMARY KEY(backend,threadId,sort,source));
      CREATE INDEX IF NOT EXISTS affected_sessions ON consumedSources(teamId,channelId,sort,source);
      CREATE TABLE IF NOT EXISTS revokedFiles(teamId TEXT,channelId TEXT,fileId TEXT,PRIMARY KEY(teamId,channelId,fileId));
      CREATE TABLE IF NOT EXISTS desktopCursor(backend TEXT,threadId TEXT,turnId TEXT,PRIMARY KEY(backend,threadId));
      CREATE TABLE IF NOT EXISTS sequence(pos INTEGER);
      INSERT INTO sequence SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM sequence);
    `);
    this.atomic(() => {
      if (
        !this.db
          .prepare('PRAGMA table_info(inbox)')
          .all()
          .some((c) => c.name === 'messageId')
      )
        this.db.exec('ALTER TABLE inbox ADD COLUMN messageId TEXT');
      // Older shared runners may have seen neighboring discussions. Preserve the Slack
      // history and unsubmitted requests, but never resume an unverifiable model context.
      if (this.db.prepare('PRAGMA user_version').get().user_version === 0)
        this.db.exec(
          'INSERT OR IGNORE INTO revokedSessions SELECT backend,threadId FROM bindings;' +
            "UPDATE inbox SET state='cancelled' WHERE state IN ('running','submitting','delivery_unknown')" +
            ' AND EXISTS (SELECT 1 FROM bindings b WHERE b.teamId=inbox.teamId' +
            ' AND b.channelId=inbox.channelId AND b.threadTs=inbox.threadTs);' +
            'DELETE FROM bindings;' +
            'PRAGMA user_version=1;',
        );
    });
  }
  desktopCheckpoint(b) {
    return this.db
      .prepare('SELECT turnId FROM desktopCursor WHERE backend=? AND threadId=?')
      .get(b.backend, b.threadId)?.turnId;
  }
  advanceDesktop(b, turnId) {
    this.db.prepare('INSERT OR REPLACE INTO desktopCursor VALUES(?,?,?)').run(b.backend, b.threadId, turnId);
  }
  close() {
    this.db.close();
  }
  atomic(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const value = fn();
      this.db.exec('COMMIT');
      return value;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  bind(scope, { backend, threadId, project }) {
    const key = scopeOf(scope);
    if (!backend || !threadId || !project) throw new Error('Incomplete binding');
    return this.atomic(() => {
      if (
        this.db.prepare('SELECT 1 FROM revokedSessions WHERE backend=? AND threadId=?').get(backend, threadId)
      )
        throw new Error('Revoked session requires a new binding');
      const a = this.db
        .prepare('SELECT * FROM audiences WHERE backend=? AND threadId=?')
        .get(backend, threadId);
      if (a && (JSON.stringify(scopeOf(a)) !== JSON.stringify(key) || a.project !== project))
        throw new Error('Session already belongs to a different audience or project');
      this.db
        .prepare('INSERT OR IGNORE INTO audiences VALUES(?,?,?,?,?,?)')
        .run(backend, threadId, ...key, project);
      this.db
        .prepare('INSERT OR REPLACE INTO bindings VALUES(?,?,?,?,?,?)')
        .run(...key, backend, threadId, project);
      return this.binding(scope);
    });
  }
  binding(scope) {
    return (
      this.db
        .prepare('SELECT * FROM bindings WHERE teamId=? AND channelId=? AND threadTs=?')
        .get(...scopeOf(scope)) ?? null
    );
  }
  bindings() {
    return this.db.prepare('SELECT * FROM bindings').all();
  }
  invalidateBinding(scope) {
    return this.atomic(() => {
      const b = this.binding(scope);
      if (!b) return false;
      this.db.prepare('INSERT OR IGNORE INTO revokedSessions VALUES(?,?)').run(b.backend, b.threadId);
      return this.unbind(scope);
    });
  }
  unbind(scope) {
    return this.db
      .prepare('DELETE FROM bindings WHERE teamId=? AND channelId=? AND threadTs=?')
      .run(...scopeOf(scope)).changes;
  }
  accept(event) {
    if (!event.eventId) throw new Error('Missing eventId');
    return this.atomic(() => {
      if (this.expired(event)) return false;
      const key = scopeOf(event),
        data = { ...event, files: this.visibleFiles(event) };
      // Keep actionable normalized input for restart. Edits and deletions also update this copy.
      const inserted = this.db
        .prepare(
          'INSERT OR IGNORE INTO inbox(eventId,teamId,channelId,threadTs,ts,event,state) VALUES(?,?,?,?,?,?,?)',
        )
        .run(event.eventId, ...key, event.ts, JSON.stringify(data), 'received');
      if (!inserted.changes) return false;
      this.writeMessage(data);
      const source = this.db
        .prepare('SELECT text,files,deleted,revision FROM messages WHERE teamId=? AND channelId=? AND ts=?')
        .get(key[0], key[1], event.ts);
      if (source.deleted) {
        this.scrubIntake(data, source);
        return false;
      }
      // An ordinary-message echo can include a raw mention where the actionable event is cleaned.
      if (source.revision > rev(event.revisionTs || event.ts)) this.scrubIntake(data, source);
      return true;
    });
  }
  remember(event) {
    if (event.kind === 'file_revoke') return this.revokeFile(event.teamId, event.channelId, event.fileId);
    return this.atomic(() => this.writeMessage(event));
  }
  writeMessage(event) {
    if (this.expired(event)) return false;
    const { teamId, channelId, ts, userId = '', bot = false } = event;
    const deleted = event.deleted === true || event.kind === 'delete';
    const threadTs = event.threadTs || ts,
      revision = rev(event.revisionTs || event.versionTs || ts);
    const text = deleted ? '' : String(event.text || ''),
      files = JSON.stringify(deleted ? [] : this.visibleFiles(event));
    const prev = this.db
      .prepare('SELECT * FROM messages WHERE teamId=? AND channelId=? AND ts=?')
      .get(teamId, channelId, ts);
    if (
      prev &&
      (prev.deleted || (!deleted && revision < prev.revision) || (revision === prev.revision && !deleted))
    )
      return false;
    const seq = this.db.prepare('UPDATE sequence SET pos=pos+1 RETURNING pos').get().pos;
    const kind = category(text, bot || event.isBot);
    const id = this.db
      .prepare(
        `INSERT INTO messages(teamId,channelId,threadTs,ts,userId,revision,text,files,kind,deleted,seq)
      VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(teamId,channelId,ts) DO UPDATE SET
      revision=excluded.revision,text=excluded.text,files=excluded.files,kind=excluded.kind,deleted=excluded.deleted,seq=excluded.seq RETURNING id`,
      )
      .get(teamId, channelId, threadTs, ts, userId, revision, text, files, kind, +deleted, seq).id;
    this.db.prepare('DELETE FROM search WHERE rowid=?').run(id);
    if (!deleted)
      this.db.prepare('INSERT INTO search(rowid,terms) VALUES(?,?)').run(
        id,
        terms(
          text +
            ' ' +
            JSON.parse(files)
              .map((f) => f.name || '')
              .join(' '),
        ).join(' '),
      );
    // Each topic stores source references rather than recursively rewriting free-form summaries.
    // On a revision, repair only the old and new buckets of this thread.
    for (const bucket of new Set([prev?.kind, kind].filter(Boolean))) {
      const dest = [teamId, channelId, prev?.threadTs || threadTs, bucket];
      const latest = this.db
        .prepare(
          'SELECT id FROM messages WHERE teamId=? AND channelId=? AND threadTs=? AND kind=? AND deleted=0 ORDER BY revision DESC,seq DESC LIMIT 1',
        )
        .get(...dest);
      if (latest) this.db.prepare('INSERT OR REPLACE INTO topics VALUES(?,?,?,?,?)').run(...dest, latest.id);
      else
        this.db
          .prepare('DELETE FROM topics WHERE teamId=? AND channelId=? AND threadTs=? AND kind=?')
          .run(...dest);
    }
    if ((bot || event.isBot) && !deleted) {
      const b = this.binding({ teamId, channelId, threadTs });
      if (b)
        this.db
          .prepare('INSERT OR IGNORE INTO authored VALUES(?,?,?,?,?)')
          .run(b.backend, b.threadId, teamId, channelId, ts);
    }
    if (prev || deleted) this.scrubIntake(event, { text, files, deleted });
    if (deleted || prev)
      this.db
        .prepare('UPDATE outbox SET text=? WHERE teamId=? AND channelId=? AND slackTs=?')
        .run(text, teamId, channelId, ts);
    return true;
  }
  scrubIntake({ teamId, channelId, ts }, source) {
    const rows = this.db
      .prepare('SELECT eventId,event,state FROM inbox WHERE teamId=? AND channelId=? AND ts=?')
      .all(teamId, channelId, ts);
    const update = this.db.prepare('UPDATE inbox SET event=?,state=? WHERE eventId=?');
    for (const row of rows) {
      const e = JSON.parse(row.event);
      e.text = source.text;
      e.files = JSON.parse(source.files);
      e.deleted = Boolean(source.deleted);
      update.run(JSON.stringify(e), source.deleted ? 'deleted' : row.state, row.eventId);
    }
  }
  setState(eventId, state, { turnId = null, messageId = null, error = null } = {}) {
    if (
      !this.db
        .prepare(
          "UPDATE inbox SET state=?,turnId=coalesce(?,turnId),messageId=coalesce(?,messageId),error=? WHERE eventId=? AND state<>'deleted'",
        )
        .run(state, turnId, messageId, error, eventId).changes
    )
      throw new Error('Unknown receipt');
  }
  receipt(eventId) {
    return receiptRow(this.db.prepare('SELECT * FROM inbox WHERE eventId=?').get(eventId));
  }
  receiptsForTurn(turnId) {
    return this.db.prepare('SELECT * FROM inbox WHERE turnId=? ORDER BY rowid').all(turnId).map(receiptRow);
  }
  pending() {
    return this.db
      .prepare(
        'SELECT * FROM inbox WHERE state NOT IN (' +
          terminalStates.map(() => '?').join(',') +
          ') ORDER BY rowid',
      )
      .all(...terminalStates)
      .map(receiptRow);
  }
  prepareSend(id, scope, text) {
    const key = scopeOf(scope);
    this.db.prepare('INSERT OR IGNORE INTO outbox VALUES(?,?,?,?,?,?,NULL)').run(id, ...key, text, 'pending');
    const row = this.delivery(id);
    if (JSON.stringify(scopeOf(row)) !== JSON.stringify(key))
      throw new Error('Delivery destination mismatch');
    if (row.state === 'pending' && row.text !== text)
      throw new Error('Delivery body differs from persisted intent');
    return row;
  }
  delivery(id) {
    return this.db.prepare('SELECT * FROM outbox WHERE id=?').get(id) ?? null;
  }
  markSending(id) {
    return Boolean(
      this.db.prepare("UPDATE outbox SET state='sending' WHERE id=? AND state='pending'").run(id).changes,
    );
  }
  markSent(id, slackTs) {
    return this.atomic(() => {
      const d = this.delivery(id);
      if (!d || !slackTs || this.fileReceipt(id) || (d.slackTs && d.slackTs !== slackTs))
        throw new Error('Delivery receipt mismatch');
      this.db.prepare("UPDATE outbox SET state='sent',slackTs=? WHERE id=?").run(slackTs, id);
      this.writeMessage({ ...d, ts: slackTs, text: d.text, userId: 'bot', bot: true });
    });
  }
  markUpdated(id, actualText, revisionTs = String(Date.now() / 1000)) {
    return this.atomic(() => {
      const d = this.delivery(id);
      if (!d || d.state !== 'sent' || !d.slackTs) throw new Error('No message receipt to update');
      this.writeMessage({ ...d, ts: d.slackTs, revisionTs, text: actualText, userId: 'bot', bot: true });
    });
  }
  // Unknown delivery stays fenced. Only reset to pending when Slack definitively rejected the write.
  markUnknown(id) {
    return Boolean(
      this.db.prepare("UPDATE outbox SET state='unknown' WHERE id=? AND state='sending'").run(id).changes,
    );
  }
  markRetry(id) {
    return Boolean(
      this.db.prepare("UPDATE outbox SET state='pending' WHERE id=? AND state='sending'").run(id).changes,
    );
  }
  markFileSent(id, fileId) {
    if (!fileId) throw new Error('Missing file receipt');
    return this.atomic(() => {
      const d = this.delivery(id),
        previous = this.fileReceipt(id);
      if (!d || d.slackTs || (previous && previous.fileId !== fileId))
        throw new Error('File receipt mismatch');
      if (
        this.db
          .prepare('SELECT 1 FROM revokedFiles WHERE teamId=? AND channelId=? AND fileId=?')
          .get(d.teamId, d.channelId, fileId)
      )
        throw new Error('File access was revoked');
      this.db
        .prepare('INSERT OR IGNORE INTO fileDeliveries VALUES(?,?,?,?,?)')
        .run(id, ...scopeOf(d), fileId);
      this.db.prepare("UPDATE outbox SET state='sent' WHERE id=?").run(id);
    });
  }
  fileReceipt(id) {
    return this.db.prepare('SELECT * FROM fileDeliveries WHERE id=?').get(id) ?? null;
  }
  expired({ teamId, channelId, ts }) {
    const policy = this.db
      .prepare('SELECT cutoff FROM channelRetention WHERE teamId=? AND channelId=?')
      .get(teamId, channelId);
    return Boolean(policy && rev(ts) < policy.cutoff);
  }
  // Set the earliest source timestamp still readable in this channel. The watermark
  // prevents delayed events from resurrecting expired storage after restart.
  expireBefore(teamId, channelId, cutoffTs) {
    const cutoff = rev(cutoffTs);
    return this.atomic(() => {
      this.db
        .prepare(
          'INSERT INTO channelRetention VALUES(?,?,?) ON CONFLICT(teamId,channelId) DO UPDATE SET cutoff=MAX(cutoff,excluded.cutoff)',
        )
        .run(teamId, channelId, cutoff);
      const old = this.db
        .prepare('SELECT id,ts FROM messages WHERE teamId=? AND channelId=?')
        .all(teamId, channelId);
      let count = 0;
      for (const row of old) {
        if (rev(row.ts) >= cutoff) continue;
        count++;
        this.db.prepare('DELETE FROM search WHERE rowid=?').run(row.id);
        this.db.prepare('DELETE FROM topics WHERE msgId=?').run(row.id);
        this.db.prepare('DELETE FROM messages WHERE id=?').run(row.id);
        this.db
          .prepare('DELETE FROM inbox WHERE teamId=? AND channelId=? AND ts=?')
          .run(teamId, channelId, row.ts);
        this.db
          .prepare('DELETE FROM outbox WHERE teamId=? AND channelId=? AND slackTs=?')
          .run(teamId, channelId, row.ts);
      }
      return count;
    });
  }
  visibleFiles(event) {
    const denied = this.db.prepare('SELECT 1 FROM revokedFiles WHERE teamId=? AND channelId=? AND fileId=?');
    return filesFor(event).filter((f) => f.id && !denied.get(event.teamId, event.channelId, f.id));
  }
  revokeFile(teamId, channelId, fileId) {
    return this.atomic(() => {
      let withdrawn = [{ sort: 'file', source: fileId }];
      this.db
        .prepare(
          'DELETE FROM outbox WHERE id IN (SELECT id FROM fileDeliveries WHERE teamId=? AND channelId=? AND fileId=?)',
        )
        .run(teamId, channelId, fileId);
      this.db
        .prepare('DELETE FROM fileDeliveries WHERE teamId=? AND channelId=? AND fileId=?')
        .run(teamId, channelId, fileId);
      const rows = this.db
        .prepare("SELECT * FROM messages WHERE teamId=? AND channelId=? AND deleted=0 AND files<>'[]'")
        .all(teamId, channelId);
      for (const row of rows) {
        const next = JSON.parse(row.files).filter((f) => f.id !== fileId);
        if (next.length === JSON.parse(row.files).length) continue;
        withdrawn.push({ sort: 'ts', source: row.ts });
        const files = JSON.stringify(next);
        const seq = this.db.prepare('UPDATE sequence SET pos=pos+1 RETURNING pos').get().pos;
        this.db.prepare('UPDATE messages SET files=?,seq=? WHERE id=?').run(files, seq, row.id);
        this.db
          .prepare('UPDATE search SET terms=? WHERE rowid=?')
          .run(terms(row.text + ' ' + next.map((f) => f.name || '').join(' ')).join(' '), row.id);
        this.scrubIntake(row, { text: row.text, files, deleted: false });
      }
      this.db.prepare('INSERT OR IGNORE INTO revokedFiles VALUES(?,?,?)').run(teamId, channelId, fileId);
      return this.retireConsumers(teamId, channelId, withdrawn);
    });
  }
  revokeChannel(teamId, channelId) {
    this.atomic(() => {
      this.db
        .prepare('DELETE FROM search WHERE rowid IN (SELECT id FROM messages WHERE teamId=? AND channelId=?)')
        .run(teamId, channelId);
      this.db
        .prepare(
          'INSERT OR IGNORE INTO revokedSessions SELECT backend,threadId FROM audiences WHERE teamId=? AND channelId=?',
        )
        .run(teamId, channelId);
      for (const table of ['messages', 'inbox', 'outbox', 'bindings', 'topics', 'fileDeliveries'])
        this.db.prepare('DELETE FROM ' + table + ' WHERE teamId=? AND channelId=?').run(teamId, channelId);
    });
  }
  revision() {
    return this.db.prepare('SELECT pos FROM sequence').get().pos;
  }
  threadFiles(scope) {
    const files = new Map();
    for (const row of this.db
      .prepare(
        "SELECT files FROM messages WHERE teamId=? AND channelId=? AND threadTs=? AND deleted=0 AND files<>'[]' ORDER BY seq",
      )
      .iterate(...scopeOf(scope))) {
      for (const file of JSON.parse(row.files)) if (file.id) files.set(file.id, file);
    }
    return [...files.values()];
  }
  // Generate the visible project's, channel's and thread's extractive summaries from pointers
  // maintained on write. A project view is scoped to the recipient's channel.
  digest(scope, { level = 'thread', match = '', limitChars = 3000, onSource } = {}) {
    const [team, channel, thread] = scopeOf(scope);
    const labels = {
      workspace: 'Workspace (visible channel only)',
      project: 'Project (visible channel only)',
      channel: 'Channel topics',
      thread: 'Current thread',
    };
    if (!labels[level]) throw new Error('Unknown digest level');
    const restricted = level === 'thread';
    const rows = this.db
      .prepare(
        `SELECT m.* FROM topics t JOIN messages m ON m.id=t.msgId
      WHERE t.teamId=? AND t.channelId=? ${restricted ? 'AND t.threadTs=?' : ''}
      ORDER BY CASE m.kind WHEN 'decision candidate' THEN 0 WHEN 'commitment' THEN 1 WHEN 'open item' THEN 2 WHEN 'delivered reply' THEN 3 ELSE 4 END,m.seq DESC`,
      )
      .iterate(...(restricted ? [team, channel, thread] : [team, channel]));
    let out =
      labels[level] +
      ' · ' +
      (level === 'project'
        ? this.binding(scope)?.project || channel
        : restricted
          ? thread
          : level === 'workspace'
            ? team
            : channel);
    const notice = '\n[More topics available; narrow the query.]';
    for (const row of rows) {
      if (match && !row.text.toLowerCase().includes(match.toLowerCase())) continue;
      const firstLine = row.text.split(/\r?\n/u)[0];
      const line =
        '\n' +
        JSON.stringify({
          ts: row.ts,
          thread: row.threadTs,
          user: row.userId,
          type: row.kind,
          quote: firstLine,
        });
      if (out.length + line.length + notice.length > limitChars) {
        if (limitChars > out.length + notice.length) onSource?.(row.ts);
        out += line.slice(0, Math.max(0, limitChars - out.length - notice.length)) + notice;
        break;
      }
      onSource?.(row.ts);
      out += line;
    }
    return out;
  }
  retentionWatermark(scope) {
    const [team, channel] = scopeOf(scope);
    return (
      this.db.prepare('SELECT cutoff FROM channelRetention WHERE teamId=? AND channelId=?').get(team, channel)
        ?.cutoff ?? null
    );
  }
  context(scope, query = '', opts = {}) {
    return this.contextPacket(scope, query, opts).text;
  }
  contextPacket(scope, query = '', { maxChars = 12000, after = 0, threadOnly = false } = {}) {
    const sources = new Set();
    if (!Number.isSafeInteger(maxChars) || maxChars < 256)
      throw new Error('Context budget must be at least 256 characters');
    const [team, channel, thread] = scopeOf(scope);
    const pos = this.revision();
    const binding = this.binding(scope);
    const sections = [
      JSON.stringify({
        team,
        channel,
        thread,
        project: binding?.project ?? null,
        through: pos,
        after,
        characterBudget: maxChars,
        coverage: 'observed events only',
        retentionCutoff: this.retentionWatermark(scope),
      }),
    ];
    const seen = new Set();
    let size = sections[0].length,
      full = false;
    if (maxChars >= 1600) {
      const digestBudget = Math.floor(maxChars / 8);
      for (const level of threadOnly ? ['thread'] : ['channel', 'thread']) {
        const section = this.digest(scope, {
          level,
          limitChars: digestBudget,
          onSource: (ts) => sources.add(ts),
        });
        sections.push(section);
        size += section.length + 1;
      }
    }
    const append = (statement, args, label, fields) => {
      const header = '\n' + label;
      if (size + header.length + 100 >= maxChars) {
        full = true;
        return;
      }
      let first = true;
      for (const row of this.db.prepare(statement).iterate(...args)) {
        if (seen.has(row.id)) continue;
        const output = {
          source: row.ts,
          thread: row.threadTs,
          author: row.userId,
          kind: row.kind,
          ...fields(row),
        };
        const line = JSON.stringify(output),
          available = maxChars - size - (first ? header.length + 2 : 1) - 90;
        if (available < 80) {
          full = true;
          break;
        }
        if (first) {
          sections.push(header);
          size += header.length + 1;
          first = false;
        }
        sources.add(row.ts);
        if (line.length > available) {
          sections.push(line.slice(0, available) + '…');
          size += available + 2;
          full = true;
          break;
        }
        sections.push(line);
        size += line.length + 1;
        seen.add(row.id);
      }
    };
    const queryTokens = terms(query);
    const channelWhere = 'm.teamId=? AND m.channelId=? AND m.deleted=0';
    const where = threadOnly ? channelWhere + ' AND m.threadTs=?' : channelWhere;
    const whereArgs = threadOnly ? [team, channel, thread] : [team, channel];
    // Allocate space first to the latest relevant direct quote, then decisions and commitments,
    // then extractive summaries and recent discussion. Source timestamps allow exact follow-up.
    if (queryTokens.length)
      append(
        'SELECT m.* FROM search JOIN messages m ON m.id=search.rowid WHERE search MATCH ? AND ' +
          where +
          ' ORDER BY rank, m.seq DESC',
        [queryTokens.map((x) => '"' + x.replaceAll('"', '""') + '"').join(' OR '), ...whereArgs],
        'Search evidence',
        (r) => ({ quote: r.text, files: JSON.parse(r.files).map(({ id, name }) => ({ id, name })) }),
      );
    append(
      'SELECT m.* FROM messages m WHERE ' +
        where +
        " AND m.kind IN ('commitment','decision candidate','open item') AND (m.seq>? OR m.threadTs=?) ORDER BY (m.threadTs=?) DESC,m.seq DESC",
      [...whereArgs, after, thread, thread],
      'Decisions, proposals and open commitments (quoted claims)',
      (r) => ({ quote: r.text }),
    );
    append(
      'SELECT m.* FROM messages m WHERE ' + channelWhere + ' AND m.threadTs=? AND m.seq>? ORDER BY m.seq DESC',
      [team, channel, thread, after],
      'Thread changes',
      (r) => ({ quote: r.text, files: JSON.parse(r.files).map(({ id, name }) => ({ id, name })) }),
    );
    if (!threadOnly)
      append(
        'SELECT m.* FROM messages m WHERE ' + channelWhere + ' AND m.seq>? ORDER BY m.seq DESC',
        [team, channel, after],
        'Channel topic digest',
        (r) => ({ excerpt: r.text.split(/\r?\n/u)[0], files: JSON.parse(r.files).map((x) => x.name) }),
      );
    if (full) sections.push('[Context budget reached; additional evidence remains in the store.]');
    return { text: sections.join('\n'), through: pos, sourceTs: [...sources] };
  }
  consumed(scope, threadId) {
    const b = this.binding(scope);
    if (!b || b.threadId !== threadId) return 0;
    return (
      this.db.prepare('SELECT pos FROM cursors WHERE backend=? AND threadId=?').get(b.backend, threadId)
        ?.pos ?? 0
    );
  }
  markConsumed(scope, threadId, throughSeq, { sourceTs = [], fileIds = [] } = {}) {
    if (!Number.isSafeInteger(throughSeq) || throughSeq < 0) throw new Error('Invalid context cursor');
    return this.atomic(() => {
      const b = this.binding(scope);
      if (!b || b.threadId !== threadId) throw new Error('Binding changed while preparing context');
      const insert = this.db.prepare('INSERT OR IGNORE INTO consumedSources VALUES(?,?,?,?,?,?)');
      for (const ts of new Set(sourceTs)) {
        const msg = this.source(scope, ts);
        if (!msg || msg.seq > throughSeq) throw new Error('Source changed while preparing context');
        insert.run(b.backend, threadId, b.teamId, b.channelId, 'ts', ts);
      }
      for (const fileId of new Set(fileIds)) {
        if (
          this.db
            .prepare('SELECT 1 FROM revokedFiles WHERE teamId=? AND channelId=? AND fileId=?')
            .get(b.teamId, b.channelId, fileId)
        )
          throw new Error('File access was revoked');
        insert.run(b.backend, threadId, b.teamId, b.channelId, 'file', fileId);
      }
      this.db
        .prepare(
          'INSERT INTO cursors VALUES(?,?,?) ON CONFLICT(backend,threadId) DO UPDATE SET pos=max(pos,excluded.pos)',
        )
        .run(b.backend, threadId, throughSeq);
    });
  }
  affectedBindings({ teamId, channelId, ts, fileId }) {
    if (!teamId || !channelId || !(ts || fileId)) return [];
    return this.db
      .prepare(
        `SELECT DISTINCT b.* FROM consumedSources d JOIN bindings b ON
      b.backend=d.backend AND b.threadId=d.threadId AND b.teamId=d.teamId AND b.channelId=d.channelId
      WHERE d.teamId=? AND d.channelId=? AND ((d.sort='file' AND d.source=?) OR (d.sort='ts' AND d.source=?))`,
      )
      .all(teamId, channelId, fileId ?? null, ts ?? null);
  }
  // Withdraw derived assistant quotations too. A different Slack thread can have
  // consumed a bot answer that quoted the deleted source, so follow that dependency.
  retireConsumers(teamId, channelId, withdrawn) {
    const queue = [...withdrawn],
      retired = new Set(),
      affected = [];
    while (queue.length) {
      const { sort, source } = queue.pop();
      const sessions = this.db
        .prepare(
          'SELECT backend,threadId FROM consumedSources WHERE teamId=? AND channelId=? AND sort=? AND source=?',
        )
        .all(teamId, channelId, sort, source);
      for (const { backend, threadId } of sessions) {
        const key = JSON.stringify([backend, threadId]);
        if (retired.has(key)) continue;
        retired.add(key);
        this.db.prepare('INSERT OR IGNORE INTO revokedSessions VALUES(?,?)').run(backend, threadId);
        const b = this.db
          .prepare('SELECT * FROM bindings WHERE backend=? AND threadId=?')
          .get(backend, threadId);
        if (b) {
          affected.push(b);
          this.unbind(b);
        }
        const replies = this.db
          .prepare(
            'SELECT m.* FROM authored a JOIN messages m USING(teamId,channelId,ts) WHERE a.backend=? AND a.threadId=? AND m.deleted=0',
          )
          .all(backend, threadId);
        for (const reply of replies) {
          this.writeMessage({ ...reply, text: '', files: [], deleted: true });
          queue.push({ sort: 'ts', source: reply.ts });
        }
      }
    }
    return affected;
  }
  editSource(event) {
    return this.atomic(() => {
      const old = this.source(event, event.ts);
      if (
        !this.writeMessage(event) ||
        !old ||
        (old.text === event.text && old.files === JSON.stringify(this.visibleFiles(event)))
      )
        return [];
      return this.retireConsumers(event.teamId, event.channelId, [{ sort: 'ts', source: event.ts }]);
    });
  }
  revokeMessage(event) {
    return this.atomic(() => {
      if (!this.writeMessage({ ...event, deleted: true })) return [];
      return this.retireConsumers(event.teamId, event.channelId, [{ sort: 'ts', source: event.ts }]);
    });
  }
  // Exact citation lookup; the caller must always pass the authorized destination scope.
  source(scope, ts) {
    const [team, channel] = scopeOf(scope);
    return (
      this.db
        .prepare('SELECT * FROM messages WHERE teamId=? AND channelId=? AND ts=? AND deleted=0')
        .get(team, channel, ts) ?? null
    );
  }
}
