---
id: T04.01/S03
status: DONE_WITH_CONCERNS
---
# 结果 — T04.01/S03 多会话路由验收

## 结论

- 新增七项本地回归，使用真实路由、桥接和 SQLite 存储，模拟 Slack 与 Codex 外部端点。
- 并发与重建路由器后的链接重试均复用原帖和执行会话。多个来源可进入同一 Slack 讨论，单一来源也可接入不同讨论。私人会话使用新的共享执行会话。
- `/use` 按用户保存选择。`/to` 单次指定会话，普通免提及追问仍走默认选择。已验证 Slack 普通事件先到、用户切换会话后收到重投、同讨论上下文共享及跨讨论输入与输出隔离。

## 需要上层处理

1. 路由分派与 Bridge 收件写入分属两个数据库。若故障发生在两者之间，当前重投恢复跳过斜线指令和普通免提及追问。建议由持久分派记录保留或重建已解析输入，再按原分派重投。常规重投测试已通过，未注入此故障。
2. 创建 Slack 根帖发生不确定故障时，重试检查旧写入意图之前已经创建了隔离执行会话。每次重试可能留下一个未绑定会话。建议提前检查写入意图，或持久化并复用已准备的会话。常规并发与重建重试已通过，未向真实端点注入超时。

## 验证

- `node --test test/routing-acceptance.test.js` → 七项通过。
- `npm test` → 102 项通过，零失败、零跳过。
- `node --check test/routing-acceptance.test.js` → 通过。

## 产物

- [routing-acceptance.test.js](</Users/yuanyunchen/Desktop/AI Programing/Play for Fun/slack-codex-bridge/test/routing-acceptance.test.js>)

## 写入 memory

无。

## 附件

| 文件 | 内容 | 用途 |
| --- | --- | --- |
| `npm-test.log` | 全量测试输出 | 回查通过项和数量 |
