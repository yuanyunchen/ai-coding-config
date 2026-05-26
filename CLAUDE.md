# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 仓库定位

本仓库是 **Cursor / Claude Code / Codex** 三工具的统一 agent 配置备份库，用于跨设备迁移与版本管理。

- **真实配置**在部署目录 `~/.cursor` `~/.claude` `~/.codex`（各工具至少运行过一次才会创建）
- **git 快照**在 `config/`（真实文件，无软链，可 push 到其他设备）
- **本机软链视图**在 `config-links/`（gitignore，运行 `./agent-config links` 创建）

所有操作通过**唯一入口** `./agent-config` 完成，实现脚本在 `scripts/` 子目录。

## 目录结构

```
config/              git 追踪的配置快照（跨设备迁移用）
config-links/        本机软链 -> ~/.claude（gitignore）
agent-config         统一 CLI 入口
scripts/             deploy pull sync migrate links 的实现
AGENTS.md            本仓库工作准则（本文件 @ 导入）
config/AGENTS.md     部署到三工具的全局英文规则（与根 AGENTS.md 不同）
```

## 部署目录映射

| 配置类别   | cursor          | claude          | codex                       |
|-----------|-----------------|-----------------|-----------------------------|
| 斜杠命令   | `commands/*.md` | `commands/*.md` | `prompts/*.md`              |
| subagents | `agents/*.md`   | `agents/*.md`   | （无此机制，跳过）            |
| skills    | `skills/*`      | `skills/*`      | `skills/*`（`.system` 不动）  |
| 全局规则   | `AGENTS.md`     | `AGENTS.md`     | `AGENTS.md`                 |

**Canonical 源**：`~/.claude`。`config/` 快照和 `pull`/`deploy` 默认都以它为基准。

Claude Code 只读 `CLAUDE.md`，部署目录里用 `~/.claude/CLAUDE.md` 的 `@AGENTS.md` 导入全局规则。

## 配置流程

### 新设备首次恢复

前提：已安装三工具，且 `~/.cursor` / `~/.claude` / `~/.codex` 目录存在。

```bash
git clone https://github.com/yuanyunchen/ai-coding-config.git
cd ai-coding-config
./agent-config deploy --dry-run   # 预览
./agent-config deploy             # config/ -> ~/.claude -> sync 到 cursor + codex
./agent-config links              # 可选：创建 config-links/ 软链方便浏览
```

### 本机日常改配置

1. 直接改 `~/.claude/...`（或通过 `config-links/` 浏览，实质改同一处）
2. 或在 Cursor 里改完后：`./agent-config sync --source cursor`
3. 拉回仓库快照：`./agent-config pull`
4. 提交：`git add -A && git commit -m "sync config" && git push`

### 三工具互相同步（不写仓库）

```bash
./agent-config sync --dry-run              # 默认 claude -> cursor + codex
./agent-config sync --source cursor        # cursor 为源
```

### 从 Cursor 初次迁移到 Claude（一次性）

仅在还没建立 `~/.claude` 配置、需要从 Cursor 全盘搬过来时用：

```bash
./agent-config migrate --dry-run
./agent-config migrate
./agent-config pull    # 把结果纳入 config/ 快照
```

## `./agent-config` 命令一览

| 命令 | 方向 | 说明 |
|------|------|------|
| `deploy` | config/ → ~/.claude (+ sync) | 新设备恢复 |
| `pull` | ~/.claude → config/ | 改完配置后拉回仓库 |
| `sync` | 三工具互相同步 | 增量，只加不删 |
| `migrate` | ~/.cursor → ~/.claude | 一次性迁移 |
| `links` | 创建 config-links/ | 本机软链视图 |

各命令均支持 `--dry-run` 预览；`deploy --no-sync` 只写 claude 不同步；`sync --no-backup` 覆盖前不备份。详细参数：`./agent-config <command> -h`

## Disable 一个 skill

禁用 = 把 skill 目录从 `skills/` 移到同级 `skills-disabled/`。两工具都忽略 `skills-disabled/`。重新启用即移回 `skills/`。

`sync` 不同步禁用态；`migrate` 会保留禁用 skill 到目标的 `skills-disabled/`。

## Gotchas

- **两个 AGENTS.md**：根目录是中文工作准则（给本仓库 CLAUDE.md）；`config/AGENTS.md` 是部署到三工具的全局英文规则。
- **插件 skill 不在本仓库**：Cursor 插件（如 parallel）的 skill 在 `~/.cursor/plugins/cache/...`，`config/` 看不到。要用自己的版本：装进 `~/.claude/skills/` 再 `pull` + `sync`。
- **`config/` 不用软链**：绝对路径软链无法跨设备；本机浏览用 `config-links/`。
- **`node_modules` 未纳入 git**：`frontend-pipeline/.../ui-ux-design-pro/cli` 需要时在目标机器 `npm install`。
- **脚本有副作用**：除 `pull` 和 `links` 外都会写部署目录；执行前先 `--dry-run`。
