# AI Coding Config

Cursor / Claude Code / Codex 三工具统一的 agent 配置备份与迁移仓库。

## 目录结构

```
config/                    git 追踪的配置快照（真实文件，无软链，可跨设备）
config-links/              本机软链视图 -> ~/.claude（gitignore，运行 setup-config-links.sh 创建）
  agents/ commands/ skills/ skills-disabled/ global-AGENTS.md
AGENTS.md                  本仓库工作准则（CLAUDE.md @ 导入）
CLAUDE.md                  仓库说明
pull-config.sh             本地 ~/.claude -> config/（改完配置后拉回仓库）
deploy-config.sh           config/ -> ~/.claude（新设备恢复）
setup-config-links.sh      创建本机 config-links/ 软链
sync-agent-config.sh       三工具间增量同步
migrate-cursor-to-claude.sh  Cursor -> Claude 迁移
```

## 新设备恢复

```bash
git clone git@github.com:yuanyunchen/ai-coding-config.git
cd ai-coding-config
./deploy-config.sh --dry-run   # 预览
./deploy-config.sh             # 写入 ~/.claude 并同步到 ~/.cursor ~/.codex
```

前提：目标机器已安装 Cursor、Claude Code、Codex，且存在 `~/.cursor` / `~/.claude` / `~/.codex` 目录（各工具至少运行过一次）。

## 本机软链（config-links）

`config/` **故意不用软链**——GitHub 上必须是真实文件才能迁移到其他设备。

本机如需像父工作区 `config-links/` 一样直接看部署目录，运行一次：

```bash
./setup-config-links.sh        # config-links/ -> ~/.claude
# 或 ./setup-config-links.sh --cursor  -> ~/.cursor
```

`config-links/` 已 gitignore，不会 push 到 GitHub。

## 日常维护

在本机改完 `~/.claude`（或在 Cursor 里改完后 `./sync-agent-config.sh --source cursor`）：

```bash
./pull-config.sh --dry-run   # 预览
./pull-config.sh             # ~/.claude -> config/
git diff config/
git add -A && git commit -m "sync config from local"
git push
```

三工具互相同步（不写仓库）：

```bash
./sync-agent-config.sh --dry-run
./sync-agent-config.sh
```

## 注意

- `config/AGENTS.md`（全局英文规则）与根目录 `AGENTS.md`（中文工作准则）是不同文件，用途不同。
- 插件自带 skill（如 parallel 插件）不在本仓库；新设备需单独安装插件或把改写版 skill 放进 `config/skills/`。
- `frontend-pipeline/skills/ui-ux-design-pro/cli` 的 `node_modules` 未纳入版本库；需要时在目标机器 `npm install`。
