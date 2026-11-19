function micros(ts) {
  if (typeof ts !== 'string' || !/^\d+(?:\.\d{1,6})?$/.test(ts))
    throw new Error('Invalid Slack history timestamp');
  const [seconds, fraction = ''] = ts.split('.');
  return BigInt(seconds) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
}

function timestamp(value) {
  return String(value / 1_000_000n) + '.' + String(value % 1_000_000n).padStart(6, '0');
}

async function* pages(slack, { threadTs, oldest, latest, signal }) {
  let cursor;
  const cursors = new Set();
  while (oldest <= latest) {
    signal.throwIfAborted();
    const page = await slack.readHistory({
      threadTs,
      oldest: timestamp(oldest),
      latest: timestamp(latest),
      cursor,
      signal,
    });
    signal.throwIfAborted();
    if (page?.ok === false || !Array.isArray(page?.messages)) throw new Error('Invalid Slack history page');
    const messages = page.messages.filter((message) => {
      const at = micros(message.ts);
      return at >= oldest && at <= latest;
    });
    yield messages;
    const next = page.response_metadata?.next_cursor;
    if (next) {
      if (typeof next !== 'string' || cursors.has(next))
        throw new Error('Slack history cursor did not advance');
      cursors.add(next);
      cursor = next;
    } else if (page.has_more) {
      if (!messages.length) throw new Error('Slack history time range did not advance');
      // Slack also paginates by time. History is newest first and replies oldest first.
      const edge = micros(messages.at(-1).ts);
      if (threadTs) oldest = edge + 1n;
      else latest = edge - 1n;
      if (oldest > latest) throw new Error('Slack history time range did not advance');
      cursor = undefined;
      cursors.clear();
    } else {
      return;
    }
  }
}

const fileIds = (files) =>
  files
    .map((file) => file.id)
    .sort()
    .join(',');

