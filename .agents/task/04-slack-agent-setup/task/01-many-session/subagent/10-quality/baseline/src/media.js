import { mkdtemp, mkdir, readFile, writeFile, rm, lstat } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const helper = fileURLToPath(new URL('./media-extract.py', import.meta.url));
const voicePython = join(homedir(), 'Library/Application Support/slack-coding-bridge/media-venv/bin/python');
const DEFAULT_BYTES = 24 * 1024 * 1024;

// Bound both process output and elapsed time for externally supplied documents.
function run(program, args, { input, signal, timeout = 60000, maxBytes = DEFAULT_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) =>
        ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'WHISPER_MODEL', 'HF_HOME', 'FONTCONFIG_PATH'].includes(
          key,
        ),
      ),
    );
    env.HF_HUB_OFFLINE = '1';
    const proc = spawn(program, args, { stdio: ['pipe', 'pipe', 'pipe'], signal, env });
    const chunks = [];
    let size = 0,
      error = '',
      failure;
    const timer = setTimeout(() => {
      failure = new Error('processor timed out');
      proc.kill('SIGKILL');
    }, timeout);
    proc.stdout.on('data', (buf) => {
      size += buf.length;
      if (size <= maxBytes) chunks.push(buf);
      else {
        failure = new Error('processor output exceeds ' + maxBytes + ' bytes');
        proc.kill('SIGKILL');
      }
    });
    proc.stderr.on('data', (buf) => {
      if (error.length < 2000) error += buf.toString().slice(0, 2000 - error.length);
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (failure || code !== 0) reject(failure || new Error(program + ' failed: ' + error.trim()));
      else resolve(Buffer.concat(chunks));
    });
    proc.stdin.on('error', () => {});
    proc.stdin.end(input);
  });
}

