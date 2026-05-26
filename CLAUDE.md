# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

@AGENTS.md

## 仓库定位

本仓库是 **Cursor / Claude Code / Codex** 三工具的统一 agent 配置备份，用于跨设备迁移。

唯一管理脚本：**`agent-config.sh`**（所有配置操作都通过它）。

## 目录结构

```
config/              git 追踪的配置快照（真实文件，可跨设备 clone）
config-links/        本机软链 -> ~/.claude（gitignore，运行 links 子命令创建）
  agents/ commands/ skills/ skills-disabled/ global-AGENTS.md
config/AGENTS.md     部署到三工具的全局规则（英文）
AGENTS.md            本仓库工作准则（中文，本文件 @ 导入）
agent-config.sh      唯一入口脚本
```

## 三处配置的关系

```
                    ┌─────────────────┐
  git 仓库           │  config/        │  跨设备迁移的快照（真实文件）
                    └────────┬────────┘
                             │ deploy / pull
                    ┌────────▼────────┐
  本机 canonical     │  ~/.claude/     │  默认源（agents commands skills AGENTS.md）
                    └────────┬────────┘
                             │ sync
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         ~/.cursor/     ~/.claude/     ~/.codex/
         commands       commands       prompts
         agents         agents         (无 agents)
         skills         skills         skills
```

| 配置类别 | cursor | claude | codex |
|---------|--------|--------|-------|
| 斜杠命令 | `commands/*.md` | `commands/*.md` | `prompts/*.md` |
| subagents | `agents/*.md` | `agents/*.md` | 无 |
| skills | `skills/*` | `skills/*` | `skills/*`（`.system` 不动） |
| 全局规则 | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` |

Claude Code 只读 `CLAUDE.md`，部署时脚本会确保 `~/.claude/CLAUDE.md` 含 `@AGENTS.md` 导入。

**两个 AGENTS.md 不要混淆：**

- `config/AGENTS.md` → 同步到 `~/.claude/AGENTS.md` 等的**全局英文规则**
- 根目录 `AGENTS.md` → **本仓库中文工作准则**，仅供此仓库的 CLAUDE.md 使用

## agent-config.sh 子命令

所有写操作都支持 `--dry-run` 预览。

```bash
./agent-config.sh help                              # 总览

./agent-config.sh deploy [--no-sync] [--dry-run]    # config/ -> ~/.claude -> sync 到其他工具
./agent-config.sh pull [--source claude] [--dry-run] # 本地 -> config/（commit 前）
./agent-config.sh sync [--source claude] [--dry-run] # 三工具互相同步（不写仓库）
./agent-config.sh links [--cursor]                  # 创建 config-links/ 软链
./agent-config.sh migrate [--from DIR] [--to DIR]   # ~/.cursor -> ~/.claude 一次性迁移
```

## 配置流程

### 新设备（从零恢复）

```bash
git clone https://github.com/yuanyunchen/ai-coding-config.git
cd ai-coding-config
./agent-config.sh deploy --dry-run    # 预览
./agent-config.sh deploy              # 写入 ~/.claude 并 sync 到 cursor + codex
./agent-config.sh links               # 可选：创建本机 config-links/ 软链视图
```

前提：目标机器已安装三工具，且各工具至少运行过一次（存在 `~/.cursor` / `~/.claude` / `~/.codex`）。

### 日常改配置

```bash
# 方式 A：直接改 ~/.claude/...（或 config-links/ 里看同一份文件）
# 方式 B：在 Cursor 里改完后先 sync
./agent-config.sh sync --source cursor

# 拉回仓库、提交
./agent-config.sh pull
git diff config/
git add -A && git commit -m "sync config" && git push
```

### 只有 Cursor、还没有 Claude 配置

```bash
./agent-config.sh migrate             # ~/.cursor -> ~/.claude
./agent-config.sh pull                # 快照进 config/
```

## Disable 一个 skill

把 skill 目录从 `skills/` 移到同级 `skills-disabled/`。`sync` 不同步禁用态；`migrate` 会把 Cursor 里的失效软链恢复进 `skills-disabled/`。

## Gotchas

- **`config/` 不用软链**：GitHub 上必须是真实文件；本机浏览用 `config-links/`（`./agent-config.sh links`）。
- **插件 skill 不在本仓库**：Cursor 插件（如 parallel）的 skill 在 `~/.cursor/plugins/cache/...`，不在 `config/`。要用自己的版本：放进 `config/skills/`，`deploy` 后再 `sync`。
- **`frontend-pipeline/.../cli/node_modules`** 未纳入版本库；需要时在目标机器 `npm install`。
- **写操作前先 `--dry-run`**：所有子命令都支持。
