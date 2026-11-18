import { test } from 'node:test';
import assert from 'node:assert/strict';

const repo = process.env.SLACK_BRIDGE_REPO;
const { Bridge } = await import(repo + '/src/bridge.js');
const { createSlack, splitSlackText } = await import(repo + '/src/slack.js');
const { sendSlackAnswer } = await import(repo + '/src/slack-answer.js');
const { Store } = await import(repo + '/src/store.js');

const scope = { teamId: 'T1', channelId: 'C1', threadTs: '1.000000' };
const graph = '~~~bridge-diagram\n{"title":"Architecture","nodes":["Slack","Codex"],"edges":[[0,1]]}\n~~~~';
const example = 'Example:\n````md\n```bridge-diagram\n{"nodes":["This is literal"]}\n```\n````\nEnd.';

async function setup(t) {
  const store = new Store(':memory:');
  t.after(() => store.close());
  const posts = [], uploads = [];
  const client = {
    auth: { test: async () => ({ ok: true, team_id: scope.teamId, bot_id: 'B1', user_id: 'UB1' }) },
    conversations: {
      info: async () => ({ channel: { id: scope.channelId, is_channel: true, is_member: true, is_ext_shared: false } }),
    },
    chat: {
      postMessage: async (args) => {
        posts.push(args);
        return { ok: true, ts: '2.' + String(posts.length).padStart(6, '0'), channel: args.channel };
      },
    },
    filesUploadV2: async (args) => {
      uploads.push(args);
      return { ok: true, files: [{ files: [{ id: 'F' + uploads.length }] }] };
    },
  };
  const slack = createSlack({
    teamId: scope.teamId, channelId: scope.channelId, client,
    receiver: { init() {}, async start() {} }, onEvent: async () => {},
  });
  await slack.start();
  const worker = new Bridge({ store, slack, split: splitSlackText });
  return { worker, posts, uploads, client };
}

test('diagram examples survive as literal code and only exact standalone declarations upload', async (t) => {
  const { worker, posts, uploads } = await setup(t);
  const nearMatch = '```bridge-diagram-example\n{"nodes":["A code sample"]}\n```';
  const answer = [example, nearMatch, graph, 'More prose.'].join('\n\n');
  const result = await sendSlackAnswer(worker, scope, 'example', answer);
  assert.deepEqual(result, { ts: '2.000001', imageFailed: false });
  assert.equal(posts.length, 1);
  assert.deepEqual(
    posts[0].blocks[0].elements.filter(({ type }) => type === 'rich_text_preformatted')
      .map(({ elements }) => elements[0].text),
    ['```bridge-diagram\n{"nodes":["This is literal"]}\n```', '{"nodes":["A code sample"]}'],
  );
  assert.match(posts[0].text, /More prose\./);
  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].title, 'Architecture');
  assert.equal(uploads[0].thread_ts, scope.threadTs);
});

test('unsupported graph JSON stays hidden without masking the receipt for successful text and images', async (t) => {
  const { worker, posts, uploads } = await setup(t);
  const valid = graph.replaceAll('~', '`').slice(0, -1);
  const invalid = '```bridge-diagram\n{"nodes":[42],"secret":"never publish raw schema"}\n```';
  const answer = ['Here is the architecture.', valid, invalid].join('\n\n');
  const expected = { ts: '2.000001', imageFailed: true };
  const first = await sendSlackAnswer(worker, scope, 'mixed', answer);
  const replay = await sendSlackAnswer(worker, scope, 'mixed', answer);
  assert.deepEqual(posts.map(({ text }) => text), ['Here is the architecture.', 'The diagram could not be rendered.']);
  assert.equal(uploads.length, 1);
  assert.equal(worker.store.fileReceipt('mixed/diagram').fileId, 'F1');
  assert.deepEqual(first, expected);
  assert.deepEqual(replay, expected);
});

