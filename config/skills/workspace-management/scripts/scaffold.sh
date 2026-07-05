#!/bin/bash
# scaffold.sh --profile task|repo [目标目录]  — 建最小工作区(幂等;已存在的不覆盖)
# 老规范保护:目标根存在 memory.md 时拒绝执行(防双根),提示走迁移流程。
set -euo pipefail
PROFILE=""; DIR=""
while [ $# -gt 0 ]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2;;
    *) DIR="$1"; shift;;
  esac
done
[ -z "$PROFILE" ] && { echo "用法: scaffold.sh --profile task|repo [目标目录]" >&2; exit 2; }
[ "$PROFILE" = "task" ] || [ "$PROFILE" = "repo" ] || { echo "ERROR: profile 只能是 task 或 repo" >&2; exit 2; }
DIR="${DIR:-$(pwd)}"; mkdir -p "$DIR"
# macOS 文件系统大小写不敏感,-e 会把 MEMORY.md 误判为 memory.md;find -name 对存储名精确匹配
has(){ [ -n "$(find "$1" -maxdepth 1 -name "$2" 2>/dev/null)" ]; }
if has "$DIR" memory.md; then
  echo "ERROR: 检测到老规范根文件 memory.md — 拒绝执行以防双根并存。" >&2
  echo "老规范任务维持原样;确需升级请走迁移流程(见 workspace-management spec §10 软切换),迁移完成后再跑本脚本。" >&2
  exit 1
fi
TPL="$(cd "$(dirname "$0")/../templates" && pwd)"
created=()
[ -d "$DIR/.agent" ] || { mkdir "$DIR/.agent"; created+=(".agent/"); }
# v2.0 根位 MEMORY.md → 自动移入 .agent/(v2.1 规范)
if has "$DIR" MEMORY.md && ! has "$DIR/.agent" MEMORY.md; then
  mv "$DIR/MEMORY.md" "$DIR/.agent/MEMORY.md"; created+=("MEMORY.md(v2.0 根位→移入 .agent/)")
fi
if ! has "$DIR/.agent" MEMORY.md; then
  BN="$(basename "$DIR")"; BN_ESC="${BN//&/\\&}"
  sed "s|{任务名}|$BN_ESC|g" "$TPL/MEMORY.template.md" > "$DIR/.agent/MEMORY.md"; created+=(".agent/MEMORY.md")
fi
if [ "$PROFILE" = "task" ]; then
  [ -d "$DIR/context" ] || { mkdir "$DIR/context"; created+=("context/"); }
  [ -d "$DIR/deliverables" ] || { mkdir "$DIR/deliverables"; created+=("deliverables/"); }
  PTR='Agent 记忆入口 = ./.agent/MEMORY.md(先读它再干活;工作区规范 = ~/.claude/skills/workspace-management/)。'
  if [ ! -e "$DIR/CLAUDE.md" ]; then
    printf '%s\n' "$PTR" > "$DIR/CLAUDE.md"; created+=("CLAUDE.md(指针行)")
  elif grep -q "= ./MEMORY.md" "$DIR/CLAUDE.md"; then
    sed -i '' 's|= ./MEMORY.md|= ./.agent/MEMORY.md|' "$DIR/CLAUDE.md"; created+=("CLAUDE.md(指针改 .agent/ 位)")
  elif ! grep -q "MEMORY.md" "$DIR/CLAUDE.md"; then
    printf '\n%s\n' "$PTR" >> "$DIR/CLAUDE.md"; created+=("CLAUDE.md(追加指针行)")
  fi
else
  echo "NOTE(repo profile): 不自动改 repo 的 AGENTS.md/CLAUDE.md——追加指针行须先征得用户确认(文案见 templates/pointer-line.md)。"
fi
if [ ${#created[@]} -eq 0 ]; then echo "OK(幂等): $DIR 已是目标形态,未做任何改动。"
else echo "OK: 已创建 -> ${created[*]}"; fi
echo "提醒: 任务 profile 的飞书任务夹按 spec §9 由 workspace-init 流程建(lark-cli),脚本不代办。"
