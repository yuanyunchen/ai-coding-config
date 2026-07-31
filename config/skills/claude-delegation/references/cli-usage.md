# Headless `claude` — complete operating guide

Self-sufficient guide to running a delegated Claude Code process. Assumes auth is set up (`references/auth-and-setup.md`) and the prompt-writing / when-not rules from SKILL.md; this file covers execution mechanics.

## Canonical invocation (unattended write task)

```bash
claude -p "<TASK PROMPT>" \
  --output-format json \
  --permission-mode bypassPermissions \
  --model sonnet --effort high \
  --session-id "$(uuidgen)"
```

- **`-p` is the delegation switch.** It runs the loop non-interactively and exits. Everything else tunes it.
- **Prompt goes first, right after `-p`.** Several flags are variadic (`--add-dir`, `--tools`, `--disallowedTools`, `--allowedTools` take `<...>`) and will greedily consume the positional prompt if it trails them — the run then dies with "Input must be provided either through stdin or as a prompt argument." Prompt-first avoids it; piping also works: `echo "<prompt>" | claude -p ...`. With the prompt as an arg, stdin is not otherwise read, so no `< /dev/null` guard is needed (that only matters when piping or with `--input-format stream-json`).
- **Model — pass an alias or omit.** `opus`/`sonnet`/`haiku`/`fable`, or a full id, or omit to inherit the config default. Match model to task; don't burn opus on mechanical edits.
- **Effort — default `high`.** `--effort low|medium|high|xhigh|max`. Drop only for trivial mechanical work.
- **`--session-id "$(uuidgen)"`** — pin the id you'll resume by. Cleaner than parsing it back out of the result. One fresh UUID per parallel job.

## Output formats

| `--output-format` | Shape | When |
|---|---|---|
| `text` (default) | Final message as plain text to stdout | Human glance, quick pipes |
| `json` | A **JSON array** of the run's messages (verified on 2.1.201) — `system/init`, `assistant` turns, and a final `result` element | **Default for delegation** — select the result element, don't scrape text |
| `stream-json` | JSONL: one event per line (`system/init`, `assistant`, `result`, …) as they happen | Live progress, long runs, streaming into another tool |

With `--output-format json` this build prints a JSON **array**; the last element (`type:"result"`) carries the fields that matter — don't assume a bare object. Select it robustly:

```bash
claude -p "..." --output-format json | jq '.[] | select(.type=="result")'
```

The result element:

```json
{
  "type": "result", "subtype": "success",
  "is_error": false,
  "result": "<final message text>",
  "session_id": "<uuid — resume with this>",
  "num_turns": 7,
  "duration_ms": 48210,
  "total_cost_usd": 0.1234,
  "usage": { "input_tokens": 0, "output_tokens": 0 },
  "modelUsage": {}, "permission_denials": [], "terminal_reason": "completed"
}
```

Check `is_error` first, then read `result`. `permission_denials` non-empty means the delegate wanted a tool the permission mode blocked — widen the mode or allow the tool and retry. Extract with `jq -r '.[] | select(.type=="result") | .result'`. `stream-json` extras: `--include-partial-messages` (token-level chunks), `--include-hook-events` (hook lifecycle).

## Permission modes (writes vs read-only)

`--permission-mode` choices: `acceptEdits` · `auto` · `bypassPermissions` · `manual` · `dontAsk` · `plan`.

- **Unattended writes** → `bypassPermissions` (or the flag `--dangerously-skip-permissions`). No prompts. House default for delegated edit tasks in a trusted repo. On some setups the flag must first be made available with `--allow-dangerously-skip-permissions`.
- **Read-only investigation** → keep the default mode and remove write tools instead, so edits are structurally impossible (prompt first — these are variadic flags):
  ```bash
  claude -p "Diagnose the failing test; report file:line and mechanism. Do not modify files." \
    --output-format json --disallowedTools Edit Write NotebookEdit
  ```
  Or scope the toolset positively: `--tools Read,Grep,Glob,Bash`. `plan` mode also prevents edits but steers the delegate toward producing a plan rather than freely investigating — prefer tool restriction for pure investigation.

## Tool & directory scoping

