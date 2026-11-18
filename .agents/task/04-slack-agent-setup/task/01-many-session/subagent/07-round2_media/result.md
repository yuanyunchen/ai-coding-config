---
id: T04.01/S07
status: DONE_WITH_CONCERNS
---
# 结果 — T04.01/S07 出站媒体和格式修复

## 结论

- 上一轮七条复现均转绿，并新增五个边界测试。图文专用块使用同一围栏识别，普通示例和缩进保留原意。图失败或上传回执丢失时，回帖仍链接到成功交付的正文或标题。
- 长代码按 Slack 字符预算续接围栏，保留代码全文。只过滤整条公开回答开头的署名，后续分段中的同形正文仍会送达。已按旧算法写入持久队列的正文分段保留原字节和回执。
- 恢复时只把原生正文、标题和通知类型送入聊天接口，不再把待上传图片的记录当文字回帖。所有测试只使用本地 Slack 替身，没有发外部消息、部署或提交。

## 需要上层处理

1. 最新共享工作树的全量检查在两条直接收件箱测试失败。当前路由需要真实时间戳，旧假发送函数没有返回时间戳。主 agent 已收到测试名和堆栈，需在路由改动完成后重跑全量。
2. 同键并发和实际 Slack 文件上传的可见回执仍未在本次夹具验证。进程内顺序重放覆盖了确认状态与未知状态，未确认的文件仍不盲重传。

## 验证

- 初始 `node --test test/slack-answer-regression.test.js` → 七条预期行为断言失败。
- `node --test test/slack-answer-regression.test.js test/slack-answer.test.js test/slack.test.js test/output-media.test.js` → 35 通过，0 失败。
- `npm test` 最新集成结果 → 165 通过，2 失败。失败为 `test/direct-inbox.test.js:91` 交接期间报告和 `test/direct-inbox.test.js:368` 本机授权成员回帖，媒体用例均通过。并行路由更改前的全量复跑曾为 166 通过，0 失败。
- 改动文件的 `node --check` 和 `git diff --check` → 通过。

## 产物

- `slack-codex-bridge/src/markdown-fences.js`、`src/slack-answer.js`、`src/slack-format.js`、`src/slack.js`、`src/output-media.js`、`src/bridge.js`。
- `slack-codex-bridge/test/slack-answer-regression.test.js`。

## 写入 memory

无。

## 附件

| 文件 | 内容 |
|---|---|
| [implementation-red.log](./implementation-red.log) | 仓库内新增七条回归的原始失败。 |
| [implementation-green.log](./implementation-green.log) | 媒体和格式相关文件的完整绿灯结果。 |
| [implementation-final.log](./implementation-final.log) | 集成共享树最新全量结果。 |

使用 skill：ponytail、superpowers:brainstorming、superpowers:executing-plans、superpowers:systematic-debugging、superpowers:test-driven-development、superpowers:verification-before-completion
