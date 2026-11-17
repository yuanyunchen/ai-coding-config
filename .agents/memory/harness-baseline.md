---
summary: 迁移时源仓、运行目录、既有改动和兼容路径的事实基线
type: knowledge
tags: [harness, migration, runtime]
source: T01
status: stable
updated: 2026-11-16
basis: 6df5f0cadb345b12c13f8c5f6f84dc5d657e1546
covers: [scripts/, config/]
---
# Harness 基线

- 实体配置仓位于当前目录；远端仍为 yuanyunchen/ai-coding-config。
- 迁移前 HEAD：6df5f0cadb345b12c13f8c5f6f84dc5d657e1546；分支：main。
- 迁移前主分支提交数：52；版本化及未忽略路径数：3098。
- 迁移前工作树已有 22 项变更，未被本轮覆盖。
- config/ 为仓库快照；实际加载源是各工具 home 中的配置，本轮没有运行 pull/deploy/sync。
- 原路径保留软链；相邻 global-memory 是指向原记忆仓的软链。
- 对话从本次建区开始，原会话与旧整改记录不伪造成新工作区会话。

## 运行目录

| 平台 | 实际运行文件 | 仓内快照 |
|---|---|---|
| Claude | [skills](/Users/yuanyunchen/.claude/skills/)、[规则](/Users/yuanyunchen/.claude/AGENTS.md)、[hooks](/Users/yuanyunchen/.claude/hooks/) | config/skills/、config/AGENTS.md、config/hooks/ |
| Cursor | [skills](/Users/yuanyunchen/.cursor/skills/)、[规则](/Users/yuanyunchen/.cursor/AGENTS.md) | 同一 config/ 树，映射见 CLAUDE.md |
| Codex | [skills](/Users/yuanyunchen/.codex/skills/)、[规则](/Users/yuanyunchen/.codex/AGENTS.md)、[prompts](/Users/yuanyunchen/.codex/prompts/) | config/skills/、config/AGENTS.md、config/commands/，保留平台差异 |
| Trae | [skills](/Users/yuanyunchen/.trae/skills/)、[规则](/Users/yuanyunchen/.trae/AGENTS.md) | 同一 config/ 树 |

2026-11-16 本机核验：codex-cli 0.169.0、Claude Code 2.1.326；通过各 CLI --version 验证。
Claude workspace-guard 已注册到 SessionStart、UserPromptSubmit、PreToolUse、SubagentStop、Stop；读取当前 settings.json 核实。
当前 Codex 环境不存在 ~/.codex/hooks/；本轮用已有 ws 同套 wslib 补录 Q/A，没有注册新 hook。

## 原始证据

- [迁移前逐文件清单](../task/01-workspace-migration/input/migration-before.json)
- [迁移前工作树状态](../task/01-workspace-migration/input/pre-existing-changes.txt)
- [全部既有提交](../task/01-workspace-migration/input/git-history.txt)
- [验证输出](../task/01-workspace-migration/deliverables/verification.json)
