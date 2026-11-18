---
id: T04.01/S10
status: DONE_WITH_CONCERNS
---
# 结果 — T04.01/S10 双角色质量修复与影子复测

使用 skill：ponytail、superpowers:systematic-debugging、superpowers:test-driven-development、superpowers:brainstorming、superpowers:writing-plans、superpowers:verification-before-completion

## 结论

- 普通团队工作者只向模型装载当前 Slack 讨论证据。全文检索、议题摘要、决策和附件引用均按线程限域。频道概述保留独立的原有入口。M11 初版在提示和回复中出现相邻帖金额，修后两处都没有该金额，模型说明附件无法读取并请求重新提供。
- M06 的组合致谢、O12 的英文确认致谢被路由直接忽略。M07 的英文同线程订阅保留为本地控制并收到一次里程碑。O05 的同内容进度只发送一次，取消后保持静默。
- 保守迁移旧共享 worker 绑定。旧数据库首次打开时撤销旧共享会话标记，已有外部提交的旧请求停止重放，保留未提交请求和 Slack 历史。后续团队请求在同帖从新 worker 继续。真实桌面所有者的 exact 授权不使用这些绑定记录，迁移不读写其模型会话。
- 同模型、同夹具重跑了全部 24 项。修后完成 27 个真实模型回合，Slack 使用本地替身。原盲包不变，修后数据与初版候选组成独立的 A/B 盲包，供两位评审使用。

## 需要上层处理

1. 将 [修复盲评材料](blind-repair/observations.json) 和同目录 PNG 交给审阅者。[修复版本映射](blind-repair-mapping.json) 单独保留。新版快照包含同时合入的其他桥接修复，不能把所有回答变化单独归因于本派发。
2. 首次全量回归的 7 个失败都在独立进程崩溃夹具启动时发生。它的 Slack 工作区或频道 ID 过短，在生产标识验证入口被拒绝。其余 175 个通过，相关专项 53 个全过。全量结果仍需夹具修复后复验。
3. 旧共享会话的公开历史仍留在 Slack，之前已显示的消息不因本地模型轮换而撤回。使用独立本地操作发报告时，旧的会话授权仍然失效。

## 验证

- [首批红灯](followup-red.log) → 5 个确定性复现。分别覆盖跨帖证据、组合致谢、英文订阅与重复进度。
- [迁移红灯](migration-red.log) → 新迁移测试单独失败，其余 52 个通过。
- [专项复验](followup-green.log) → 53 通过，0 失败。覆盖同帖检索、邻帖及其他工作区隔离、游标依赖、旧会话拒绝重连及新绑定重启保留。
- [修后模型重放](repair-shadow.log) → 24 案完成，27 个真实模型回合完成。M06、M07、M11、O05、O12 按阶段检查了模型启动、回复、里程碑和金额范围。无实际 Slack 调用。
- 改动源码通过 Node 语法校验和 `git diff --check`。匿名包有 24 对、48 个 A/B 观察，源码 SHA-256 校验通过。

## 产物

- [修复前后匿名盲包](blind-repair/observations.json)
- [修复前后身份映射](blind-repair-mapping.json)
- [原始配对取样结果](result-r1.md)

## 写入 memory

无。

## 附件

| 文件 | 内容 | 何时查看 |
|---|---|---|
| [repair-source-sha256.txt](repair-source-sha256.txt) | 修后冻结源码 SHA-256 | 复核样本对应源码 |
| [runs/patched](runs/patched) | 修后逐案原文、完整实际提示和模拟回执 | 追溯具体回复 |
| [followup-suite.log](followup-suite.log) | 首次全量回归输出 | 排查进程夹具 |
