# AI Coding Config

Cursor / Claude Code / Codex 三工具统一的 agent 配置备份与迁移仓库。

## 目录结构

```
config/                    配置快照（替代工作区 config-links 软链里的真实内容）
  agents/                  subagents
  commands/                斜杠命令
  skills/                  启用的 skills
  skills-disabled/         禁用的 skills
  AGENTS.md                部署到 ~/.claude/AGENTS.md 的全局规则
AGENTS.md                  本仓库工作准则（CLAUDE.md @ 导入）
CLAUDE.md                  仓库说明
sync-agent-config.sh       三工具间增量同步
migrate-cursor-to-claude.sh  Cursor -> Claude 迁移
deploy-config.sh           新设备一键恢复
```

## 新设备恢复

```bash
git clone git@github.com:yuanyunchen/ai-coding-config.git
cd ai-coding-config
./deploy-config.sh --dry-run   # 预览
./deploy-config.sh             # 写入 ~/.claude 并同步到 ~/.cursor ~/.codex
```

前提：目标机器已安装 Cursor、Claude Code、Codex，且存在 `~/.cursor` / `~/.claude` / `~/.codex` 目录（各工具至少运行过一次）。

## 日常维护

在本机改完 `~/.claude`（或任一工具）后，把变更拉回仓库：

```bash
# 以 claude 为 canonical 源更新 config/ 快照
rsync -a ~/.claude/agents/ config/agents/
rsync -a ~/.claude/commands/ config/commands/
rsync -aL --exclude='node_modules' ~/.claude/skills/ config/skills/
rsync -aL --exclude='node_modules' ~/.claude/skills-disabled/ config/skills-disabled/
cp ~/.claude/AGENTS.md config/AGENTS.md
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
