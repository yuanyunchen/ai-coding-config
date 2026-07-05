#!/bin/bash
################################################################################
# 全局记忆枢纽 git 同步（独立仓库 claude-memory）。
#
# 用法：
#   ./agent-config memory status
#   ./agent-config memory pull
#   ./agent-config memory push [-m "message"]
################################################################################

set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"
MANIFEST="$REPO_ROOT/../claude-memory/manifest.json"

usage() {
    sed -n '2,10p' "$0"
}

hub_path() {
    python3 - "$MANIFEST" <<'PY'
import json, os, sys
from pathlib import Path
manifest_path = Path(sys.argv[1])
manifest = json.loads(manifest_path.read_text())
base = manifest_path.parent
hub = manifest.get("hubPath") or manifest.get("hubRepo", ".")
hub_path = Path(os.path.expanduser(hub))
if not hub_path.is_absolute():
    hub_path = (base / hub_path).resolve()
print(hub_path)
PY
}

require_hub() {
    local hub
    hub="$(hub_path)"
    if [ ! -d "$hub/.git" ]; then
        echo "ERROR: 记忆枢纽未初始化或不是 git 仓库: $hub"
        echo "新设备请先 clone 到 Agent Development/claude-memory 并软链 runtime 路径"
        exit 1
    fi
    echo "$hub"
}

CMD="${1:-status}"
shift || true

MSG="memory: update"
while [ $# -gt 0 ]; do
    case "$1" in
        -m|--message) MSG="${2:-memory: update}"; shift 2 ;;
        -h|--help) usage; exit 0 ;;
        *) echo "ERROR: 未知参数 '$1'"; usage; exit 1 ;;
    esac
done

case "$CMD" in
    status)
        hub="$(require_hub)"
        echo "hub: $hub"
        git -C "$hub" remote -v 2>/dev/null | head -2 || true
        git -C "$hub" status -sb
        ;;
    pull)
        hub="$(require_hub)"
        echo "[memory pull] $hub"
        git -C "$hub" pull --rebase
        ;;
    push)
        hub="$(require_hub)"
        echo "[memory push] $hub"
        if git -C "$hub" diff --quiet && git -C "$hub" diff --cached --quiet && [ -z "$(git -C "$hub" ls-files --others --exclude-standard)" ]; then
            echo "  (无改动，跳过 commit/push)"
            exit 0
        fi
        git -C "$hub" add -A
        git -C "$hub" commit -m "$MSG"
        git -C "$hub" push
        ;;
    *)
        echo "ERROR: 未知子命令 '$CMD'"
        usage
        exit 1
        ;;
esac
