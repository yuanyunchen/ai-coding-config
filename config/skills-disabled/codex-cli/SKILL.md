---
name: codex-cli
description: Delegate coding work to OpenAI Codex via the local `codex` CLI in non-interactive mode (`codex exec`). Use when you want a second autonomous coding agent — especially for tasks needing different reasoning, deep logic, complex algorithms, or as a fresh perspective when one agent is stuck. Treat Codex like a capable engineer you hand a ticket to.
---

# Codex as a worker

Use the local `codex` CLI to hand a self-contained task to Codex and read back the result. You are the orchestrator; Codex does the work.

## Mental model

Codex is a peer engineer with its own filesystem, shell, and agent loop. Give it a clear task with enough context, then trust it. Don't micromanage individual edits.

## Invocation

```bash
codex exec --skip-git-repo-check --full-auto "<TASK PROMPT>"
```

- Default model is **the current best available on your auth tier** — Codex picks it, don't hardcode. On a ChatGPT subscription the best is `gpt-5.4` (`gpt-5.5` and `gpt-5.4-codex` are API-key-only). On API key, you can pass `-m gpt-5.5`.
- Default reasoning effort is already **medium**. Bump to `high` / `xhigh` for hard problems, drop to `low` / `minimal` for trivial ones.
- `--skip-git-repo-check` lets Codex run outside a git repo. Default behavior refuses for safety.
- `--full-auto` = `workspace-write` sandbox + auto-approve. Standard for autonomous runs.
- stdout = final agent message. stderr = streaming progress.

## Common flags

| Flag | When to use |
|---|---|
| `-m, --model <name>` | Override model. ChatGPT-sub options: `gpt-5.4` (best), `gpt-5.4-mini`, `gpt-5.3-codex`, `gpt-5.3-codex-spark` (cheap/fast). API-key only: `gpt-5.5`, `gpt-5.4-codex`. Don't hardcode — let it default unless you need a specific tradeoff. |
| `--config model_reasoning_effort="<level>"` | Reasoning budget: `minimal`, `low`, `medium` (default), `high`, `xhigh`. Higher = better reasoning, more tokens, slower. |
| `-s, --sandbox <mode>` | `read-only` (review only), `workspace-write` (default w/ `--full-auto`), `danger-full-access` (network + full FS — use only in containers) |
| `--full-auto` | Auto-approve in `workspace-write`. Standard delegation flag. |
| `--yolo` | Bypass ALL approvals incl. network. Dangerous; avoid unless sandboxed. |
| `-C, --cd <dir>` | Run in a different directory |
| `--json` | JSONL event stream on stdout. Each line is an event (`thread.started`, `turn.completed`, `item.*`, `error`). |
| `-o, --output-last-message <file>` | Write final message to file (cleaner than parsing stdout) |
| `--output-schema <file>` | Constrain final response to a JSON schema |
| `-i, --image <file>` | Attach image(s) as input |
| `--ephemeral` | Don't persist session to disk |
| `exec resume --last "<followup>"` | Continue the previous session |
| `exec resume <session-id> "<followup>"` | Resume a specific session |

## Writing the task prompt

Codex executes literally what you say. Treat the prompt like a ticket for an engineer:

- **State the goal**, not the steps. Codex will plan.
- **Pin success criteria** — what makes it "done" (tests pass, file exists, output matches).
- **Provide context** — paths, repo conventions, what already exists, what to leave alone.
- **Surface constraints** — what must not change, perf/style rules, libraries to use.
- **Demand verification** when applicable — "run the tests and confirm they pass".

The prompt is the entire briefing. Codex has no other context.

## Useful subcommands

Beyond `codex exec`, the CLI exposes other non-interactive commands. All accept `-m`, `--config`, `--skip-git-repo-check`, `--full-auto`, etc.

| Subcommand | Purpose | Common form |
|---|---|---|
| `codex exec "<task>"` | Main delegation: run a one-shot agent loop | `codex exec --skip-git-repo-check --full-auto "..."` |
| `codex exec resume --last "<followup>"` | Continue the most recent session | After a previous `exec`, send a follow-up |
| `codex exec resume <session-id> "..."` | Resume a specific past session | id from earlier `--json` output |
| `codex review` | Automated code review (read-only, no edits) | `codex review --uncommitted` |
| `codex review --base <branch>` | Review current branch vs base | `codex review --base main` |
| `codex review --commit <sha>` | Review a specific commit | — |
| `codex review -` | Custom review prompt from stdin | `echo "focus on race conditions" \| codex review -` |
| `codex apply <task-id>` | Apply latest diff from a Codex Cloud task to local working tree (`git apply`) | After a `codex cloud` run |
| `codex sandbox macos <cmd>` | Run any shell command under Codex's macOS Seatbelt sandbox | Test untrusted scripts |
| `codex sandbox linux <cmd>` | Same, Landlock+seccomp on Linux | — |
| `codex login` / `logout` | Manage auth (ChatGPT or API key) | One-time setup |
| `codex resume` / `fork` | Picker for past sessions (interactive — TUI only) | Don't use in headless |
| `codex cloud` | Browse / apply Codex Cloud tasks (experimental) | Cloud-side runs |
| `codex mcp` | Manage MCP server configs Codex can call | Add tools to Codex |

`codex review` is the one most often missed: it's a headless, read-only code reviewer separate from `exec`. Use it for PR review automation; use `exec` when you need writes.

Codex's interactive **slash commands** (`/model`, `/diff`, `/undo`, `/review`, `/approvals`) only exist in the TUI — there is no headless equivalent for those. For headless: switch model with `-m`, view diffs with `git diff`, control approvals with `--full-auto` / `--sandbox` / `--yolo`.

## Reading the output

Plain mode: final message goes to stdout, progress to stderr. Pipe stdout for the answer, redirect stderr for debug:

```bash
codex exec --skip-git-repo-check --full-auto "<TASK>" \
  > result.txt 2> codex.log
```

With `--json`, parse JSONL events; the relevant final content arrives in `turn.completed` / `item.*` events.

## Defaults you should usually set

```bash
codex exec --skip-git-repo-check --full-auto \
  -o codex_out.txt \
  "<TASK>"
```

Best-available model (auto), medium reasoning (default), writable sandbox, final answer to a file.

Tune when needed:
- Hard problem → add `--config model_reasoning_effort="high"`
- Cheap/fast → add `-m gpt-5.3-codex-spark` or `--config model_reasoning_effort="low"`
- API key user wanting frontier → add `-m gpt-5.5`

## Gotchas

- Default sandbox is `read-only`. If you need edits, use `--full-auto` (or set `-s workspace-write` and approve).
- Without `--skip-git-repo-check`, Codex refuses to run outside a git repo.
- Codex streams a lot of progress to stderr; capture it if you want to debug, otherwise discard with `2>/dev/null`.
- Auth uses `~/.codex/auth.json` from `codex login` (ChatGPT subscription or API key). Don't pass `OPENAI_API_KEY` unless overriding intentionally.
- `--yolo` allows network calls. Don't use on the host machine.
- Resume by `--last` only works if the session was persisted (not `--ephemeral`).

## When NOT to use

- Trivial edits you can do directly — faster than spawning Codex.
- Tasks needing your conversation context — Codex can't see it; inline the context into the prompt.
- When Claude Code (cc) is already a better fit for the task — don't reflex-spawn the other agent. Pick one.
