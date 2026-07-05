#!/bin/bash
# new-dispatch.sh <工作区根> <模块路径/子智能体名> ["任务名"] — 建派发目录 + task.md 骨架
set -euo pipefail
[ $# -ge 2 ] || { echo "用法: new-dispatch.sh <工作区根> <模块/子智能体名> [任务名]" >&2; exit 2; }
ROOT="$1"; NAME="$2"; TITLE="${3:-$(basename "$NAME")}"
[ -d "$ROOT" ] || { echo "ERROR: 工作区根不存在: $ROOT" >&2; exit 1; }
case "$NAME" in *..*|/*) echo "ERROR: 模块路径须为工作区内相对路径(不含 .. / 不以 / 开头): $NAME" >&2; exit 2;; esac
D="$ROOT/.agent/subagent/$NAME"
if [ -e "$D/task.md" ]; then
  echo "ERROR: $D/task.md 已存在(派发留档为日志型,不覆盖)。同一子智能体的新一轮派发请用新目录名(如 ${NAME}-2)。" >&2
  exit 1
fi
mkdir -p "$D"
TPL="$(cd "$(dirname "$0")/../templates" && pwd)"
TITLE_ESC="${TITLE//&/\\&}"
TMP="$(mktemp)"
sed "s|{任务名}|$TITLE_ESC|g" "$TPL/dispatch-task.template.md" > "$TMP" && mv "$TMP" "$D/task.md"
echo "OK: $D/task.md"
echo "下一步: 补全 task.md(背景/成功标准/必读 path/输出 path)后,派发 prompt 只需一句: 先 Read $D/task.md 并严格按其执行。"
