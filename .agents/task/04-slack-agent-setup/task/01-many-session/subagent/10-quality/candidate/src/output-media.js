import { constants } from 'node:fs';
import { lstat, mkdir, open, realpath, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { extractFencedBlocks } from './markdown-fences.js';

const requestPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu;
const filenamePattern = /^[^./\\\p{C}][^/\\\p{C}]*$/u;
const defaultBytes = 24 * 1024 * 1024;
const definitiveRejections = new Set([
  'channel_not_found', 'not_in_channel', 'missing_scope', 'is_archived', 'invalid_arguments',
]);

async function privateDirectory(path, create) {
  if (create) {
    await mkdir(path, { mode: 0o700 }).catch((error) => {
      if (error.code !== 'EEXIST') throw error;
    });
  }
  const info = await lstat(path);
  if (!info.isDirectory() || info.uid !== process.getuid() || (info.mode & 0o077) || await realpath(path) !== path)
    throw new Error('Output directory must be a private directory inside the execution project');
  return info;
}

async function outputDirectory(project, messageId, create = false) {
  if (typeof messageId !== 'string' || !requestPattern.test(messageId)) throw new Error('Invalid output request');
  const base = join(await realpath(project), '.slack-bridge-output');
  await privateDirectory(base, create);
  if (create) {
    await writeFile(join(base, '.gitignore'), '*\n', { flag: 'wx', mode: 0o600 }).catch((error) => {
      if (error.code !== 'EEXIST') throw error;
    });
  }
  const path = join(base, messageId);
  return { path, info: await privateDirectory(path, create) };
}

export async function prepareOutputMedia(project, messageId) {
  return (await outputDirectory(project, messageId, true)).path;
}

export function extractOutputMedia(text) {
  let invalid = false;
  const files = [];
  const { body, blocks } = extractFencedBlocks(text, 'bridge-media');
  for (const { payload, closed } of blocks) {
    try {
      const spec = closed && JSON.parse(payload);
      if (!Array.isArray(spec?.files) || !spec.files.length) throw new Error('Invalid manifest');
      files.push(...spec.files);
    } catch {
      invalid = true;
    }
  }
  return { body, files, invalid };
}

const jpg = (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const aiff = (b) => b.toString('ascii', 0, 4) === 'FORM'
  && ['AIFF', 'AIFC'].includes(b.toString('ascii', 8, 12));
const oggAudio = (b) => b.toString('ascii', 0, 4) === 'OggS'
  && ['OpusHead', '\x01vorbis', 'Speex   ', '\x7fFLAC'].some((codec) => b.subarray(27, 128).includes(codec));
const formats = {
  '.png': (b) => b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')),
  '.jpg': jpg,
  '.jpeg': jpg,
  '.gif': (b) => ['GIF87a', 'GIF89a'].includes(b.toString('ascii', 0, 6)),
  '.webp': (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  '.wav': (b) => ['RIFF', 'RF64'].includes(b.toString('ascii', 0, 4)) && b.toString('ascii', 8, 12) === 'WAVE',
  '.aif': aiff,
  '.aiff': aiff,
  '.mp3': (b) => b.toString('ascii', 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe6) === 0xe2),
  '.m4a': (b) => b.toString('ascii', 4, 8) === 'ftyp'
    && (b.toString('ascii', 8, 12) === 'M4A ' || b.subarray(16, 80).includes('M4A ')),
  '.aac': (b) => b[0] === 0xff && (b[1] & 0xf6) === 0xf0,
  '.flac': (b) => b.toString('ascii', 0, 4) === 'fLaC',
  '.ogg': oggAudio,
  '.opus': oggAudio,
};

function sameFile(a, b) {
  return a.dev === b.dev && a.ino === b.ino;
}

async function validatedBytes(project, messageId, filename, maxBytes) {
  const signature = formats[extname(filename).toLowerCase()];
  if (!signature) throw new Error('Unsupported image or audio extension');
  const directory = await outputDirectory(project, messageId);
  const path = join(directory.path, filename);
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.nlink !== 1 || info.uid !== process.getuid()
      || info.birthtimeMs < directory.info.birthtimeMs)
      throw new Error('Media must be a regular file created for this output request');
    if (info.size < 12 || info.size > maxBytes)
      throw new Error('Media must contain at least 12 and at most ' + maxBytes + ' bytes');

    // Recheck directory and descriptor identity before reading from a pinned file.
    const current = await outputDirectory(project, messageId);
    if (current.path !== directory.path || !sameFile(current.info, directory.info)
      || !sameFile(info, await lstat(path)) || await realpath(path) !== path)
      throw new Error('Media path changed');
    const bytes = Buffer.alloc(info.size);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    const after = await handle.stat();
    if (bytesRead !== bytes.length || after.size !== info.size || after.ctimeMs !== info.ctimeMs || after.nlink !== 1)
      throw new Error('Media changed while reading');
    if (!signature(bytes)) throw new Error('Media does not match its extension');
    return bytes;
  } finally {
    await handle.close();
  }
}

export async function deliverOutputMedia({
  store, slack, scope, id, project, messageId, files, authorize, maxBytes = defaultBytes,
}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error('maxBytes must be positive');
  const sent = [], failed = [], seen = new Set();
  for (const spec of files) {
    const filename = spec?.path;
    if (typeof filename !== 'string' || !filenamePattern.test(filename) || filename !== filename.trim()) {
      failed.push({ filename: null, state: 'invalid', error: new Error('Expected an output filename') });
      continue;
    }
    if (seen.has(filename)) continue;
    seen.add(filename);
    const deliveryId = id + '/media/' + filename;
    const title = typeof spec.title === 'string'
      ? spec.title.replace(/\p{C}/gu, '').trim() || filename : filename;
    let sending = false;
    try {
      const previous = store.delivery(deliveryId);
      if (previous) {
        const intent = store.prepareSend(deliveryId, scope, title);
        if (intent.state === 'sent') {
          const fileId = store.fileReceipt(deliveryId)?.fileId;
          if (!fileId) throw new Error('Media receipt missing');
          sent.push({ filename, fileId });
          continue;
        }
        if (intent.state !== 'pending') {
          failed.push({ filename, state: 'unknown', error: new Error('Previous media delivery unconfirmed') });
          continue;
        }
      }
      const bytes = await validatedBytes(project, messageId, filename, maxBytes);
      await authorize?.();
      store.prepareSend(deliveryId, scope, title);
      sending = store.markSending(deliveryId);
      if (!sending) {
        failed.push({ filename, state: 'unknown', error: new Error('Media delivery already started') });
        continue;
      }
      const fileId = await slack.upload(scope.threadTs, { filename, bytes }, title);
      if (typeof fileId !== 'string' || !/^F[A-Z0-9]+$/u.test(fileId)) throw new Error('Slack file receipt missing');
      store.markFileSent(deliveryId, fileId);
      sent.push({ filename, fileId });
    } catch (error) {
      let state = 'invalid';
      if (sending) {
        if (definitiveRejections.has(error?.data?.error)) {
          store.markRetry(deliveryId);
          state = 'rejected';
        } else {
          store.markUnknown(deliveryId);
          state = 'unknown';
        }
      }
      failed.push({ filename, state, error });
    }
  }
  return { sent, failed };
}
