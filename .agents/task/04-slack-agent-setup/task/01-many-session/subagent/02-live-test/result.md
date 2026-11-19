---
id: T04.01/S02
status: DONE_WITH_CONCERNS
---
# 结果 — T04.01/S02 Slack 目的地与断连恢复验证

使用 skill：workspace-management、ponytail、slack:slack-cli、slack:slack-api、superpowers:systematic-debugging、superpowers:verification-before-completion

## 结论

- 已验证指定的 [私有 #test](https://app.slack.com/client/T0B2PK88RJ5/C0CJN63KC66)。Slack CLI 唯一已认证工作区为 `columbiaunive-zxm5569`（`T0B2PK88RJ5`）。应用 `A0CJMTC8BEE` 已安装，机器人和工作区负责人都是 `C0CJN63KC66` 的成员。频道未归档、未与外部组织共享。
- 本机 Codex RPC 冒烟通过。测试向独立合成会话提交一条明确指定 `gpt-6.2-sol` 与 `high` 的请求。排干桥接工作后断连并关闭 SQLite，模型完成后重新连接并打开数据库。两次恢复及重放同一入站事件之后，仍只有同一会话的一个 turn，只有一条模拟 Slack 最终回执。真实 Slack 发帖数为 0。

## 需要上层处理

- 真实 Slack 发言和整条链路需由上层在获得授权后验证，这份派发只读取频道和会籍。已确认的工作区与频道无需替换。
- 本机 App Server 0.169.1 首次在桌面目录下启动合成项目时返回 `failed to load AGENTS.md instructions for environment local: Operation not permitted`。同一测试改用可读的空目录 `/private/var/empty` 后通过，SQLite 仍在派发目录内的临时路径。若部署依赖用户当前桌面项目，要单独验证 daemon 能读到实际项目与会话；默认专用项目不在 Desktop。
- 只读 `config/read` 返回的默认模型为 `gpt-6.2-astra`、推理强度为 `high`。`model/list` 确认 `gpt-6.2-sol` 支持 `high`。本地 0.169.0 的 schema 确认 `turn/start` 可传 `model` 和 `effort`；合成测试显式设置这两个参数。上线参数仍由上层验证。

## 验证

- `~/.slack/bin/slack auth list` 与 `app list --app A0CJMTC8BEE` 均退出 0，确认唯一已登录工作区和已安装应用。
- 用相同工作区和应用参数查询 `auth.test`，返回 bot user `U0CJRQ32L9J`、bot ID `B0CJFS39EEP`。将 `conversations.list` 的公开和私有频道分别分页至游标耗尽，精确名称 `test` 只出现一次。随后 `conversations.info channel=C0CJN63KC66` 返回 `is_member=true`、`is_private=true`、`is_archived=false`、`is_ext_shared=false`。 [Slack 频道查询](https://docs.slack.dev/reference/methods/conversations.info/)
- `conversations.members channel=C0CJN63KC66` 分页确认 app bot user 和负责人 `U0B2EAU2WN8` 均在频道。 [Slack 会籍查询](https://docs.slack.dev/reference/methods/conversations.members/)
- 在派发目录运行 `node smoke-recovery.mjs "<slack-codex-bridge 仓库绝对路径>"`，退出 0。实际本机 App Server、实际模型、实际 SQLite，Slack 传输使用测试替身。结束后归档合成会话并清理临时 SQLite。早期测试清理曾在关闭数据库后收到归档通知，已移除测试回调并重新获得完整通过结果。

## 产物

- 真实频道只读验证和本机恢复结果见本文件。
- 可复跑的冒烟脚本见 [smoke-recovery.mjs](smoke-recovery.mjs)，最终输出见 [smoke-recovery.json](smoke-recovery.json)。

## 写入 memory

无。

## 附件

| 文件 | 内容 | 何时查看 |
|---|---|---|
| `smoke-recovery.mjs` | 合成事件、真实 RPC、恢复和重复投递断言 | 复现恢复测试 |
| `smoke-recovery.json` | 退出 0 的模型请求和回执计数 | 复核结果 |
