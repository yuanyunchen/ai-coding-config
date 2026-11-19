import { createHash, randomUUID } from 'node:crypto';
import { closesFence, fencedBlocks, openingFence } from './markdown-fences.js';

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const characters = { '&amp;': '&', '&lt;': '<', '&gt;': '>' };
const blockId = /^bridge-format-v1:([a-f0-9]{64}):/;
const digest = (text) => createHash('sha256').update(text).digest('hex');

// The operator's local transcript can include skill attribution. Slack gets the answer body.
export function publicReplyText(text) {
  return text.replace(/^(?:(?:[^\S\r\n]*\r?\n)* {0,3}[^\S \t\r\n]*(\*{1,2}|_{1,2})?(?:使用[^\S\r\n]*skills?|skills?[^\S\r\n]+used|used[^\S\r\n]+skills?)\1?[^\S\r\n]*[:：][^\r\n]*(?:\r?\n|$))+(?:[^\S\r\n]*\r?\n)*/iu, '');
}

const slackTextLimit = 4000;

export function splitPublicSlackText(text, limit = slackTextLimit) {
  const parts = [];
  let part = '', length = 0;
  for (const point of text) {
    const width = entities[point]?.length ?? 1;
    if (length + width > limit) {
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

function fencedSlackChunks(code) {
  // A split can put a literal run of backticks or tildes on a new line.
  const widths = { '`': 3, '~': 3 };
  for (const [run] of code.matchAll(/`{3,}|~{3,}/gu))
    widths[run[0]] = Math.max(widths[run[0]], run.length + 1);
  const mark = widths['`'] <= widths['~'] ? '`' : '~';
  const limit = slackTextLimit - 2 * (widths[mark] + 1);
  if (limit < 5)
    return splitPublicSlackText(code, slackTextLimit / 2 - 2).flatMap(fencedSlackChunks);
  const delimiter = mark.repeat(widths[mark]);
  return splitPublicSlackText(code, limit).map((part) => delimiter + '\n' + part + '\n' + delimiter);
}

export function splitSlackAnswer(text, parts) {
  if (parts.length < 2) return parts.filter((part) => part.trim());

  const fences = [...fencedBlocks(text)];
  let offset = 0;
  const crossesFence = parts.slice(0, -1).some((part) => {
    offset += part.length;
    return fences.some(({ start, end }) => start < offset && offset < end);
  });
  if (!crossesFence) return parts.filter((part) => part.trim());

  const chunks = [];
  let from = 0;
  for (const { start, bodyStart, bodyEnd, end, closed } of fences) {
    chunks.push(...splitPublicSlackText(text.slice(from, start)));
    const intact = splitPublicSlackText(text.slice(start, end));
    if (intact.length === 1) chunks.push(...intact);
    else {
      let code = text.slice(bodyStart, bodyEnd);
      if (closed) code = code.replace(/\r?\n$/u, '');
      chunks.push(...fencedSlackChunks(code));
    }
    from = end;
  }
  chunks.push(...splitPublicSlackText(text.slice(from)));
  return chunks.filter((part) => part.trim());
}

const literal = (text, style) => ({ type: 'text', text, ...(style && { style }) });
const section = (elements) => ({ type: 'rich_text_section', elements });
const inlineToken = new RegExp([
  /\\(?<escaped>[\\\x60*_{}\[\]()#+.!<>~-])/,
  /(?<!\x60)(?<ticks>\x60+)(?<code>[^\r\n]+?)\k<ticks>(?!\x60)/,
  /(?<strong>\*\*|__)(?<bold>(?!\s)[^\r\n]+?)\k<strong>/,
  /!?\[(?<label>[^\]\r\n]+)\]\((?<target>(?:[^\s()<>]|\([^()\s]*\))+)\)/,
  /<(?<angle>[^<>\r\n]+)>/,
  /(?<bare>https?:\/\/(?:[^\s<>\[\]()"|\x60]|\([^()\s<>]*\))+)/,
].map((token) => token.source).join('|'), 'giu');

function link(target) {
  if (!/^https?:\/\//i.test(target) || /[\\|<>\s]/u.test(target)) return null;
  const url = URL.parse(target);
  if (!url?.hostname || url.username || url.password) return null;
  // A generated label must never misrepresent the address Slack will open.
  return { type: 'link', url: url.href, text: url.href };
}

function inline(text, style) {
  const elements = [];
  const append = (value) => {
    if (!value) return;
    const previous = elements.at(-1);
    if (previous?.type === 'text' && previous.style === style) previous.text += value;
    else elements.push(literal(value, style));
  };
  let from = 0;
  for (const match of text.matchAll(inlineToken)) {
    append(text.slice(from, match.index));
    const [token] = match;
    const { escaped, code, bold, label, target, angle, bare } = match.groups;
    if (escaped) append(escaped);
    else if (code) elements.push(literal(code, { code: true }));
    else if (bold) elements.push(...inline(bold, { bold: true }));
    else {
      const address = bare?.replace(/[.,!?;:，。！？、]+$/u, '') ?? target ?? angle;
      const destination = !token.startsWith('!') && link(address);
      if (!destination) append(token);
      else {
        if (label) append(label + ' (');
        elements.push(destination);
        if (label) append(')');
        if (bare) append(bare.slice(address.length));
      }
    }
    from = match.index + token.length;
  }
  append(text.slice(from));
  return elements;
}

function richText(text) {
  const elements = [];
  const lines = text.split(/\r?\n/);
  const paragraph = [];
  const flush = () => {
    const body = paragraph.splice(0).join('\n');
    if (body) elements.push(section(inline(body)));
  };
  let list;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = openingFence(line)?.[1];
    if (fence) {
      flush();
      list = null;
      const body = [];
      while (++i < lines.length && !closesFence(openingFence(lines[i]), fence)) body.push(lines[i]);
      const code = body.join('\n');
      if (code) elements.push({ type: 'rich_text_preformatted', elements: [literal(code)] });
      continue;
    }
    const item = /^([ \t]*)([-+*]|\d{1,9}[.)])[ \t]+(\S.*)$/.exec(line);
    if (item) {
      flush();
      const [, spaces, marker, content] = item;
      const number = Number.parseInt(marker, 10);
      const style = Number.isNaN(number) ? 'bullet' : 'ordered';
      const indent = Math.floor(spaces.replaceAll('\t', '  ').length / 2);
      if (!list || list.style !== style || list.indent !== indent) {
        list = { type: 'rich_text_list', style, indent, elements: [] };
        if (number > 1) list.offset = number - 1;
        elements.push(list);
      }
      list.elements.push(section(inline(content)));
    } else {
      list = null;
      paragraph.push(line);
    }
  }
  flush();
  return elements.length ? elements : [section([literal(text)])];
}

export function slackMessage(text, deliveryKey, publicBody = false) {
  if (!publicBody) text = publicReplyText(text);
  if (!text.trim()) throw Error('Slack message has no public content');
  const fallback = text.replace(/[&<>]/g, (point) => entities[point]);
  const fallbackHash = digest(text);
  const args = {
    text: fallback,
    blocks: [{
      type: 'rich_text',
      block_id: 'bridge-format-v1:' + fallbackHash + ':' + randomUUID(),
      elements: richText(text),
    }],
    parse: 'none',
    link_names: false,
  };
  if (deliveryKey) {
    args.metadata = { event_type: 'bridge_reply', event_payload: { key: deliveryKey, fallbackHash } };
  }
  return args;
}

export function slackOriginalText(message) {
  const text = message.text || '';
  const expected =
    message.blocks?.find((block) => block.type === 'rich_text' && blockId.test(block.block_id))
      ?.block_id.match(blockId)[1] ??
    (message.metadata?.event_type === 'bridge_reply' && message.metadata.event_payload?.fallbackHash);
  if (!expected || !/&(?:amp|lt|gt);/.test(text) || digest(text) === expected) return text;
  const decoded = text.replace(/&(?:amp|lt|gt);/g, (entity) => characters[entity]);
  return digest(decoded) === expected ? decoded : text;
}
