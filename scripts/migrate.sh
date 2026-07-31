#!/bin/bash
################################################################################
# 一键把【已部署的 Cursor 系统】迁移到 Claude Code，迁移后可直接使用。
#
# 源头是真实部署目录 .cursor/（默认 ~/.cursor），不是工作区里的源码。
# 因此你在 Cursor 里实际拥有的全部 commands / agents / skills 都会被带过去。
#
# 映射（FROM 默认 $HOME/.cursor，TO 默认 $HOME/.claude）：
#   $FROM/.cursor/commands/*.md  -> $TO/.claude/commands/*.md   ( 斜杠命令，如 /agent )
#   $FROM/.cursor/agents/*.md    -> $TO/.claude/agents/*.md     ( subagents )
#   $FROM/.cursor/skills/*       -> $TO/.claude/skills/*        ( skills )
#   $FROM/.cursor/hooks.json     -> 合并进 $TO/.claude/settings.json 的 .hooks（如存在）
#   (内置规则种子)               -> $TO/.claude/AGENTS.md + CLAUDE.md(@AGENTS.md 导入) + 工作区链接
#                                   Claude Code 只读 CLAUDE.md，故标准做法是用 CLAUDE.md 导入 AGENTS.md。
#
# 路径改写：拷贝后把文件里的字符串 "~/.cursor/" 改写为：
#   - 全局安装(默认)： ~/.claude/
#   - 项目安装(--to)： <项目绝对路径>/.claude/
# 使 agent / skill 正文里 "Read ~/.cursor/skills/pdf/SKILL.md" 之类指令指向迁移后的真实位置。
#
# 撞名保护：若目标已存在同名 skill，先备份到 $TO/.claude/skills-backup-<时间戳>/ 再覆盖。
#
# 用法：./agent-config migrate [--from <根>] [--to <项目根>] [--dry-run] [--no-backup]
################################################################################

set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"
# 过时残留：不迁移、不报告（早期装了又删的官方示例断链 + 被 write-report 取代的旧原型）
IGNORE_SKILLS=" brand-guidelines doc-coauthoring internal-comms slack-gif-creator designer-subagent "
FROM_ROOT="$HOME"
TO_ROOT="$HOME"
TO_LABEL="global (~/.claude/)"
DRY_RUN=0
DO_BACKUP=1

while [ $# -gt 0 ]; do
    case "$1" in
        --from)
            [ -n "${2:-}" ] || { echo "ERROR: --from 需要一个目录参数"; exit 1; }
            FROM_ROOT="$(cd "$2" 2>/dev/null && pwd)" || { echo "ERROR: 目录不存在: $2"; exit 1; }
            shift 2 ;;
        --to)
            [ -n "${2:-}" ] || { echo "ERROR: --to 需要一个目录参数"; exit 1; }
            TO_ROOT="$(cd "$2" 2>/dev/null && pwd)" || { echo "ERROR: 目录不存在: $2"; exit 1; }
            TO_LABEL="project ($TO_ROOT/.claude/)"
            shift 2 ;;
        --dry-run)   DRY_RUN=1; shift ;;
        --no-backup) DO_BACKUP=0; shift ;;
        -h|--help)   sed -n '2,40p' "$0"; exit 0 ;;
        *) echo "ERROR: 未知参数 '$1'（用 -h 查看用法）"; exit 1 ;;
    esac
done

SRC="$FROM_ROOT/.cursor"
[ -d "$SRC" ] || { echo "ERROR: 找不到源 Cursor 目录: $SRC"; exit 1; }

CLAUDE_BASE="$TO_ROOT/.claude"
CLAUDE_COMMANDS="$CLAUDE_BASE/commands"
CLAUDE_AGENTS="$CLAUDE_BASE/agents"
CLAUDE_SKILLS="$CLAUDE_BASE/skills"
BACKUP_DIR="$CLAUDE_BASE/skills-backup-$(date +%Y%m%d-%H%M%S)"

# 路径改写替换目标：全局保留 ~/.claude/（可移植），项目用绝对路径
if [ "$TO_ROOT" = "$HOME" ]; then REPL="~/.claude/"; else REPL="$CLAUDE_BASE/"; fi

