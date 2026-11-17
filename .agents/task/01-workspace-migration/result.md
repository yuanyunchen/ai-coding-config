---
id: T01
status: DONE
---
# 结果 — T01 迁移 Harness 并建立可追溯工作区

## 结论
实体配置仓已迁到当前目录并接入 workspace-management v4；保留 Git 全历史、原有工作树改动和旧路径入口。README 可直接查看配置、任务、对话、历史及后续升级入口。

## 需求验收
| 要求 | 结果 | 证据 |
|---|---|---|
| R1 迁移实体仓、保留历史与改动 | 通过 | 3098 个原路径核对，52 个原提交连续，22 项既有改动保留 |
| R2 v4 工作区管理 | 通过 | ws init 创建结构，T01 记录目标/计划/进度/结果，ws index 生成地图 |
| R3 具体文件与历史可查看 | 通过 | README 导航、Git 全历史文本、历史来源导航与本轮 Q&A |
| R4 原路径与管理命令可用 | 通过 | 新旧 help、memory status、deploy --dry-run 均成功 |
| R5 后续升级可继续 | 通过 | T02 保持 planned，已写审计范围、逐阶段判据与实施计划 |

## 需要上层处理
- 后续从 T02 开始系统审计，核验既有未提交改动的归属与源仓/运行目录差异。
- ws 的历史基线过期提醒来自迁移前就存在的 scripts/config 工作树改动；哈希清单精确记录了这部分状态。本轮不提交或覆盖它们。
- Codex 本轮使用现有 wslib 手动补录 Q&A；后续兜底已进入项目 AGENTS.md，没有注册新 hook。

## 验证
- 原路径逐项核对：仅 README.md、CLAUDE.md 有预期的入口补充，其他原文件内容及软链不变。
- 原有全部 Git 历史保留；原工作树状态的每一项仍在。
- 新旧路径 help、memory status 和完整 deploy --dry-run：退出码均为零。
- 现有测试：12 项通过；本轮未新增实现或测试。
- 已监测的全局规则、settings、Codex config 与 workspace-guard 内容均未变化。
- 本轮索引、链接与生命周期检查：结果见 deliverables/workspace-check.json、links-check.json。

## 产物
- [入口](../../../README.md)、[工作区地图](../../../AGENTS.md)
- [后续升级任务](../02-harness-upgrade/task.md)、[计划](../02-harness-upgrade/plan.md)
- [本轮 Q&A](../../conversation.md)、[历史来源](../../memory/history-sources.md)

## 写入 memory
- .agents/memory/harness-baseline.md
- .agents/memory/history-sources.md
- 全局定位卡与时间线补充当前机器位置；旧机器历史单独保留，过长历史无损拆片。

## 附件
| 文件 | 讲什么 | 何时看 |
|---|---|---|
| [verification.json](deliverables/verification.json) | 文件、历史和命令的迁移核对 | 验收 |
| [cli-checks.json](deliverables/cli-checks.json) | 管理命令及 dry-run 全输出 | 路径或部署排错 |
| [existing-tests.txt](deliverables/existing-tests.txt) | 已有测试输出 | 回归复核 |
| [workspace-check.json](deliverables/workspace-check.json) | 工作区结构和已知提醒 | 接手 |
| [links-check.json](deliverables/links-check.json) | 新入口引用存在性 | 导航异常 |
| [migration-before.json](input/migration-before.json) | 迁移前所有受控路径 SHA-256/软链 | 追溯 |
| [pre-existing-changes.txt](input/pre-existing-changes.txt) | 原有未提交改动 | 升级基线 |
| [git-history.txt](input/git-history.txt) | 原仓完整提交记录 | 历史回溯 |