- `--tools "Read,Bash,Edit"` — allowlist from the built-in set (`""` disables all, `default` for all).
- `--allowedTools` / `--disallowedTools` — finer-grained, supports patterns like `"Bash(git *)" Edit`.
- `--add-dir <dir>` — extra directories the delegate may touch (repeatable). Tighter than running from a broad root.
- `--worktree <name>` — run inside a fresh git worktree so the delegate's edits never land on your working tree. The clean way to parallelize write tasks that would otherwise collide. `--tmux` pairs with it for a live pane.
- `--mcp-config <file>` / `--strict-mcp-config` — give the delegate specific MCP servers (and only those).

## Long tasks: background

Anything beyond a couple of minutes: don't block.

1. **Via Bash**: run the canonical command with `run_in_background: true`, redirecting JSON to an **absolute scratchpad path** (`... > /abs/scratchpad/job1.json 2> /abs/scratchpad/job1.log`). Keep working; read the file on completion.
2. **Native detach**: `claude --bg "<prompt>"` starts a background agent and returns immediately. Manage it with:
   ```bash
   claude agents            # human view of running/recent background sessions
   claude agents --json     # scriptable array: pid, cwd, kind, startedAt, sessionId, name
   claude agents --json --all   # include completed
   ```
   This is the job-ledger analog of codex's `status`/`result`. Filter with `--cwd <path>`.
3. **Always verify the outcome yourself** — `git diff`, run the tests. The delegate's "done" is a claim.

## Parallel fan-out

```bash
for t in task1 task2 task3; do
  id=$(uuidgen)
  claude -p "$(cat prompts/$t.md)" \
    --output-format json --permission-mode bypassPermissions \
    --session-id "$id" --worktree "wt-$t" \
    > "/abs/scratchpad/$t.json" 2> "/abs/scratchpad/$t.log" &
done
wait
```

Each job: its own `--session-id`, its own output file, its own `--worktree` if it writes. Collect the JSON files, resume any laggard by its pinned id. Do **not** use `--continue` to follow up while several jobs are live — it targets the newest session in the cwd and will grab the wrong one; always resume by explicit id.

## Multi-turn

```bash
claude -p --resume <session-id> "<followup>"     # continue a specific session, context intact
claude -p --continue "<followup>"                # newest session in this cwd
claude -p --resume <id> --fork-session "<...>"   # branch a new session id off <id>, leaving it untouched
```

Resume accepts the same flags as the initial run (model, effort, permission mode, output format). Only works if the session was persisted (not `--no-session-persistence`). `--fork-session` is useful to explore a variation without polluting the original thread.

## Structured output & budget

- **`--json-schema '<schema>'`** — constrain the final answer to a JSON Schema; pair with `--output-format json` for a machine-readable, validated result (audits, risk reports, extraction).
- **`--max-budget-usd <amount>`** — hard dollar ceiling for the run (print mode only). The run stops when it's hit.
- **`--fallback-model <m>`** — fall back when the primary is overloaded (print mode only).

## Gotchas

- **Not logged in** — the big one. A fresh process needs its own auth; see `references/auth-and-setup.md`. Gate every dispatch on `claude auth status`.
- **Variadic flag eats the prompt** — `--add-dir`/`--tools`/`--disallowedTools`/`--allowedTools` consume every following token as their own values, including your prompt, and the run fails with "Input must be provided…". Put the prompt first, or pipe it via stdin.
- **`--output-format json` is an array, not an object** on this build — index the `type=="result"` element, don't `jq '.result'` the top level.
- **`--continue` grabs the wrong session** under parallelism — it's newest-in-cwd. Pin and resume by `--session-id`.
- **Keychain unreadable in a sandboxed shell** — even a logged-in CLI can't read macOS keychain creds from inside a sandboxed Bash; use `dangerouslyDisableSandbox` or an `ANTHROPIC_API_KEY`/`--bare` path.
- **Flags that are print-only** — `--fallback-model`, `--max-budget-usd`, `--no-session-persistence`, `--include-partial-messages` only take effect with `-p`.
- **The delegate won't auto-invoke skills** — name the skill in the prompt if you need it.

## Ground truth

`claude --help`, `claude <cmd> --help`, `claude doctor`, `claude auth status`. When behavior contradicts this file, re-dump them.