async function download(file, { botToken, fetch: fetchFn, signal, maxBytes }) {
  const url = new URL(file.url_private_download || file.url_private);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'files.slack.com' ||
    url.port ||
    url.username ||
    url.password
  )
    throw new Error('untrusted Slack file URL');
  if (!botToken) throw new Error('missing Slack bot token');
  if (Number(file.size) > maxBytes) throw new Error('file exceeds ' + maxBytes + ' bytes');
  const deadline = AbortSignal.timeout(60000);
  const response = await fetchFn(url, {
    headers: { Authorization: 'Bearer ' + botToken },
    redirect: 'error',
    signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
  });
  if (!response.ok) throw new Error('Slack download HTTP ' + response.status);
  if (Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel();
    throw new Error('file exceeds ' + maxBytes + ' bytes');
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.length;
    if (total > maxBytes) throw new Error('file exceeds ' + maxBytes + ' bytes');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function imageExt(buf) {
  if (buf.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return '.png';
  if (buf[0] === 255 && buf[1] === 216 && buf[2] === 255) return '.jpg';
  if (['GIF87a', 'GIF89a'].includes(buf.toString('ascii', 0, 6))) return '.gif';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  return null;
}

export async function inlineImages(paths = []) {
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
  const urls = [];
  for (const path of paths) {
    const bytes = await readFile(path);
    const type = mime[imageExt(bytes)];
    if (type) urls.push('data:' + type + ';base64,' + bytes.toString('base64'));
  }
  return urls;
}

export async function prepareFiles(files, options = {}) {
  const {
    botToken,
    signal,
    workDir = tmpdir(),
    maxBytes = DEFAULT_BYTES,
    fetch: fetchFn = fetch,
    python = process.env.MEDIA_PYTHON || (existsSync(voicePython) ? voicePython : 'python3'),
    workspaceLanguage = 'en',
  } = options;
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error('maxBytes must be positive');
  const text = [],
    images = [],
    audio = [],
    items = [];
  if (!files?.length) return { text: '', images, audio, items, cleanup: async () => {} };
  let parent = workDir;
  if (options.workDir) {
    parent = join(workDir, '.slack-bridge-media');
    await mkdir(parent, { recursive: true, mode: 0o700 });
    const st = await lstat(parent);
    if (!st.isDirectory() || st.uid !== process.getuid() || st.mode & 0o077)
      throw new Error('attachment directory must be a private directory owned by the bridge');
    await writeFile(join(parent, '.gitignore'), '*\n', { flag: 'wx', mode: 0o600 }).catch((e) => {
      if (e.code !== 'EEXIST') throw e;
    });
  }
  const dir = await mkdtemp(join(parent, 'bot-media-'));
  const cleanup = () => rm(dir, { recursive: true, force: true });
  try {
    for (const [idx, file] of files.entries()) {
      if (signal?.aborted) throw signal.reason;
      const label = JSON.stringify({
        file: file.id,
        name: file.name,
        version: file.updated || file.timestamp || file.created,
      });
      try {
        const mime = file.mimetype || '',
          ext = extname(file.name || '').toLowerCase();
        const buf = await download(file, { botToken, fetch: fetchFn, signal, maxBytes });
        const img = imageExt(buf);
        let content = '';
        if (img && mime.startsWith('image/')) {
          const path = join(dir, 'image-' + idx + img);
          await writeFile(path, buf, { mode: 0o600 });
          images.push(path);
          content = 'Vision input ' + images.length + ' (' + img.slice(1) + ')';
        } else if (
          mime.startsWith('text/') ||
          ['.txt', '.md', '.json', '.csv', '.tsv', '.log', '.yaml', '.yml'].includes(ext)
        ) {
          content = new TextDecoder('utf-8', { fatal: true }).decode(buf);
        } else {
          const mode =
            buf.toString('ascii', 0, 5) === '%PDF-'
              ? 'pdf'
              : ['.docx', '.xlsx', '.pptx'].includes(ext)
                ? ext.slice(1)
                : mime.startsWith('audio/') ||
                    ['.wav', '.m4a', '.ogg', '.mp3', '.flac', '.webm', '.aac', '.mp4'].includes(ext)
                  ? 'audio'
                  : null;
          if (!mode) throw new Error('unsupported file type');
          const path = join(dir, 'source-' + idx);
          await writeFile(path, buf, { mode: 0o600 });
          if (mode === 'audio') {
            const target = join(dir, 'audio-' + idx + '.wav');
            await run(
              'ffmpeg',
              [
                '-v',
                'error',
                '-nostdin',
                '-protocol_whitelist',
                'pipe',
                '-format_whitelist',
                'mov,matroska,webm,mp3,wav,ogg,flac,aac,aiff',
                '-i',
                'pipe:0',
                '-vn',
                '-ac',
                '1',
                '-ar',
                '16000',
                '-f',
                'wav',
                'pipe:1',
              ],
              { input: buf, signal, maxBytes, timeout: 60000 },
            ).then((bytes) => writeFile(target, bytes, { mode: 0o600 }));
            try {
              content = (
                await run(python, [helper, mode, target], { signal, maxBytes, timeout: 600000 })
              ).toString();
            } catch (error) {
              if (!options.nativeAudio || signal?.aborted) throw error;
              audio.push(target);
              content =
                'Timestamped transcript unavailable. Native audio input ' +
                audio.length +
                ' (mono 16 kHz WAV); cite approximate timestamps.';
            }
          } else if (mode === 'pdf') {
            const pages = JSON.parse(
              (await run(python, [helper, mode, path], { signal, maxBytes })).toString(),
            );
            const rendered = [];
            let remaining = maxBytes;
            const deadline = AbortSignal.timeout(60000);
            for (const [i, page] of pages.entries()) {
              if (page.trim()) {
                rendered.push('[page ' + (i + 1) + '] ' + page);
                continue;
              }
              try {
                const number = String(i + 1);
                const bytes = await run(
                  'pdftoppm',
                  ['-f', number, '-l', number, '-scale-to', '1600', '-singlefile', '-png', path],
                  {
                    signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
                    maxBytes: remaining,
                  },
                );
                const pagePath = join(dir, 'scan-' + idx + '-' + number + '.png');
                await writeFile(pagePath, bytes, { mode: 0o600 });
                remaining -= bytes.length;
                images.push(pagePath);
                rendered.push('[page ' + number + '] image-only; vision input ' + images.length);
              } catch (error) {
                if (signal?.aborted) throw error;
                rendered.push(
                  '[page ' +
                    (i + 1) +
                    '] image-only; vision unavailable: ' +
                    error.message.split('\n').at(-1),
                );
              }
            }
            content = rendered.join('\n');
          } else content = (await run(python, [helper, mode, path], { signal, maxBytes })).toString();
        }
        text.push(label + '\n' + content);
        items.push({ id: file.id, content });
      } catch (e) {
        if (signal?.aborted) throw signal.reason;
        const reason = e.message.replaceAll(dir, '[temporary file]').split('\n').slice(-1)[0];
        text.push(
          label +
            '\n' +
            (workspaceLanguage.startsWith('zh') ? '附件暂无法读取：' : 'Attachment unavailable: ') +
            reason,
        );
        items.push({ id: file.id, error: reason });
      }
    }
    let excerpt = text.join('\n\n');
    if (options.promptChars && excerpt.length > options.promptChars) {
      if (options.inlineOnly) {
        const notice = '\n[Attachment text continues in the original Slack files.]';
        excerpt = excerpt.slice(0, Math.max(0, options.promptChars - notice.length)) + notice.slice(0, options.promptChars);
      } else {
        // Let the scoped worker read full extracts from its private workspace.
        const path = join(dir, 'attachment-evidence.txt');
        await writeFile(path, excerpt, { mode: 0o600 });
        excerpt =
          'Attachment evidence (' +
          excerpt.length +
          ' characters; full text in ' +
          JSON.stringify(path) +
          '). Preview:\n' +
          excerpt.slice(0, options.promptChars);
      }
    }
    return { text: excerpt, images, audio, items, cleanup };
  } catch (e) {
    await cleanup();
    throw e;
  }
}

// Encode labels as plain DOT strings; graph shape is data, never raw DOT input.
export async function diagramPng({ nodes, edges = [] }) {
  if (!Array.isArray(nodes) || !nodes.length || !nodes.every((n) => typeof n === 'string'))
    throw new Error('invalid graph nodes');
  const lines = [
    'digraph G { rankdir=TB; graph [dpi=144,pad=0.25,nodesep=0.32,ranksep=0.4,bgcolor="white"];',
    'node [shape=box,style="rounded,filled",fillcolor="#edf4fa",color="#58778f",fontcolor="#15334b",fontname="Arial",fontsize=16,margin="0.18,0.11"];',
    'edge [color="#57738b",arrowsize=0.75];',
  ];
  nodes.forEach((n, i) =>
    lines.push('n' + i + ' [label=' + JSON.stringify(n.replace(/[\u0000-\u001f]/g, ' ')) + '];'),
  );
  for (const edge of edges) {
    if (
      !Array.isArray(edge) ||
      edge.length !== 2 ||
      !edge.every((i) => Number.isInteger(i) && i >= 0 && i < nodes.length)
    )
      throw new Error('invalid graph edge');
    lines.push('n' + edge[0] + ' -> n' + edge[1] + ';');
  }
  return run('dot', ['-Tpng'], { input: lines.join('\n') + '\n}' });
}

export async function uploadDiagram(client, { channel, threadTs, title, nodes, edges }) {
  const bytes = await diagramPng({ nodes, edges });
  return client.filesUploadV2({
    channel_id: channel,
    thread_ts: threadTs,
    title,
    filename: 'diagram.png',
    file: bytes,
  });
}
