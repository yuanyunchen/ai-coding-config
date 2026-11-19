---
id: T04/S06
status: DONE
---
# 结果 — T04/S06 安静模式延迟基准

## 结论

- 48 轮模拟分别覆盖慢附件、慢模型，以及默认安静、显式进度。每项有 48 个样本。入站到后端接受 p95 为 162 ms，入站到最终答复送达 p95 为 199 ms，事件到显式进度送达 p95 为 165 ms。所有样本均送达或被后端接受。
- 24 个安静请求在最终答案前均未发帖。24 个显式请求各发送一次进度、更新一次进度和发送一次最终答复。中英文两条纯问候均无发送或后端启动。
- 主任务在 Codex 服务结束排空后补测了真实 Codex 和模拟 Slack。两轮中英文最终答复为 4112 ms 和 2687 ms。主任务记录的真实 Slack 单样本为 7791 ms，线上分布仍需更多样本。

## 需要上层处理

无。

## 验证

- `node --test test/latency.test.js`：6/6。慢附件与慢模型回归以门闩验证顺序，未设耗时门槛。
- `npm test`：109/109。
- 核对最终基准 JSON 的 48 个请求、144 个时间样本、投递次数、逐项 p95 和纯问候。
- 真实 Codex 对照采用主任务恢复后实测。续派期间 RPC 曾因服务排空拒绝，期间的失败尝试未作为延迟样本。

## 产物

- [基准及运行口径](../../deliverables/latency-results.md)
- [安静模式逐样本记录](../../deliverables/quiet-bench.json)

## 写入 memory

无。

## 附件

无。上一轮回执版本保留于 [result-r1.md](result-r1.md)。

使用 skill：ponytail、workspace-management、superpowers:test-driven-development、superpowers:systematic-debugging、superpowers:verification-before-completion
