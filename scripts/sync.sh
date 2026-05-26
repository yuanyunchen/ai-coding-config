#!/bin/bash
################################################################################
# 以 cursor | claude | codex 任一为 SOURCE，把统一的 agent 配置【增量】同步到
# 另外两个工具。只添加 / 更新，绝不删除目标里已有的东西。
#
# 三个工具的部署目录（全局安装）：
#   ~/.cursor   ~/.claude   ~/.codex
#
# 同步的配置类别及各工具的目录映射：
#   类别          cursor          claude          codex
#   -----------   -------------   -------------   ----------------------------
#   斜杠命令      commands/*.md   commands/*.md   prompts/*.md
#   subagents     agents/*.md     agents/*.md     (无对应目录 -> 跳过)
#   skills        skills/*        skills/*        skills/*  (.system 不动)
#   全局规则      AGENTS.md       AGENTS.md       AGENTS.md
#
#   - claude 额外保证 CLAUDE.md 里有 @AGENTS.md 导入（Claude 只读 CLAUDE.md）。
#   - codex 没有 subagents 机制，故 subagents 只在 cursor <-> claude 之间同步。
#   - codex 的 skills/.system 是官方系统 skill，永不触碰。
#   - hooks / 插件不在同步范围（各工具机制不同；用户已声明“除了插件全部统一”）。
#
# 增量语义（关键）：
#   - 命令 / subagents：把 source 的文件拷到目标，同名覆盖更新，绝不删目标多出来的。
#   - skills：rsync 不加 --delete，同名 skill 内更新/新增文件，绝不删除目标里多余文件。
#   - AGENTS.md：source 为准，覆盖目标（这是“统一规则”的本意；覆盖前若内容不同会备份）。
#
# 路径改写：拷贝后把正文里的 ~/.cursor/  ~/.claude/  ~/.codex/ 统一改写成
#   目标工具自己的根（如同步到 codex 则改写为 ~/.codex/），使 skill / 命令正文里
#   "Read ~/.claude/skills/pdf/SKILL.md" 之类指令指向目标工具的真实位置。
#
# 撞名保护：覆盖已存在的 skill / AGENTS.md 前，先备份到目标根下
#   <tool>/.claude-sync-backup-<时间戳>/。
#
# 用法：./agent-config sync [--source cursor|claude|codex] [--dry-run] [--no-backup]
################################################################################

set -euo pipefail

# 过时残留：不同步、不报告
IGNORE_SKILLS=" brand-guidelines doc-coauthoring internal-comms slack-gif-creator designer-subagent "
# 仅在【目标是 codex】时额外跳过的 skill：
#   skill-creator           -> 与 codex 自带 .system/skill-creator 同名冲突
#   webpage-content-extraction -> 依赖 cursor 专有插件 parallel-cli，codex 下不可用
CODEX_IGNORE_SKILLS=" skill-creator webpage-content-extraction "

SOURCE="claude"
DRY_RUN=0
DO_BACKUP=1
STAMP="$(date +%Y%m%d-%H%M%S)"

while [ $# -gt 0 ]; do
    case "$1" in
        --source)
            [ -n "${2:-}" ] || { echo "ERROR: --source 需要一个值 (cursor|claude|codex)"; exit 1; }
            SOURCE="$2"; shift 2 ;;
        --dry-run)   DRY_RUN=1; shift ;;
        --no-backup) DO_BACKUP=0; shift ;;
        -h|--help)   sed -n '2,49p' "$0"; exit 0 ;;
        *) echo "ERROR: 未知参数 '$1'（用 -h 查看用法）"; exit 1 ;;
    esac
done

case "$SOURCE" in cursor|claude|codex) ;; *) echo "ERROR: --source 只能是 cursor|claude|codex"; exit 1 ;; esac

# --- 工具属性 ---
base_dir()  { echo "$HOME/.$1"; }                                  # 部署根
cmd_dir()   { [ "$1" = codex ] && echo "prompts" || echo "commands"; }  # 斜杠命令目录名
has_agents(){ [ "$1" != codex ]; }                                 # 是否有 subagents 机制

