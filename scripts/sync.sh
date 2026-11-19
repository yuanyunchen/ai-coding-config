#!/bin/bash
################################################################################
# 以 cursor | claude | codex | trae 任一为 SOURCE，把统一的 agent 配置同步到
# 其余工具。默认【增量】：只添加 / 更新，绝不删除目标里已有的东西。
# 加 --mirror 则【镜像】：目标与源对齐，删除源里没有的多余项（覆盖前备份）。
#
# 四个工具的部署目录（全局安装）：
#   ~/.cursor   ~/.claude   ~/.codex   ~/.trae
#
# 同步的配置类别及各工具的目录映射：
#   类别          cursor/claude/trae              codex
#   -----------   -----------------------------   ----------------------------
#   斜杠命令      commands/*.md                    prompts/*.md
#   subagents     agents/*.md                      (无对应目录 -> 跳过)
#   skills        skills/* + skills-disabled/*     同上 (codex 的 skills/.system 不动)
#   全局规则      AGENTS.md                        AGENTS.md
#   中文镜像      AGENTS-cn.md                     AGENTS-cn.md（人读参考）
#
#   - claude 额外保证 CLAUDE.md 里有 @AGENTS.md 导入（Claude 只读 CLAUDE.md）。
#   - trae = Trae IDE + Trae CLI（traecli）共用 ~/.trae；布局与 cursor/claude 同构。
#   - codex 没有 subagents 机制，故 subagents 不写入 codex。
#   - codex 的 skills/.system 是官方系统 skill，永不触碰。
#   - hook 型 Claude 插件（manifest hookPlugins）不同步；各工具单独安装。
#
# 增量语义（默认）：
#   - 命令 / subagents：把 source 的文件拷到目标，同名覆盖更新，绝不删目标多出来的。
#   - skills：rsync 不加 --delete，同名 skill 内更新/新增文件，绝不删除目标里多余文件。
#   - AGENTS.md / AGENTS-cn.md：source 为准，覆盖目标（统一规则；覆盖前若内容不同会备份）。
#
# 镜像语义（--mirror）：
#   - 命令 / subagents：删除目标里 source 没有的文件（hook 插件 IGNORE_COMMANDS 除外）。
#   - skills / skills-disabled：rsync --delete；并删除目标里 source 未同步的整个 skill 目录。
#   - 同步到 codex 时仍永不触碰 skills/.system；--mirror 也会同步 CODEX_IGNORE 里跳过的 skill。
#
# 路径改写：拷贝后把正文里的 ~/.cursor/ ~/.claude/ ~/.codex/ ~/.trae/ 统一改写成
#   目标工具自己的根（如同步到 trae 则改写为 ~/.trae/），使 skill / 命令正文里
#   "Read ~/.claude/skills/pdf/SKILL.md" 之类指令指向目标工具的真实位置。
#
# 撞名保护：覆盖已存在的 skill / AGENTS.md / AGENTS-cn.md 前，先备份到目标根下
#   <tool>/.claude-sync-backup-<时间戳>/。
#
# 用法：./agent-config sync [--source cursor|claude|codex|trae]
#                           [--target cursor|claude|codex|trae]
#                           [--mirror] [--dry-run] [--no-backup]
################################################################################

set -euo pipefail

# 过时残留：不同步、不报告
IGNORE_SKILLS=" brand-guidelines doc-coauthoring internal-comms slack-gif-creator designer-subagent "
# hook 型 Claude 插件命令：仅 Claude marketplace，不同步到 Cursor/Codex
IGNORE_COMMANDS=" ralph-loop.md cancel-ralph.md hookify.md configure.md list.md help.md "
# 仅在【目标是 codex】时额外跳过的 skill：
#   skill-creator           -> 与 codex 自带 .system/skill-creator 同名冲突
#   webpage-content-extraction -> 依赖 cursor 专有插件 parallel-cli，codex 下不可用
CODEX_IGNORE_SKILLS=" skill-creator webpage-content-extraction "

SOURCE="claude"
TARGET_FILTER=""
MIRROR=0
DRY_RUN=0
DO_BACKUP=1
STAMP="$(date +%Y%m%d-%H%M%S)"

while [ $# -gt 0 ]; do
    case "$1" in
        --source)
            [ -n "${2:-}" ] || { echo "ERROR: --source 需要一个值 (cursor|claude|codex|trae)"; exit 1; }
            SOURCE="$2"; shift 2 ;;
        --target)
            [ -n "${2:-}" ] || { echo "ERROR: --target 需要一个值 (cursor|claude|codex|trae)"; exit 1; }
            TARGET_FILTER="$2"; shift 2 ;;
        --mirror)  MIRROR=1; shift ;;
        --dry-run)   DRY_RUN=1; shift ;;
        --no-backup) DO_BACKUP=0; shift ;;
        -h|--help)   sed -n '2,55p' "$0"; exit 0 ;;
        *) echo "ERROR: 未知参数 '$1'（用 -h 查看用法）"; exit 1 ;;
    esac
