---
id: T04.01/S06
status: DONE
---
# 结果 — T04.01/S06 thread/sample 复核

## 结论

- Codex 0.169.0 的真实 app-server 可以从准确的现有会话取样。回复的 `sourceTurnId` 命中最新回合，模型输入包含该会话过去的用户消息、助手回复和当前抽样问题。原回合仍运行时，取样也能读取刚开始的用户内容。
- 合成 Responses 接口发出 MCP 调用时，取样返回 `text: null`，没有执行 MCP，也没有再次请求模型。用同一工具和同一会话运行普通回合作为正对照，工具确实写出了调用标记，结果也回到了模型。
- 当前仓库的 `sampleText()` 通过同一组隔离测试。取样未改变源会话的最新回合，后续普通回合的历史未包含抽样内容。

## 需要上层处理

无。取样协议的已知限制已在 `result-r2.md` 留档。若生产会话不支持分页历史，`thread/read` 加 `includeTurns: true` 在本次合成会话复测中能读取正在运行的最新回合。

## 验证

- 派发目录 `node --test sample.test.mjs` → 1 项通过，使用真实 app-server 与本地合成模型、MCP。
- 在内存中用仓库生产连接器和 `sampleText()` 重跑合成模型与 MCP 测试 → 1 项通过。
- 在内存中追加普通回合执行工具的正对照 → 1 项通过，确立工具可以运行且调用标记有效。
- 用真实 app-server 验证传入旧的 `expectedTurnId` → 返回 `-32600 sample source turn must be the latest turn`，模型请求计数没有增长。
- 在仓库运行 `node --test test/exact-thread.test.js` → 1 项通过。

## 产物

无仓库修改。测试未访问真实 Slack 或私人凭据。

## 写入 memory

无。

## 附件

现有 `sample.test.mjs` 可复现基础协议测试。现有 `result-r2.md` 记载协议限制。
