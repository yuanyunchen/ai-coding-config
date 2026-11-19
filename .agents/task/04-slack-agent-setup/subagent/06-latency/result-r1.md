---
id: T04/S06
status: DONE
---
# 结果 — T04/S06 延迟基准

## 结论

- 模拟 Slack 基准通过。24 轮共有 48 个确认回执和 48 次公开进度操作，p95 分别为 13 ms 和 164 ms，96 项均首次送达。24 轮的第二条回执均在首条的慢附件或慢模型提交结束前到达，最终答复均有送达记录。
- 真实 Codex 加模拟 Slack 的两轮中英文冒烟通过，复用上下文，回执分别为 3 ms、5 ms。脚本直接注入桥接入口并即时确认模拟发送。模拟基准通过 Slack 适配器且给发帖或更新增加 8 ms 延时。两路数据采样范围不同。
- 样本覆盖正常在线模拟条件。真实 Slack、网络和限流须使用目标频道验收。在慢模型场景，桥接已收到的首次进度会等同线程提交返回。模拟的 150 ms 等待对应首次进度 p95 164 ms。

## 需要上层处理

无。烟雾测试复跑曾在结束时晚到的通知触发已关闭数据库访问。主任务调整关闭顺序后，重新运行成功且正常退出。全量测试曾因并行开发的补拉模块尚未写入而短暂失败，模块落盘后全量绿。

## 验证

- `node --test test/latency.test.js`：4/4。慢附件与慢模型均用异步门闩断言顺序，测试没有延迟门槛。
- `node scripts/bench-latency.js`：退出 0，复核样本、尝试次数、终态与百分位。
- `node scripts/smoke-pipeline.js`：关闭顺序修复后退出 0，完成 2 轮。
- `npm test`：53/53。
- `python3 -m json.tool`：交付 JSON 可解析。

## 产物

- [基准脚本](</Users/yuanyunchen/Desktop/AI Programing/Play for Fun/slack-codex-bridge/scripts/bench-latency.js>)
- [延迟回归测试](</Users/yuanyunchen/Desktop/AI Programing/Play for Fun/slack-codex-bridge/test/latency.test.js>)
- [测量口径和结果](../../deliverables/latency-results.md)
- [逐样本数据](../../deliverables/latency-results.json)

## 写入 memory

无。

## 附件

| 文件 | 内容 | 何时查看 |
|---|---|---|
| [mock-results.json](mock-results.json) | 模拟基准命令标准输出 | 校验样本或统计 |
| [real-codex-smoke.json](real-codex-smoke.json) | 真实 Codex 最终复测标准输出 | 校验两轮对照 |
| [test-output.txt](test-output.txt) | 全量测试原始输出 | 校验测试通过数 |

使用 skill：ponytail、workspace-management、superpowers:test-driven-development、superpowers:systematic-debugging、superpowers:verification-before-completion
