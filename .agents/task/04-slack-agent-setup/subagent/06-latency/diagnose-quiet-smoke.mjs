// Real model and database, simulated Slack transport. Never posts to Slack.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Bridge } from 'file:///Users/yuanyunchen/Desktop/AI%20Programing/Play%20for%20Fun/slack-codex-bridge/src/bridge.js';
import { Store } from 'file:///Users/yuanyunchen/Desktop/AI%20Programing/Play%20for%20Fun/slack-codex-bridge/src/store.js';
import { connectCodex } from 'file:///Users/yuanyunchen/Desktop/AI%20Programing/Play%20for%20Fun/slack-codex-bridge/src/codex.js';
import { splitSlackText } from 'file:///Users/yuanyunchen/Desktop/AI%20Programing/Play%20for%20Fun/slack-codex-bridge/src/slack.js';

const project = await mkdtemp(join(tmpdir(), 'bridge-pipeline-'));
const store = new Store(join(project, 'sandbox-test.sqlite'));
const answerTimes = [],
  posts = [];
let clock = Date.now() * 1000,
  bridge;
const tick = () => String(++clock);
const slack = {
  post: async (_, text) => {
    posts.push(text);
    return tick();
  },
  update: async (ts) => ts,
  hydrateFiles: async () => [],
};
const codex = await connectCodex({ onEvent: (m, p) => bridge?.event('codex', m, p) });
bridge = new Bridge({
  store,
  slack,
  clients: { codex },
  split: splitSlackText,
  config: { locale: 'zh', project, contextBudget: 12000 },
  metrics: {
    add: (m, id, ms) => {
      if (m === 'arrival_to_final') answerTimes.push(ms);
    },
  },
  report: (e) => console.error('smoke error', e.name, e.code ?? '', e.message, e.message),
});
const scope = { teamId: 'TTEST', channelId: 'CTEST', threadTs: '10', userId: 'UTEST', files: [] };
async function ask(id, text) {
  bridge.dispatch({ ...scope, id, kind: 'mention', ts: tick(), receivedAt: Date.now(), text });
  const until = Date.now() + 120000;
  while (
    !['completed', 'failed', 'delivery_unknown'].includes(store.receipt(id)?.state) &&
    Date.now() < until
  )
    await new Promise((r) => setTimeout(r, 100));
  assert.equal(store.receipt(id)?.state, 'completed');
  await Promise.all(bridge.lanes.values());
}
try {
  bridge.dispatch({
    ...scope,
    id: 'history',
    kind: 'message',
    ts: tick(),
    text: '决定：验收代号是「蓝鸟」。',
  });
  await ask('first', '本群验收代号是什么？用一个中文句子作答。');
  assert.ok(posts.some((t) => t.includes('蓝鸟')));
  await ask('second', 'What does the acceptance label mean in English? Answer in one English sentence.');
  assert.ok(posts.some((t) => /blue.?bird/i.test(t)));
  console.log(
    JSON.stringify(
      {
        realCodexTurns: 2,
        sharedHistory: true,
        questionLanguages: ['zh', 'en'],
        simulatedSlackRealModelAnswerMs: answerTimes,
      },
      null,
      2,
    ),
  );
} finally {
  const finished = bridge;
  bridge = undefined;
  await Promise.allSettled(finished.lanes.values());
  for (const b of store.bindings())
    await codex.rpc('thread/archive', { threadId: b.threadId }).catch(() => {});
  codex.close();
  store.close();
  await rm(project, { recursive: true, force: true });
}