test('a missing upload receipt fences the uncertain image while another image reaches the thread', async (t) => {
  const { worker, posts, uploads, client } = await setup(t);
  const upload = client.filesUploadV2;
  client.filesUploadV2 = async (args) => {
    const receipt = await upload(args);
    if (args.title === 'Uncertain') return { ok: true, files: [] };
    return receipt;
  };
  const valid = graph.replaceAll('~', '`').slice(0, -1);
  const answer = ['Here is the architecture.', valid.replace('Architecture', 'Uncertain'), valid].join('\n\n');
  const expected = { ts: '2.000001', imageFailed: true };
  const first = await sendSlackAnswer(worker, scope, 'missing', answer);
  const replay = await sendSlackAnswer(worker, scope, 'missing', answer);
  assert.deepEqual(posts.map(({ text }) => text), ['Here is the architecture.', 'Diagram delivery could not be confirmed.']);
  assert.deepEqual(uploads.map(({ title }) => title), ['Uncertain', 'Architecture']);
  assert.equal(worker.store.delivery('missing/diagram').state, 'unknown');
  assert.equal(worker.store.fileReceipt('missing/diagram/1').fileId, 'F2');
  assert.deepEqual(first, expected);
  assert.deepEqual(replay, expected);
});

test('first-line skill attribution variants stay out of public post and code samples stay intact', async (t) => {
  const { worker, posts } = await setup(t);
  const quoted = '```text\n使用 skill：keep this example\n```';
  const variants = [
    '**Skills used**: private',
    '__Used skills:__ private',
    '   **使用 skills** ： private',
    '   *Skills used:* private',
    '　使用 skill：private',
    '\uFEFFSkills used: private',
  ];
  for (const [i, variant] of variants.entries())
    await sendSlackAnswer(worker, scope, 'variant/' + i, variant + '\r\n\r\n' + quoted);
  assert.deepEqual(posts.map(({ text }) => text), variants.map(() => quoted));
  for (const { blocks } of posts)
    assert.deepEqual(blocks[0].elements, [
      { type: 'rich_text_preformatted', elements: [{ type: 'text', text: '使用 skill：keep this example' }] },
    ]);
});

test('a long fenced code example preserves exact literal content across public chunks', async (t) => {
  const { worker, posts } = await setup(t);
  const firstCodeLine = 'x'.repeat(3990);
  const secondCodeLine = 'Skills used: this is literal code.';
  const answer = '```text\n' + firstCodeLine + '\n' + secondCodeLine + '\n```';
  await sendSlackAnswer(worker, scope, 'long-code', answer);
  assert.ok(posts.length > 1);
  const elements = posts.flatMap(({ blocks }) => blocks[0].elements);
  assert.ok(elements.every(({ type }) => type === 'rich_text_preformatted'));
  assert.equal(elements.map(({ elements }) => elements[0].text).join('\n'), firstCodeLine + '\n' + secondCodeLine);
});

test('native generated-media examples stay literal inside an outer code fence', async () => {
  const { extractOutputMedia } = await import(repo + '/src/output-media.js');
  const literal = '````md\n```bridge-media\n{"files":[{"path":"sample.png"}]}\n```\n````';
  assert.deepEqual(extractOutputMedia(literal), { body: literal, files: [], invalid: false });
});

test('native crash recovery replays pending prose without publishing pending upload titles', async (t) => {
  const { worker, posts } = await setup(t);
  worker.config = { project: '/shared' };
  worker.clients = { codex: { resumeThread: async () => ({ cwd: '/shared' }) } };
  worker.store.bind(scope, { backend: 'codex', threadId: 'thread', project: '/shared' });
  const base = 'answer/thread/turn/item';
  worker.store.prepareSend(base + '/0', scope, 'The text answer.');
  worker.store.prepareSend(base + '/diagram', scope, 'First diagram title');
  worker.store.prepareSend(base + '/diagram/1', scope, 'Second diagram title');
  worker.store.prepareSend(base + '/media/image.png', scope, 'Generated image title');
  await worker.recover();
  assert.deepEqual(posts.map(({ text }) => text), ['The text answer.']);
  assert.equal(worker.store.delivery(base + '/diagram/1').state, 'pending');
  assert.equal(worker.store.delivery(base + '/media/image.png').state, 'pending');
});
