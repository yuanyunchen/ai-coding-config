---
name: workspace-management
description: "Manage v4 workspace structure, ws commands, dispatch, memory and init/recall/update. Use for long tasks, workspace creation, wrap-up, archiving, restoring context, splitting tasks, dispatching agents, or organizing workspace memory or skills. Detect .agents/ws.json (v4) or .agent/ (legacy v3) up the directory tree. Skip workspace creation for light tasks. Route global memory and harness changes to their respective management skills."
---

# Agent workspace v4

A workspace consists of a root `AGENTS.md`, the agent-maintained entry point and map, plus `.agents/` for agent files. Use the `ws` CLI for all structural writes. The `~/.claude/hooks/workspace-guard.py` hook injects current state, records user messages verbatim, intercepts noncompliant dispatches and collects subagent results. Each workspace's AGENTS.md contains the rules in its working protocol block (`工作协议`), read by the lead and subagents in every session.

## Layout

```
<workspace>/
├── AGENTS.md                 Entry and map, maintained by the agent, 100–200 lines. ws index generates <!-- ws:… --> blocks.
└── .agents/
    ├── ws.json               v4 activation marker and lock. "hooks": "off" disables the hook.
    ├── conversation.md       Hook-recorded Q&A: verbatim user messages, each turn's final answer and archive markers. Append only, excluded from git.
    ├── inbox.md              User messages only, with date, time, number and verbatim text. Append only, excluded from git.
    ├── secrets.env           Secrets, mode 600, excluded from git.
    ├── memory/               Knowledge organized by topic. Split large files into a directory and README.md. INDEX.md is generated.
    ├── skills/<name>/SKILL.md Workspace-specific skills, automatically listed in the AGENTS.md Skills table.
    └── task/NN-<name>/       Task node. The same structure applies at each depth.
        ├── task.md           Parent writes the structured current specification and append-only verbatim record.
        ├── goal.md · plan.md Executor writes these before starting.
        ├── progress.md       Frontmatter status and an append-only log.
        ├── result.md         Executor's handoff to the parent at close: core ≤6KB plus attachment index.
        ├── brief.md          Optional instructions common to this node's dispatches, automatically listed as required reading.
        ├── input/ · deliverables/  User-supplied inputs and human-facing outputs.
        ├── subagent/NN-<name>/ Dispatch. task.md in, result.md out. The subagent writes the result.
        └── task/NN-<name>/   Subtask with the same structure.
```

IDs derive from paths. `T01.02` is subtask 02 of task 01. `T01.02/S03` is its third dispatch.

## Eight mandatory rules

1. **Recognize v4 only by `.agents/ws.json`.** The home-level `~/.agents/skills` contains lark-cli-managed skills and is unrelated to workspaces. Neither `ws` nor the hook walks above `$HOME`.
2. **Create structure with `ws` only.** Generate tasks, dispatches, numbers and indexes through commands. Never create `NN-` directories or edit `<!-- ws:… -->` blocks by hand.
3. **Preserve requirements verbatim.** The hook records user messages and each turn's final answer in conversation.md. At kickoff, set the current node once with `ws focus <ID>`. The hook then appends user messages to the node's task.md under `原文记录` (verbatim record), without per-message filing or classification. When requirements or direction change, fold the change into `任务说明` (current specification) using `ws task spec`. The executor does not edit task.md.
4. **Apply node gates.** Before active, write the task specification (goal and acceptance criteria), goal and plan. Before done, ensure result.md passes, all dispatches have results, subtasks are closed, this node's drafts are promoted.
5. **Dispatch through files.** First use `ws dispatch` to generate task.md, then send the printed prompt verbatim. The subagent writes result.md itself. A chat reply does not qualify as its result. For each item in `需要上层处理` (requires parent action), choose a fix, waiver or escalation to the user and record the decision. Use `ws followup` before giving additional requirements to the original executor. Allow at most 3 dispatch waves per node. Create subtasks for subsequent waves. Hand an executor's work to a new dispatch once it has taken 8 follow-ups (`ws followup` prints the hint). See `references/subagent-protocol.md`.
6. **Keep memory useful across tasks.** Include facts, practices, lessons, source materials and long-term decisions. Use topic directories. Split files over 8KB into directories with a README.md sufficient to start work. Include basis/covers in code notes to detect staleness. Keep plans and suggestions in their task nodes and user rulings only in the AGENTS.md rules section (`规则`). Mark subagent-written memory draft.
7. **Use AGENTS.md as a map.** Keep it to 100–200 lines and point to details in memory. Reserve the rules section for user decisions. Route agent-proposed rules through harness-management.
8. **Preserve v3 workspaces.** For directories containing `.agent/MEMORY.md` or `.agent/memory/`, follow `references/v3-legacy.md`. Never convert them automatically.

