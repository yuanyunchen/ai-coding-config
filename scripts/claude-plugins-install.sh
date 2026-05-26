#!/bin/bash
################################################################################
# 新设备：在 Claude Code 里安装 manifest 要求的官方 marketplace 插件。
#
# 用法：./agent-config plugins install [--dry-run]
################################################################################

set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"
MANIFEST="$REPO_ROOT/config/plugins/manifest.json"

DRY_RUN=0
while [ $# -gt 0 ]; do
    case "$1" in
        install) shift ;;
        --dry-run) DRY_RUN=1; shift ;;
        -h|--help) sed -n '2,8p' "$0"; exit 0 ;;
        *) echo "ERROR: 未知参数 '$1'"; exit 1 ;;
    esac
done

[ -f "$MANIFEST" ] || { echo "ERROR: 找不到 $MANIFEST"; exit 1; }
command -v claude >/dev/null 2>&1 || { echo "ERROR: 找不到 claude CLI，请先安装 Claude Code"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "ERROR: 需要 python3"; exit 1; }

echo "Claude Code 官方插件安装（依据 manifest）"

PLUGINS=$(python3 - "$MANIFEST" <<'PY'
import json, sys
from pathlib import Path

manifest = json.loads(Path(sys.argv[1]).read_text())
enabled = manifest.get("claude", {}).get("enabledPlugins", {})

for pid in sorted(pid for pid, on in enabled.items() if on):
    print(pid)
print("__SKIP_OFF__")
for pid in sorted(pid for pid, on in enabled.items() if not on):
    print(pid)
PY
)

TO_INSTALL=""
SKIP_OFF=""
section=""
while IFS= read -r line; do
    [ -z "$line" ] && continue
    case "$line" in
        __SKIP_OFF__) section="off"; continue ;;
    esac
    case "$section" in
        off) SKIP_OFF="$SKIP_OFF$line\n" ;;
        *) TO_INSTALL="$TO_INSTALL$line\n" ;;
    esac
done <<< "$PLUGINS"

if [ -z "$TO_INSTALL" ]; then
    echo ""
    echo "无需安装官方 marketplace 插件。"
else
    echo ""
    echo "[安装 — claude plugin install]"
    printf "%b" "$TO_INSTALL" | sed '/^$/d' | while read -r plugin; do
        if claude plugin list 2>/dev/null | grep -qF "$plugin"; then
            echo "  (已安装) $plugin"
            continue
        fi
        if [ "$DRY_RUN" -eq 1 ]; then
            echo "  [dry-run] claude plugin install \"$plugin\""
        else
            echo "  claude plugin install \"$plugin\""
            claude plugin install "$plugin"
        fi
    done
fi

echo ""
echo "下一步: ./agent-config deploy"
echo "  portable 插件能力经 vendor + sync 到 Cursor/Codex；hook 插件（ralph-loop 等）各工具单独安装。"
