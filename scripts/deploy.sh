#!/bin/bash
################################################################################
# 把本仓库 config/ 快照部署到 ~/.claude，插件一键 deploy，再 sync 到 cursor + codex。
#
# 用法：./agent-config deploy [--dry-run] [--no-sync]
################################################################################

set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"
CONFIG="$REPO_ROOT/config"
CLAUDE="$HOME/.claude"
CODEX="$HOME/.codex"
DRY_RUN=0
DO_SYNC=1

while [ $# -gt 0 ]; do
    case "$1" in
        --dry-run)  DRY_RUN=1; shift ;;
        --no-sync)  DO_SYNC=0; shift ;;
        -h|--help)  sed -n '2,8p' "$0"; exit 0 ;;
        *) echo "ERROR: 未知参数 '$1'"; exit 1 ;;
    esac
done

run() { if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] $*"; else eval "$*"; fi; }
DRY_FLAG=$([ "$DRY_RUN" -eq 1 ] && echo --dry-run || true)

[ -d "$CONFIG/agents" ] || { echo "ERROR: 找不到 $CONFIG/agents"; exit 1; }

echo "部署 agent 配置 -> $CLAUDE"
[ "$DRY_RUN" -eq 1 ] && echo "  (dry-run：不写任何文件)"

run "mkdir -p \"$CLAUDE/agents\" \"$CLAUDE/commands\" \"$CLAUDE/skills\" \"$CLAUDE/skills-disabled\""

for dir in agents commands; do
    echo "[$dir]"
    run "rsync -a --exclude='node_modules' --exclude='__pycache__' --exclude='*.pyc' --exclude='.DS_Store' \"$CONFIG/$dir/\" \"$CLAUDE/$dir/\""
done

# 清理旧式嵌套布局：Claude Code 把 skills/ 的每个子目录当一个 skill，
# 残留的 skills/enabled skills/disabled 会被误当成两个 skill，导致真 skill 不加载。
if [ "$DRY_RUN" -eq 1 ]; then
    echo "  [dry-run] 若存在则移除旧式 $CLAUDE/skills/{enabled,disabled}"
else
    for stale in enabled disabled; do
        [ -d "$CLAUDE/skills/$stale" ] && rm -rf "$CLAUDE/skills/$stale" && echo "  移除旧式 skills/$stale"
    done
fi

echo "[skills]"
run "rsync -a --exclude='node_modules' --exclude='__pycache__' --exclude='*.pyc' --exclude='.DS_Store' \"$CONFIG/skills/\" \"$CLAUDE/skills/\""
echo "[skills-disabled]"
run "rsync -a --exclude='node_modules' --exclude='__pycache__' --exclude='*.pyc' --exclude='.DS_Store' \"$CONFIG/skills-disabled/\" \"$CLAUDE/skills-disabled/\""

CLAUDE_ONLY_COMMANDS="ralph-loop.md cancel-ralph.md hookify.md configure.md list.md help.md"
if [ "$DRY_RUN" -eq 1 ]; then
    echo "  [dry-run] 移除 hook 插件 vendored 命令（若 config 中已无）"
else
    for base in $CLAUDE_ONLY_COMMANDS; do
        [ -f "$CONFIG/commands/$base" ] && continue
        [ -f "$CLAUDE/commands/$base" ] && rm -f "$CLAUDE/commands/$base" && echo "  移除 $base（Claude 官方 hook 插件）"
    done
fi

echo "[AGENTS.md + AGENTS-cn.md + CLAUDE.md]"
run "cp \"$CONFIG/AGENTS.md\" \"$CLAUDE/AGENTS.md\""
if [ -f "$CONFIG/AGENTS-cn.md" ]; then
    run "cp \"$CONFIG/AGENTS-cn.md\" \"$CLAUDE/AGENTS-cn.md\""
fi
if [ "$DRY_RUN" -eq 1 ]; then
    echo "  [dry-run] 确保 $CLAUDE/CLAUDE.md 含 @AGENTS.md"
else
    if [ ! -f "$CLAUDE/CLAUDE.md" ] || ! grep -q '^@AGENTS.md' "$CLAUDE/CLAUDE.md" 2>/dev/null; then
        printf '@AGENTS.md\n' >> "$CLAUDE/CLAUDE.md"
        echo "  $CLAUDE/CLAUDE.md 已加入 @AGENTS.md 导入"
    fi
fi

if [ -f "$CONFIG/claude-personal/settings.personal.json" ]; then
    echo "[settings 个性化]"
    python3 "$SCRIPTS_DIR/settings-personal.py" deploy "$CONFIG/claude-personal/settings.personal.json" "$CLAUDE/settings.json" $DRY_FLAG
fi

if [ -d "$CONFIG/claude-personal/ccstatusline" ]; then
    echo "[ccstatusline 显示]"
    run "mkdir -p \"$HOME/.config/ccstatusline\""
    run "rsync -a --exclude='.DS_Store' \"$CONFIG/claude-personal/ccstatusline/\" \"$HOME/.config/ccstatusline/\""
fi

if [ -f "$CONFIG/codex-personal/config.personal.toml" ]; then
    echo "[codex config 个性化]"
    python3 "$SCRIPTS_DIR/codex-personal.py" deploy "$CONFIG/codex-personal/config.personal.toml" "$CODEX/config.toml" $DRY_FLAG
fi

if [ -f "$CONFIG/plugins/manifest.json" ]; then
    echo "[plugins deploy]"
    "$SCRIPTS_DIR/plugins.sh" deploy $DRY_FLAG
    echo "[plugins install — Claude marketplace]"
    "$SCRIPTS_DIR/claude-plugins-install.sh" install $DRY_FLAG
fi

echo ""
if [ "$DO_SYNC" -eq 1 ]; then
    echo "同步 portable 配置到 cursor + codex ..."
    if [ "$DRY_RUN" -eq 1 ]; then
        "$SCRIPTS_DIR/sync.sh" --dry-run
    else
        "$SCRIPTS_DIR/sync.sh"
    fi
else
    echo "跳过 sync（--no-sync）。手动运行: ./agent-config sync"
fi

echo ""
echo "完成。"
