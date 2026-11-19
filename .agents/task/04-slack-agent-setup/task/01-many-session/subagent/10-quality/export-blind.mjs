import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cases } from './fixtures.mjs';

const repair = process.argv[2] === 'repair';
const paired = process.argv[2] === 'paired' || repair;
const pack = repair ? 'blind-repair' : paired ? 'blind-paired' : 'blind-single';
const variants = paired ? ['candidate', repair ? 'patched' : 'baseline'] : ['candidate'];
mkdirSync(pack, { recursive: true });
for (const name of ['env', 'failure', 'status']) copyFileSync(name + '.png', join(pack, name + '.png'));
const mapping = {};
const dossier = {
  conditions: {
    transport: '本地 Slack 替身，已记录发送、编辑、文件尝试和确认。没有真实 Slack 回执或客户端渲染观察。',
    text: '实际模型生成的文字经过桥接处理。运行时进度、附件撤回、旧关联和所有者运行中的构建用合成事件驱动。',
    media: '本地图确实渲染为 PNG。附件识别输入为合成 PNG。图是否出现在真实 Slack 客户端未观察。',
    limitations: '所有者中断的路由分支和原回合身份由夹具观测。没有使用真实桌面构建或真实 Slack 账号。',
  },
  cases: [],
};
for (const id of Object.keys(cases)) {
  const order = paired && randomInt(2) ? [...variants].reverse() : variants;
  const viable = { id, outputs: {} };
  mapping[id] = {};
  for (const [i, version] of order.entries()) {
    const name = 'AB'[i];
    const filename = join('runs', version, id + '.json');
    assert(existsSync(filename), filename);
    const d = JSON.parse(readFileSync(filename));
    assert.equal(d.id, id);
    assert.equal(d.externalSlackCalls, 0);
    mapping[id][name] = version;
    viable.outputs[name] = {
      events: d.events,
      elapsedMs: d.windowMs,
      publicOperations: d.outbound.map(({ blocks, file, ...o }) => {
        if (file) {
          o.image = id + '-' + name + '-' + file;
          copyFileSync(join('runs', version, id, file), join(pack, o.image));
        }
        if (blocks?.some((block) => block.elements?.some((e) => e.type === 'rich_text_preformatted')))
          o.nativeCodeBlockCreated = true;
        return o;
      }),
      model: d.turns.map((t) => ({
        stage: t.stage,
        status: t.status ?? 'no model completion',
        inputImages: t.inputImageCount,
        returnedNoReplyMarker: t.items?.some(({ text }) => text?.trim() === '[[NO_REPLY]]') ?? false,
        agentMessages: t.items?.filter(({ type }) => type === 'agentMessage').length ?? 0,
        commandExecutions: t.items?.filter(({ type }) => type === 'commandExecution').length ?? 0,
        ...(t.error ? { error: t.error } : {}),
      })),
      errors: d.errors,
    };
  }
  dossier.cases.push(viable);
}
writeFileSync(join(pack, 'observations.json'), JSON.stringify(dossier, null, 2) + '\n');
writeFileSync(pack + '-mapping.json', JSON.stringify(mapping, null, 2) + '\n');
console.log(pack, dossier.cases.length, dossier.cases.reduce((n, c) => n + Object.keys(c.outputs).length, 0));
