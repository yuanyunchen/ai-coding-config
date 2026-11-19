const fenceLine = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)/u;

export function openingFence(line) {
  const match = fenceLine.exec(line);
  if (match?.[1][0] === '`' && match[2].includes('`')) return null;
  return match;
}

export function closesFence(line, delimiter) {
  return line?.[1][0] === delimiter[0] && line[1].length >= delimiter.length && !line[2].trim();
}

export function* fencedBlocks(text) {
  let block;
  for (const match of text.matchAll(new RegExp(fenceLine.source, 'gmu'))) {
    const end = match.index + match[0].length;
    if (!block && openingFence(match[0])) {
      const newLine = /^\r?\n/u.exec(text.slice(end, end + 2))?.[0] ?? '';
      block = { start: match.index, bodyStart: end + newLine.length, delimiter: match[1], info: match[2].trim() };
    } else if (block && closesFence(match, block.delimiter)) {
      yield { ...block, bodyEnd: match.index, end, closed: true };
      block = undefined;
    }
  }
  if (block) yield { ...block, bodyEnd: text.length, end: text.length, closed: false };
}

export function extractFencedBlocks(text, info) {
  const blocks = [];
  let body = '', from = 0;
  for (const block of fencedBlocks(text)) {
    if (block.info !== info) continue;
    body += text.slice(from, block.start);
    from = block.end;
    blocks.push({ payload: text.slice(block.bodyStart, block.bodyEnd), closed: block.closed });
  }
  if (!blocks.length) return { body: text, blocks };
  // Keep the first content line's indentation when removing a declaration.
  return { body: (body + text.slice(from)).replace(/^\s*\n|\r?\n\s*$/gu, ''), blocks };
}
