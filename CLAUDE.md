# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 工作区定位

这是改造 **cursor / claude / codex** 三个 agent 工具配置生态的工作区，不是单一应用代码库。核心产物是把三者的 commands / subagents / skills / 全局规则统一管理的脚本，外加几个相互独立的子项目（每个有自己的目标和说明文档）。

## 工作区结构（根目录顶层）

```
AGENTS.md                      中文《工作准则》，由本文件 @AGENTS.md 导入
sync-agent-config.sh           三工具间增量同步配置（详见下）
migrate-cursor-to-claude.sh    把已部署的 ~/.cursor 整体迁移到 ~/.claude
config-links/                  指向真实部署目录的软链接（只读视图，别在此改文件）
cursor-multiagent-system/      多 agent 编排系统，独立 git 仓库，看其 README.md / AGENTS.md
frontend-skills-refactor/      前端 skill 合并实验，有自己的 CLAUDE.md（在此目录工作以它为准）
my-search-skills/              搜索类 skill 调研与对比
meta-skills-manage-skills/     管理 skill 的元 skill / 写作指南
rules-system/                  规则系统设计稿
```

## 部署目录与配置映射（"原文件"在这里）

脚本操作的是真实部署目录，不是工作区内的源码：

```
~/.cursor   ~/.claude   ~/.codex
```

| 配置类别   | cursor          | claude          | codex                       |
|-----------|-----------------|-----------------|-----------------------------|
| 斜杠命令   | `commands/*.md` | `commands/*.md` | `prompts/*.md`              |
| subagents | `agents/*.md`   | `agents/*.md`   | （无此机制，跳过）            |
| skills    | `skills/*`      | `skills/*`      | `skills/*`（`.system` 不动）  |
| 全局规则   | `AGENTS.md`     | `AGENTS.md`     | `AGENTS.md`                 |

Claude Code 只读 CLAUDE.md，因此规则统一的标准做法是 **CLAUDE.md 用 `@AGENTS.md` 导入 AGENTS.md**（本文件即如此），脚本也依赖这一约定。`config-links/` 下的软链接（`agents`、`commands`、`skills`、`skills-disabled` 指向 `~/.cursor/...`，`global-AGENTS.md` 指向 `~/.claude/AGENTS.md`）是这些部署目录的只读视图。

## 用脚本统一配置（都有副作用，先 `--dry-run`）

两个脚本都写入上面的全局部署目录，跑实际写入前先 `--dry-run` 预览。

- **同步**：`sync-agent-config.sh` 以某一工具为**源**，把统一配置**增量**同步到另外两个——只新增/更新同名项，**绝不删除**目标里已有的东西。
  ```bash
  ./sync-agent-config.sh                 # 默认以 claude 为源（canonical），同步到 cursor + codex
  ./sync-agent-config.sh --source cursor # 改以 cursor 为源
  ./sync-agent-config.sh --dry-run       # 只预览，不写文件
  ./sync-agent-config.sh --no-backup     # 覆盖前不备份
  ```
  只处理**启用中的 `skills/`**，不碰 `skills-disabled/`；codex 无 subagents、`skills/.system` 永不触碰。
- **迁移**：`migrate-cursor-to-claude.sh` 一键把**已部署的** `~/.cursor` 整体迁移到 `~/.claude`（`--to <项目根>` 则装到项目）。会把禁用态 skill 一并迁到目标的 `skills-disabled/` 并保持禁用。

## Disable 一个 skill

禁用机制 = **把 skill 目录从 `skills/` 移到同级 `skills-disabled/`**；两个工具都忽略 `skills-disabled/`（如 `~/.claude/skills-disabled/`）。Cursor 侧禁用表现为 `~/.cursor/skills/` 里的失效软链。重新启用就是移回 `skills/`。`sync-agent-config.sh` 不会同步禁用态，只有 `migrate` 脚本保留它。

## Gotchas

- **根目录不是 git 仓库**；只有 `cursor-multiagent-system/` 是独立 git 仓库（remote 在 GitHub）。在根目录别假设有 git 工作流。
- 根目录无构建 / 测试 / 格式化 / lint 工具。脚本改动靠 `--dry-run` 预览验证。
- **插件自带的 skill 游离于本体系外**：Cursor 插件（如 `parallel`）的 skill 在 `~/.cursor/plugins/cache/<市场>/<插件>/<hash>/skills/`，**不在** `~/.cursor/skills/`——所以 `config-links/` 看不到、`sync-agent-config.sh` 也不碰。要用自己的版本盖掉插件 skill：把改写版装进受管 `~/.<tool>/skills/`（以 `~/.claude/skills/` 为 canonical 源再 sync），并把插件那份移到**插件自己的** `skills-disabled/`（脆弱：插件更新会还原，需重做）。插件依赖的 CLI 二进制（如 `parallel-cli` 在 `~/.local/share/`）独立安装，删插件不影响。
