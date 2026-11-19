import { createReadStream } from 'node:fs';
import { basename } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import bolt from '@slack/bolt';
import { publicReplyText, slackMessage, slackOriginalText, slackTextLength } from './slack-format.js';

// Slack recommends 4,000 characters per chat.postMessage. Preserve the rest as
// additional messages, keeping whole Unicode code points and escaped entities.
export function splitSlackText(text) {
  const parts = [];
  let part = '', length = 0;
  for (const point of publicReplyText(text)) {
    const width = slackTextLength(point);
    if (length + width > 4000) {
      parts.push(part);
      part = '';
      length = 0;
    }
    part += point;
    length += width;
  }
  if (part) parts.push(part);
  return parts;
}

function internalMember(user, userId, teamId) {
  return (
    user?.id === userId &&
    user.team_id === teamId &&
    user.is_bot === false &&
    user.deleted === false &&
    !user.is_stranger &&
    user.is_restricted === false &&
    user.is_ultra_restricted === false
  );
}

function cleanMention(text, botUser) {
  // Only remove the address; preserve @mentions of other people in the prompt.
  return text.replace(new RegExp('<@' + botUser + '(?:\\|[^>]+)?>', 'g'), '').trim();
}

function fileReference(f) {
  // Keep Slack's ID for a fresh access check at download time.
  const {
    id,
    name,
    title,
    mimetype,
    size,
    url_private,
    url_private_download,
    updated,
    timestamp,
    file_access,
  } = f;
  return {
    id,
    name,
    title,
    mimetype,
    size,
    url_private,
    url_private_download,
    updated,
    timestamp,
    file_access,
  };
}

const messageSubtypes = ['file_share', 'bot_message', 'thread_broadcast', 'me_message'];
const connectionCode = /^(connect|连接)\s+\S+$/iu;
const channelPattern = /^[CG][A-Z0-9]+$/;
const timestampPattern = /^\d+\.\d{6}$/;

