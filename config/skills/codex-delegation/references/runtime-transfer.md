# Runtime transfer — hand this session to Codex

`transfer` converts the **current Claude Code session transcript** into a persisted Codex thread and prints `codex resume <thread-id>`. The user (or you) can then pick up this whole conversation inside Codex. Unique to the plugin runtime — no raw-CLI equivalent, so if the runtime is missing you reinstall the plugin (SKILL.md "Empty runtime"), you do not fall back.

## Run it (copy-paste)

```bash
# 1. locate the runtime
RUNTIME=$(ls ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs 2>/dev/null | sort -V | tail -1)

# 2. locate THIS session's transcript — <escaped-cwd>/<session-id>.jsonl, newest wins
SRC=$(ls -t ~/.claude/projects/<escaped-cwd>/*.jsonl | head -1)

# 3. transfer
node "$RUNTIME" transfer --source "$SRC" --json
```

`<escaped-cwd>` = the working directory with `/` and `.` turned into `-` (e.g. `/Users/me/Desktop/AI Workspace` → `-Users-me-Desktop-AI-Workspace`). The session id is the same one embedded in your scratchpad path, so `ls -t | head -1` normally lands on the right file; confirm the id matches before trusting it if multiple sessions are active in the same cwd.

JSON output:

```json
{
  "threadId": "019f333e-...",
  "resumeCommand": "codex resume 019f333e-...",
  "sourcePath": ".../<session-id>.jsonl",
  "sessionId": "<session-id>"
}
```

`resumeCommand` is the handoff: run it in a terminal to continue the conversation in Codex.

## The `--source` is mandatory here — why

Run it bare and it dies with `Could not identify the current Claude transcript. Retry with --source <path>`. That is **not a breakage** — it is the expected result under house policy:

- `transfer` auto-locates the transcript from a session env var that the plugin's command context injects.
- House policy keeps plugin **registration off** (`"codex@openai-codex": false`) and calls `codex-companion.mjs` directly via `node`. That path never sets the env var.
- So auto-location always fails when called directly. **Always pass `--source` explicitly.** This is the same class of "direct-call loses the session env" gotcha as `status`/`result` needing to run from the original workspace dir (companion-runtime.md).

If an agent reports "transfer 没法用 / doesn't work", the first thing to check is whether it ran bare without `--source` — that is the usual cause, not a missing or broken plugin.

## Do it from the MAIN agent only

`transfer` operates on *the current session*. A subagent has its own (or no) transcript, does not inherit this skill, and cannot see the main conversation — so a subagent transferring "this session" either errors or grabs the wrong `.jsonl`. Session handoff is a main-agent action; never delegate it.

## Verify

The returned `threadId` is a live Codex thread. To confirm without opening the interactive TUI, resume headlessly with a trivial follow-up:

```bash
codex exec resume <thread-id> "Reply exactly: TRANSFER-OK" < /dev/null -o /dev/stdout
```

(Plain `codex resume <id>` opens the interactive TUI and captures nothing — use `exec resume` for a scripted check.)
