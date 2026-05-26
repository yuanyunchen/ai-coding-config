# AI Coding Config

Cursor / Claude Code / Codex 三工具统一的 agent 配置备份与迁移仓库。

**配置说明见 [CLAUDE.md](./CLAUDE.md)**（目录结构、部署流程、命令一览）。

## 快速开始

```bash
# 新设备
git clone https://github.com/yuanyunchen/ai-coding-config.git
cd ai-coding-config
./agent-config deploy

# 本机改完配置后
./agent-config pull && git commit -am "sync config" && git push
```

## 命令

```bash
./agent-config deploy   # config/ -> ~/.claude (+ sync)
./agent-config pull     # ~/.claude -> config/
./agent-config sync     # 三工具互相同步
./agent-config migrate  # Cursor -> Claude 一次性迁移
./agent-config links    # 创建本机 config-links/ 软链
./agent-config help
```
