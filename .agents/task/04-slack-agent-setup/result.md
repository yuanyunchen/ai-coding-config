---
id: T04
status: DONE_WITH_CONCERNS
---
# 发布与验收 · Ethan’s Bot

## 结论
Columbia University 的 #random 和 #test 已启用。本地源码提交 c551570。launchd 正在运行，运行目录文件与源码一致。显示名为 Ethan's Bot (local)。

## 核验
- 真实私有 #test：已确认成员资格、创建[测试线程](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794957283609919)、回读团队 Codex 中文回答和源会话的直接进度汇报。另有真实成员在频道发起 @ 并收到答复。
- Codex 双客户端与真实 TUI 续接测试通过。测试帖实际使用独立团队会话，ID 为 01a1ebca-8e9f-7693-886c-7acd0736d9e5。私人源历史留在本机。
- 发布版 110 项回归通过。多对多选路、线程隔离、迟到重投、主动进度开关、问候静默、语音/文件、输出方向与恢复均有覆盖。
- Codex 已发现并启用 slack-bot；Claude、Codex、配置仓的 skill 内容一致。Claude Code 真机收到测试输入，模型最终回答受账号周额度限制。
- Quiet 基准包含 48 轮模拟负载。真实 #test 有线上样本，低样本量不足以认证生产 p95。

## 需要上层处理
真实 Claude 模型回复需等待账号额度恢复。两个真实内部成员先后发令及足够线上样本的 p95，需正常使用积累。Slack 发令权限与消息受众不同，同一频道的读者均可看见输出。

## 产物
[关联指南](deliverables/session-pairing.html) · [安静模式延迟](deliverables/latency-results.md) · [自动测试](deliverables/release-tests.txt) · [终审发现](subagent/08-final-check/result.md)。

## 审查处置
未通过恢复权限核验的绑定会冻结；Slack 内部错误保留未知交付状态；桌面离线输出按检查点恢复；过期源资料经权限与版本对账后恢复；多来源选路修复 /to 污染默认和迟到重投串线。详见回归与各派发结果。
