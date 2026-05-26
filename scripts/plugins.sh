#!/bin/bash
################################################################################
# 三平台插件原始包：分目录快照 + 一键 deploy。
#
#   config/plugins/claude/   Claude Code marketplace 原始包
#   config/plugins/cursor/   Cursor 插件原始包
#   config/plugins/codex/    Codex 插件原始包
#
# hook 插件：各平台独立目录，不跨平台 sync；deploy 时提示 marketplace/IDE 安装。
# portable 插件：claude 经 vendor -> config/ -> sync；cursor/codex 从各自目录 deploy。
#
# 用法：
#   ./agent-config plugins pull [--platform claude|cursor|codex|all]
#   ./agent-config plugins deploy [--platform ...]
#   ./agent-config plugins vendor [--force]
#   ./agent-config plugins sync [--source claude] [--no-deploy]
#   ./agent-config plugins apply | install | status
################################################################################

set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"
LIB="$SCRIPTS_DIR/plugins-lib.py"

CMD="${1:-status}"
shift || true

DRY_RUN=0
FORCE=0
PLATFORM="all"
SOURCE="claude"
NO_DEPLOY=0

while [ $# -gt 0 ]; do
    case "$1" in
        --dry-run)  DRY_RUN=1; shift ;;
        --force)    FORCE=1; shift ;;
        --no-deploy) NO_DEPLOY=1; shift ;;
        --source)   SOURCE="${2:-claude}"; shift 2 ;;
        --platform) PLATFORM="${2:-all}"; shift 2 ;;
        -h|--help)  sed -n '2,22p' "$0"; exit 0 ;;
        *) echo "ERROR: 未知参数 '$1'"; exit 1 ;;
    esac
done

py() {
    local args=(--repo "$REPO_ROOT")
    [ "$DRY_RUN" -eq 1 ] && args+=(--dry-run)
    [ "$FORCE" -eq 1 ] && args+=(--force)
    [ "$NO_DEPLOY" -eq 1 ] && args+=(--no-deploy)
    [ "$PLATFORM" != "all" ] && args+=(--platform "$PLATFORM")
    [ "$CMD" = "sync" ] && args+=(--source "$SOURCE")
    python3 "$LIB" "$CMD" "${args[@]}"
}

case "$CMD" in
    pull|deploy|vendor|apply|sync|status)
        py
        ;;
    extract|migrate)
        echo "已废弃：请用 ./agent-config plugins pull"
        exit 1
        ;;
    install)
        exec "$SCRIPTS_DIR/claude-plugins-install.sh" install "$([ "$DRY_RUN" -eq 1 ] && echo --dry-run)"
        ;;
    *)
        echo "ERROR: 未知子命令 '$CMD'"
        echo "用法: ./agent-config plugins {pull|sync|deploy|vendor|apply|install|status} [--source claude] [--platform ...]"
        exit 1
        ;;
esac
