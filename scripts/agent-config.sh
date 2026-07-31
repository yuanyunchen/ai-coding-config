#!/bin/bash
################################################################################
# 统一入口：管理 Cursor / Claude / Codex / Trae 四工具的 agent 配置。
#
# 用法：
#   ./agent-config <command> [options]
#   ./agent-config help
#
# 命令：
#   deploy   config/ -> ~/.claude，并同步到 cursor + codex + trae（新设备恢复）
#   pull     本地部署目录 -> config/（改完配置后拉回仓库）
#   sync     四工具互相同步（不写仓库）
#   migrate  Cursor -> Claude 一次性迁移
#   plugins  Claude 插件开关 + 可移植内容提取（见 plugins -h）
#   memory   全局记忆枢纽 git 同步（见 memory -h）
#
# 示例：
#   ./agent-config deploy --dry-run
#   ./agent-config pull
#   ./agent-config sync --source claude --target trae
################################################################################

set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() {
    sed -n '2,19p' "$0"
    echo ""
    echo "子命令详细帮助: ./agent-config <command> -h"
}

case "${1:-}" in
    deploy)  shift; exec "$SCRIPTS_DIR/deploy.sh" "$@" ;;
    pull)    shift; exec "$SCRIPTS_DIR/pull.sh" "$@" ;;
    sync)    shift; exec "$SCRIPTS_DIR/sync.sh" "$@" ;;
    migrate) shift; exec "$SCRIPTS_DIR/migrate.sh" "$@" ;;
    plugins)
        case "${2:-}" in
            install) shift 2; exec "$SCRIPTS_DIR/claude-plugins-install.sh" install "$@" ;;
            *) shift; exec "$SCRIPTS_DIR/plugins.sh" "$@" ;;
        esac ;;
    memory)  shift; exec "$SCRIPTS_DIR/memory.sh" "$@" ;;
    help|-h|--help) usage ;;
    "")
        echo "ERROR: 缺少命令"; echo ""
        usage; exit 1 ;;
    *)
        echo "ERROR: 未知命令 '$1'"; echo ""
        usage; exit 1 ;;
esac
