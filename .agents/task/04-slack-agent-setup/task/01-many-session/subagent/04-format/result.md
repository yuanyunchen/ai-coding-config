---
id: T04.01/S04
status: DONE_WITH_CONCERNS
---
# 结果 — T04.01/S04 format

## 结论

- 创建、回复和编辑都由 Slack 原生富文本渲染。覆盖 Markdown 加粗、有序与无序列表、行内代码、围栏代码块和 HTTP(S) 链接。
- 可点击文字始终是实际目的地址。原生 Slack 伪造标签、提及和广播语法按字面展示，通知文本转义 Slack 控制字符。发帖关闭自动解析和链接预览。
- 仅对已认证机器人且版本和摘要匹配的回声恢复发送前文本。Socket 事件和历史都走同一归一化入口，现有发送记录和历史匹配逻辑继续按原文本工作。旧记录及成员文本保持原样。
- 文本拆分计入转义长度并保留全部 Unicode 码点。多段文本各自渲染，跨段 Markdown 围栏没有延续代码块样式。没有产生 Slack 消息、重启服务或提交代码。

## 需要上层处理

1. 首轮全量回归唯一失败来自并行媒体改动。`test/output-media.test.js:165` 的媒体对象传入尚期待路径的 `upload`，触发 `ERR_INVALID_ARG_TYPE`。媒体接口合入后重跑全套。
2. 本轮只有公开 schema 验证及本地边界测试。真实 Slack 客户端渲染和回声观察由主任务在授权范围内完成。

## 验证

- `node --test test/slack.test.js test/slack-link.test.js test/bridge.test.js test/catchup.test.js test/ops.test.js` → 51 通过，0 失败。
- `npm test` → 121 通过，1 失败，见上方媒体测试。
- `git diff --check`、`node --check src/slack-format.js`、`node --check src/slack.js` → 通过。
- 合成中英文字、代码、列表和链接的 Block Kit 载荷经 Slack `blocks.validate` 返回 `{"ok":true}`。该调用只验证 JSON。

## 产物

- `slack-codex-bridge/src/slack-format.js`、`src/slack.js`
- `slack-codex-bridge/test/slack.test.js`、`test/slack-link.test.js`
- 依据 [Slack 富文本块](https://docs.slack.dev/reference/block-kit/blocks/rich-text-block/) 和 [消息格式](https://docs.slack.dev/messaging/formatting-message-text/)。
- 使用 skill：using-superpowers、ponytail、systematic-debugging、test-driven-development、verification-before-completion、slack:slack-docs、slack:block-kit。

## 写入 memory

无。

## 附件

无。