SRC_BASE="$(base_dir "$SOURCE")"
[ -d "$SRC_BASE" ] || { echo "ERROR: 找不到源目录: $SRC_BASE"; exit 1; }

ALL="cursor claude codex"
TARGETS=""
for t in $ALL; do [ "$t" = "$SOURCE" ] || TARGETS="$TARGETS $t"; done

run() { if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] $*"; else eval "$*"; fi; }

# 把 path 下 .md/.py 正文里的三种工具根，统一改写成 dest 工具的根
rewrite_paths() {
    local path="$1" dest="$2"
    [ "$DRY_RUN" -eq 1 ] && return 0
    export REPL="~/.$dest/"
    find "$path" -type f \( -name '*.md' -o -name '*.py' \) -print0 2>/dev/null \
        | xargs -0 perl -pi -e 's{\Q~/.cursor/\E|\Q~/.claude/\E|\Q~/.codex/\E}{$ENV{REPL}}g' 2>/dev/null || true
}

echo "同步 agent 配置（增量，只加不删）"
echo "  源:   $SOURCE ($SRC_BASE)"
echo "  目标: $(echo $TARGETS)"
[ "$DRY_RUN" -eq 1 ] && echo "  (dry-run：不写任何文件)"

for TGT in $TARGETS; do
    TGT_BASE="$(base_dir "$TGT")"
    BK="$TGT_BASE/.claude-sync-backup-$STAMP"
    echo ""
    echo "===== -> $TGT ($TGT_BASE) ====="
    [ -d "$TGT_BASE" ] || { echo "  目标根不存在，跳过该工具: $TGT_BASE"; continue; }

    # --- AGENTS.md（source 为准，覆盖；覆盖前若不同则备份）---
    echo "[AGENTS.md]"
    SRC_RULES="$SRC_BASE/AGENTS.md"
    TGT_RULES="$TGT_BASE/AGENTS.md"
    if [ -s "$SRC_RULES" ]; then
        if [ "$DO_BACKUP" -eq 1 ] && [ -s "$TGT_RULES" ] && ! cmp -s "$SRC_RULES" "$TGT_RULES"; then
            run "mkdir -p \"$BK\" && cp \"$TGT_RULES\" \"$BK/AGENTS.md\""
            echo "  (备份旧 AGENTS.md -> ${BK##*/}/)"
        fi
        run "cp \"$SRC_RULES\" \"$TGT_RULES\""
        echo "  AGENTS.md -> $TGT_RULES"
        if [ "$TGT" = claude ]; then
            CLAUDE_MD="$TGT_BASE/CLAUDE.md"
            if [ "$DRY_RUN" -eq 1 ]; then
                echo "  [dry-run] 确保 $CLAUDE_MD 含 @AGENTS.md 导入"
            elif [ ! -f "$CLAUDE_MD" ] || ! grep -q '^@AGENTS.md' "$CLAUDE_MD" 2>/dev/null; then
                printf '@AGENTS.md\n' >> "$CLAUDE_MD"; echo "  $CLAUDE_MD 已加入 @AGENTS.md 导入"
            fi
        fi
    else
        echo "  (源无 AGENTS.md 内容，跳过)"
    fi

    # --- 斜杠命令 ---
    echo "[commands]"
    SRC_CMD="$SRC_BASE/$(cmd_dir "$SOURCE")"
    TGT_CMD="$TGT_BASE/$(cmd_dir "$TGT")"
    N=0
    if [ -d "$SRC_CMD" ]; then
        run "mkdir -p \"$TGT_CMD\""
        for f in "$SRC_CMD"/*.md; do
            [ -f "$f" ] || continue
            run "cp \"$f\" \"$TGT_CMD/$(basename "$f")\""
            rewrite_paths "$TGT_CMD/$(basename "$f")" "$TGT"
            echo "  $(basename "$f") -> $TGT_CMD/"; N=$((N+1))
        done
    fi
    [ "$N" -eq 0 ] && echo "  (无)"

    # --- subagents（codex 无此机制，跳过）---
    echo "[agents]"
    if has_agents "$SOURCE" && has_agents "$TGT"; then
        N=0
        if [ -d "$SRC_BASE/agents" ]; then
            run "mkdir -p \"$TGT_BASE/agents\""
            for f in "$SRC_BASE/agents"/*.md; do
                [ -f "$f" ] || continue
                run "cp \"$f\" \"$TGT_BASE/agents/$(basename "$f")\""
                rewrite_paths "$TGT_BASE/agents/$(basename "$f")" "$TGT"
                echo "  $(basename "$f") -> $TGT_BASE/agents/"; N=$((N+1))
            done
        fi
        [ "$N" -eq 0 ] && echo "  (无)"
    else
        echo "  (codex 无 subagents 机制，跳过)"
    fi

    # --- skills（增量 rsync，无 --delete；codex 的 .system 永不触碰）---
    echo "[skills]"
    TGT_SKILLS="$TGT_BASE/skills"
    TGT_SKILLS_REAL="$(cd "$TGT_SKILLS" 2>/dev/null && pwd -P || echo "$TGT_SKILLS")"
    N=0; BK_N=0
    if [ -d "$SRC_BASE/skills" ]; then
        run "mkdir -p \"$TGT_SKILLS\""
        for entry in "$SRC_BASE/skills"/*; do
            NAME=$(basename "$entry")
            [ "$NAME" = ".system" ] && continue                       # codex 系统 skill，跳过
            case "$IGNORE_SKILLS" in *" $NAME "*) continue ;; esac      # 过时残留
            if [ "$TGT" = codex ]; then case "$CODEX_IGNORE_SKILLS" in *" $NAME "*) echo "  (跳过 ${NAME}: codex 不适用)"; continue ;; esac; fi
            SRC_REAL="$(cd "$entry" 2>/dev/null && pwd -P || true)"     # 解析真实路径（含软链）
            [ -z "$SRC_REAL" ] && continue                             # 失效软链，无源可同步
            [ "$SRC_REAL" = "$TGT_SKILLS_REAL/$NAME" ] && continue      # 源就是目标本身（软链回指）
            TARGET="$TGT_SKILLS/$NAME"
            # 目标若是软链且实指回源（如 cursor/skills/pdf -> claude/skills/pdf），跳过，
            # 否则 rsync 会顺着软链写回源自身。
            TGT_REAL="$(cd "$TARGET" 2>/dev/null && pwd -P || true)"
            [ -n "$TGT_REAL" ] && [ "$TGT_REAL" = "$SRC_REAL" ] && { echo "  (跳过 ${NAME}: 目标软链已指向源)"; continue; }
            if [ -d "$TARGET" ] && [ ! -L "$TARGET" ] && [ "$DO_BACKUP" -eq 1 ]; then
                run "mkdir -p \"$BK/skills\" && cp -R \"$TARGET\" \"$BK/skills/$NAME\""
                BK_N=$((BK_N+1))
            fi
            run "mkdir -p \"$TARGET\""
            run "rsync -aL --exclude='__pycache__' --exclude='*.pyc' --exclude='.DS_Store' \"$SRC_REAL/\" \"$TARGET/\""
            rewrite_paths "$TARGET" "$TGT"
            echo "  $NAME/ -> $TARGET/"; N=$((N+1))
        done
    fi
    [ "$N" -eq 0 ] && echo "  (无可同步的 skill)"
    [ "$BK_N" -gt 0 ] && echo "  (覆盖前备份了 $BK_N 个同名旧 skill -> ${BK##*/}/skills/)"
done

echo ""
echo "完成。以 $SOURCE 为源，已增量同步到:$(echo " $TARGETS")。"
[ "$DRY_RUN" -eq 1 ] && echo "（dry-run：未写任何文件，去掉 --dry-run 实际执行）"
