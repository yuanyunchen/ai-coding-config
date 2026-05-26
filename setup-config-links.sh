#!/bin/bash
################################################################################
# 在本机创建 config-links/ 软链，指向 ~/.claude 部署目录（只读视图，别在此改文件）。
# 与父工作区 config-links/ 同模式；config/ 仍是 git 追踪的真实快照。
#
# 用法：
#   ./setup-config-links.sh           链到 ~/.claude（默认）
#   ./setup-config-links.sh --cursor  链到 ~/.cursor
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LINKS="$SCRIPT_DIR/config-links"
TARGET="claude"

while [ $# -gt 0 ]; do
    case "$1" in
        --cursor)  TARGET="cursor"; shift ;;
        --claude)  TARGET="claude"; shift ;;
        -h|--help)
            sed -n '2,10p' "$0"
            exit 0
            ;;
        *) echo "ERROR: 未知参数 '$1'"; exit 1 ;;
    esac
done

BASE="$HOME/.$TARGET"
[ -d "$BASE" ] || { echo "ERROR: 找不到 $BASE"; exit 1; }

mkdir -p "$LINKS"

link() {
    local name="$1" dest="$2"
    if [ -e "$LINKS/$name" ] || [ -L "$LINKS/$name" ]; then
        rm "$LINKS/$name"
    fi
    ln -s "$dest" "$LINKS/$name"
    echo "  $name -> $dest"
}

echo "创建 config-links/ -> $BASE"
link agents           "$BASE/agents"
link commands         "$BASE/commands"
link skills           "$BASE/skills"
link skills-disabled  "$BASE/skills-disabled"
link global-AGENTS.md "$BASE/AGENTS.md"

echo "完成。浏览/编辑请改 $BASE 下原文件，改完运行 ./pull-config.sh 更新 config/。"
