---
id: T04/S05
status: DONE_WITH_CONCERNS
---
# 结果 — Slack 离线补录

## 结论

- 已实现按绑定 Slack 工作区和频道补录。首次监听时保存起点，重启、Socket Mode 重连和事件限流后分页重扫可读根消息及线程。重扫成功才更新 SQLite 检查点。
- 旧消息只进入记忆。编辑和删除走原有撤回路径，文件失去频道访问时撤回缓存引用。Bot 历史回流保留自身身份和 Slack 发送键，可核对先前未知的送达。
- 集成入口为 `createCatchup({slack,store,onEvent,report})`。Slack 的 `onConnection(online,enrolledAt)` 接到 `catchup.setOnline`。恢复前等待 `ready()`，模型提交和公开结果发送前等待 `revalidate(scope)`。已校验的在线连接上，这两个调用不查 Slack 历史或数据库。
- 分页失败、频道失权、连接中断或发现旧版本时拒绝放行缓存。未登记的历史讨论和 Slack 已不保留的消息仍属于覆盖缺口。

## 需要上层处理

1. 真实应用仍需完成频道登记后，验证安装的 bot token 可读取该频道的 `conversations.history` 和 `conversations.replies`。权限不足时现有门控会拒绝使用缓存，产品提示可要求用户提供消息链接或附件。见 [Slack history](https://docs.slack.dev/reference/methods/conversations.history/) 和 [Slack replies](https://docs.slack.dev/reference/methods/conversations.replies/)。
2. Slack 独立重连时需要触发桥接恢复，避免后端仍在线且任务终止事件在断连期间被门控拦截后无法补发。已将建议发给负责 `main.js` 的上层。补录与对账本身不会发布任何消息。

## 验证

- `node --test test/catchup.test.js` → 8 项通过。覆盖游标分页和时间分页、旧线程补录、重启编辑与删除、失败门控、断连竞争、频道权限变化、Slack 送达核对和文件撤权。
- `npm test` → 57 项通过，0 失败。Node 输出内置 SQLite 的实验特性警告。
- `node --check src/catchup.js && node --check src/slack.js && node --check test/catchup.test.js` → 通过。

## 产物

- `slack-codex-bridge/src/catchup.js`
- `slack-codex-bridge/src/slack.js`
- `slack-codex-bridge/test/catchup.test.js`

## 写入 memory

无。

## 附件

无。
