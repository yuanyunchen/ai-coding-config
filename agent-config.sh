#!/bin/bash
################################################################################
# agent-config.sh — Cursor / Claude / Codex 配置统一管理（唯一入口）
#
# 子命令：
#   deploy   仓库 config/ -> ~/.claude，并 sync 到 cursor + codex（新设备恢复）
#   pull     本地部署目录 -> 仓库 config/（改完配置后 commit 前）
#   sync     三工具间增量同步（只加不删）
#   migrate  ~/.cursor -> ~/.claude 一次性迁移
#   links    创建本机 config-links/ 软链视图
#
# 全局选项（各子命令均支持，放子命令后面）：
#   --dry-run    只预览
#   --help       子命令帮助
#
# 示例：
#   ./agent-config.sh deploy --dry-run
#   ./agent-config.sh pull
#   ./agent-config.sh sync --source cursor
#   ./agent-config.sh links
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$SCRIPT_DIR/config"
IGNORE_SKILLS=" brand-guidelines doc-coauthoring internal-comms slack-gif-creator designer-subagent "
CODEX_IGNORE_SKILLS=" skill-creator webpage-content-extraction "
RSYNC_EXCLUDE=(--exclude='node_modules' --exclude='__pycache__' --exclude='*.pyc' --exclude='.DS_Store')

# --- shared helpers ---
base_dir()  { echo "$HOME/.$1"; }
cmd_dir()   { [ "$1" = codex ] && echo "prompts" || echo "commands"; }
has_agents(){ [ "$1" != codex ]; }

run_eval() { if [ "${DRY_RUN:-0}" -eq 1 ]; then echo "  [dry-run] $*"; else eval "$*"; fi; }

rewrite_paths_all() {
    local path="$1" dest="$2"
    [ "${DRY_RUN:-0}" -eq 1 ] && return 0
    export REPL="~/.$dest/"
    find "$path" -type f \( -name '*.md' -o -name '*.py' \) -print0 2>/dev/null \
        | xargs -0 perl -pi -e 's{\Q~/.cursor/\E|\Q~/.claude/\E|\Q~/.codex/\E}{$ENV{REPL}}g' 2>/dev/null || true
}

rewrite_paths_cursor() {
    local path="$1" repl="$2"
    [ "${DRY_RUN:-0}" -eq 1 ] && return 0
    export REPL="$repl"
    find "$path" -type f \( -name '*.md' -o -name '*.py' \) -print0 \
        | xargs -0 perl -pi -e 's{\Q~/.cursor/\E}{$ENV{REPL}}g' 2>/dev/null || true
}

usage() {
    cat <<'EOF'
用法: ./agent-config.sh <子命令> [选项]

子命令:
  deploy    仓库 config/ -> ~/.claude，并 sync 到 cursor + codex
              [--no-sync]           只写 ~/.claude，不同步其他工具
  pull      本地 -> 仓库 config/
              [--source claude|cursor|codex]   默认 claude
  sync      三工具间增量同步
              [--source claude|cursor|codex]   默认 claude
              [--no-backup]
  migrate   ~/.cursor -> ~/.claude 一次性迁移
              [--from DIR] [--to DIR] [--no-backup]
  links     创建 config-links/ -> ~/.claude（或 --cursor）

全局: --dry-run   只预览，不写文件

典型流程:
  新设备:  clone -> ./agent-config.sh deploy -> ./agent-config.sh links
  日常改:  编辑 ~/.claude 或 config-links/ -> ./agent-config.sh pull -> git push
EOF
}