rewrite_paths() {  # 把目标处文本文件里的 ~/.cursor/ 改写为 $REPL（仅 .md / .py）
    local path="$1"
    [ "$DRY_RUN" -eq 1 ] && return 0
    export REPL
    find "$path" -type f \( -name '*.md' -o -name '*.py' \) -print0 \
        | xargs -0 perl -pi -e 's{\Q~/.cursor/\E}{$ENV{REPL}}g' 2>/dev/null || true
}
run() { if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] $*"; else eval "$*"; fi; }

echo "迁移 Cursor -> Claude Code"
echo "  源: $SRC"
echo "  目标: $TO_LABEL"
echo "  路径改写: ~/.cursor/  ->  $REPL"
[ "$DRY_RUN" -eq 1 ] && echo "  (dry-run：不写任何文件)"
echo ""

run "mkdir -p \"$CLAUDE_COMMANDS\" \"$CLAUDE_AGENTS\" \"$CLAUDE_SKILLS\""

# --- commands ---
echo "[commands]"
CMD_COUNT=0
if [ -d "$SRC/commands" ]; then
    for f in "$SRC/commands/"*.md; do
        [ -f "$f" ] || continue
        run "cp \"$f\" \"$CLAUDE_COMMANDS/$(basename "$f")\""
        rewrite_paths "$CLAUDE_COMMANDS/$(basename "$f")"
        echo "  $(basename "$f") -> $CLAUDE_COMMANDS/$(basename "$f")"
        CMD_COUNT=$((CMD_COUNT + 1))
    done
fi
[ "$CMD_COUNT" -eq 0 ] && echo "  (无)"

# --- agents (subagents) ---
echo ""
echo "[agents]"
AGENT_COUNT=0
if [ -d "$SRC/agents" ]; then
    for f in "$SRC/agents/"*.md; do
        [ -f "$f" ] || continue
        run "cp \"$f\" \"$CLAUDE_AGENTS/$(basename "$f")\""
        rewrite_paths "$CLAUDE_AGENTS/$(basename "$f")"
        echo "  $(basename "$f") -> $CLAUDE_AGENTS/$(basename "$f")"
        AGENT_COUNT=$((AGENT_COUNT + 1))
    done
fi
[ "$AGENT_COUNT" -eq 0 ] && echo "  (无)"

