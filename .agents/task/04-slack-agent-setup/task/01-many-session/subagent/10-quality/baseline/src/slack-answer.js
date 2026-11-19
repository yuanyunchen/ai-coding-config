import { diagramPng } from './media.js';
import { publicReplyText } from './slack-format.js';

// Render marked diagrams locally. Only prose and verified files go into the thread.
export async function sendSlackAnswer(worker, scope, id, text, authorize, stageParts = false) {
  const graphs = [];
  const body = publicReplyText(text).replace(
    /^ {0,3}`{3}bridge-diagram\b([\s\S]*?)(?:^ {0,3}`{3}[^\S\r\n]*(?=\r?$)|(?![\s\S]))/gmu,
    (_, json) => { graphs.push(json); return ''; },
  );
  const parts = worker.split(graphs.length ? body.trim() : body);
  if (stageParts)
    for (const [i, part] of parts.entries()) worker.store.prepareSend(id + '/' + i, scope, part);
  let ts, imageFailed = false;
  for (const [i, part] of parts.entries()) {
    authorize?.();
    ts = await worker.send(scope, id + '/' + i, part, authorize);
  }
  for (const [index, json] of graphs.entries()) {
    authorize?.();
    const key = id + (index ? '/diagram/' + index : '/diagram');
    if (worker.store.fileReceipt(key)?.fileId) continue;
    let bytes, title;
    try {
      const spec = JSON.parse(json);
      title = typeof spec.title === 'string' && spec.title.trim() ? spec.title.trim() : 'Diagram';
      bytes = await diagramPng(spec);
    } catch (err) {
      worker.report?.(err);
      imageFailed = true;
      const notice = /\p{Script=Han}/u.test(body || json) ? '图未能生成。' : 'The diagram could not be rendered.';
      ts = await worker.send(scope, key + '/notice', notice, authorize);
      continue;
    }
    if (!ts && !parts.length) ts = await worker.send(scope, id + '/caption', title, authorize);
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
    ts = await worker.send(scope, key + '/delivery-notice', notice, authorize);
  }
  if (!ts && graphs.length && !parts.length) ts = worker.store.delivery(id + '/caption')?.slackTs;
  return { ts, imageFailed };
}