# --- pull ---
cmd_pull() {
    local SOURCE="claude"
    DRY_RUN=0
    while [ $# -gt 0 ]; do
        case "$1" in
            --source) SOURCE="$2"; shift 2 ;;
            --dry-run) DRY_RUN=1; shift ;;
            -h|--help) sed -n '/^# --- pull ---$/,/^# ---/{/^# --- pull ---$/d;/^# ---/d;p;}' "$0" 2>/dev/null || usage; exit 0 ;;
            *) echo "ERROR: pull 未知参数 '$1'"; exit 1 ;;
        esac
    done
    case "$SOURCE" in cursor|claude|codex) ;; *) echo "ERROR: --source 只能是 cursor|claude|codex"; exit 1 ;; esac
    local SRC_BASE="$(base_dir "$SOURCE")"
    [ -d "$SRC_BASE" ] || { echo "ERROR: 找不到 $SRC_BASE"; exit 1; }

    echo "pull: $SRC_BASE -> $CONFIG"
    [ "$DRY_RUN" -eq 1 ] && echo "  (dry-run)"

    if [ "$DRY_RUN" -eq 1 ]; then
        echo "  [dry-run] mkdir -p config/{agents,commands,skills,skills-disabled}"
    else
        mkdir -p "$CONFIG/agents" "$CONFIG/commands" "$CONFIG/skills" "$CONFIG/skills-disabled"
    fi

    _rsync_pull() {
        local mode="$1" dest="$2"; shift 2
        if [ "$DRY_RUN" -eq 1 ]; then
            echo "  [dry-run] rsync -a${mode} ${RSYNC_EXCLUDE[*]} $* -> $dest"
        else
            rsync -a${mode} "${RSYNC_EXCLUDE[@]}" "$@" "$dest"
        fi
    }

    [ -d "$SRC_BASE/agents" ] && { echo "[agents]"; _rsync_pull "" "$CONFIG/agents/" "$SRC_BASE/agents/"; }
    local SRC_CMD="$SRC_BASE/$(cmd_dir "$SOURCE")"
    if [ -d "$SRC_CMD" ]; then
        echo "[commands]"
        [ "$DRY_RUN" -eq 0 ] && mkdir -p "$CONFIG/commands"
        _rsync_pull "" "$CONFIG/commands/" "$SRC_CMD/"
    fi
    [ -d "$SRC_BASE/skills" ] && { echo "[skills]"; _rsync_pull L "$CONFIG/skills/" "$SRC_BASE/skills/"; }
    [ -d "$SRC_BASE/skills-disabled" ] && { echo "[skills-disabled]"; _rsync_pull L "$CONFIG/skills-disabled/" "$SRC_BASE/skills-disabled/"; }
    echo "[AGENTS.md]"
    if [ -s "$SRC_BASE/AGENTS.md" ]; then
        if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] cp AGENTS.md"; else cp "$SRC_BASE/AGENTS.md" "$CONFIG/AGENTS.md"; fi
    else
        echo "  (源无 AGENTS.md，跳过)"
    fi
    echo "完成。检查 git diff 后 commit / push。"
}