export function createCatchup({ slack, store, onEvent, report = () => {}, now = Date.now }) {
  const db = store.db;
  db.exec(`CREATE TABLE IF NOT EXISTS slackHistory(
    teamId TEXT, channelId TEXT, since TEXT NOT NULL, through TEXT, PRIMARY KEY(teamId,channelId)
  )`);
  const getCheckpoint = db.prepare('SELECT since,through FROM slackHistory WHERE teamId=? AND channelId=?');
  const setStart = db.prepare('INSERT INTO slackHistory(teamId,channelId,since) VALUES(?,?,?)');
  const setThrough = db.prepare('UPDATE slackHistory SET through=? WHERE teamId=? AND channelId=?');
  const sources = db.prepare('SELECT * FROM messages WHERE teamId=? AND channelId=? AND deleted=0');
  const priorThreadText = db.prepare(`
    SELECT userId,ts,text FROM messages WHERE teamId=? AND channelId=? AND threadTs=?
      AND deleted=0 AND text<>'' AND ts<? ORDER BY (ts=?) DESC, ts DESC
  `);
  const filesUsed = db.prepare(`SELECT DISTINCT d.source AS id FROM consumedSources d JOIN bindings b
    ON d.backend=b.backend AND d.threadId=b.threadId
    WHERE d.teamId=? AND d.channelId=? AND d.sort='file'`);
  let batch;

  async function reconcile(scope, signal, enrolledAt) {
    if (!scope) return;
    const key = [scope.teamId, scope.channelId];
    const upper = BigInt(now()) * 1000n;
    const cached = sources.all(...key).filter((row) => micros(row.ts) <= upper);
    let checkpoint = getCheckpoint.get(...key);
    if (!checkpoint) {
      let earliest = enrolledAt ? micros(enrolledAt) : upper;
      for (const row of cached) if (micros(row.ts) < earliest) earliest = micros(row.ts);
      checkpoint = { since: timestamp(earliest), through: null };
      setStart.run(...key, checkpoint.since);
      if (earliest === upper && !cached.length) {
        setThrough.run(checkpoint.since, ...key);
        return;
      }
    }
    if (checkpoint.through && micros(checkpoint.through) > upper)
      throw new Error('Slack history clock moved backwards');
    let lower = micros(checkpoint.since);
    const retention = store.retentionWatermark({ ...scope, threadTs: checkpoint.since });
    if (retention && micros(retention) > lower) lower = micros(retention);
    const previous = new Map(cached.map((row) => [row.ts, row]));
    const seen = new Set();
    const members = new Map();
    const threads = new Set(cached.filter((row) => row.ts !== row.threadTs).map((row) => row.threadTs));
    const events = new Map();

    async function observe(raw) {
      const event = await slack.historyEvent(raw, members, signal);
      signal.throwIfAborted();
      if (!event) return;
      event.files = store.visibleFiles(event);
      seen.add(event.ts);
      const old = previous.get(event.ts);
      const received =
        event.isBot &&
        event.deliveryKey &&
        ['sending', 'unknown'].includes(store.delivery(event.deliveryKey)?.state);
      const differs =
        old && (old.text !== event.text || fileIds(JSON.parse(old.files)) !== fileIds(event.files));
      const revision = micros(event.revision);
      const previousRevision = old && micros(old.revision);
      if (!old || received || revision > previousRevision) {
        if (differs) event.kind = 'edit';
        const existing = events.get(event.ts);
        if (!existing || revision >= micros(existing.revision)) events.set(event.ts, event);
      } else if (revision === previousRevision) {
        // Local delivery records can have the same timestamp as their Slack echo.
        // A different body at the same source revision is unsafe to use.
        if (differs) seen.delete(event.ts);
      } else if (differs) {
        throw new Error('Slack history returned an older source revision');
      }
    }

    for await (const messages of pages(slack, { oldest: lower, latest: upper, signal })) {
      for (const raw of messages) {
        if (raw.type === 'message' && (raw.reply_count > 0 || raw.thread_ts))
          threads.add(raw.thread_ts || raw.ts);
        await observe(raw);
      }
    }
    for (const threadTs of threads) {
      for await (const messages of pages(slack, { threadTs, oldest: lower, latest: upper, signal })) {
        for (const raw of messages) {
          if ((raw.thread_ts || raw.ts) !== threadTs)
            throw new Error('Slack history returned a different thread');
          // The channel-level copy already establishes the root source.
          if (raw.ts !== threadTs) await observe(raw);
        }
      }
    }
    signal.throwIfAborted();
    const refs = new Map(filesUsed.all(...key).map((file) => [file.id, file]));
    for (const row of cached) for (const file of JSON.parse(row.files)) refs.set(file.id, file);
    const files = await slack.hydrateFiles([...refs.values()], signal);
    await slack.verifyHistoryChannel(signal);
    signal.throwIfAborted();

    for (const row of cached) {
      if (seen.has(row.ts)) continue;
      events.set(row.ts, {
        ...scope,
        threadTs: row.threadTs,
        ts: row.ts,
        kind: 'delete',
        text: '',
        files: [],
        id: 'history/delete/' + scope.teamId + '/' + scope.channelId + '/' + row.ts,
        revision: timestamp(upper),
        userId: row.userId,
        isBot: false,
      });
    }
    const ordered = [...events.values()].sort((a, b) => Number(micros(a.ts) - micros(b.ts)));
    for (const event of ordered) {
      signal.throwIfAborted();
      await onEvent(event);
    }
    for (const file of files) {
      if (!file.error) continue;
      signal.throwIfAborted();
      await onEvent({
        ...scope,
        id: 'history/file/' + scope.teamId + '/' + scope.channelId + '/' + file.id,
        kind: 'file_revoke',
        fileId: file.id,
      });
    }
    signal.throwIfAborted();
    setThrough.run(timestamp(upper), ...key);
  }

  function setOnline(online, enrolledAt) {
    batch?.controller.abort(new Error('Slack history connection changed'));
    batch = undefined;
    if (!online) return;
    const controller = new AbortController();
    const { signal } = controller;
    const disconnected = new Promise((_, reject) =>
      signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
    );
    const attempt = { controller };
    batch = attempt;
    attempt.job = Promise.race([reconcile(slack.historyScope(), signal, enrolledAt), disconnected]).catch(
      (error) => {
        if (!signal.aborted) {
          attempt.retryAt = now() + 15000;
          report(error);
        }
        throw error;
      },
    );
    void attempt.job.catch(() => {});
  }

  async function ready() {
    if (!batch) throw new Error('Slack history is offline');
    if (batch.retryAt && now() >= batch.retryAt) setOnline(true);
    const attempt = batch;
    await attempt.job;
    if (attempt !== batch) throw new Error('Slack history connection changed');
  }

  return {
    setOnline,
    ready,
    async revalidate(scope) {
      await ready();
      const bound = slack.historyScope();
      if (scope.teamId !== bound?.teamId || scope.channelId !== bound.channelId)
        throw new Error('Slack history scope mismatch');
    },
    threadContext(scope, maxChars = 12000) {
      const { teamId, channelId, threadTs, ts } = scope;
      const bound = slack.historyScope();
      if (teamId !== bound?.teamId || channelId !== bound.channelId)
        throw new Error('Slack history scope mismatch');
      const notice = '\n[More context in the original Slack thread.]';
      let text = '';
      for (const row of priorThreadText.iterate(teamId, channelId, threadTs, ts, threadTs)) {
        const line = (text ? '\n' : '') + JSON.stringify({ author: row.userId, message: row.ts, quote: row.text });
        if (text.length + line.length > maxChars)
          return (text + line).slice(0, Math.max(0, maxChars - notice.length)) + notice.slice(0, maxChars);
        text += line;
      }
      return text;
    },
  };
}
