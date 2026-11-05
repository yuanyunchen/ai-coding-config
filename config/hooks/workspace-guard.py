#!/usr/bin/env python3
"""Workspace v4 guard for Claude Code hooks.

Self-activates only inside a v4 workspace (nearest `.agents/ws.json`, never $HOME). Events:
- SessionStart: inject `ws status` (v3 workspaces get a one-line "follow v3, don't convert" note).
- UserPromptSubmit: record typed user prompts verbatim as Q entries in `.agents/conversation.md` (and in `.agents/inbox.md`, user messages only); long ones
  get a one-line hint with the entry id. Background reports, cross-session messages and `-p` runs are skipped.
- UserPromptSubmit carrying a `<task-notification>` for a ws dispatch: inject one line (status, open items under
  「需要上层处理」, how many of the wave are still out, elapsed time, open requirements). Nothing is recorded.
- PreToolUse(SendMessage): a long message that cites no dispatch task.md gets a reminder to `ws followup` first.
  Never denies.
- PreToolUse(Agent): deny a dispatch whose prompt does not reference an existing, unanswered,
  filled-in `subagent/NN-*/task.md` created by `ws dispatch`. Read-only agent types and `[ws:skip]` pass.
- SubagentStop: if the dispatch has no valid result.md, block once; on the second stop save the
  last message as an UNVERIFIED result.md.
- Stop: record the turn's final reply as the A entry for this session's open questions, then refresh
  generated index blocks silently.

Fails open: any internal error exits 0 with no output. Off switch: WS_HOOKS=off or `"hooks": "off"` in
`.agents/ws.json`. WS_HOOKS=force also records Q/A in non-interactive (-p) runs.
Spec: ~/.claude/skills/workspace-management/references/spec.md
"""
import json
import os
import re
import sys
from pathlib import Path

WM_SCRIPTS = Path(__file__).resolve().parent.parent / "skills" / "workspace-management" / "scripts"
EXEMPT_TYPES = {"Explore", "Plan", "claude-code-guide", "web-fetch", "statusline-setup"}
SKIP_MARK = "[ws:skip]"
FOLLOWUP_MIN_CHARS = 40  # shorter SendMessage texts are nudges ("继续"), not new requirements
NON_TYPED_PREFIXES = ("<task-notification>", "<cross-session-message", "<local-command", "<command-name>",
                      "<command-message>", "<system-reminder>", "<bash-input>", "<bash-stdout>")
V3_NOTE = ("本目录是 v3 工作区（.agent/）：按 ~/.claude/skills/workspace-management/references/v3-legacy.md 的规则工作，"
           "不要自行转换成 v4；用户明确要求迁移时再迁。")


def emit(obj):
    print(json.dumps(obj, ensure_ascii=False))


def context(event, text):
    emit({"hookSpecificOutput": {"hookEventName": event, "additionalContext": text}})


def deny(reason):
    emit({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
                                 "permissionDecisionReason": reason}})


def first_user_text(transcript_path):
    with open(transcript_path) as f:
        for line in f:
            rec = json.loads(line)
            if rec.get("type") != "user":
                continue
            content = (rec.get("message") or {}).get("content")
            if isinstance(content, list):
                content = "\n".join(b.get("text", "") for b in content if isinstance(b, dict))
            return content or ""
    return ""


def active_ids(ws, limit=3):
    return [ws.node_id(d) for d in ws.tasks() if ws.task_status(d) == "active"][:limit]


def on_session_start(ws, wslib, data):
    context("SessionStart", ws.status_text() + "\n本会话在 v4 工作区内，规则见 AGENTS.md「工作协议」："
            "用户消息和每轮回答自动记入 conversation.md，需求当轮用 ws req 归档；派发先 ws dispatch；子智能体的结果以 result.md 为准。")


def interactive(data):
    sdk = os.environ.get("CLAUDE_CODE_ENTRYPOINT", "").startswith("sdk")
    return (not sdk or os.environ.get("WS_HOOKS") == "force") and not data.get("agent_id")


def on_notification(ws, wslib, prompt):
    """A subagent reported back: say where it stands, at the moment the main agent reads it."""
    m = re.search(r"<output-file>(.*?)</output-file>", prompt)
    ref = None
    if m and os.path.isfile(m.group(1)):
        try:  # background Bash tasks also notify; their output file is not a transcript
            ref = wslib.find_dispatch_ref(first_user_text(m.group(1)), ws.root)
        except (OSError, ValueError, AttributeError):
            ref = None
    ref = ref or wslib.find_result_ref(prompt, ws.root)
    if ref is not None:
        context("UserPromptSubmit", ws.return_note(ref))


def on_prompt(ws, wslib, data):
    if not interactive(data):
        return
    prompt = data.get("prompt") or ""
    if prompt.lstrip().startswith("<task-notification>"):
        on_notification(ws, wslib, prompt)
        return
    if not prompt.strip() or prompt.lstrip().startswith(NON_TYPED_PREFIXES):
        return
    eid = ws.record_question(data.get("session_id"), data.get("prompt_id"), prompt)
    if len(prompt.strip()) >= wslib.INBOX_MIN_CHARS:
        context("UserPromptSubmit", f"（ws）本条已记入 conversation.md：{eid}。是需求或方向变化就归档：ws req <节点ID> --entry {eid}"
                f"（新任务：ws req --new <slug> --entry {eid}）；不是需求：ws req --not-req {eid}。")