# --- sync ---
cmd_sync() {
    local SOURCE="claude" DO_BACKUP=1
    DRY_RUN=0
    local STAMP="$(date +%Y%m%d-%H%M%S)"
    while [ $# -gt 0 ]; do
        case "$1" in
            --source) SOURCE="$2"; shift 2 ;;
            --dry-run) DRY_RUN=1; shift ;;
            --no-backup) DO_BACKUP=0; shift ;;
            -h|--help) usage; exit 0 ;;
            *) echo "ERROR: sync 未知参数 '$1'"; exit 1 ;;
        esac
    done
    case "$SOURCE" in cursor|claude|codex) ;; *) echo "ERROR: --source 只能是 cursor|claude|codex"; exit 1 ;; esac

    local SRC_BASE="$(base_dir "$SOURCE")"
    [ -d "$SRC_BASE" ] || { echo "ERROR: 找不到源 $SRC_BASE"; exit 1; }

    local TARGETS=""
    for t in cursor claude codex; do [ "$t" != "$SOURCE" ] && TARGETS="$TARGETS $t"; done

    echo "sync（增量，只加不删）: $SOURCE ($SRC_BASE) ->$TARGETS"
    [ "$DRY_RUN" -eq 1 ] && echo "  (dry-run)"

    for TGT in $TARGETS; do
        local TGT_BASE BK
        TGT_BASE="$(base_dir "$TGT")"
        BK="$TGT_BASE/.claude-sync-backup-$STAMP"
        echo ""; echo "===== -> $TGT ($TGT_BASE) ====="
        [ -d "$TGT_BASE" ] || { echo "  目标不存在，跳过"; continue; }

        echo "[AGENTS.md]"
        local SRC_RULES="$SRC_BASE/AGENTS.md" TGT_RULES="$TGT_BASE/AGENTS.md"
        if [ -s "$SRC_RULES" ]; then
            if [ "$DO_BACKUP" -eq 1 ] && [ -s "$TGT_RULES" ] && ! cmp -s "$SRC_RULES" "$TGT_RULES"; then
                run_eval "mkdir -p \"$BK\" && cp \"$TGT_RULES\" \"$BK/AGENTS.md\""
                echo "  (备份旧 AGENTS.md)"
            fi
            run_eval "cp \"$SRC_RULES\" \"$TGT_RULES\""
            echo "  -> $TGT_RULES"
            if [ "$TGT" = claude ]; then
                local CLAUDE_MD="$TGT_BASE/CLAUDE.md"
                if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] 确保 CLAUDE.md 含 @AGENTS.md"
                elif [ ! -f "$CLAUDE_MD" ] || ! grep -q '^@AGENTS.md' "$CLAUDE_MD" 2>/dev/null; then
                    printf '@AGENTS.md\n' >> "$CLAUDE_MD"; echo "  CLAUDE.md 已加入 @AGENTS.md"
                fi
            fi
        else echo "  (源无 AGENTS.md)"; fi

        echo "[commands]"
        local SRC_CMD="$SRC_BASE/$(cmd_dir "$SOURCE")" TGT_CMD="$TGT_BASE/$(cmd_dir "$TGT")" N=0
        if [ -d "$SRC_CMD" ]; then
            run_eval "mkdir -p \"$TGT_CMD\""
            for f in "$SRC_CMD"/*.md; do
                [ -f "$f" ] || continue
                run_eval "cp \"$f\" \"$TGT_CMD/$(basename "$f")\""
                rewrite_paths_all "$TGT_CMD/$(basename "$f")" "$TGT"
                echo "  $(basename "$f")"; N=$((N+1))
            done
        fi
        [ "$N" -eq 0 ] && echo "  (无)"

        echo "[agents]"
        if has_agents "$SOURCE" && has_agents "$TGT"; then
            N=0
            if [ -d "$SRC_BASE/agents" ]; then
                run_eval "mkdir -p \"$TGT_BASE/agents\""
                for f in "$SRC_BASE/agents"/*.md; do
                    [ -f "$f" ] || continue
                    run_eval "cp \"$f\" \"$TGT_BASE/agents/$(basename "$f")\""
                    rewrite_paths_all "$TGT_BASE/agents/$(basename "$f")" "$TGT"
                    echo "  $(basename "$f")"; N=$((N+1))
                done
            fi
            [ "$N" -eq 0 ] && echo "  (无)"
        else echo "  (codex 无 subagents，跳过)"; fi

        echo "[skills]"
        local TGT_SKILLS="$TGT_BASE/skills"
        local TGT_SKILLS_REAL="$(cd "$TGT_SKILLS" 2>/dev/null && pwd -P || echo "$TGT_SKILLS")"
        N=0; local BK_N=0
        if [ -d "$SRC_BASE/skills" ]; then
            run_eval "mkdir -p \"$TGT_SKILLS\""
            for entry in "$SRC_BASE/skills"/*; do
                local NAME="$(basename "$entry")"
                [ "$NAME" = ".system" ] && continue
                case "$IGNORE_SKILLS" in *" $NAME "*) continue ;; esac
                if [ "$TGT" = codex ]; then case "$CODEX_IGNORE_SKILLS" in *" $NAME "*) echo "  (跳过 $NAME: codex 不适用)"; continue ;; esac; fi
                local SRC_REAL="$(cd "$entry" 2>/dev/null && pwd -P || true)"
                [ -z "$SRC_REAL" ] && continue
                [ "$SRC_REAL" = "$TGT_SKILLS_REAL/$NAME" ] && continue
                local TARGET="$TGT_SKILLS/$NAME"
                local TGT_REAL="$(cd "$TARGET" 2>/dev/null && pwd -P || true)"
                [ -n "$TGT_REAL" ] && [ "$TGT_REAL" = "$SRC_REAL" ] && { echo "  (跳过 $NAME: 软链已指向源)"; continue; }
                if [ -d "$TARGET" ] && [ ! -L "$TARGET" ] && [ "$DO_BACKUP" -eq 1 ]; then
                    run_eval "mkdir -p \"$BK/skills\" && cp -R \"$TARGET\" \"$BK/skills/$NAME\""
                    BK_N=$((BK_N+1))
                fi
                run_eval "mkdir -p \"$TARGET\""
                run_eval "rsync -aL --exclude='__pycache__' --exclude='*.pyc' --exclude='.DS_Store' \"$SRC_REAL/\" \"$TARGET/\""
                rewrite_paths_all "$TARGET" "$TGT"
                echo "  $NAME/"; N=$((N+1))
            done
        fi
        [ "$N" -eq 0 ] && echo "  (无)"
        [ "$BK_N" -gt 0 ] && echo "  (备份了 $BK_N 个旧 skill)"
    done
    echo ""; echo "sync 完成。"
}

# --- deploy ---
cmd_deploy() {
    local DO_SYNC=1
    DRY_RUN=0
    while [ $# -gt 0 ]; do
        case "$1" in
            --dry-run) DRY_RUN=1; shift ;;
            --no-sync) DO_SYNC=0; shift ;;
            -h|--help) usage; exit 0 ;;
            *) echo "ERROR: deploy 未知参数 '$1'"; exit 1 ;;
        esac
    done
    local CLAUDE="$HOME/.claude"
    [ -d "$CONFIG/agents" ] || { echo "ERROR: 找不到 $CONFIG/agents"; exit 1; }

    echo "deploy: $CONFIG -> $CLAUDE"
    [ "$DRY_RUN" -eq 1 ] && echo "  (dry-run)"

    run_eval "mkdir -p \"$CLAUDE/agents\" \"$CLAUDE/commands\" \"$CLAUDE/skills\" \"$CLAUDE/skills-disabled\""
    for dir in agents commands skills skills-disabled; do
        echo "[$dir]"
        local mode=""
        [ "$dir" = skills ] || [ "$dir" = skills-disabled ] && mode=L
        if [ "$DRY_RUN" -eq 1 ]; then
            echo "  [dry-run] rsync -a${mode} ${RSYNC_EXCLUDE[*]} \"$CONFIG/$dir/\" \"$CLAUDE/$dir/\""
        else
            rsync -a${mode} "${RSYNC_EXCLUDE[@]}" "$CONFIG/$dir/" "$CLAUDE/$dir/"
        fi
    done
    echo "[AGENTS.md]"
    run_eval "cp \"$CONFIG/AGENTS.md\" \"$CLAUDE/AGENTS.md\""
    if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] 确保 CLAUDE.md 含 @AGENTS.md"
    elif [ ! -f "$CLAUDE/CLAUDE.md" ] || ! grep -q '^@AGENTS.md' "$CLAUDE/CLAUDE.md" 2>/dev/null; then
        printf '@AGENTS.md\n' >> "$CLAUDE/CLAUDE.md"; echo "  CLAUDE.md 已加入 @AGENTS.md"
    fi
    if [ "$DO_SYNC" -eq 1 ]; then echo ""; cmd_sync ${DRY_RUN:+--dry-run}; else echo "跳过 sync（--no-sync）"; fi
    echo "deploy 完成。"
}

# --- links ---
cmd_links() {
    local TARGET="claude"
    while [ $# -gt 0 ]; do
        case "$1" in
            --cursor) TARGET="cursor"; shift ;;
            --claude) TARGET="claude"; shift ;;
            -h|--help) usage; exit 0 ;;
            *) echo "ERROR: links 未知参数 '$1'"; exit 1 ;;
        esac
    done
    local BASE="$(base_dir "$TARGET")" LINKS="$SCRIPT_DIR/config-links"
    [ -d "$BASE" ] || { echo "ERROR: 找不到 $BASE"; exit 1; }
    mkdir -p "$LINKS"
    _link() {
        local name="$1" dest="$2"
        rm -f "$LINKS/$name"
        ln -s "$dest" "$LINKS/$name"
        echo "  $name -> $dest"
    }
    echo "links: config-links/ -> $BASE"
    _link agents "$BASE/agents"
    _link commands "$BASE/commands"
    _link skills "$BASE/skills"
    _link skills-disabled "$BASE/skills-disabled"
    _link global-AGENTS.md "$BASE/AGENTS.md"
    echo "完成。改 $BASE 下原文件后运行: ./agent-config.sh pull"
}

# --- migrate ---
cmd_migrate() {
    local FROM_ROOT="$HOME" TO_ROOT="$HOME" TO_LABEL="global (~/.claude/)"
    DRY_RUN=0; local DO_BACKUP=1
    while [ $# -gt 0 ]; do
        case "$1" in
            --from) FROM_ROOT="$(cd "$2" && pwd)"; shift 2 ;;
            --to)   TO_ROOT="$(cd "$2" && pwd)"; TO_LABEL="project ($TO_ROOT/.claude/)"; shift 2 ;;
            --dry-run) DRY_RUN=1; shift ;;
            --no-backup) DO_BACKUP=0; shift ;;
            -h|--help) usage; exit 0 ;;
            *) echo "ERROR: migrate 未知参数 '$1'"; exit 1 ;;
        esac
    done
    local SRC="$FROM_ROOT/.cursor"
    [ -d "$SRC" ] || { echo "ERROR: 找不到 $SRC"; exit 1; }
    local CLAUDE_BASE CLAUDE_COMMANDS CLAUDE_AGENTS CLAUDE_SKILLS CLAUDE_SKILLS_DISABLED BACKUP_DIR
    CLAUDE_BASE="$TO_ROOT/.claude"
    CLAUDE_COMMANDS="$CLAUDE_BASE/commands"
    CLAUDE_AGENTS="$CLAUDE_BASE/agents"
    CLAUDE_SKILLS="$CLAUDE_BASE/skills"
    CLAUDE_SKILLS_DISABLED="$CLAUDE_BASE/skills-disabled"
    BACKUP_DIR="$CLAUDE_BASE/skills-backup-$(date +%Y%m%d-%H%M%S)"
    local REPL; [ "$TO_ROOT" = "$HOME" ] && REPL="~/.claude/" || REPL="$CLAUDE_BASE/"

    echo "migrate: $SRC -> $TO_LABEL"
    [ "$DRY_RUN" -eq 1 ] && echo "  (dry-run)"
    run_eval "mkdir -p \"$CLAUDE_COMMANDS\" \"$CLAUDE_AGENTS\" \"$CLAUDE_SKILLS\""

    echo "[commands]"; local CMD_COUNT=0
    if [ -d "$SRC/commands" ]; then
        for f in "$SRC/commands/"*.md; do
            [ -f "$f" ] || continue
            run_eval "cp \"$f\" \"$CLAUDE_COMMANDS/$(basename "$f")\""
            rewrite_paths_cursor "$CLAUDE_COMMANDS/$(basename "$f")" "$REPL"
            echo "  $(basename "$f")"; CMD_COUNT=$((CMD_COUNT+1))
        done
    fi
    [ "$CMD_COUNT" -eq 0 ] && echo "  (无)"

    echo "[agents]"; local AGENT_COUNT=0
    if [ -d "$SRC/agents" ]; then
        for f in "$SRC/agents/"*.md; do
            [ -f "$f" ] || continue
            run_eval "cp \"$f\" \"$CLAUDE_AGENTS/$(basename "$f")\""
            rewrite_paths_cursor "$CLAUDE_AGENTS/$(basename "$f")" "$REPL"
            echo "  $(basename "$f")"; AGENT_COUNT=$((AGENT_COUNT+1))
        done
    fi
    [ "$AGENT_COUNT" -eq 0 ] && echo "  (无)"

    echo "[skills]"; local SKILL_COUNT=0 BACKED_UP=0 SKIPPED=0 DIS_COUNT=0 DIS_SKIP=0 DANGLING=""
    local CLAUDE_SKILLS_REAL="$(cd "$CLAUDE_SKILLS" 2>/dev/null && pwd -P || echo "$CLAUDE_SKILLS")"
    if [ -d "$SRC/skills" ]; then
        for entry in "$SRC/skills"/*; do
            local NAME="$(basename "$entry")"
            case "$IGNORE_SKILLS" in *" $NAME "*) continue ;; esac
            local TARGET="$CLAUDE_SKILLS/$NAME"
            local SRC_REAL="$(cd "$entry" 2>/dev/null && pwd -P || true)"
            if [ -z "$SRC_REAL" ]; then
                local DTARGET="$CLAUDE_SKILLS_DISABLED/$NAME"
                if [ -d "$DTARGET" ]; then DIS_SKIP=$((DIS_SKIP+1)); continue; fi
                local RECOVER=""
                for b in "$FROM_ROOT"/.cursor/skills-backup*/"$NAME"; do
                    [ -f "$b/SKILL.md" ] && { RECOVER="$b"; break; }
                done
                if [ -n "$RECOVER" ]; then
                    run_eval "mkdir -p \"$DTARGET\""
                    run_eval "rsync -aL --delete --exclude='__pycache__' --exclude='*.pyc' --exclude='.DS_Store' \"$RECOVER/\" \"$DTARGET/\""
                    rewrite_paths_cursor "$DTARGET" "$REPL"
                    echo "  $NAME -> skills-disabled/ (保持禁用)"; DIS_COUNT=$((DIS_COUNT+1))
                else DANGLING="$DANGLING $NAME"; fi
                continue
            fi
            if [ "$SRC_REAL" = "$CLAUDE_SKILLS_REAL/$NAME" ]; then SKIPPED=$((SKIPPED+1)); continue; fi
            if [ -d "$TARGET" ] && [ "$DO_BACKUP" -eq 1 ]; then
                run_eval "mkdir -p \"$BACKUP_DIR\" && cp -R \"$TARGET\" \"$BACKUP_DIR/$NAME\""
                BACKED_UP=$((BACKED_UP+1))
            fi
            run_eval "mkdir -p \"$TARGET\""
            run_eval "rsync -aL --delete --exclude='__pycache__' --exclude='*.pyc' --exclude='.DS_Store' \"$SRC_REAL/\" \"$TARGET/\""
            rewrite_paths_cursor "$TARGET" "$REPL"
            echo "  $NAME/"; SKILL_COUNT=$((SKILL_COUNT+1))
        done
    fi
    [ -n "$DANGLING" ] && echo "  无法恢复（失效软链且无 backup）:$DANGLING"

    echo "[rules]"
    local RULES_FILE="$CLAUDE_BASE/AGENTS.md" CLAUDE_MD="$CLAUDE_BASE/CLAUDE.md"
    local WS_LINK="$SCRIPT_DIR/config-links/global-AGENTS.md"
    if [ "$DRY_RUN" -eq 1 ]; then
        echo "  [dry-run] AGENTS.md / CLAUDE.md / config-links"
    else
        if [ ! -f "$RULES_FILE" ]; then
            cp "$CONFIG/AGENTS.md" "$RULES_FILE" 2>/dev/null || cat > "$RULES_FILE" <<'AGENTS_EOF'
