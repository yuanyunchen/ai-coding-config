#!/bin/bash
################################################################################
# 统一入口：管理 Cursor / Claude / Codex 三工具的 agent 配置。
#
# 用法：
#   ./agent-config <command> [options]
#   ./agent-config help
#
# 命令：
#   deploy   config/ -> ~/.claude，并同步到 cursor + codex（新设备恢复）
#   pull     本地部署目录 -> config/（改完配置后拉回仓库）
#   sync     三工具互相同步（不写仓库）
#   migrate  Cursor -> Claude 一次性迁移
#   links    创建本机 config-links/ 软链
#
# 示例：
#   ./agent-config deploy --dry-run
#   ./agent-config pull
#   ./agent-config sync --source cursor
################################################################################

set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() {
    sed -n '2,20p' "$0"
    echo ""
    echo "子命令详细帮助: ./agent-config <command> -h"
}

case "${1:-}" in
    deploy)  shift; exec "$SCRIPTS_DIR/deploy.sh" "$@" ;;
    pull)    shift; exec "$SCRIPTS_DIR/pull.sh" "$@" ;;
    sync)    shift; exec "$SCRIPTS_DIR/sync.sh" "$@" ;;
    migrate) shift; exec "$SCRIPTS_DIR/migrate.sh" "$@" ;;
    links)   shift; exec "$SCRIPTS_DIR/links.sh" "$@" ;;
    help|-h|--help) usage ;;
    "")
        echo "ERROR: 缺少命令"; echo ""
        usage; exit 1 ;;
    *)
        echo "ERROR: 未知命令 '$1'"; echo ""
        usage; exit 1 ;;
esac
