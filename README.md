# AI Coding Config

Cursor / Claude Code / Codex / Trae 四工具统一的 agent 配置备份与迁移仓库。

**配置说明见 [CLAUDE.md](./CLAUDE.md)**（目录结构、部署流程、命令一览）。

**新机器 / 第一次部署见 [SETUP.md](./SETUP.md)**（安装 Cursor、Claude Code、Codex、Trae，登录账号，Parallel 等 skill 依赖）。

## 当前工作区

本目录已从原 Agent Development 目录迁入这里。实际配置文件、原有未提交改动与完整 Git 历史都在本仓库。

| 想看什么 | 打开哪里 |
|---|---|
| 全局规则 | [英文主版本](config/AGENTS.md) · [中文镜像](config/AGENTS-cn.md) |
| Skills、子智能体、命令、Hooks | [skills](config/skills/) · [agents](config/agents/) · [commands](config/commands/) · [hooks](config/hooks/) |
| 插件与个性化快照 | [插件清单](config/plugins/README.md) · [Claude](config/claude-personal/) · [Codex](config/codex-personal/) |
| 工作区入口、任务树与操作约定 | [AGENTS.md](AGENTS.md) |
| 本次需求与执行记录 | [需求](.agents/task/01-workspace-migration/task.md) · [进度](.agents/task/01-workspace-migration/progress.md) · [结果](.agents/task/01-workspace-migration/result.md) |
| 对话历史（本机） | [用户原文与最终答复](.agents/conversation.md) · [用户消息](.agents/inbox.md) |
| 迁移前的全部 Git 提交 | [历史快照](.agents/task/01-workspace-migration/input/git-history.txt)；持续历史在本仓库 Git 面板 |
| 早期整改、重构和工作区升级记录 | [历史来源导航](.agents/memory/history-sources.md) |
| 现在部署在哪里、快照是什么 | [Harness 基线](.agents/memory/harness-baseline.md) |
| 接下来系统性升级 | [T02 任务](.agents/task/02-harness-upgrade/task.md) · [阶段计划](.agents/task/02-harness-upgrade/plan.md) |

config/ 是版本化配置快照；各工具当前实际加载的文件在各自 home 目录。运行目录链接见基线，未经核对不把两者视为完全相同。
对话记录从本轮开始，旧对话保留在原会话系统；本地 Q&A 不进 Git。原路径保留兼容入口，全局记忆通过相邻软链访问。

```sh
ws status       # 任务与最近进度
ws check        # 工作区完整性
ws inbox        # 未归档需求
git log --all --date=short --format='%h %ad %s'
```

## 快速开始

```bash
# 新设备（Claude Code：官方插件 + deploy，暂不 sync 到其他工具）
git clone https://github.com/yuanyunchen/ai-coding-config.git
cd ai-coding-config
./agent-config plugins install
./agent-config deploy --no-sync

# 本机改完配置后
./agent-config pull && git commit -am "sync config" && git push
```

插件说明与清单见 [config/plugins/README.md](./config/plugins/README.md)。同步 Cursor/Codex：`./agent-config plugins sync` 或 `./agent-config deploy`。

## 命令

```bash
./agent-config deploy   # config/ -> ~/.claude (+ sync)
./agent-config pull     # ~/.claude -> config/
./agent-config sync     # 四工具互相同步（claude → cursor/codex/trae）
./agent-config migrate  # Cursor -> Claude 一次性迁移
./agent-config help
```
