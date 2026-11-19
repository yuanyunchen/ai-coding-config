---
id: T04.01/S06
status: DONE
---
# 结果 — T04.01/S06 本人 Slack 插话及同回合继续

## 结论

- Codex 0.169.0 真实 app-server 收到 `SessionRouter.dispatch` 传入的本人 Slack 正文。模拟模型在原回合的后续请求中看到了原任务、先前历史和这次正文。回合历史和启动事件均只包含测试的原有回合。
- 套接字可访问时，原回合调用真实 `exec_command`，运行仓库的 `slack-bot` CLI 经隔离的 `startLinkControl` 和生产 `reportFromSource` 发出一条模拟 Slack 回复。模拟回执挂起期间，模型未开始原工具。放行后，模型收到 `Slack 已确认送达。`，执行原 shell 工具，并在同一回合完成。
- 默认只读且禁止审批时，真实 shell 返回套接字权限错误。生产 `thread/resume` 令桥接器收到同一回合的 `commentary` 回复标记，桥接器随后发出一条模拟 Slack 回复。将模拟回执挂起，原 shell 工具和回合仍能先完成，回执放行后记录为 `answered`。

## 需要上层处理

无。只读备用路径的发送与原任务继续是异步的，不能保证原工具等待 Slack 的网络回执。验证使用真实本地 app-server、生产路由与 CLI，模型和 Slack 发送使用合成响应，未访问真实 Slack 或私人凭据。

## 验证

- 在 `slack-codex-bridge` 根目录执行下列命令，9 项通过、0 失败、0 跳过。

```sh
node --test --test-concurrency=1 test/exact-thread.test.js test/direct-inbox.test.js \
  '../ai-coding-config/.agents/task/04-slack-agent-setup/task/01-many-session/subagent/06-exactqa/steer.test.mjs' \
  '../ai-coding-config/.agents/task/04-slack-agent-setup/task/01-many-session/subagent/06-exactqa/owner-steer.test.mjs'
```

- 本人完整 CLI 路径 → 同一回合及请求线程，且在回执后执行原工具。
- 只读备用路径 → 同一回合及请求线程，原工具能先于网络确认继续。
- 非本人抽样路径及仓库现有精确路由回归 → 通过。

## 产物

只写派发目录。未修改桥接仓库文件。

## 写入 memory
无。

## 附件

| 文件 | 讲什么 | 什么时候看 |
|---|---|---|
| `owner-steer.test.mjs` | 生产路由、真实 app-server 和 CLI、合成模型与 Slack 的两种权限验证 | 复测同步回执和只读备用路径 |
| `owner-steer-evidence.log` | 9 项测试输出和两条回复路径的模型阶段 | 复核测试结果 |
