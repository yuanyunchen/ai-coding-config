---
id: T04.01/S06
status: DONE
---
# 结果 — T04.01/S06 活跃原回合插话复核

## 结论

- 真实 Codex 0.169.0 app-server 检测到 `inProgress` 的原回合，`turn/steer` 返回该回合的 ID。抽样先于原回合完成，读取到了先前的用户和助手历史及当前原任务，并返回了合成 Slack 答复。
- 抽样模型发出合成 MCP 调用后返回 `null`，本地工具调用标记仍不存在。解除原任务的响应闩锁后，原回合执行了自己的合成 MCP 工具，并在原回合 ID 下完成。
- Codex 收到插话时会在同一回合里重新发起模型请求。原回合运行中的重发及后续推理只收到固定提示。合成 Slack 原文和抽样答复均未进入原模型请求或持久回合历史。回合启动事件和持久回合数都没有增加。

## 需要上层处理

无。底层模型流存在重发。可以保证本次复核中的原任务继续并在同一回合完成，无法保证进行中的模型流保持不变。本次为协议和生产连接器冒烟验证，真实 Slack 和线上模型未接入。

## 验证

- 在 `slack-codex-bridge` 根目录执行 `node --test test/exact-thread.test.js '../ai-coding-config/.agents/task/04-slack-agent-setup/task/01-many-session/subagent/06-exactqa/steer.test.mjs'` → 2 通过、0 失败。
- 原回合仍在运行时读取状态、发固定 `turn/steer`、用生产 `sampleText()` 取同源文本 → 通过。
- 抽样时模型尝试调用 MCP、原回合解闩后实际调用 MCP → 抽样未执行、原任务成功执行。
- 两个客户端、原回合 ID、原模型输入、原回合最终记录及启动事件核对 → 同源、无额外回合、无 Slack 原文和抽样回复泄入。

## 产物

只写派发目录。仓库代码没有修改，未访问 Slack 或私人凭据。

## 写入 memory

无。

## 附件

| 文件 | 讲什么 | 什么时候看 |
|---|---|---|
| `steer.test.mjs` | 两个客户端、真实 app-server、合成 Responses 及 MCP 的运行脚本 | 复测同回合转向、取样、随后完成 |
| `steer-evidence.log` | 本次原始测试输出 | 复核结果和模型调用次序 |