done

case "$SOURCE" in cursor|claude|codex|trae) ;; *) echo "ERROR: --source 只能是 cursor|claude|codex|trae"; exit 1 ;; esac
case "$TARGET_FILTER" in
    "") ;;
    cursor|claude|codex|trae)
        [ "$TARGET_FILTER" = "$SOURCE" ] && { echo "ERROR: --target 不能与 --source 相同"; exit 1; } ;;
    *) echo "ERROR: --target 只能是 cursor|claude|codex|trae"; exit 1 ;;
esac

# --- 工具属性 ---
base_dir()  { echo "$HOME/.$1"; }                                  # 部署根
cmd_dir()   { [ "$1" = codex ] && echo "prompts" || echo "commands"; }  # 斜杠命令目录名
has_agents(){ [ "$1" != codex ]; }                                 # 是否有 subagents 机制

SRC_BASE="$(base_dir "$SOURCE")"
[ -d "$SRC_BASE" ] || { echo "ERROR: 找不到源目录: $SRC_BASE"; exit 1; }

ALL="cursor claude codex trae"
TARGETS=""
for t in $ALL; do
    [ "$t" = "$SOURCE" ] && continue
    [ -n "$TARGET_FILTER" ] && [ "$t" != "$TARGET_FILTER" ] && continue
    TARGETS="$TARGETS $t"
done
[ -n "$TARGETS" ] || { echo "ERROR: 没有可同步的目标（检查 --source / --target）"; exit 1; }

run() { if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] $*"; else eval "$*"; fi; }

should_sync_skill() {
    local name="$1" tgt="$2"
    [ "$name" = ".system" ] && return 1
    # qa-loop 是 Codex 本地入口；不跨工具复制，镜像同步也不裁剪它。
    [ "$name" = "qa-loop" ] && return 1
    # skills/synced/ = Claude 应用从 claude.ai 下发的托管副本，只属于 Claude，不外传
    [ "$name" = "synced" ] && return 1
    case "$IGNORE_SKILLS" in *" $name "*) return 1 ;; esac
    if [ "$tgt" = codex ] && [ "$MIRROR" -eq 0 ]; then
        case "$CODEX_IGNORE_SKILLS" in *" $name "*) return 1 ;; esac
    fi
    return 0
}

backup_path() {
    local bk="$1" sub="$2" name="$3"
    run "mkdir -p \"$bk/$sub\" && cp -R \"$4\" \"$bk/$sub/$name\""
}

