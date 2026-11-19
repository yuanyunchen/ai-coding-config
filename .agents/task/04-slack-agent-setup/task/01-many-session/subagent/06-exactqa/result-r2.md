---
id: T04.01/S06
status: DONE_WITH_CONCERNS
---
# 结果 — T04.01/S06 thread/sample

## 结论

- 在真实 Codex 0.169.0 app-server 上，`thread/sample` 从准确的已载入会话读取过去的用户消息和助手回复，也将新 prompt 发给合成模型。返回的 `sourceTurnId` 命中原回合。原客户端实际还在等待模型响应时，另一个客户端也成功抽样并看到了正在运行的用户输入。
- 标准 Responses 模式下，`disableMcp: true` 后工具列表仍列出合成 MCP。模型发出该工具调用后，抽样 API 返回 `text: null`，MCP 进程的调用记录文件没有创建，推理也没有继续发出下一次请求。
- 成功抽样返回文本，但 `thread/read` 的源会话仍只有原回合。下一次在原会话启动的原生回合也看不到抽样 prompt 或回复。需要模型未来记住这段交流时，可另用 `thread/inject_items`，其历史可见性已由首轮验证。

## 需要上层处理

- 抽样需要实验能力及已载入的原会话。测试没有覆盖真实桌面模型、真实 Slack、发信账号或重启后的会话加载。
- 抽样保留原会话上下文。发布抽样生成的文本前，仍需按绑定对话的共享范围判断源会话里的私有内容。测试中的所有历史与 MCP 工具都是合成数据。
- `disableMcp` 的工具列表过滤只适用于生成协议所述的 Responses Lite 增量工具。普通 Responses 依赖抽样 RPC 不执行工具的行为。对 `text: null` 应保留现有不发布路径，避免生成无内容的 Slack 回复。

## 验证

- `node --test sample.test.mjs` → 1 通过。准确的来源历史、真实运行回合中的抽样、未执行 MCP、抽样结果没有进入原会话历史均有断言。
- 本次验证只写派发目录。桥接仓库的真实 app-server 基础测试及首轮全量状态见 `result-r1.md)。

## 产物

无新的桥接仓库文件。

## 写入 memory

无。

## 附件

| 文件 | 讲什么 | 什么时候看 |
|---|---|---|
| `sample-evidence.log` | 原会话抽样、模型尝试 MCP、原回合仍运行时的测试输出 | 复核本轮结果 |
| `sample.test.mjs`、`experimental-client.mjs` | 隔离 app-server 与合成 Responses/MCP 的复现代码 | 复测协议或 Codex CLI 版本 |
| `result-r1.md` | 直接启动团队回合、普通会话降权失败、原会话注入历史的首轮测试 | 对比原生回合和抽样 |
