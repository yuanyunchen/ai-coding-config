#!/bin/bash
################################################################################
# 创建 config-links -> config/ 软链（结构完全一致，仅本机浏览用，已 gitignore）。
#
# 用法：./agent-config links
################################################################################

set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"
LINKS="$REPO_ROOT/config-links"
CONFIG="$REPO_ROOT/config"
SKILLS="$CONFIG/skills"

normalize_skills_layout() {
    mkdir -p "$SKILLS/enabled" "$SKILLS/disabled"
    local name
    for name in "$SKILLS"/*; do
        [ -e "$name" ] || continue
        name=$(basename "$name")
        [ "$name" = enabled ] || [ "$name" = disabled ] && continue
        if [ -d "$SKILLS/enabled/$name" ]; then
            rm -rf "$SKILLS/enabled/$name"
        fi
        mv "$SKILLS/$name" "$SKILLS/enabled/$name"
        echo "  skills/enabled/$name"
    done
}

echo "整理 config/skills/ -> enabled/ + disabled/"
normalize_skills_layout

echo "创建 config-links -> config/"
if [ -L "$LINKS" ]; then
    rm -f "$LINKS"
elif [ -e "$LINKS" ]; then
    rm -rf "$LINKS"
fi
ln -sfn config "$LINKS"
echo "  config-links -> $(cd "$REPO_ROOT" && pwd -P)/config"
echo ""
echo "浏览路径与 config/ 相同，例如："
echo "  config-links/skills/enabled/"
echo "  config-links/plugins/claude/enabled/"
echo "  config-links/plugins/README.md"
