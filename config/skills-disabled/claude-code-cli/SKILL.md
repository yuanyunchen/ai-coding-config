---
name: claude-code-cli
description: Delegate coding work to Claude Code via the local `claude` CLI in headless mode. Use when you want another autonomous coding agent to investigate, plan, refactor, fix, or implement something — especially tasks that benefit from Claude's reasoning/codebase navigation. Treat Claude Code like a capable engineer you hand a ticket to.
---

# Claude Code (cc) as a worker

Use the local `claude` CLI to hand a self-contained task to Claude Code and read back the result. You are the orchestrator; cc does the work.

## Mental model

cc is a peer engineer with its own filesystem, shell, and agent loop. Give it a clear task with enough context, then trust it. Don't micromanage individual edits.

## Invocation

```bash
claude -p "<TASK PROMPT>" \
  --model opus \
  --effort medium \
  --dangerously-skip-permissions \
  < /dev/null
```

- Default to **`--model opus`** (alias auto-resolves to the current latest Opus — don't hardcode a version like `claude-opus-4-5`). cc's own default is sonnet, which is weaker; explicitly request opus.
- Default `--effort medium`. Bump to `high` / `xhigh` / `max` for hard problems; drop to `low` for trivial ones.
- Always pipe `< /dev/null`. Without it cc waits 3s on stdin then warns.
- Never use `--bare`. It bypasses OAuth and breaks Pro/Max subscriptions.

## Common flags

| Flag | When to use |
|---|---|
| `--model <name>` | Aliases (auto-pick latest): `opus`, `sonnet`, `haiku`. Or full id like `claude-opus-4-5-20251101`. Use `opus` for serious work, `sonnet` for routine, `haiku` for cheap/fast. |
| `--effort <level>` | Thinking budget: `low`, `medium` (default for delegation), `high`, `xhigh`, `max`. Higher = better reasoning, more tokens, slower. |
| `--dangerously-skip-permissions` | Standard for autonomous runs. cc can read/write/bash freely. |
| `--permission-mode acceptEdits` | Safer: auto-approves edits but asks for shell. Often too restrictive — even `/tmp` writes get blocked. |
| `--allowedTools "Bash,Read,Edit,Write"` | Whitelist tools when you don't want full access |
| `--output-format json` | Structured output: an **array of events** (init / assistant turns / final). Final result is in the last element's `result` field, with `session_id`, `total_cost_usd`, `num_turns`, `usage`. Parse with: `json.load(f)[-1]["result"]` |
| `--output-format stream-json --include-partial-messages` | Live JSONL event stream for long jobs (one event per line) |
| `--max-turns N` | Hard cap on agent turns. Use 30–100. Prevents runaways. |
| `--append-system-prompt "..."` | Inject role/constraints on top of cc's defaults |
| `--cwd <dir>` | Run in a different repo |
| `--continue` | Continue most recent session |
| `--resume <session-id>` | Resume a specific session (id from prior `--output-format json`) |
| `--session-id <uuid>` | Pin a session id you can resume later |

## Writing the task prompt

cc executes literally what you say. Treat the prompt like a ticket for an engineer:

- **State the goal**, not the steps. cc will plan.
- **Pin success criteria** — what makes it "done" (tests pass, file exists, output matches).
- **Provide context** — paths, repo conventions, what already exists, what to leave alone.
- **Surface constraints** — what must not change, perf/style rules, libraries to use.
- **Demand verification** when applicable — "run the tests and confirm they pass".

The prompt is the entire briefing. cc has no other context.

## Slash commands in headless mode

You can invoke skills as the prompt — start the prompt with `/skill-name args`:

```bash
claude -p --dangerously-skip-permissions "/loop write a fizzbuzz that passes all tests" < /dev/null
```

What works in `-p`:
- **Bundled skills** (always available, prompt-based playbooks)
- **Your custom skills** under `~/.claude/skills/<name>/SKILL.md` or project-local `.claude/skills/`

What does NOT work in `-p` (TUI-only built-ins):
- `/plan`, `/help`, `/clear`, `/compact`, `/rewind`, `/login`, etc. — describe the task in prose instead.
- For plan-mode-style read-only analysis, use the flag equivalent: `--permission-mode plan`.

### Useful bundled skills for delegation

| Slash | What it does | When to invoke |
|---|---|---|
| `/loop "<prompt>"` | Run prompt repeatedly with self-assessment until done or max iters | "Keep iterating until tests pass" — good for stubborn bugs |
| `/simplify` | Review recently changed code for quality/efficiency, apply fixes | After cc just edited something; cleanup pass |
| `/review` | Review a pull request (uses gh / git diff) | Code review of staged/PR changes |
| `/code-review` | Same as `/review` (alias) | — |
| `/security-review` | Security audit of pending changes on current branch | Pre-merge security pass |
| `/init` | Generate a CLAUDE.md documenting the codebase | First-time onboarding cc to a repo |
| `/claude-api` | Anthropic SDK / prompt caching / model migration expertise | Working with Anthropic API code |
| `/skill-creator` | Create, modify, or evaluate Claude Code skills | Authoring new skills |
| `/schedule` | Create one-time or recurring scheduled agents (cron-based) | Background polling jobs |
| `/update-config` | Edit `~/.claude/settings.json` (hooks, permissions, env) | Configure cc itself |
| `/fewer-permission-prompts` | Scan past transcripts, propose allowlist entries | Reduce future approval friction |

User-installed skills (e.g. `/docx`, `/pdf`, `/pptx`, `/xlsx`, `/frontend-design`, `/theme-factory`, `/webapp-testing`, `/mcp-builder`, `/web-artifacts-builder`) are also invocable when present in `~/.claude/skills/` — same pattern: `claude -p "/skill-name <args>"`.

Note: `/debug`, `/batch`, `/commit` look like skills but are TUI-only CLI commands. In headless mode just describe the task instead.

## Reading the output

Default stdout is the final assistant message only. Streamed thinking goes to stderr. With `--output-format json` stdout is a JSON array of events — take the **last element** and read `.result`. Check exit code.

For multi-step jobs, run with `--output-format stream-json` and tee to a file so you can debug if it goes off-track.

## Defaults you should usually set

```bash
claude -p "<TASK>" \
  --model opus \
  --effort medium \
  --dangerously-skip-permissions \
  --max-turns 60 \
  --output-format json \
  < /dev/null
```

Best model + medium thinking + autonomous execution + turn cap + parseable output.

## Gotchas

- Subscription auth lives in macOS Keychain, not a file. Other users / sudo / containers won't see it.
- `--bare` requires `ANTHROPIC_API_KEY`. Don't use it on Pro/Max.
- `acceptEdits` mode denies `/tmp` and most non-cwd paths. Use `--dangerously-skip-permissions` for real autonomy.
- cc may try to commit/push. Forbid in the prompt if you don't want that.
- Long output can blow up your context. Pipe to a file and read summaries:
  ```bash
  claude -p "..." --output-format json < /dev/null > cc_out.json
  ```

## When NOT to use

- Trivial edits you can do directly with Read/Edit tools — faster than spawning cc.
- Tasks needing your conversation context — cc can't see it; either inline the context into the prompt or skip cc.