# --- skills ---
# 注意：.cursor/skills 下既有真实目录，也有指向 .claude/skills 的软链。
#   真实目录            -> 迁移
#   软链且已在目标里     -> 跳过（本来就是 Claude 的 skill）
#   失效软链（目标不存在）-> 无源可迁，列出告警
echo ""
echo "[skills]"
SKILL_COUNT=0; BACKED_UP=0; SKIPPED=0; DANGLING=""; DIS_COUNT=0; DIS_SKIP=0
CLAUDE_SKILLS_DISABLED="$CLAUDE_BASE/skills-disabled"   # 禁用 skill（同级目录，被忽略）
CLAUDE_SKILLS_ENABLED="$CLAUDE_BASE/skills"             # 启用 skill（扁平）
CLAUDE_SKILLS_REAL="$(cd "$CLAUDE_SKILLS" 2>/dev/null && pwd -P || echo "$CLAUDE_SKILLS")"
if [ -d "$SRC/skills" ]; then
    for entry in "$SRC/skills"/*; do
        NAME=$(basename "$entry")
        case "$IGNORE_SKILLS" in *" $NAME "*) continue ;; esac   # 跳过过时残留
        TARGET="$CLAUDE_SKILLS_ENABLED/$NAME"
        # 解析真实源路径（目录或可达软链得到实路径；失效软链得到空）
        SRC_REAL="$(cd "$entry" 2>/dev/null && pwd -P || true)"
        if [ -z "$SRC_REAL" ]; then
            # 失效软链 = 该 skill 在 Cursor 里已被禁用。尝试从 skills-backup 恢复内容，
            # 作为“禁用 skill”迁移到 skills-disabled/（保持禁用，完全同步）。
            DTARGET="$CLAUDE_SKILLS_DISABLED/$NAME"
            if [ -d "$DTARGET" ]; then
                echo "  (已禁用且已存在，跳过 $NAME)"; DIS_SKIP=$((DIS_SKIP + 1)); continue
            fi
            RECOVER=""
            for b in "$FROM_ROOT"/.cursor/skills-backup*/"$NAME"; do
                [ -f "$b/SKILL.md" ] && { RECOVER="$b"; break; }
            done
            if [ -n "$RECOVER" ]; then
                run "mkdir -p \"$DTARGET\""
                run "rsync -aL --delete --exclude='__pycache__' --exclude='*.pyc' --exclude='.DS_Store' \"$RECOVER/\" \"$DTARGET/\""
                rewrite_paths "$DTARGET"
                echo "  $NAME -> $DTARGET/  (保持禁用)"; DIS_COUNT=$((DIS_COUNT + 1))
            else
                DANGLING="$DANGLING $NAME"
            fi
            continue
        fi
        if [ "$SRC_REAL" = "$CLAUDE_SKILLS_REAL/$NAME" ]; then
            echo "  (跳过 ${NAME}：已是 Claude 的 skill)"; SKIPPED=$((SKIPPED + 1)); continue
        fi
        if [ -d "$TARGET" ] && [ "$DO_BACKUP" -eq 1 ]; then
            run "mkdir -p \"$BACKUP_DIR\" && cp -R \"$TARGET\" \"$BACKUP_DIR/$NAME\""
            echo "  (备份旧版 $NAME -> ${BACKUP_DIR##*/}/)"
            BACKED_UP=$((BACKED_UP + 1))
        fi
        run "mkdir -p \"$TARGET\""
        run "rsync -aL --delete --exclude='__pycache__' --exclude='*.pyc' --exclude='.DS_Store' \"$SRC_REAL/\" \"$TARGET/\""
        rewrite_paths "$TARGET"
        echo "  $NAME/ -> $TARGET/"
        SKILL_COUNT=$((SKILL_COUNT + 1))
    done
fi
[ "$SKILL_COUNT" -eq 0 ] && echo "  (无可迁移的真实 skill 目录)"
[ "$DIS_COUNT" -gt 0 ] && echo "  ($DIS_COUNT 个禁用 skill 已从 skills-backup 恢复到 skills-disabled/，保持禁用)"
if [ -n "$DANGLING" ]; then
    echo "  无法同步（失效软链且在 skills-backup 中也找不到内容）:$DANGLING"
    echo "    -> 系统内无任何源副本，需重新获取后再放入；其余禁用项已同步。"
fi

# --- rules (全局 AGENTS.md：Claude Code 实际读 CLAUDE.md，故用 CLAUDE.md 导入 AGENTS.md) ---
# 这些规则原本只存在 Cursor 的 IDE 设置里（无文件），故在此内置一份作为种子。
echo ""
echo "[rules]"
RULES_FILE="$CLAUDE_BASE/AGENTS.md"
CLAUDE_MD="$CLAUDE_BASE/CLAUDE.md"
if [ "$DRY_RUN" -eq 1 ]; then
    echo "  [dry-run] 写 ${RULES_FILE}（若不存在）；确保 ${CLAUDE_MD} 含 @AGENTS.md"
else
    if [ -f "$RULES_FILE" ]; then
        echo "  已存在，保留不覆盖: $RULES_FILE"
    else
        cat > "$RULES_FILE" <<'AGENTS_EOF'
# Global Agent Rules

Personal operating rules that apply to every project on this machine.
(Migrated from the Cursor rule system; now IDE-independent.)

## Rule 1: Goal-Driven Execution
Define verifiable success criteria, then loop until met.

"Add validation" → write tests for invalid inputs, make them pass. "Fix the bug" → write a test that reproduces it, make it pass. "Refactor X" → ensure tests pass before and after. For multi-step tasks, state a brief plan: each step paired with a verification check. Strong criteria let you loop independently; weak criteria ("make it work") require constant clarification.

## Rule 2: Surgical Changes
Touch only what you must. Clean up only your own mess.

Don't improve adjacent code, comments, or formatting. Don't refactor things that aren't broken. Match existing style even if you'd do it differently. Unrelated dead code: report, don't delete. Remove imports/variables/functions YOUR changes made unused; leave pre-existing dead code alone. Test: every changed line traces directly to the user's request.