## Commands

`ws` lives in `~/.local/bin` as a symlink to this skill's `scripts/ws`. If unavailable on PATH, use `python3 <skill-dir>/scripts/ws`.

| Command | Purpose |
|---|---|
| `ws init [DIR] [--profile task\|repo] [--title] [--yes]` | Create a workspace. The repo profile appends only a block to AGENTS.md and requires user consent before passing `--yes`. |
| `ws focus <ID>` · `ws focus --clear` · `ws focus` | Set, clear or display the current node. The hook appends subsequent user messages to its task.md verbatim section unless they contain secrets or are shorter than 20 characters. |
| `ws req --new <slug> --entry <id>` · `ws req <ID> --entry <id>` | Manually backfill an original message by creating a task or appending it to another node. Use `--stdin` in environments without a hook. |
| `ws task new <slug> [--parent ID] [--title] [--stdin]` | Create a task node with the parent's instructions from stdin in task.md. |
| `ws task spec <ID> --stdin` | Replace the current task.md specification with the latest complete one. Its required format uses `###` headings `目标` (goal), `背景` (background), `要求` (requirements), `约束` (constraints), `验收标准` (acceptance criteria), `输入` (inputs), and `未定事项` (open questions). |
| `ws task status <ID> <planned\|active\|blocked\|done\|dropped>` | Change status with gate checks. `--force "<reason>"` skips the checks and records the reason in progress. |
| `ws dispatch <ID> <slug> --stdin [--force reason] [--external]` | Create the dispatch directory and task.md, then print the dispatch prompt. Blocks starting at wave 4. `--external` registers codex exec / claude -p. Warns when a paragraph duplicates one in a prior dispatch. |
| `ws followup <dispatch-ID> --stdin` | Append new requirements to the original dispatch task.md, preserve its old result.md under a new name and print the follow-up message. |
| `ws log <ID> "…" [--tag decision\|surprise\|note]` | Append one line to progress.md. |
| `ws inbox` · `ws status` · `ws check` · `ws index` | Show original messages recorded in no task node, summarize current state, check workspace integrity, or refresh generated blocks. |
| `ws migrate` | Upgrade an older v4 workspace to v4.2: new conversation format, inbox.md and separate current specification and verbatim record in task.md. |

## Routines and references

| Situation | Read |
|---|---|
| Start work or create a workspace | `modules/init.md` |
| Take over in a new session or recover from context compaction | `modules/recall.md` |
| Close a stage, wrap up or hand off | `modules/update.md` |
| Dispatch a subagent. The lead must read section 2 and give the subagent the path to read section 1. | `references/subagent-protocol.md` |
| Full rules for recognition, repo workspaces, node lifecycle, inbox, memory, AGENTS.md, hooks, checks, boundaries and known limitations | `references/spec.md` |
| Workspace skills and the root `.claude/` directory | `references/capability-layer.md` |
| Legacy v3 workspaces and inspection | `references/v3-legacy.md` and `scripts/legacy/lint-v3.sh` |
| Templates | `templates/` holds both AGENTS variants, the protocol, five task-node files, dispatch, memory notes and directory README. |
| Version history | `CHANGELOG.md` |

Run `python3 -m unittest discover -s scripts/tests` for ws and `python3 -m unittest discover -s ~/.claude/hooks/tests` for the hook.