prune_skill_dir() {
    local src_dir="$1" tgt_dir="$2" bk_sub="$3"
    [ "$MIRROR" -eq 1 ] || return 0
    [ -d "$tgt_dir" ] || return 0
    for entry in "$tgt_dir"/*; do
        [ -e "$entry" ] || continue
        local name; name=$(basename "$entry")
        [ "$name" = ".system" ] && continue
        should_sync_skill "$name" "$TGT" || continue
        local found=0
        if [ -d "$src_dir" ]; then
            for src_entry in "$src_dir"/*; do
                [ -e "$src_entry" ] || continue
                [ "$(basename "$src_entry")" = "$name" ] && { found=1; break; }
            done
        fi
        if [ "$found" -eq 0 ]; then
            if [ "$DO_BACKUP" -eq 1 ]; then
                backup_path "$BK" "$bk_sub" "$name" "$entry"
            fi
            run "rm -rf \"$entry\""
            echo "  (删除多余 ${bk_sub}/${name}/)"
        fi
    done
}

# 把 path 下 .md/.py 正文里的各工具根，统一改写成 dest 工具的根
rewrite_paths() {
    local path="$1" dest="$2"
    [ "$DRY_RUN" -eq 1 ] && return 0
    export REPL="~/.$dest/"
    find "$path" -type f \( -name '*.md' -o -name '*.py' -o -name '*.sh' \) -print0 2>/dev/null \
        | xargs -0 perl -pi -e '
            # 先把绝对写法（/Users/<user>/.claude/、$HOME/.codex/）归一成 ~/.<tool>/，
            # 否则它们绕过下面的改写、把源工具的 home 原样带进目标工具（chart-gen 曾四源同错）
            s{(?:/Users/[^/\s"'"'"']+|\$HOME|\$\{HOME\})/\.(cursor|claude|codex|trae)/}{~/.$1/}g;
            s{(~/.(?:cursor|claude|codex|trae)/skills)/disabled/}{${1}-disabled/}g;
            s{(~/.(?:cursor|claude|codex|trae)/skills)/enabled/}{$1/}g;
            s{\Q~/.cursor/\E|\Q~/.claude/\E|\Q~/.codex/\E|\Q~/.trae/\E}{$ENV{REPL}}g;
        ' 2>/dev/null || true
}

if [ "$MIRROR" -eq 1 ]; then
    echo "同步 agent 配置（镜像，与源完全对齐）"
else
    echo "同步 agent 配置（增量，只加不删）"
fi
echo "  源:   $SOURCE ($SRC_BASE)"
echo "  目标: $(echo $TARGETS)"
[ -n "$TARGET_FILTER" ] && echo "  (仅同步到: $TARGET_FILTER)"
[ "$DRY_RUN" -eq 1 ] && echo "  (dry-run：不写任何文件)"

for TGT in $TARGETS; do
    TGT_BASE="$(base_dir "$TGT")"
    BK="$TGT_BASE/.claude-sync-backup-$STAMP"
    echo ""
    echo "===== -> $TGT ($TGT_BASE) ====="
    [ -d "$TGT_BASE" ] || { echo "  目标根不存在，跳过该工具: $TGT_BASE"; continue; }

    # --- AGENTS.md / AGENTS-cn.md（source 为准，覆盖；覆盖前若不同则备份）---
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

    echo "[AGENTS-cn.md]"
    SRC_CN="$SRC_BASE/AGENTS-cn.md"
    TGT_CN="$TGT_BASE/AGENTS-cn.md"
    if [ -s "$SRC_CN" ]; then
        if [ "$DO_BACKUP" -eq 1 ] && [ -s "$TGT_CN" ] && ! cmp -s "$SRC_CN" "$TGT_CN"; then
            run "mkdir -p \"$BK\" && cp \"$TGT_CN\" \"$BK/AGENTS-cn.md\""
            echo "  (备份旧 AGENTS-cn.md -> ${BK##*/}/)"
        fi
        run "cp \"$SRC_CN\" \"$TGT_CN\""
        echo "  AGENTS-cn.md -> $TGT_CN"
    else
        echo "  (源无 AGENTS-cn.md 内容，跳过)"
    fi

    # --- 斜杠命令 ---
    echo "[commands]"
    SRC_CMD="$SRC_BASE/$(cmd_dir "$SOURCE")"
    TGT_CMD="$TGT_BASE/$(cmd_dir "$TGT")"
    N=0
    SYNCED_CMDS=""
    if [ -d "$SRC_CMD" ]; then
        run "mkdir -p \"$TGT_CMD\""
        for f in "$SRC_CMD"/*.md; do
            [ -f "$f" ] || continue
            base=$(basename "$f")
            case "$IGNORE_COMMANDS" in *" $base "*) echo "  (跳过 ${base}: hook 插件，仅 Claude)"; continue ;; esac
            SYNCED_CMDS="$SYNCED_CMDS $base "
            run "cp \"$f\" \"$TGT_CMD/$(basename "$f")\""
            rewrite_paths "$TGT_CMD/$(basename "$f")" "$TGT"
            echo "  $(basename "$f") -> $TGT_CMD/"; N=$((N+1))
        done
    fi
    if [ "$MIRROR" -eq 1 ] && [ -d "$TGT_CMD" ]; then
        for f in "$TGT_CMD"/*.md; do
            [ -f "$f" ] || continue
            base=$(basename "$f")
            case "$IGNORE_COMMANDS" in *" $base "*) continue ;; esac
            case "$SYNCED_CMDS" in *" $base "*) continue ;; esac
            if [ "$DO_BACKUP" -eq 1 ]; then
                backup_path "$BK" "commands" "$base" "$f"
            fi
            run "rm -f \"$f\""
            echo "  (删除多余命令 ${base})"; N=$((N+1))
        done
    fi
    [ "$N" -eq 0 ] && echo "  (无)"

    # --- subagents（codex 无此机制，跳过）---
    echo "[agents]"
    if has_agents "$SOURCE" && has_agents "$TGT"; then
        N=0
        SYNCED_AGENTS=""
        if [ -d "$SRC_BASE/agents" ]; then
            run "mkdir -p \"$TGT_BASE/agents\""
            for f in "$SRC_BASE/agents"/*.md; do
                [ -f "$f" ] || continue
                base=$(basename "$f")
                SYNCED_AGENTS="$SYNCED_AGENTS $base "
                run "cp \"$f\" \"$TGT_BASE/agents/$(basename "$f")\""
                rewrite_paths "$TGT_BASE/agents/$(basename "$f")" "$TGT"
                echo "  $(basename "$f") -> $TGT_BASE/agents/"; N=$((N+1))
            done
        fi
        if [ "$MIRROR" -eq 1 ] && [ -d "$TGT_BASE/agents" ]; then
            for f in "$TGT_BASE/agents"/*.md; do
                [ -f "$f" ] || continue
                base=$(basename "$f")
                case "$SYNCED_AGENTS" in *" $base "*) continue ;; esac
                if [ "$DO_BACKUP" -eq 1 ]; then
                    backup_path "$BK" "agents" "$base" "$f"
                fi
                run "rm -f \"$f\""
                echo "  (删除多余 agent ${base})"; N=$((N+1))
            done
        fi
        [ "$N" -eq 0 ] && echo "  (无)"
    else
        echo "  (codex 无 subagents 机制，跳过)"
    fi

    # --- skills（启用 = 扁平 skills/；禁用 = 同级 skills-disabled/；codex 的 skills/.system 永不触碰）---
    echo "[skills]"
    N=0; BK_N=0
    sync_skill_dir() {
        local src_dir="$1" tgt_dir="$2"
        [ -d "$src_dir" ] || return 0
        run "mkdir -p \"$tgt_dir\""
        local bk_sub; bk_sub="$(basename "$tgt_dir")"
        local rsync_delete=""
        [ "$MIRROR" -eq 1 ] && rsync_delete="--delete"
        for entry in "$src_dir"/*; do
            [ -e "$entry" ] || continue
            NAME=$(basename "$entry")
            should_sync_skill "$NAME" "$TGT" || {
                if [ "$TGT" = codex ] && [ "$MIRROR" -eq 0 ]; then
                    case "$CODEX_IGNORE_SKILLS" in *" $NAME "*) echo "  (跳过 ${NAME}: codex 不适用)" ;; esac
                fi
                continue
            }
            SRC_REAL="$(cd "$entry" 2>/dev/null && pwd -P || true)"
            [ -z "$SRC_REAL" ] && continue
            TARGET="$tgt_dir/$NAME"
            TGT_REAL="$(cd "$TARGET" 2>/dev/null && pwd -P || true)"
            [ -n "$TGT_REAL" ] && [ "$TGT_REAL" = "$SRC_REAL" ] && { echo "  (跳过 ${NAME}: 目标软链已指向源)"; continue; }
            if [ -d "$TARGET" ] && [ ! -L "$TARGET" ] && [ "$DO_BACKUP" -eq 1 ]; then
                run "mkdir -p \"$BK/$bk_sub\" && cp -R \"$TARGET\" \"$BK/$bk_sub/$NAME\""
                BK_N=$((BK_N+1))
            fi
            run "mkdir -p \"$TARGET\""
            run "rsync -aL $rsync_delete --exclude='__pycache__' --exclude='*.pyc' --exclude='.DS_Store' \"$SRC_REAL/\" \"$TARGET/\""
            rewrite_paths "$TARGET" "$TGT"
            echo "  $bk_sub/$NAME/ -> $TARGET/"; N=$((N+1))
        done
        prune_skill_dir "$src_dir" "$tgt_dir" "$bk_sub"
    }
    sync_skill_dir "$SRC_BASE/skills" "$TGT_BASE/skills"
    sync_skill_dir "$SRC_BASE/skills-disabled" "$TGT_BASE/skills-disabled"
    if [ "$TGT" = codex ] && [ -d "$SRC_BASE/skills/.system" ]; then
        run "mkdir -p \"$TGT_BASE/skills/.system\""
        run "rsync -aL --exclude='__pycache__' --exclude='*.pyc' --exclude='.DS_Store' \"$SRC_BASE/skills/.system/\" \"$TGT_BASE/skills/.system/\""
        echo "  .system/ -> $TGT_BASE/skills/.system/ (codex 官方，不加 --delete)"
    fi
    [ "$N" -eq 0 ] && echo "  (无可同步的 skill)"
    [ "$BK_N" -gt 0 ] && echo "  (覆盖前备份了 $BK_N 个同名旧 skill -> ${BK##*/}/)"
done

python3 "$(dirname "$0")/codex-skill-isolation.py" $([ "$DRY_RUN" -eq 1 ] && echo --dry-run || true)

echo ""
if [ "$MIRROR" -eq 1 ]; then
    echo "完成。以 $SOURCE 为源，已镜像同步到:$(echo " $TARGETS")。"
else
    echo "完成。以 $SOURCE 为源，已增量同步到:$(echo " $TARGETS")。"
fi
if [ "$DRY_RUN" -eq 1 ]; then echo "（dry-run：未写任何文件，去掉 --dry-run 实际执行）"; fi
