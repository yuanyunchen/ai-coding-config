---
id: T04.01/S08
status: DONE_WITH_CONCERNS
---
# 结果 — T04.01/S08 撤回与接管实现

## 结论

已修复接管期间的乱序撤回与附件撤销。删除或编辑现在按 Slack 消息身份保留取消记录，旧正文和撤回的控制命令均不会重播。队列清理先记录频道的文件撤销，持久收件重放前再次校验同一记录。没有正文和可用附件的请求不会启动空回合。七条本地回归全部通过。

## 需要上层处理

1. 审阅发现，非所有者的固定旁路提示在等待 Codex 回合信息返回后的授权回调仅核验接管授权，领取后的撤回会阻止原正文和附件，仍可能发送这条无正文的固定提示。若要保证撤回也抑制该提示，可在上层负责的授权回调检查取消状态。未对该提示执行新的时序夹具。
2. 用真实 SessionRouter、Bridge 和独立 SQLite Store 测试，Slack 与 Codex 是本地替身。重启用重建路由对象复用持久数据模拟。未联系真实 Slack、部署、提交，未验证已经由 Codex 确认接收的内容撤销。

## 验证

| 用例 | 修复前 | 完成后 |
| --- | --- | --- |
| 排队后撤回，接管前后重投 | 通过 | 通过 |
| 删除或编辑早于旧正文 | 旧正文进入新会话 | 通过 |
| 删除早于迟到的静音命令 | 新会话被静音 | 通过 |
| 接管前后附件撤销，且另一频道独立 | 撤销附件被解析 | 通过 |
| 撤销唯一已排队附件 | 启动空回合 | 通过 |
| 频道已记录附件撤销，但队列清理前重启 | 旧队列携带撤销附件 | 通过 |
| 活动路由等待 Codex 加载时撤销唯一附件 | 启动空回合 | 通过 |

- `node --test test/handoff-revocation.test.js test/direct-inbox.test.js test/exact-controls.test.js test/routing-acceptance.test.js` → 29 项通过。
- `npm test` → 166 项通过，零失败、取消和跳过。
- `git diff --check` 和两个改动文件的 Node 语法检查 → 通过。

## 产物

- `slack-codex-bridge/src/routes.js` 的撤回、控制与文件可见性处理。
- `slack-codex-bridge/test/handoff-revocation.test.js` 的本地回归。

## 写入 memory

无。

## 附件

| 文件 | 内容 | 使用场景 |
| --- | --- | --- |
| `implementation-red.txt` | 原有撤回重投保护保持绿，另四项行为断言失败 | 复查修复前行为 |
| `restart-file-red.txt` | 模拟队列清理前重启的失败输出 | 复查重启边界 |
| `active-file-red.txt` | 活动接收加载时启动空回合的失败输出 | 复查活动接收边界 |
| `integration-green.txt` | 七项撤回回归和已有关联回归通过 | 复查整合结果 |
| `suite.txt` | 完整仓库测试输出 | 复查全量回归 |

使用 skill：ponytail、superpowers:systematic-debugging、superpowers:test-driven-development、superpowers:verification-before-completion