def on_pre_agent(ws, wslib, data):
    ti = data.get("tool_input") or {}
    stype = ti.get("subagent_type") or "general-purpose"
    if stype in EXEMPT_TYPES:
        return
    prompt = ti.get("prompt") or ""
    if SKIP_MARK in prompt:
        ws.log_skip(data.get("session_id"), f"{stype}: {ti.get('description', '')}")
        return
    ref = wslib.find_dispatch_ref(prompt, ws.root)
    if ref is None:
        nodes = active_ids(ws)
        hint = f"进行中的节点：{'、'.join(nodes)}。" if nodes else "还没有 active 节点，先 ws task new 或 ws req --new 建任务。"
        deny("本工作区（v4）要求派发走 ws：1) ws dispatch <节点ID> <slug> --stdin，从 stdin 传入背景、成功标准、"
             "必读路径、可写范围；2) 原样使用它打印的那行 prompt 重新派发。" + hint + "规则见 AGENTS.md「工作协议」第 4 条。")
    elif (ref / "result.md").exists():
        deny(f"{ws.rel(ref)} 已经有 result.md，不能再次派发；重试请用 ws dispatch 新建一个派发。")
    else:
        missing = wslib.brief_missing(ref / "task.md")
        if missing:
            deny(f"{ws.rel(ref / 'task.md')} 的「{'」「'.join(missing)}」还是空的：补全后再派发。")


def on_pre_send(ws, wslib, data):
    if not interactive(data):  # subagents messaging each other are not the main agent continuing an executor
        return
    msg = (data.get("tool_input") or {}).get("message")
    if not isinstance(msg, str) or len(msg.strip()) < FOLLOWUP_MIN_CHARS or wslib.find_dispatch_ref(msg, ws.root):
        return
    context("PreToolUse", "（ws）续接子智能体时如果带了新要求或范围变化：先 ws followup <派发ID> --stdin 把要求记进原派发"
            "（旧结果自动改名保留），再发它打印的续接消息。只是催促或简单答疑可以忽略本提醒。")


def on_subagent_stop(ws, wslib, data):
    if data.get("agent_type") in EXEMPT_TYPES or not data.get("agent_transcript_path"):
        return
    ref = wslib.find_dispatch_ref(first_user_text(data["agent_transcript_path"]), ws.root)
    if ref is None:
        return
    res = ref / "result.md"
    problem = wslib.result_problem(res, allow_unverified=True)
    if problem is None:
        return
    if not data.get("stop_hook_active"):
        emit({"decision": "block", "reason":
              f"派发协议要求先把结果写入 {res}（frontmatter 必填 status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED；"
              f"结构参照 {wslib.TEMPLATES / 'node' / 'result.md'}），写完后最后只回一行 `<STATUS> {res}`。当前问题：{problem}"})
        return
    if not res.exists():
        sid = ws.node_id(ref)
        res.write_text(f"---\nid: {sid}\nstatus: {wslib.UNVERIFIED}\n---\n# 结果 — {sid}（hook 代存）\n\n"
                       "> 子智能体两次结束都没有写出 result.md，下面是它最后一条消息，由 hook 原样保存。主 agent 核对后改成正式状态。\n\n"
                       f"{data.get('last_assistant_message') or '（没有消息）'}\n")
        ws.log(ws.node_id(ref.parent.parent), f"{sid} 没有自己写 result.md，hook 代存为 UNVERIFIED", tag="dispatch")


def on_stop(ws, wslib, data):
    if data.get("stop_hook_active"):
        return
    if interactive(data):
        ws.record_answer(data.get("session_id"), data.get("last_assistant_message"))
    ws.index()


HANDLERS = {"SessionStart": on_session_start, "UserPromptSubmit": on_prompt,
            "SubagentStop": on_subagent_stop, "Stop": on_stop}


def main():
    if os.environ.get("WS_HOOKS") == "off":
        return
    data = json.loads(sys.stdin.read() or "{}")
    sys.path.insert(0, str(WM_SCRIPTS))
    import wslib

    root, ver = wslib.find_root(data.get("cwd") or os.getcwd())
    if root is None:
        return
    event = data.get("hook_event_name")
    if ver == 3:
        if event == "SessionStart":
            context(event, V3_NOTE)
        return
    ws = wslib.Workspace(root)
    if ws.hooks_off():
        return
    if event == "PreToolUse" and data.get("tool_name") in ("Agent", "Task"):
        on_pre_agent(ws, wslib, data)
    elif event == "PreToolUse" and data.get("tool_name") == "SendMessage":
        on_pre_send(ws, wslib, data)
    elif event in HANDLERS:
        HANDLERS[event](ws, wslib, data)


if __name__ == "__main__":
    try:
        main()
    except Exception:  # noqa: BLE001 - a guard must never break the session
        pass
    sys.exit(0)
