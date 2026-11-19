---
id: T04/S09
status: DONE_WITH_CONCERNS
---
# 结果 — T04/S09 源会话主动汇报

## 结论

- `slack-bot <Slack 目标> --report <正文>` 通过现有私有本机套接字发送显式汇报命令。正文按原样传入，不读取历史。该命令要求目标和准确源会话 ID，拒绝项目及 Claude 套接字覆盖，也拒绝在运行时已知当前会话时传入另一会话的 ID。原绑定命令继续默认使用 `link` 操作。
- Claude Code 优先从 `CLAUDE_CODE_SESSION_ID` 读取当前 ID，也可将技能展开的 `${CLAUDE_SESSION_ID}` 作为明确的 `--session` 传入。桥接启动会话仍可使用原有 `CLAUDE_BRIDGE_THREAD_ID`。技能说明了 Claude Channel 连通条件。 [Claude Code 技能变量](https://code.claude.com/docs/en/skills#available-string-substitutions) [Claude Code 环境变量](https://code.claude.com/docs/en/env-vars)

## 需要上层处理

- 现有 `createLink` 可以直接返回一个旧的 `base` store 绑定，当前 `reportFromSource` 只查新 `links` 表。如果「已绑定话题」包括这些旧绑定，从旧绑定对应的源会话汇报会被拒绝。建议在路由中按相同的 workspace、频道、帖子、backend 与源会话 ID 校验后纳入查找。已发给上层。

## 验证

- `node --test test/link-control.test.js` 通过 10 项，覆盖 Codex、Claude 当前会话、明确 Claude ID、无效目标/正文/超量与报告隔离。见 `report-tests.log`。
- `node --check src/link-control.js`、`node --check scripts/link-session.js` 和 `./scripts/link-session.js --help` 通过。
- 按本派发范围使用本机测试套接字，无真实 Slack 写入。上层负责路由、安装与发布验收。

## 产物

- `src/link-control.js` 的 `startLinkControl({socketPath,onLink,onReport})` 根据显式 `operation:'report'` 交给 `onReport({operation,threadId,target,backend?,text})`。成功沿用 `{link,reply}`。未确认的汇报建议先检查 Slack，再决定是否重试。
- `scripts/link-session.js` 的 `--report <text>`，以及 `skills/slack-bot/SKILL.md` 说明。
- `test/link-control.test.js` 的 CLI 与套接字传输测试。

## 写入 memory

无。

## 附件

| 文件 | 内容 | 何时查看 |
|---|---|---|
| `report-tests.log` | 本机入口测试输出 | 核对测试范围 |
