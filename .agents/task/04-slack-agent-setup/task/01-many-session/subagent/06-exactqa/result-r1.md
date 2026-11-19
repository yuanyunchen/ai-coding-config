---
id: T04.01/S06
status: DONE_WITH_CONCERNS
---
# 结果 — T04.01/S06 exactqa

## 结论

- Codex CLI 0.169.0 的真实 app-server 可让第二个客户端在已存在、从建立时就按团队权限运行的会话里直接启动回合。两客户端都收到原会话 ID 下的新回合，原会话最近回合记录命中同一 ID。回合保留此前的用户消息和助手回复。验证使用独立临时配置与本地合成推理接口，未使用用户凭据或真实 Slack。
- 已载入的普通个人会话不能用这些 RPC 参数可靠地降权。实验开启后，`environments: []` 能阻止合成 shell 命令运行。即使用 `readOnly`、禁止沙箱网络、禁用插件 ID，外加在 `thread/resume` 请求禁用合成 MCP，已载入会话仍向模型提供该 MCP。合成工具在 `never` 和 `untrusted` 两种审批策略下均返回了 `MCP_MARKER_EXECUTED`。
- `thread/inject_items` 可把合成用户消息放到原会话的模型历史。它没有触发推理，也没有发出可作为桌面可见回合的 `item/*` 或 `turn/*` 事件。下一次显式启动的原会话回合能读取该消息。

## 需要上层处理

- 仅可在已经过团队权限验证的目标会话上直接启动自动回合。普通个人会话若要保留准确 ID，优先用原会话主动处理的收件方式，并把 Slack 发送权限限定在确切绑定的消息归属。原会话整体历史是否适合用于共享回复仍需由该会话处理人判断。
- 普通会话未启用分页历史时，`thread/turns/list` 实测返回 `-32601 list_turns is not supported yet`。现有团队会话历史校验不可直接套到普通会话。订阅前已结束的普通回合没有经过恢复测试。
- 全量测试运行 123 项，121 项通过。生成媒体的两项失败源自普通回复的前导空格和尾换行被截掉，以及上传把流对象传给 `createReadStream`。本派发只修改 exact-thread 测试，未修这些文件。

## 验证

- `node --test test/exact-thread.test.js` → 通过。真实 app-server、两个 WebSocket 客户端、全本地的 SSE 模型替身保留原会话 ID 和历史，两客户端均观察到完成。推理请求无 Authorization，未出现 MCP 工具。
- 实际 `turn/start`，未声明实验能力 → 拒绝 `environments: []`。声明 `experimentalApi: true` 后通过。
- `node --test experimental-exec.test.mjs experimental-mcp.test.mjs experimental-mcp-untrusted.test.mjs experimental-inject.test.mjs` → 输出见附件。原会话复用可用，个人会话隔离不足。
- `npm test` → 121 通过 / 2 失败（详见上节）。新增 exact-thread 测试通过。

## 产物

- `slack-codex-bridge/test/exact-thread.test.js`

## 写入 memory

无。

## 附件

| 文件 | 讲什么 | 什么时候看 |
|---|---|---|
| `protocol-evidence.log` | 原会话隔离、合成工具输出、注入事件验证 | 审核降权边界 |
| `experimental-client.mjs`、`experimental-*.test.mjs` | 使用已安装 app-server 和回环模型的复现实验 | 复测 app-server 版本或协议行为 |
