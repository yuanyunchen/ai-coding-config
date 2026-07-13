#!/bin/bash
################################################################################
# 全局记忆 git 同步（仓库 global-memory：hub + bytedance）。
#
# 用法：
#   ./agent-config memory status
#   ./agent-config memory pull
#   ./agent-config memory push [-m "message"]
#   ./agent-config memory setup    # 注册 BM projects + runtime 软链
################################################################################

set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"
MANIFEST="$REPO_ROOT/../global-memory/manifest.json"

usage() {
    sed -n '2,12p' "$0"
}

repo_root() {
    python3 - "$MANIFEST" <<'PY'
import json, sys
from pathlib import Path
print(Path(sys.argv[1]).parent.resolve())
PY
}

hub_path() {
    python3 - "$MANIFEST" <<'PY'
import json, os, sys
from pathlib import Path
manifest_path = Path(sys.argv[1])
manifest = json.loads(manifest_path.read_text())
base = manifest_path.parent
hub = manifest.get("hubPath") or "hub"
if "projects" in manifest and "hub" in manifest["projects"]:
    hub = manifest["projects"]["hub"].get("path", hub)
hub_path = Path(os.path.expanduser(hub))
if not hub_path.is_absolute():
    hub_path = (base / hub_path).resolve()
print(hub_path)
PY
}

bytedance_path() {
    python3 - "$MANIFEST" <<'PY'
import json, os, sys
from pathlib import Path
manifest_path = Path(sys.argv[1])
manifest = json.loads(manifest_path.read_text())
base = manifest_path.parent
p = "bytedance"
if "projects" in manifest and "bytedance" in manifest["projects"]:
    p = manifest["projects"]["bytedance"].get("path", p)
path = Path(os.path.expanduser(p))
if not path.is_absolute():
    path = (base / path).resolve()
print(path)
PY
}

require_repo() {
    local repo hub
    repo="$(repo_root)"
    hub="$(hub_path)"
    if [ ! -d "$repo/.git" ]; then
        echo "ERROR: global-memory 未初始化: $repo"
        exit 1
    fi
    if [ ! -d "$hub" ]; then
        echo "ERROR: hub 目录不存在: $hub（是否尚未迁移 memory→hub？）"
        exit 1
    fi
    echo "$repo"
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
        repo="$(require_repo)"
        hub="$(hub_path)"
        byte="$(bytedance_path)"
        echo "repo:       $repo"
        echo "hub:        $hub"
        echo "bytedance:  $byte"
        echo "bm:         $repo/bin/bm"
        git -C "$repo" remote -v 2>/dev/null | head -2 || true
        git -C "$repo" status -sb
        ;;
    setup)
        repo="$(require_repo)"
        "$repo/bin/setup"
        ;;
    pull)
        repo="$(require_repo)"
        echo "[memory pull] $repo"
        git -C "$repo" pull --rebase
        ;;
    push)
        repo="$(require_repo)"
        echo "[memory push] $repo"
        if git -C "$repo" diff --quiet && git -C "$repo" diff --cached --quiet && [ -z "$(git -C "$repo" ls-files --others --exclude-standard)" ]; then
            echo "  (无改动，跳过 commit/push)"
            exit 0
        fi
        git -C "$repo" add -A
        git -C "$repo" commit -m "$MSG"
        git -C "$repo" push
        ;;
    *)
        echo "ERROR: 未知子命令 '$CMD'"
        usage
        exit 1
        ;;
esac
