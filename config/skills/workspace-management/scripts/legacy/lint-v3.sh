#!/bin/bash
# lint.sh <工作区根> — 巡检六项(spec §9)。输出 ERROR:/WARN: 行;有 ERROR 则退出码 1。
# 新旧规范识别:MEMORY.md=新(全查);仅 memory.md=旧规范(只查死链);双根并存=ERROR。
set -uo pipefail
ROOT="${1:-$(pwd)}"; ERR=0; WARN=0
err(){ echo "ERROR: $1"; ERR=$((ERR+1)); }
warn(){ echo "WARN: $1"; WARN=$((WARN+1)); }
[ -d "$ROOT" ] || { echo "ERROR: 目录不存在: $ROOT"; exit 1; }

# 死链检查函数:抽取 md 内本地 path(markdown 链接 + 反引号相对路径),验存在性
check_links(){ # $1=md 文件;反引号 token 须含 / 才算路径(裸文件名是行文提及,不查——防误报)
  local f="$1" base; base="$(dirname "$1")"
  { grep -oE '\]\([^)#]+\)' "$f" 2>/dev/null | sed -E 's/^\]\(//; s/\)$//';
    grep -oE '`[A-Za-z0-9_.-]+(/[A-Za-z0-9_. -]+)+\.(md|sh|py|html|csv|png|json)`' "$f" 2>/dev/null | sed -E 's/^`//; s/`$//'; } \
    | grep -vE '^(https?|mailto):' | sort -u | while read -r p; do
      case "$p" in
        /*) [ -e "$p" ] || echo "$p";;
        "~"*) [ -e "$HOME${p#\~}" ] || echo "$p";;
        *) [ -e "$base/$p" ] || [ -e "$ROOT/$p" ] || echo "$p";;
      esac
    done
}

# macOS 大小写不敏感:用 find -name 对存储名精确匹配,防 MEMORY.md 被 -f memory.md 误命中
has(){ [ -n "$(find "$1" -maxdepth 1 -name "$2" 2>/dev/null)" ]; }
MODE="new"; MEMF="$ROOT/.agent/MEMORY.md"
# 双根/多入口护栏(大小写并存仅 case-sensitive 卷可现;.agent 位与根位并存本机即可现)
if [ -d "$ROOT/.agent" ] && has "$ROOT/.agent" MEMORY.md; then
  MEMF="$ROOT/.agent/MEMORY.md"
  has "$ROOT" memory.md && { err "① 双入口:.agent/MEMORY.md 与根 memory.md 同在(迁移未完成态)"; MODE="dual"; }
  has "$ROOT" MEMORY.md && { err "① 双入口:.agent/MEMORY.md 与根 MEMORY.md 同在(v2.0 残留,应删根位)"; MODE="dual"; }
elif has "$ROOT" MEMORY.md; then
  MEMF="$ROOT/MEMORY.md"
  warn "① 入口在 v2.0 根位:MEMORY.md 应移入 .agent/(v2.1 起;scaffold 重跑可自动迁)"
  has "$ROOT" memory.md && { err "① 双根并存:MEMORY.md 与 memory.md 同在"; MODE="dual"; }
elif has "$ROOT" memory.md; then
  MODE="old"
else
  err "① 根缺入口:.agent/MEMORY.md 不存在(也非老规范根 memory.md)"
fi

if [ "$MODE" = "dual" ]; then
  : # 双根已报,不再叠加其它检查
elif [ "$MODE" = "old" ]; then
  echo "NOTE: 老规范工作区(根=memory.md),只查死链(spec §10 软切换)。"
  miss=$(check_links "$ROOT/memory.md"); [ -n "$miss" ] && while read -r p; do err "③ 死链(memory.md): $p"; done <<< "$miss"
else
  # ① 结构合规:根级白名单外散文件
  while read -r f; do
    [ -n "$f" ] && warn "① 根级散文件: $(basename "$f")(应归 context/deliverables/.agent)"
  done < <(find "$ROOT" -maxdepth 1 -type f ! -name 'MEMORY.md' ! -name 'CLAUDE.md' ! -name 'AGENTS.md' \
    ! -name 'README*' ! -name '.DS_Store' ! -name '.gitignore' ! -name '*.code-workspace')
  # ② 状态型新鲜度:MEMORY.md 落后于工作区最新活动 > 7 天
  if [ -f "$MEMF" ]; then
    mem_m=$(stat -f %m "$MEMF")
    newest=$(find "$ROOT" \( -name .git -o -name node_modules \) -prune -o -type f -print0 2>/dev/null | xargs -0 stat -f %m 2>/dev/null | sort -rn | head -1)
    if [ -n "${newest:-}" ] && [ $((newest - mem_m)) -gt 604800 ]; then
      warn "② 新鲜度:MEMORY.md 落后工作区最新活动 >7 天(可能失实)"
    fi
    # ② 规模软指引(spec §8:提醒不硬卡)
    ml=$(wc -l < "$MEMF" | tr -d ' ')
    [ "$ml" -gt 150 ] && warn "② 规模:MEMORY.md 已 $ml 行(软指引:一屏读完;考虑按需分流拆文件,信息量优先不删内容)"
    # ③ 死链
    miss=$(check_links "$MEMF"); [ -n "$miss" ] && while read -r p; do err "③ 死链(MEMORY.md): $p"; done <<< "$miss"
  fi
  # ④ 索引核对:note 文件未被 MEMORY.md 提及
  if [ -d "$ROOT/.agent/memory/note" ]; then
    while read -r n; do
      [ -n "$n" ] && { grep -q "$(basename "$n")" "$MEMF" 2>/dev/null || warn "④ 索引缺口:note $(basename "$n") 未登 MEMORY.md"; }
    done < <(find "$ROOT/.agent/memory/note" -name '*.md')
  fi
  # ⑤ 派发留档完整性:task.md 与 result.md 成对
  if [ -d "$ROOT/.agent/subagent" ]; then
    while read -r t; do
      [ -n "$t" ] && { [ -f "$(dirname "$t")/result.md" ] || warn "⑤ 派发未回传:$(dirname "${t#$ROOT/}") 有 task.md 无 result.md(在途或失联)"; }
    done < <(find "$ROOT/.agent/subagent" -name 'task.md' -not -path '*sandbox*')
  fi
  # ⑥ 能力层对账(.agent/skills|agents ↔ MEMORY.md 路由表;根 .claude 仅限 harness 执行物)
  for s in "$ROOT/.agent/skills"/*/ "$ROOT/.agent/agents"/*.md "$ROOT/.claude/skills"/*/ "$ROOT/.claude/agents"/*.md; do
    [ -e "$s" ] || continue
    nm=$(basename "$s" .md)
    grep -q "$nm" "$MEMF" 2>/dev/null || warn "⑥ 能力层未登路由表:$nm(不登此表 = 不存在)"
  done
  [ -d "$ROOT/.claude/skills" ] && warn "⑥ 根 .claude/skills 存在:v2.1 起文本能力应在 .agent/skills(根 .claude 仅 hooks 等 harness 执行物)"
fi
# ⑥ 归档区活跃注册物:自身在归档路径下,或根下一层 _archive/*/ 内
case "$ROOT" in *_archive*|*Archive*) [ -d "$ROOT/.claude" ] && err "⑥ 归档区存在活跃 .claude/(应改名 .claude.archived/)";; esac
for a in "$ROOT"/_archive/*/.claude; do
  [ -d "$a" ] && err "⑥ 归档区存在活跃 .claude/:${a#$ROOT/}(应改名 .claude.archived/)"
done

echo "---"
echo "lint 完成: $ERR error / $WARN warn ($ROOT, mode=$MODE)"
[ "$ERR" -gt 0 ] && exit 1 || exit 0
