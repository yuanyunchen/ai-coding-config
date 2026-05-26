# AI Coding Config

Cursor / Claude Code / Codex 三工具统一的 agent 配置备份与迁移仓库。

**配置说明见 [CLAUDE.md](./CLAUDE.md)**（目录结构、部署流程、命令一览）。

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
./agent-config sync     # 三工具互相同步
./agent-config migrate  # Cursor -> Claude 一次性迁移
./agent-config links    # config-links -> config/（本机浏览，与 git 快照同结构）
./agent-config help
```
