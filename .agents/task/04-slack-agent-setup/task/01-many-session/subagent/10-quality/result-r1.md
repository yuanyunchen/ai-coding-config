---
id: T04.01/S10
status: DONE_WITH_CONCERNS
---
# 结果 — T04.01/S10 双角色对话质量取样

使用 skill：ponytail、superpowers:verification-before-completion

## 结论

- 已交付 24 个场景的 A/B 盲包，覆盖认证所有者和内部成员的中文与英文请求。两臂各完成 30 个真实 Codex 回合。O05、O06 的主动通知与沉默路径由桥接路由处理，未启动模型。样本、模型原文、桥接后的公开内容和模拟回执都已保存。本派发不评分。
- 对照是桥接提交 `834b20bc78fcd38583f936c80b57a47f7577f86a`。候选是启动时冻结的工作树，逐文件校验和附后。两臂均使用 `gpt-6.2-sol`、`low`、默认服务层、临时独立会话、只读执行与无审批环境。模型输入来自桥接及合成历史，未包含判分键。
- 执行了实际路由、内存 SQLite、Slack 富文本构造以及本地图渲染。Slack 发帖、编辑、上传、历史在线边界、所有者正在跑的构建及后端进展均用替身。三张输入截图均是实际上传给模型的合成 PNG。未调用真实 Slack。

## 需要上层处理

1. 将 [A/B 观察](blind-paired/observations.json) 和同目录匿名 PNG、题集、判分键、量表交两位独立盲评。内部 [版本映射](blind-paired-mapping.json) 不进入评审材料。
2. O08 的主要回放中两臂首次都未生成图片。一臂在后续回复才产生上传超时。将这个时序差异连同 [固定回执补充对照](blind-paired/o08-controlled-receipt.json) 交评审。补充对照预置首段图文，原帖文字确认、PNG 上传超时后，两臂再各运行一次真实追问。O02 走了实际所有者 steer 分支，但构建和接管恢复为夹具，仅能核对原逻辑回合身份。
3. 冻结后活动工作树的 `bridge.js`、`codex.js`、`dialog.js`、`routes.js` 已变化。该批分数归属冻结快照。若用于确认更新版质量，需用更新源码重跑相关路径。

## 验证

- 逐案对比两个臂的入站与预置事件 → 24 个配对输入一致。A/B 两个角色各有 24 份版本观察。
- 模型事件原文 → 各臂 30 个回合完成，均无命令执行，真实 Slack 回执及调用为 0。
- 两臂各有 O04 和 M05 的成功渲染 PNG 与替身确认。检查盲包 PNG 文件签名 → 通过。O08 超时单列，结合观察时序解释。
- 独立复核静默/无回执与显式回应 → 盲包逐事件含真实模型调用计数、实际公开文本、原帖、模拟文件回执和本地错误观察。

## 产物

- [24 案 A/B 盲包](blind-paired/observations.json)
- [版本映射](blind-paired-mapping.json)
- [固定回执补充对照](blind-paired/o08-controlled-receipt.json)

## 写入 memory

无。

## 附件

| 文件 | 内容 | 何时查看 |
|---|---|---|
| [run.mjs](run.mjs)、[fixtures.mjs](fixtures.mjs)、[model.mjs](model.mjs) | 本地桥接重放及真实模型连接 | 复现实验 |
| [source-sha256.txt](source-sha256.txt) | 两臂运行源码的 SHA-256 | 确认快照差异 |
| [runs/candidate](runs/candidate)、[runs/baseline](runs/baseline) | 每案原始模型回答、提示输入、收件及媒体记录 | 排查失败路径 |
| [pilot](pilot) | 纠正历史/隔离夹具之前的试跑原文 | 检查重复试验与夹具改动 |
| [runs-controlled-receipt](runs-controlled-receipt) | 两臂 O08 固定回执的原始观察、PNG 和模型回复 | 验证区分文本与附件的条件 |
