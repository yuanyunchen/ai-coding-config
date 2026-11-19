---
name: claude-delegation
description: Delegate coding work, investigation, or review to a second headless Claude Code agent via the `claude` CLI (`claude -p`) — a peer engineer in its own process, context window, cwd, and git worktree. Use when you want an isolated fresh-context run, a truly detached background job, a parallel fan-out of independent tickets, a different model/effort, or a clean-slate second opinion. Prefer the in-process Task/Agent tool for lightweight subagents that share this session; reach for the CLI when you need real process/filesystem isolation.
---

# Delegating to a headless Claude Code

`claude -p` launches a **separate, fully autonomous Claude Code process** — its own agent loop, context window, working directory, git state, and CLAUDE.md discovery. You are the orchestrator: brief it like a capable colleague, let it run, read the result, follow up by session id. Don't micromanage its edits.

There is **no companion plugin** for Claude→Claude delegation (unlike codex-delegation's runtime). This is **pure CLI** — everything below runs the `claude` binary directly via Bash.

## Auth prerequisite — check this first

A spawned `claude -p` is a fresh process that needs its **own** credentials; it does **not** inherit the auth of the session you're in. If the standalone CLI was never logged in, every run returns `Not logged in · Please run /login` with `"authMethod":"none"` — a silent-looking failure that wastes the whole dispatch.

```bash
claude auth status          # {"loggedIn":true,...} required before delegating
```

`loggedIn:false` → the user must authenticate the CLI once (you cannot — it's interactive/outward-facing): `claude setup-token` (long-lived token, needs a Claude subscription), `claude auth login` (browser OAuth), or export `ANTHROPIC_API_KEY`. Full diagnosis + the desktop-app-vs-CLI keychain gotcha: `references/auth-and-setup.md`. **Verify auth before any dispatch** — it's the one failure that looks like the task ran but produced nothing.

## Route

| Task | Use |
|---|---|
| Lightweight helper that can share this session's context | in-process **Task/Agent tool**, not the CLI — cheaper, no process spin-up |
| Read-only investigation — diagnose, explain, find-the-bug | `claude -p` with write tools disallowed (`--disallowedTools "Edit Write NotebookEdit"`) |
| Edits confined to the repo, unattended | `claude -p --permission-mode bypassPermissions` |
| Long task — don't block on it | Bash `run_in_background: true` + `-o`-style capture, or native `--bg` → `claude agents` |
| Parallel independent tickets | N × `claude -p` each with a distinct `--session-id` and output file → collect |
| Must not touch the current tree | `claude -p --worktree <name>` (isolated git worktree) or `--add-dir` for scope |
| Different model / bigger effort / clean slate | `--model`, `--effort`, `--bare` (hermetic, no CLAUDE.md/hooks/plugins) |

**When to prefer the CLI over the Task tool:** you need genuine isolation — a separate process that can't corrupt this session, its own cwd/git worktree, a truly detached background job, a different account or model, or hermetic execution. For everything lighter, the in-process Task tool is the right call; don't reflex-spawn a subprocess.

Pass `fable`, `opus`, `sonnet`, `haiku`, or a full ID verbatim. The CLI/provider resolves aliases. New tasks use explicit `--model default` and `--effort high` unless overridden. On resume or continue, omit the model override unless the user explicitly requests a switch. Check account-specific extra usage before a live Fable test.

## Interface — `claude -p`

Canonical unattended write task — **prompt goes first** (see the variadic gotcha below):

```bash
claude -p "<TASK PROMPT>" \
  --output-format json \
  --permission-mode bypassPermissions \
  --model "${MODEL:-default}" --effort "${EFFORT:-high}" \
  --session-id "$(uuidgen)" \
  --add-dir /path/to/repo
```

| Part | Meaning |
|---|---|
| `-p, --print` | Headless: run the agent loop, print the final result, exit. The delegation entry point. |
| `--output-format json` | Emit structured JSON (a **JSON array** of the run's messages) instead of bare text; the final `type:"result"` element carries `result`, `session_id`, `total_cost_usd`, `usage`, `is_error`. Select it — don't scrape stdout: `jq '.[] | select(.type=="result")'`. `text` (default) or `stream-json` (JSONL event stream) also available. |
| `--permission-mode <mode>` | `bypassPermissions` = fully unattended writes (house default for delegated write tasks). Read-only: keep the default and disallow write tools instead. Modes: `acceptEdits`, `auto`, `bypassPermissions`, `manual`, `dontAsk`, `plan`. |
| `--model <alias>` | `opus` · `sonnet` · `haiku` · `fable`, or a full id. Pass `default` when unspecified. |
| `--effort <lvl>` | `low` · `medium` · `high` · `xhigh` · `max`. Default high; honor user overrides. |
| `--session-id <uuid>` | Pin a known session id up front so you can resume it deterministically later (cleaner than fishing the id out of output). Must be a valid UUID; use a fresh one per parallel job. |
| `--add-dir <dir>` | Grant tool access to a directory outside cwd. Tighter than running from a broad root. |
| `--worktree <name>` | Run in a fresh git worktree — the delegate can't touch your working tree. Ideal for parallel edits that would otherwise collide. |

**Variadic gotcha — put the prompt first.** `--add-dir`, `--tools`, `--disallowedTools`, and `--allowedTools` take multiple values (`<tools...>`) and will greedily swallow the positional prompt if it follows them, leaving the run with no prompt ("Input must be provided…"). Give the prompt as the **first positional after `-p`**, or pipe it via stdin (`echo "<prompt>" | claude -p ...`). With the prompt supplied as an arg, `claude -p` does not otherwise read stdin, so no `< /dev/null` guard is needed. For long runs, launch via Bash `run_in_background: true`, redirect the JSON to an absolute scratchpad path, keep working, come back to read it.

**Read-only investigation** (prompt first, write tools removed):

```bash
claude -p "Find the root cause of the failing test in tests/auth_test.py. Do not modify any files. Report file:line and the mechanism." --model "${MODEL:-default}" --effort "${EFFORT:-high}" \
  --output-format json --disallowedTools Edit Write NotebookEdit
```

Full flag/subcommand inventory (verified against the local binary): `references/cli-reference.md`. Operating guide — output parsing, permission modes, background, multi-turn, structured output, gotchas: `references/cli-usage.md`.

## Background & parallel dispatch

- **Background one job**: run the canonical command under Bash `run_in_background: true`, capturing JSON to an absolute scratchpad path. Or `--bg` to detach natively — it returns immediately and the job shows up in `claude agents` / `claude agents --json` (the job-ledger analog).
- **Parallel fan-out**: launch N runs, each with its own `--session-id` and its own output file (and `--worktree` if they write). Collect each file when done; resume any by its pinned id. Never rely on `--continue` (newest-in-cwd) while multiple jobs are live — it will grab the wrong one.

## Multi-turn — resume instead of re-briefing

A delegated session keeps its full context; follow up instead of restating everything.

```bash
claude -p --resume <session-id> "Tests still fail on X — fix and rerun."   # a specific session
claude -p --continue "..."                                                  # newest session in this cwd
claude -p --resume <id> --fork-session "..."                                # branch off without mutating the original
```

Resume takes the same flags as the initial run. Pin `--session-id` on the first call so resumes are unambiguous.

## Writing the task prompt

The prompt is the **entire** briefing — the delegate sees none of your conversation.

- State the **goal**, not the steps; it plans.
- Pin **success criteria** — what makes it "done" (tests pass, file exists, output matches).
- Provide **context** — paths, repo conventions, what already exists, what to leave alone.
- Surface **constraints** — what must not change, libraries to use, read-only if so.
- Demand **verification** — "run the tests and confirm they pass; report the command and output."

The delegate discovers its own CLAUDE.md/skills from its cwd (unless `--bare`). It will **not** reliably invoke a skill on its own — when a task matches one, name it: "Use your `pdf` skill to ...". Verify outcomes yourself (`git diff`, run the tests) — the delegate's "done" is a claim, not a fact.

## When NOT to use

- **A lightweight subagent that shares context** — use the in-process Task/Agent tool; a subprocess is heavier and blind to this conversation.
- **Trivial edits you can do directly** — faster than spawning a whole Claude.
- **Work needing your conversation context** — the delegate can't see it; inline everything into the prompt or it flies blind.
- **Auth not set up** — `claude auth status` first; a delegated run with no credentials silently produces nothing.

## References

| Need | Read |
|---|---|
| Auth prerequisite: `setup-token` vs `auth login` vs `ANTHROPIC_API_KEY`, the desktop-app/standalone-CLI keychain split, this-machine findings, diagnosis | `references/auth-and-setup.md` |
| Full operating guide: output formats & JSON result schema, permission modes, read-only recipe, background + `claude agents` ledger, multi-turn, structured output (`--json-schema`), cost/budget, gotchas | `references/cli-usage.md` |
| Authoritative flag/subcommand inventory verified against the local `claude` binary — every `-p` flag, subcommands, model aliases, isolation flags | `references/cli-reference.md` |

When behavior contradicts any file, `claude --help`, `claude <cmd> --help`, and `claude doctor` are ground truth — re-dump them rather than trusting the docs.