## Rule 3: Simplicity First
Write the minimum code that solves the problem. Nothing speculative.

No features beyond what was asked. No abstractions for single-use code. No flexibility/configurability that wasn't requested. No error handling for impossible scenarios. If 200 lines could be 50, rewrite it. Self-check: "Would a senior engineer call this overcomplicated?" If yes, simplify.

## Rule 4: Think Before Coding
Before implementing, surface assumptions and confusion.

State assumptions explicitly; if uncertain, ask. If multiple interpretations exist, present them — don't pick silently. If a simpler approach exists, say so and push back when warranted. If something is unclear, stop, name what's confusing, and ask.

## Rule 5: No Emojis
Do not use emojis in code comments, outputs, or responses. Maintain a clean and professional tone and presentation at all times.
AGENTS_EOF
        echo "  写入: $RULES_FILE"
    fi
    # 确保 CLAUDE.md 导入 AGENTS.md（幂等）
    if [ ! -f "$CLAUDE_MD" ] || ! grep -q '^@AGENTS.md' "$CLAUDE_MD" 2>/dev/null; then
        printf '@AGENTS.md\n' >> "$CLAUDE_MD"
        echo "  $CLAUDE_MD 已加入 @AGENTS.md 导入"
    else
        echo "  $CLAUDE_MD 已含 @AGENTS.md 导入"
    fi
fi

# --- hooks (如源里有 hooks.json 则合并进 settings.json) ---
echo ""
echo "[hooks]"
if [ -f "$SRC/hooks.json" ]; then
    SETTINGS="$CLAUDE_BASE/settings.json"
    if command -v jq >/dev/null 2>&1; then
        if [ "$DRY_RUN" -eq 1 ]; then
            echo "  [dry-run] 合并 $SRC/hooks.json 的 .hooks 到 $SETTINGS"
        else
            [ -f "$SETTINGS" ] && cp "$SETTINGS" "$SETTINGS.bak.$(date +%s)"
            [ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"
            tmp="$(mktemp)"
            jq -s '.[0] * {hooks: .[1].hooks}' "$SETTINGS" "$SRC/hooks.json" > "$tmp" && mv "$tmp" "$SETTINGS"
            echo "  hooks.json -> 已合并到 $SETTINGS (.hooks)，原文件已备份"
        fi
    else
        echo "  WARN: 有 hooks.json 但未装 jq，跳过；请手动把 .hooks 合并进 $SETTINGS"
    fi
else
    echo "  源无 hooks（$SRC/hooks.json 不存在），跳过。"
fi

# --- 校验与告警 ---
echo ""
echo "[check]"
if [ "$DRY_RUN" -eq 0 ]; then
    LEFT=$(grep -rl 'cursor' "$CLAUDE_AGENTS" "$CLAUDE_SKILLS" "$CLAUDE_COMMANDS" 2>/dev/null \
            | xargs grep -l '\.cursor/\|cursor-public' 2>/dev/null || true)
    if [ -n "$LEFT" ]; then
        echo "  注意：以下文件仍引用 cursor 专有插件路径（如 parallel-*，Cursor 插件，未随仓库迁移）："
        echo "$LEFT" | sed 's/^/    - /'
        echo "  -> 这些插件在 Claude Code 下不存在；请安装等价 skill 或删除相关引用。"
    else
        echo "  OK：未发现残留的 cursor 专有路径。"
    fi
fi

echo ""
echo "完成。迁移 ${CMD_COUNT} 命令 + ${AGENT_COUNT} subagents + ${SKILL_COUNT} 启用 skills + ${DIS_COUNT} 禁用 skills 到 ${TO_LABEL}（跳过 ${SKIPPED} 启用/${DIS_SKIP} 禁用，已存在）。"
[ "$BACKED_UP" -gt 0 ] && echo "（覆盖前备份了 ${BACKED_UP} 个同名旧 skill 到 ${BACKUP_DIR}）"
echo "在 Claude Code 里：输入 /agent 启动编排器；subagents 与 skills 已就位可被自动调用。"
