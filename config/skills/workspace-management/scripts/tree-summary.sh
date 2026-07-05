#!/bin/bash
# tree-summary.sh <工作区根> — 结构摘要:目录树(3 层) + 状态型文件 mtime(供 recall 定向与新鲜度核查)
set -euo pipefail
ROOT="${1:-$(pwd)}"
[ -d "$ROOT" ] || { echo "ERROR: 目录不存在: $ROOT" >&2; exit 1; }
echo "== 结构(≤3 层,略过大宗) =="
find "$ROOT" -maxdepth 3 \( -name .git -o -name node_modules -o -name __pycache__ -o -name .DS_Store \) -prune -o -print \
  | sed "s|^$ROOT|.|" | sort | head -100
echo
echo "== 状态型文件 mtime(新→旧) =="
{ find "$ROOT" -maxdepth 1 \( -name MEMORY.md -o -name memory.md \); [ -d "$ROOT/.agent" ] && find "$ROOT/.agent" -maxdepth 1 -name MEMORY.md;
  if [ -d "$ROOT/.agent/memory" ]; then find "$ROOT/.agent/memory" -name '*.md' -not -path '*/Archive/*'; fi; } \
  | while read -r f; do printf '%s  %s\n' "$(stat -f '%Sm' -t '%Y-%m-%d %H:%M' "$f")" "${f#$ROOT/}"; done | sort -r
echo
echo "== 工作区最近活动(全目录最新 5 个文件) =="
find "$ROOT" \( -name .git -o -name node_modules \) -prune -o -type f -print 2>/dev/null \
  | while read -r f; do printf '%s\t%s\n' "$(stat -f '%m' "$f")" "$f"; done \
  | sort -rn | head -5 \
  | while IFS=$'\t' read -r ep f; do printf '%s  %s\n' "$(date -r "$ep" '+%Y-%m-%d %H:%M')" "${f#$ROOT/}"; done
