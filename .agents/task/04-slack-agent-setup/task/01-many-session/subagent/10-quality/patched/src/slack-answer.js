import { diagramPng } from './media.js';
import { extractFencedBlocks } from './markdown-fences.js';
import { publicReplyText, splitSlackAnswer } from './slack-format.js';

// Render marked diagrams locally. Only prose and verified files go into the thread.
export async function sendSlackAnswer(worker, scope, id, text, authorize, stageParts = false) {
  const { body, blocks: graphs } = extractFencedBlocks(publicReplyText(text), 'bridge-diagram');
  const plainParts = worker.split(body, true);
  let parts = splitSlackAnswer(body, plainParts);
  if (stageParts) {
    // An already staged answer keeps its original delivery keys and message bodies.
    if (plainParts.some((part, i) => part !== parts[i] && worker.store.delivery(id + '/' + i)?.text === part))
      parts = plainParts;
    for (const [i, part] of parts.entries()) worker.store.prepareSend(id + '/' + i, scope, part);
  }
  let ts, noticeTs, imageFailed = false;
  for (const [i, part] of parts.entries()) {
    authorize?.();
    ts = await worker.send(scope, id + '/' + i, part, authorize, true);
  }
  for (const [index, { payload, closed }] of graphs.entries()) {
    authorize?.();
    const key = id + (index ? '/diagram/' + index : '/diagram');
    if (worker.store.fileReceipt(key)?.fileId) continue;
    let bytes, title;
    try {
      if (!closed) throw Error('Incomplete diagram declaration');
      const spec = JSON.parse(payload);
      title = typeof spec.title === 'string' && spec.title.trim() ? spec.title.trim() : 'Diagram';
      bytes = await diagramPng(spec);
    } catch (err) {
      worker.report?.(err);
      imageFailed = true;
      const notice = /\p{Script=Han}/u.test(body || payload) ? '图未能生成。' : 'The diagram could not be rendered.';
      noticeTs = await worker.send(scope, key + '/notice', notice, authorize);
      continue;
    }
    if (!ts && !parts.length) ts = await worker.send(scope, id + '/caption', title, authorize, true);
    authorize?.();
    worker.store.prepareSend(key, scope, title);
    if (worker.store.markSending(key)) {
      try {
        const fileId = await worker.slack.upload(scope.threadTs, { filename: 'diagram.png', bytes }, title, authorize);
        if (!fileId) throw Error('Slack diagram receipt missing');
        worker.store.markFileSent(key, fileId);
        continue;
      } catch (err) {
        worker.store.markUnknown(key);
        worker.report?.(err);
      }
    }
    imageFailed = true;
    authorize?.();
    const notice = /\p{Script=Han}/u.test(body || title) ? '尚未确认图片送达。' : 'Diagram delivery could not be confirmed.';
    noticeTs = await worker.send(scope, key + '/delivery-notice', notice, authorize);
  }
  if (!ts && graphs.length && !parts.length) ts = worker.store.delivery(id + '/caption')?.slackTs;
  return { ts: ts ?? noticeTs, imageFailed };
}
