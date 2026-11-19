import { createHash, randomUUID } from 'node:crypto';

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const characters = { '&amp;': '&', '&lt;': '<', '&gt;': '>' };
const blockId = /^bridge-format-v1:([a-f0-9]{64}):/;
const digest = (text) => createHash('sha256').update(text).digest('hex');

// The operator's local transcript can include skill attribution. Slack gets the answer body.
export function publicReplyText(text) {
  return text.replace(/^(?:[\t \r\n]*(?:\*\*)?(?:使用\s*skills?|skills?\s+used|used\s+skills?)\s*[:：][^\r\n]*(?:\r?\n|$))+(?:[ \t]*\r?\n)*/iu, '');
}

export function slackTextLength(point) {
  return entities[point]?.length ?? 1;
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
    const fence = /^ {0,3}(\x60{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      flush();
      list = null;
      const close = new RegExp('^ {0,3}' + fence[0] + '{' + fence.length + ',}\\s*$');
      const body = [];
      while (++i < lines.length && !close.test(lines[i])) body.push(lines[i]);
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

export function slackMessage(text, deliveryKey) {
  text = publicReplyText(text);
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