# Global Agent Rules
Personal operating rules that apply to every project on this machine.
AGENTS_EOF
            echo "  写入 $RULES_FILE"
        else echo "  保留已有 $RULES_FILE"; fi
        if [ ! -f "$CLAUDE_MD" ] || ! grep -q '^@AGENTS.md' "$CLAUDE_MD" 2>/dev/null; then
            printf '@AGENTS.md\n' >> "$CLAUDE_MD"; echo "  CLAUDE.md 已加入 @AGENTS.md"
        fi
        mkdir -p "$(dirname "$WS_LINK")"
        ln -sf "$RULES_FILE" "$WS_LINK"
        echo "  config-links/global-AGENTS.md -> $RULES_FILE"
    fi

    echo "[hooks]"
    if [ -f "$SRC/hooks.json" ] && command -v jq >/dev/null 2>&1; then
        local SETTINGS="$CLAUDE_BASE/settings.json"
        if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] 合并 hooks.json"
        else
            [ -f "$SETTINGS" ] && cp "$SETTINGS" "$SETTINGS.bak.$(date +%s)"
            [ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"
            local tmp="$(mktemp)"
            jq -s '.[0] * {hooks: .[1].hooks}' "$SETTINGS" "$SRC/hooks.json" > "$tmp" && mv "$tmp" "$SETTINGS"
            echo "  hooks 已合并到 settings.json"
        fi
    else echo "  (无 hooks 或未装 jq，跳过)"; fi

    echo ""; echo "migrate 完成: ${CMD_COUNT} 命令 + ${AGENT_COUNT} agents + ${SKILL_COUNT} skills + ${DIS_COUNT} 禁用 skills。"
}

# --- main ---
main() {
    local cmd="${1:-help}"
    case "$cmd" in
        pull)    shift; cmd_pull "$@" ;;
        sync)    shift; cmd_sync "$@" ;;
        deploy)  shift; cmd_deploy "$@" ;;
        links)   shift; cmd_links "$@" ;;
        migrate) shift; cmd_migrate "$@" ;;
        help|-h|--help) usage ;;
        *) echo "ERROR: 未知子命令 '$cmd'（运行 ./agent-config.sh help）"; exit 1 ;;
    esac
}

main "$@"
