# AI Coding Config

Cursor / Claude Code / Codex 统一 agent 配置备份与跨设备迁移。

**配置说明见 [CLAUDE.md](CLAUDE.md)**（含目录结构、三工具映射、完整操作流程）。

## 快速开始

```bash
# 新设备
git clone https://github.com/yuanyunchen/ai-coding-config.git
cd ai-coding-config
./agent-config.sh deploy
./agent-config.sh links

# 日常改完配置
./agent-config.sh pull && git add -A && git commit -m "sync config" && git push
```

唯一脚本入口：`./agent-config.sh help`
