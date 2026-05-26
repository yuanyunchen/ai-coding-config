# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库定位

本仓库是 **Cursor / Claude Code / Codex** 三工具的统一 agent 配置备份库，用于跨设备迁移与版本管理。

- **真实配置**在部署目录 `~/.cursor` `~/.claude` `~/.codex`（各工具至少运行过一次才会创建）
- **git 快照**在 `config/`（真实文件，无软链，可 push 到其他设备）
- **本机浏览**：`config-links/` 是指向 `config/` 的软链（gitignore，`./agent-config links` 创建），目录树与 `config/` 完全一致

所有操作通过**唯一入口** `./agent-config` 完成，实现脚本在 `scripts/` 子目录。

## 目录结构

```
config/                        git 快照（跨设备迁移）
  agents/  commands/  AGENTS.md
  skills/enabled/  skills/disabled/
  plugins/manifest.json  plugins/README.md
  plugins/{claude,cursor,codex}/{enabled,disabled}/
config-links/ -> config/       本机软链（gitignore，`./agent-config links`）
agent-config                   统一 CLI 入口
scripts/                       deploy | pull | sync | plugins | links
config/AGENTS.md               部署到三工具的全局英文规则
```

## 部署目录映射

| 配置类别   | cursor          | claude          | codex                       |
|-----------|-----------------|-----------------|-----------------------------|
| 斜杠命令   | `commands/*.md` | `commands/*.md` | `prompts/*.md`              |
| subagents | `agents/*.md`   | `agents/*.md`   | （无此机制，跳过）            |
| skills    | `skills/enabled/*` `skills/disabled/*` | 同上 | 同上（`.system` 不动） |
| 插件      | —               | `settings.json` | —                             |
| 插件快照  | `config/plugins/cursor/` | `config/plugins/claude/` | `config/plugins/codex/` |
| 全局规则   | `AGENTS.md`     | `AGENTS.md`     | `AGENTS.md`                 |

**Canonical 源**：`~/.claude`。`config/plugins/claude|cursor|codex/` 存各平台**原始插件包**；`pull` 拉回、`deploy` 一键部署。hook 插件不跨平台 sync；portable 经 `vendor` + `sync`。

Claude Code 只读 `CLAUDE.md`，部署目录里用 `~/.claude/CLAUDE.md` 的 `@AGENTS.md` 导入全局规则。

## 配置流程

### 新设备首次恢复

前提：已安装三工具，且 `~/.cursor` / `~/.claude` / `~/.codex` 目录存在。

**Claude Code 用官方 marketplace 插件**（`plugins install`）；`deploy` 不同步插件包。同步到 Cursor/Codex 用 `plugins sync`。新设备可用 `deploy --no-sync`。详见 `config/plugins/README.md`。

```bash
git clone https://github.com/yuanyunchen/ai-coding-config.git
cd ai-coding-config

# 1) Claude Code 官方插件
./agent-config plugins install --dry-run
./agent-config plugins install

# 2) skills/commands/agents 等（仅 Claude：加 --no-sync）
./agent-config deploy --dry-run
./agent-config deploy --no-sync

./agent-config links              # 可选
```

手动安装（与 `plugins install` 等价）：

```bash
claude plugin install code-review@claude-plugins-official
claude plugin install code-simplifier@claude-plugins-official
claude plugin install claude-md-management@claude-plugins-official
claude plugin install skill-creator@claude-plugins-official
claude plugin install ralph-loop@claude-plugins-official
```

### 本机日常改配置

1. 直接改 `~/.claude/...`（本仓库内改 `config/...`，或经 `config-links/` 浏览——与 `config/` 为同一路径）
2. 或在 Cursor 里改完后：`./agent-config sync --source cursor`
3. 拉回仓库快照：`./agent-config pull`
3b. 若改了插件开关：`./agent-config plugins sync --force`（再 pull 亦可）
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
| `plugins sync` | claude 插件 → cursor/codex | 镜像 manifest 开关；含 pull + 可选 deploy |
| `migrate` | ~/.cursor → ~/.claude | 一次性迁移 |
| `links` | `config-links` -> `config/` | 整理 skills 两层目录 + 相对软链 |
| `plugins` | pull / sync / deploy / install / apply | 见「插件统一」；`plugins status` 看快照 |

各命令均支持 `--dry-run` 预览；`deploy --no-sync` 只写 claude 不同步；`sync --no-backup` 覆盖前不备份。详细参数：`./agent-config <command> -h`

## 插件统一

三平台**原始插件包**：`config/plugins/{claude,cursor,codex}/{enabled,disabled}/`；清单见 `config/plugins/README.md`（自动生成）。

**勿与 `agent-config sync` 混用**：后者只同步 `config/skills|commands|agents`，不处理 `config/plugins/` 原始包。

| 类型 | 存储 | Claude | Cursor/Codex |
|------|------|--------|--------------|
| **hook** | 各平台独立目录 | `plugins install` | IDE 单独安装 |
| **portable** | 各平台独立目录 | marketplace + vendor→config | vendor→sync 或 cursor 目录 deploy |

```bash
./agent-config plugins pull              # 拉回三平台原始包（--platform claude|cursor|codex）
./agent-config plugins sync              # claude portable -> cursor/codex（镜像 enable/disable）
./agent-config plugins deploy            # apply 开关 + cursor/codex portable 部署
./agent-config plugins install           # Claude marketplace
./agent-config plugins vendor [--force]  # claude portable -> config/
./agent-config deploy                    # 含 plugins deploy + install + sync
./agent-config links                     # config-links -> config/
```

portable 更新：`pull` → `vendor --force` → `deploy`

详见 `config/plugins/README.md`

## Disable 一个 skill

禁用 = 把 skill 目录从 `skills/enabled/` 移到 `skills/disabled/`。工具只加载 `enabled/`。重新启用即移回 `enabled/`。

`sync` 会同步 `skills/enabled` 与 `skills/disabled` 两目录（增量，只加不删）。

## Gotchas

- **`config/AGENTS.md`**：部署到三工具的全局英文规则；`deploy`/`pull`/`sync` 会同步到各工具 `AGENTS.md`。
- **hook 插件**：见 `manifest.json` 的 `hookPlugins`；原始包在 `config/plugins/{claude,cursor,codex}/`，不 vendor、不跨平台 sync。
- **portable 插件**：`plugins pull` → `vendor` → `sync`；如 code-review 三工具 prompt 一致。
- **`feature-dev` 已禁用**：manifest 中 `feature-dev@claude-plugins-official: false`。
- **`config/` 不用软链**：绝对路径软链无法跨设备；本机用 `config-links` -> `config` 相对软链浏览。
- **`config-links` 无独立结构**：不要往 `config-links/` 里放 replicas、plugins-enabled 等旧目录；只保留指向 `config/` 的一条链。
- **`node_modules` 未纳入 git**：`frontend-pipeline/.../ui-ux-design-pro/cli` 需要时在目标机器 `npm install`。
- **脚本有副作用**：除 `pull` 和 `links` 外都会写部署目录；执行前先 `--dry-run`。
- **`plugins apply`**：以 manifest 为准写 `~/.claude/settings.json`；会删除 manifest 已移除的插件项。
- **技能路径**：正文引用技能用 `~/.{tool}/skills/enabled/<name>/`；`sync` 会把旧式 `skills-disabled/` 改写为 `skills/disabled/`。
- **插件文档**：只维护 `config/plugins/README.md`；`pull`/`apply` 更新其中 `<!-- installed:start -->` 段。