function channelAddress(target, teamId, workspaceOrigin) {
  if (channelPattern.test(target)) return { id: target };
  if (/^#?[a-z0-9_-]+$/.test(target)) return { name: target.replace(/^#/, '') };
  const url = URL.parse(target);
  if (url?.protocol !== 'https:' || url.username || url.password || url.hash) return null;
  if (url.origin === 'https://app.slack.com' && url.pathname.startsWith('/client/')) {
    const parts = /^\/client\/(T[A-Z0-9]+)\/([CG][A-Z0-9]+)\/?$/.exec(url.pathname);
    return !url.search && parts?.[1] === teamId ? { id: parts[2] } : null;
  }
  if (url.origin !== workspaceOrigin && url.origin !== 'https://app.slack.com') return null;
  const parts = /^\/archives\/([CG][A-Z0-9]+)(?:\/p(\d+)(\d{6}))?\/?$/.exec(url.pathname);
  if (!parts) return null;
  const [, id, seconds, fraction] = parts;
  if (!seconds) return url.search ? null : { id };
  const messageTs = seconds + '.' + fraction;
  const rootTs = url.searchParams.get('thread_ts') ?? messageTs;
  const cid = url.searchParams.get('cid');
  if (
    [...url.searchParams.keys()].some((key) => key !== 'thread_ts' && key !== 'cid') ||
    url.searchParams.getAll('thread_ts').length > 1 ||
    url.searchParams.getAll('cid').length > 1 ||
    (cid !== null && cid !== id) ||
    !timestampPattern.test(rootTs) ||
    BigInt(rootTs.replace('.', '')) > BigInt(messageTs.replace('.', ''))
  )
    return null;
  return { id, messageTs, threadTs: rootTs };
}

export function createSlack({
  botToken,
  appToken,
  teamId,
  channelId,
  channelIds = [],
  ownerId,
  resolveChannel,
  onEvent,
  onConnection,
  client,
  receiver,
}) {
  const channels = new Set(channelId ? [channelId, ...channelIds] : channelIds);
  channelId ||= channels.values().next().value;
  const revoked = new Set();
  if (
    !/^T[A-Z0-9]+$/.test(teamId) ||
    [...channels].some((id) => typeof id !== 'string' || !channelPattern.test(id))
  ) {
    throw new Error('Invalid Slack workspace or channel ID');
  }
  if (!channels.size && (!ownerId || typeof resolveChannel !== 'function')) {
    throw new Error('A channel ID or owner enrollment handler is required');
  }
  if (typeof onEvent !== 'function') throw new Error('Missing onEvent handler');
  // Ambiguous network errors on a write must be reconciled by the outbox.
  // Handle only explicit 429s automatically; they were rejected before execution.
  client ??= new bolt.webApi.WebClient(botToken, {
    retryConfig: { retries: 0 },
    rejectRateLimitedCalls: true,
    timeout: 15000,
  });
  receiver ??= new bolt.SocketModeReceiver({
    appToken,
    processEventErrorHandler: async ({ error }) => {
      console.error('Slack envelope awaits retry:', error?.data?.error || error?.code || error?.name);
      return false;
    },
  });
  let botUser, botId, workspaceOrigin;
  const registered = (id) => Boolean(botUser && channels.has(id) && !revoked.has(id));
  async function call(request, signal) {
    for (;;) {
      signal?.throwIfAborted();
      try {
        const response = await request();
        signal?.throwIfAborted();
        return response;
      } catch (error) {
        if (error.code !== 'slack_webapi_rate_limited_error' || !Number.isFinite(error.retryAfter))
          throw error;
        await delay(Math.max(1, error.retryAfter) * 1000, undefined, { signal });
      }
    }
  }
  async function safeChannel(id, signal) {
    if (!botUser || revoked.has(id)) return false;
    let channel;
    try {
      const response = await call(() => client.conversations.info({ channel: id }), signal);
      if (response && response.ok !== false) ({ channel } = response);
    } catch (error) {
      if (!['channel_not_found', 'not_in_channel'].includes(error.data?.error)) throw error;
    }
    let safe =
      channel?.id === id &&
      (channel.is_channel === true || channel.is_group === true) &&
      (!channel.context_team_id || channel.context_team_id === teamId) &&
      !channel.is_im &&
      !channel.is_mpim &&
      channel.is_member !== false &&
      !channel.is_archived &&
      channel.is_ext_shared === false &&
      !channel.is_shared &&
      !channel.is_org_shared &&
      !channel.is_pending_ext_shared &&
      !channel.pending_shared?.length &&
      !channel.pending_connected_team_ids?.length &&
      !(channel.shared_team_ids || []).some((t) => t !== teamId);
    // conversations.info may omit is_member. Follow every cursor until the bot
    // is found, since public channel metadata alone does not prove membership.
    if (safe && channel.is_member !== true) {
      let cursor;
      const cursors = new Set();
      safe = false;
      do {
        const page = await call(
          () => client.conversations.members({ channel: id, cursor, limit: 200 }),
          signal,
        );
        if (page.ok === false) break;
        if (page.members?.includes(botUser)) {
          safe = true;
          break;
        }
        cursor = page.response_metadata?.next_cursor;
        if (cursor && cursors.has(cursor)) throw new Error('Slack membership lookup cursor did not advance');
        cursors.add(cursor);
      } while (cursor);
    }
    if (!safe && registered(id)) {
      revoked.add(id);
      try {
        await onEvent({ kind: 'revoke', id: 'revoke/' + teamId + '/' + id, teamId, channelId: id });
      } catch (error) {
        revoked.delete(id);
        throw error;
      }
    }
    return safe && !revoked.has(id);
  }
  async function deliveryChannel(signal, id = channelId) {
    if (!registered(id) || !(await safeChannel(id, signal)))
      throw new Error('Slack channel unavailable or shared');
    return id;
  }
  async function findChannel(name) {
    const ids = new Set();
    const cursors = new Set();
    let cursor;
    do {
      const page = await call(() =>
        client.conversations.list({
          types: 'public_channel,private_channel',
          exclude_archived: true,
          team_id: teamId,
          limit: 200,
          cursor,
        }),
      );
      if (page?.ok === false || !Array.isArray(page?.channels))
        throw new Error('Slack channel lookup failed');
      for (const channel of page.channels) {
        if (channel.name === name && channelPattern.test(channel.id)) ids.add(channel.id);
      }
      cursor = page.response_metadata?.next_cursor;
      if (cursor && cursors.has(cursor)) throw new Error('Slack channel lookup cursor did not advance');
      cursors.add(cursor);
    } while (cursor);
    if (ids.size !== 1) throw new Error('Slack channel name is missing or ambiguous');
    return ids.values().next().value;
  }
  function rootPermalink(id, ts) {
    return workspaceOrigin + '/archives/' + id + '/p' + ts.replace('.', '');
  }
  async function resolveLinkTarget(target) {
    if (!botUser) throw new Error('Slack bot is not authenticated');
    const address = typeof target === 'string' && channelAddress(target.trim(), teamId, workspaceOrigin);
    if (!address) throw new Error('Invalid Slack channel or message address');
    const id = address.id ?? (await findChannel(address.name));
    if (!(await safeChannel(id))) throw new Error('Slack channel unavailable or shared');
    const scope = { teamId, channelId: id };
    if (!address.threadTs) return scope;
    if (!workspaceOrigin) throw new Error('Slack workspace URL unavailable');
    const { messageTs, threadTs } = address;
    const history = await call(() =>
      client.conversations.history({
        channel: id,
        oldest: threadTs,
        latest: threadTs,
        inclusive: true,
        limit: 1,
      }),
    );
    const root = history?.messages?.[0];
    if (
      history?.ok === false ||
      root?.type !== 'message' ||
      root.ts !== threadTs ||
      root.hidden ||
      (root.subtype && !messageSubtypes.includes(root.subtype)) ||
      (root.thread_ts && root.thread_ts !== threadTs) ||
      (root.channel && root.channel !== id)
    ) {
      throw new Error('Slack thread root unavailable');
    }
    if (messageTs !== threadTs) {
      const replies = await call(() =>
        client.conversations.replies({
          channel: id,
          ts: threadTs,
          oldest: messageTs,
          latest: messageTs,
          inclusive: true,
          limit: 1,
        }),
      );
      if (
        replies?.ok === false ||
        !replies?.messages?.some(
          (message) =>
            message.type === 'message' &&
            !message.hidden &&
            message.ts === messageTs &&
            message.thread_ts === threadTs &&
            (!message.channel || message.channel === id),
        )
      )
        throw new Error('Slack reply does not belong to the thread');
    }
    return { ...scope, threadTs, permalink: rootPermalink(id, threadTs) };
  }
  function isOwn(message) {
    return Boolean((botUser && message.user === botUser) || (botId && message.bot_id === botId));
  }
  async function authorizedAuthor(message, members, signal) {
    if (isOwn(message)) return true;
    if (
      !message.user ||
      message.bot_id ||
      message.app_id ||
      (message.user_team && message.user_team !== teamId)
    )
      return false;
    if (members?.has(message.user)) return members.get(message.user);
    let user;
    try {
      ({ user } = await call(() => client.users.info({ user: message.user }), signal));
    } catch (error) {
      if (error.data?.error !== 'user_not_found') throw error;
    }
    const authorized = internalMember(user, message.user, teamId);
    members?.set(message.user, authorized);
    return authorized;
  }
  function normalize(message, { id, kind, ts, revision, channel, receivedAt }) {
    const isBot = isOwn(message);
    return {
      id,
      receivedAt,
      teamId,
      channelId: channel,
      threadTs: message.thread_ts || ts,
      ts,
      kind,
      revision,
      isBot,
      mentioned: new RegExp('<@' + botUser + '(?:\\|[^>]+)?>').test(message.text ?? ''),
      userId: message.user || '',
      text: kind === 'delete' ? '' : isBot ? slackOriginalText(message) : cleanMention(message.text || '', botUser),
      files: kind === 'delete' ? [] : (message.files || []).filter((f) => f.id).map(fileReference),
      clientMsgId: message.client_msg_id || null,
      deliveryKey:
        message.metadata?.event_type === 'bridge_reply' ? message.metadata.event_payload?.key : null,
    };
  }
  async function hydrateFiles(refs, signal, id) {
    if (!refs.length) return [];
    const channel = await deliveryChannel(signal, id);
    const files = [];
    for (const ref of refs) {
      let file;
      try {
        if (typeof ref.id === 'string' && /^F[A-Z0-9]+$/.test(ref.id)) {
          ({ file } = await call(() => client.files.info({ file: ref.id }), signal));
        }
      } catch (error) {
        if (!['file_not_found', 'access_denied', 'not_allowed_token_type'].includes(error.data?.error))
          throw error;
      }
      const visible =
        file?.id === ref.id &&
        (file?.channels?.includes(channel) ||
          file?.groups?.includes(channel) ||
          Boolean(file?.shares?.public?.[channel]?.length) ||
          Boolean(file?.shares?.private?.[channel]?.length));
      files.push(visible ? fileReference(file) : { id: ref.id, error: 'file_unavailable_in_channel' });
    }
    return files;
  }
  async function consume(body) {
    const receivedAt = Date.now();
    if (body.type === 'app_rate_limited' && body.team_id === teamId) onConnection?.(true);
    if (body.type !== 'event_callback' || body.team_id !== teamId || !body.event_id) return;
    const e = body.event;
    if (!e) return;
    if (e.type === 'file_deleted' || e.type === 'file_unshared') {
      if (!e.file_id) return;
      const affected = e.channel_id ? [e.channel_id] : [...channels];
      await Promise.all(
        affected.filter(registered).map(async (id) => {
          // Slack sometimes omits channel_id on file_unshared. Check whether the
          // file remains shared here before withdrawing the channel's reference.
          if (
            e.type === 'file_unshared' &&
            !e.channel_id &&
            !(await hydrateFiles([{ id: e.file_id }], undefined, id))[0].error
          )
            return;
          await onEvent({
            kind: 'file_revoke',
            id: body.event_id + '/' + id,
            teamId,
            channelId: id,
            fileId: e.file_id,
            isBot: false,
            revision: e.event_ts,
            ts: e.event_ts,
            threadTs: e.event_ts,
            text: '',
            files: [],
          });
        }),
      );
      return;
    }
    if (e.type !== 'message' && e.type !== 'app_mention') return;
    const enrolling = channels.size === 0;
    if (
      !channelPattern.test(e.channel) ||
      (!enrolling && !registered(e.channel)) ||
      (e.user_team && e.user_team !== teamId)
    )
      return;
    const isDelete = e.subtype === 'message_deleted';
    const isEdit = e.subtype === 'message_changed';
    if (e.subtype && !isDelete && !isEdit && !messageSubtypes.includes(e.subtype)) return;
    const m = isEdit ? e.message : isDelete ? e.previous_message || {} : e;
    if (!m) return;
    const ts = isDelete ? e.deleted_ts : m.ts;
    if (!ts) return;
    const own = isOwn(m);
    if (own && e.type === 'app_mention') return;
    const kind = isDelete
      ? 'delete'
      : isEdit
        ? 'edit'
        : e.type === 'app_mention' && !own
          ? 'mention'
          : 'message';
    const text = own ? m.text || '' : cleanMention(m.text || '', botUser);
    if (enrolling && !(kind === 'mention' && m.user === ownerId && connectionCode.test(text))) return;
    // A tombstone grants no read or execute capability. Apply it even when the
    // original author has been removed, or Slack omits the original message.
    if (!isDelete) {
      const [channelOK, authorOK] = await Promise.all([safeChannel(e.channel), authorizedAuthor(m)]);
      if (!channelOK || !authorOK) return;
    }
    const normalized = normalize(m, {
      id: body.event_id,
      kind,
      ts,
      channel: e.channel,
      receivedAt,
      revision: isDelete || isEdit ? (m.edited?.ts && !isDelete ? m.edited.ts : e.event_ts || ts) : ts,
    });
    if (enrolling) {
      if (channels.size || !(await resolveChannel(teamId, e.channel, m.user, text)) || channels.size) return;
      channelId = e.channel;
      channels.add(channelId);
      Object.assign(normalized, { kind: 'enroll', text: '', files: [] });
      onConnection?.(true, ts, channelId);
    }
    if (!registered(e.channel)) return;
    if (m.user === ownerId && /^\s*(?:<@[^>]+>\s*)?(connect|连接)\s+\S+\s*$/iu.test(normalized.text)) return;
    await onEvent(normalized);
  }
  receiver.init({
    async processEvent(envelope) {
      await consume(envelope.body);
      await envelope.ack();
    },
  });
  const socket = receiver.client;
  if (onConnection && socket?.on) {
    socket.on('connected', () => onConnection(true));
    socket.on('reconnecting', () => onConnection(false));
    socket.on('disconnected', () => onConnection(false));
    socket.on('close', (connection) => {
      if (!connection || connection === socket.websocket) onConnection(false);
    });
  }
  function historyScope(id = channelId) {
    return registered(id) ? { teamId, channelId: id } : null;
  }
  async function readHistory({ threadTs, oldest, latest, cursor, signal }, id) {
    const channel = await deliveryChannel(signal, id);
    const args = { channel, oldest, latest, cursor, inclusive: true, include_all_metadata: true };
    if (!threadTs) return call(() => client.conversations.history(args), signal);
    try {
      return await call(() => client.conversations.replies({ ...args, ts: threadTs }), signal);
    } catch (error) {
      if (error.data?.error !== 'thread_not_found') throw error;
      return { messages: [], has_more: false };
    }
  }
  async function historyEvent(message, members, signal, id = channelId) {
    if (
      !registered(id) ||
      (message.channel && message.channel !== id) ||
      message.type !== 'message' ||
      message.hidden ||
      (message.subtype && !messageSubtypes.includes(message.subtype)) ||
      !(await authorizedAuthor(message, members, signal)) ||
      !registered(id)
    )
      return null;
    const ts = message.ts,
      revision = message.edited?.ts || ts;
    const event = normalize(message, {
      id: 'history/' + teamId + '/' + id + '/' + ts + '/' + revision,
      kind: 'message',
      ts,
      revision,
      channel: id,
    });
    if (!event.isBot && connectionCode.test(event.text)) return null;
    if (!event.isBot && /^(bind|绑定)\s+\S+$/iu.test(event.text)) {
      if (event.userId !== ownerId) return null;
      event.text = '[bind]';
    }
    return event;
  }
  async function postMessage(channel, threadTs, text, deliveryKey, authorize) {
    const args = {
      channel,
      ...slackMessage(text, deliveryKey),
      mrkdwn: false,
      unfurl_links: false,
      unfurl_media: false,
    };
    if (threadTs) args.thread_ts = threadTs;
    const response = await call(() => {
      authorize?.();
      return client.chat.postMessage(args);
    });
    if (response?.ok === false || !response?.ts || response.channel !== channel)
      throw new Error('Slack delivery receipt missing');
    return response.ts;
  }
  async function post(threadTs, text, deliveryKey, id, authorize) {
    if (!threadTs || !text || Array.from(text).length > 4000)
      throw new Error('Invalid Slack post; use splitSlackText for long messages');
    const channel = await deliveryChannel(undefined, id);
    return postMessage(channel, threadTs, text, deliveryKey, authorize);
  }
  async function update(ts, text, id, authorize) {
    if (!ts || !text || Array.from(text).length > 4000) throw new Error('Invalid Slack update');
    const channel = await deliveryChannel(undefined, id);
    const result = await call(() => {
      authorize?.();
      return client.chat.update({ channel, ts, ...slackMessage(text) });
    });
    if (!result.ts) throw new Error('Slack update receipt missing');
    return result.ts;
  }
  async function upload(threadTs, path, title, id, authorize) {
    if (!threadTs) throw new Error('Upload requires a Slack thread');
    const channel = await deliveryChannel(undefined, id);
    authorize?.();
    const res = await client.filesUploadV2({
      channel_id: channel,
      thread_ts: threadTs,
      file: typeof path === "string" ? createReadStream(path) : path.bytes,
      filename: typeof path === "string" ? basename(path) : path.filename,
      title: title || basename(path),
    });
    const fileId = res.files?.[0]?.files?.[0]?.id || res.files?.[0]?.id;
    if (res.ok === false || !fileId) throw new Error('Slack upload receipt missing');
    return fileId;
  }
  return {
    async start() {
      const auth = await call(() => client.auth.test());
      if (auth.ok === false || auth.team_id !== teamId || !auth.user_id || !auth.bot_id) {
        throw new Error('Slack bot identity does not match configured workspace');
      }
      botUser = auth.user_id;
      botId = auth.bot_id;
      const origin = typeof auth.url === 'string' && URL.parse(auth.url)?.origin;
      if (origin && /^https:\/\/[a-z0-9-]+(?:\.enterprise)?\.slack\.com$/.test(origin))
        workspaceOrigin = origin;
      if (channels.size === 1) await deliveryChannel();
      if (channels.size > 1) await Promise.all([...channels].map((id) => safeChannel(id)));
      const result = await receiver.start();
      if (!socket?.on) onConnection?.(true);
      return result;
    },
    stop() {
      onConnection?.(false);
      return receiver.stop();
    },
    historyScope,
    historyScopes: () => [...channels].filter(registered).map((id) => ({ teamId, channelId: id })),
    verifyHistoryChannel: deliveryChannel,
    readHistory,
    historyEvent,
    hydrateFiles,
    post: (threadTs, text, deliveryKey, authorize) => post(threadTs, text, deliveryKey, undefined, authorize),
    update: (ts, text, authorize) => update(ts, text, undefined, authorize),
    upload: (threadTs, path, title, authorize) => upload(threadTs, path, title, undefined, authorize),
    resolveLinkTarget,
    async registerChannel(id) {
      if (typeof id !== 'string' || !channelPattern.test(id) || !(await safeChannel(id))) {
        throw new Error('Slack channel unavailable or shared');
      }
      channels.add(id);
      channelId ||= id;
    },
    async createLinkThread(id, text, deliveryKey) {
      if (
        typeof text !== 'string' ||
        !text.trim() ||
        Array.from(text).length > 4000 ||
        typeof deliveryKey !== 'string' ||
        !deliveryKey.trim()
      )
        throw new Error('Invalid Slack link message');
      if (typeof id !== 'string' || !channelPattern.test(id)) throw new Error('Invalid Slack link channel');
      if (!workspaceOrigin) throw new Error('Slack workspace URL unavailable');
      const channel = await deliveryChannel(undefined, id);
      const threadTs = await postMessage(channel, undefined, text, deliveryKey);
      if (typeof threadTs !== 'string' || !timestampPattern.test(threadTs))
        throw new Error('Slack link receipt missing');
      return { threadTs, permalink: rootPermalink(channel, threadTs) };
    },
    forChannel(id) {
      if (typeof id !== 'string' || !channelPattern.test(id)) throw new Error('Invalid Slack channel scope');
      return {
        historyScope: () => historyScope(id),
        verifyHistoryChannel: (signal) => deliveryChannel(signal, id),
        readHistory: (args) => readHistory(args, id),
        historyEvent: (message, members, signal) => historyEvent(message, members, signal, id),
        hydrateFiles: (refs, signal) => hydrateFiles(refs, signal, id),
        post: (threadTs, text, deliveryKey, authorize) => post(threadTs, text, deliveryKey, id, authorize),
        update: (ts, text, authorize) => update(ts, text, id, authorize),
        upload: (threadTs, path, title, authorize) => upload(threadTs, path, title, id, authorize),
      };
    },
  };
}
