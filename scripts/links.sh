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

echo "确保 config/skills/ + config/skills-disabled/ 存在"
mkdir -p "$CONFIG/skills" "$CONFIG/skills-disabled"

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
echo "  config-links/skills/            (启用)"
echo "  config-links/skills-disabled/   (禁用)"
echo "  config-links/plugins/claude/enabled/"
echo "  config-links/plugins/README.md"
