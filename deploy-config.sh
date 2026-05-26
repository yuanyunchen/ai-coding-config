#!/bin/bash
################################################################################
# 把本仓库 config/ 快照部署到 ~/.claude（canonical），再同步到 cursor + codex。
# 新设备 clone 本仓库后运行此脚本即可恢复 AI coding 配置。
#
# 用法：
#   ./deploy-config.sh              部署并同步
#   ./deploy-config.sh --dry-run    只预览
#   ./deploy-config.sh --no-sync    只写入 ~/.claude，不跑 sync-agent-config.sh
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$SCRIPT_DIR/config"
CLAUDE="$HOME/.claude"
DRY_RUN=0
DO_SYNC=1

while [ $# -gt 0 ]; do
    case "$1" in
        --dry-run)  DRY_RUN=1; shift ;;
        --no-sync)  DO_SYNC=0; shift ;;
        -h|--help)
            sed -n '2,12p' "$0"
            exit 0
            ;;
        *) echo "ERROR: 未知参数 '$1'"; exit 1 ;;
    esac
done

run() { if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] $*"; else eval "$*"; fi; }

[ -d "$CONFIG/agents" ] || { echo "ERROR: 找不到 $CONFIG/agents"; exit 1; }

echo "部署 agent 配置 -> $CLAUDE"
[ "$DRY_RUN" -eq 1 ] && echo "  (dry-run：不写任何文件)"

run "mkdir -p \"$CLAUDE/agents\" \"$CLAUDE/commands\" \"$CLAUDE/skills\" \"$CLAUDE/skills-disabled\""

for dir in agents commands skills skills-disabled; do
    echo "[$dir]"
    run "rsync -a --exclude='node_modules' --exclude='__pycache__' --exclude='*.pyc' --exclude='.DS_Store' \"$CONFIG/$dir/\" \"$CLAUDE/$dir/\""
done

echo "[AGENTS.md + CLAUDE.md]"
run "cp \"$CONFIG/AGENTS.md\" \"$CLAUDE/AGENTS.md\""
if [ "$DRY_RUN" -eq 1 ]; then
    echo "  [dry-run] 确保 $CLAUDE/CLAUDE.md 含 @AGENTS.md"
else
    if [ ! -f "$CLAUDE/CLAUDE.md" ] || ! grep -q '^@AGENTS.md' "$CLAUDE/CLAUDE.md" 2>/dev/null; then
        printf '@AGENTS.md\n' >> "$CLAUDE/CLAUDE.md"
        echo "  $CLAUDE/CLAUDE.md 已加入 @AGENTS.md 导入"
    fi
fi

echo ""
if [ "$DO_SYNC" -eq 1 ]; then
    echo "同步到 cursor + codex ..."
    if [ "$DRY_RUN" -eq 1 ]; then
        "$SCRIPT_DIR/sync-agent-config.sh" --dry-run
    else
        "$SCRIPT_DIR/sync-agent-config.sh"
    fi
else
    echo "跳过 sync（--no-sync）。手动运行: ./sync-agent-config.sh"
fi

echo ""
echo "完成。"
