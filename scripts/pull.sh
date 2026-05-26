#!/bin/bash
################################################################################
# 把本地已部署的配置拉回本仓库 config/ 快照（与 deploy-config.sh 方向相反）。
# 默认以 ~/.claude 为 canonical 源；改完配置后运行此脚本再 git commit / push。
#
# 用法：./agent-config pull [--source cursor|claude|codex] [--dry-run]
################################################################################

set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"
CONFIG="$REPO_ROOT/config"
SOURCE="claude"
DRY_RUN=0

RSYNC_EXCLUDE=(--exclude='node_modules' --exclude='__pycache__' --exclude='*.pyc' --exclude='.DS_Store')

while [ $# -gt 0 ]; do
    case "$1" in
        --source)
            [ -n "${2:-}" ] || { echo "ERROR: --source 需要一个值 (cursor|claude|codex)"; exit 1; }
            SOURCE="$2"; shift 2 ;;
        --dry-run)  DRY_RUN=1; shift ;;
        -h|--help)
            sed -n '2,12p' "$0"
            exit 0
            ;;
        *) echo "ERROR: 未知参数 '$1'"; exit 1 ;;
    esac
done

case "$SOURCE" in cursor|claude|codex) ;; *) echo "ERROR: --source 只能是 cursor|claude|codex"; exit 1 ;; esac

SRC_BASE="$HOME/.$SOURCE"
[ -d "$SRC_BASE" ] || { echo "ERROR: 找不到源目录: $SRC_BASE"; exit 1; }

cmd_dir() { [ "$1" = codex ] && echo "prompts" || echo "commands"; }

run() { if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] $*"; else "$@"; fi; }

rsync_pull() {
    local dest="$1"; shift
    if [ "$DRY_RUN" -eq 1 ]; then
        echo "  [dry-run] rsync -aL ${RSYNC_EXCLUDE[*]} $* \"$dest\""
    else
        rsync -aL "${RSYNC_EXCLUDE[@]}" "$@" "$dest"
    fi
}

rsync_pull_plain() {
    local dest="$1"; shift
    if [ "$DRY_RUN" -eq 1 ]; then
        echo "  [dry-run] rsync -a ${RSYNC_EXCLUDE[*]} $* \"$dest\""
    else
        rsync -a "${RSYNC_EXCLUDE[@]}" "$@" "$dest"
    fi
}

echo "拉回 agent 配置: $SRC_BASE -> $CONFIG"
[ "$DRY_RUN" -eq 1 ] && echo "  (dry-run：不写任何文件)"

if [ "$DRY_RUN" -eq 1 ]; then
    echo "  [dry-run] mkdir -p ... \"$CONFIG/plugins/claude\" ..."
else
    mkdir -p "$CONFIG/agents" "$CONFIG/commands" \
        "$CONFIG/skills/enabled" "$CONFIG/skills/disabled" \
        "$CONFIG/plugins/claude/enabled" "$CONFIG/plugins/claude/disabled" \
        "$CONFIG/plugins/cursor/enabled" "$CONFIG/plugins/cursor/disabled" \
        "$CONFIG/plugins/codex/enabled" "$CONFIG/plugins/codex/disabled"
fi

if [ -d "$SRC_BASE/agents" ]; then
    echo "[agents]"
    rsync_pull_plain "$CONFIG/agents/" "$SRC_BASE/agents/"
fi

SRC_CMD="$SRC_BASE/$(cmd_dir "$SOURCE")"
if [ -d "$SRC_CMD" ]; then
    echo "[commands]"
    if [ "$DRY_RUN" -eq 1 ]; then
        echo "  [dry-run] mkdir -p \"$CONFIG/commands\""
    else
        mkdir -p "$CONFIG/commands"
    fi
    rsync_pull_plain "$CONFIG/commands/" "$SRC_CMD/"
fi

if [ -d "$SRC_BASE/skills" ]; then
    echo "[skills]"
    if [ -d "$SRC_BASE/skills/enabled" ] || [ -d "$SRC_BASE/skills/disabled" ]; then
        rsync_pull "$CONFIG/skills/" "$SRC_BASE/skills/"
    else
        echo "  (源为扁平 skills/，拉回后请保持 config/skills/{enabled,disabled}/ 布局)"
        rsync_pull "$CONFIG/skills/enabled/" "$SRC_BASE/skills/"
    fi
fi

if [ -d "$SRC_BASE/skills-disabled" ]; then
    echo "[skills-disabled -> skills/disabled]"
    rsync_pull "$CONFIG/skills/disabled/" "$SRC_BASE/skills-disabled/"
fi

if [ -d "$SRC_BASE/scripts" ]; then
    echo "[scripts]"
    if [ "$DRY_RUN" -eq 1 ]; then
        echo "  [dry-run] rsync -a ${RSYNC_EXCLUDE[*]} \"$SRC_BASE/scripts/\" \"$CONFIG/scripts/\""
    else
        mkdir -p "$CONFIG/scripts"
        rsync -a "${RSYNC_EXCLUDE[@]}" "$SRC_BASE/scripts/" "$CONFIG/scripts/"
    fi
fi

echo "[AGENTS.md]"
if [ -s "$SRC_BASE/AGENTS.md" ]; then
    if [ "$DRY_RUN" -eq 1 ]; then
        echo "  [dry-run] cp \"$SRC_BASE/AGENTS.md\" \"$CONFIG/AGENTS.md\""
    else
        cp "$SRC_BASE/AGENTS.md" "$CONFIG/AGENTS.md"
    fi
else
    echo "  (源无 AGENTS.md，跳过)"
fi

if [ "$SOURCE" = claude ] && [ -f "$SRC_BASE/settings.json" ]; then
    echo "[plugins pull]"
    if [ "$DRY_RUN" -eq 1 ]; then
        "$SCRIPTS_DIR/plugins.sh" pull --dry-run
    else
        "$SCRIPTS_DIR/plugins.sh" pull
        "$SCRIPTS_DIR/plugins.sh" vendor
    fi
fi

echo ""
echo "完成。config/ 已更新（含 plugins/）；检查 diff 后 git commit / push。"
