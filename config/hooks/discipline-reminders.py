#!/usr/bin/env python3
"""Global PreToolUse warn-only reminders for two hard disciplines.

Rule 1 (persistence gate): Edit/Write/MultiEdit touching AGENTS.md,
any .claude/skills/**/SKILL.md, anything under ~/.claude/skills/,
hookify rule files (basename hookify.*.md), or any
.claude/scheduled-tasks/**/SKILL.md (定时任务 prompt = 持久全局配置)
must have gone through the harness-management update flow (AGENTS.md
Harness section; replaced continue-learning 2026-07-03).
Excluded: ~/.claude/plugins/** and ~/.claude/projects/** (memory files),
and a v4 workspace AGENTS.md (sibling .agents/ws.json; agent-maintained map).
Known boundary: ~/.agents/skills/** (lark-cli 托管副本,随 CLI 同步) 刻意排除。

Rule 2 (feishu doc chain): Bash command containing `lark-cli docs ... +create`
must have gone through lark-doc-writer §0 (+ doc-trio when applicable).

Never blocks: on match, emits JSON with additionalContext (visible to the
model) + systemMessage (visible to the user) and exits 0; otherwise emits
nothing and exits 0. No block/deny logic anywhere.
"""

import json
import os
import re
import sys

RULE1_MSG = (
    "提醒(warn,不阻塞): 检测到对 skill/全局规则文件的写入。"
    "harness 层持久性变更须先走 harness-management update 流程"
    "(判桶/判层/冲突检查/按模式审批,AGENTS.md Harness 板块)——若本轮已走过则继续。"
)

RULE2_MSG = (
    "提醒(warn,不阻塞): 检测到 lark-cli docs +create。"
    "写飞书文档必须先走 lark-doc-writer §0 写作通则 +(五类时)doc-trio 判型"
    "——绕过即返工(feishu-task-management 强制链)。若本轮已走过强制链则继续。"
)

FILE_TOOLS = ("Edit", "Write", "MultiEdit")


def match_rule1(file_path, cwd, home):
    if not file_path:
        return False
    p = os.path.expanduser(file_path)
    if not os.path.isabs(p):
        p = os.path.join(cwd or os.getcwd(), p)
    p = os.path.normpath(p)
    # Exclusions: plugin cache and project memory files
    if p.startswith(home + "/.claude/plugins/"):
        return False
    if p.startswith(home + "/.claude/projects/"):
        return False
    base = os.path.basename(p)
    if base == "AGENTS.md":
        return not os.path.isfile(os.path.join(os.path.dirname(p), ".agents", "ws.json"))
    if re.fullmatch(r"hookify\..+\.md", base):
        return True
    if base == "SKILL.md" and "/.claude/skills/" in p:
        return True
    if base == "SKILL.md" and "/.claude/scheduled-tasks/" in p:
        return True
    if p.startswith(home + "/.claude/skills/"):
        return True
    return False


def match_rule2(command):
    return bool(re.search(r"lark-cli\s+docs\b[^\n]*\+create", command or ""))


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    tool = data.get("tool_name", "")
    tool_input = data.get("tool_input") or {}
    home = os.path.expanduser("~")
    msg = None

    if tool in FILE_TOOLS:
        if match_rule1(tool_input.get("file_path", ""), data.get("cwd", ""), home):
            msg = RULE1_MSG
    elif tool == "Bash":
        if match_rule2(tool_input.get("command", "")):
            msg = RULE2_MSG

    if msg:
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "additionalContext": msg,
            },
            "systemMessage": msg,
        }, ensure_ascii=False))
    sys.exit(0)


if __name__ == "__main__":
    main()
