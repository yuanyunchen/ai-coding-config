---
name: codex-delegation
description: Use OpenAI Codex as a second autonomous coding agent — delegate coding work, investigation, or code review via the codex-companion plugin runtime when available, else the raw `codex` CLI (`codex exec`). Use when you want different reasoning, deep logic, complex algorithms, an independent code review, or a fresh perspective when one agent is stuck. Treat Codex like a capable engineer you hand a ticket to.
---

# Using Codex

Codex is a peer engineer with its own filesystem, shell, and agent loop. You are the orchestrator: brief it like a capable colleague, let it work, read the result, follow up. Don't micromanage individual edits.

## Route

```bash
RUNTIME=$(ls ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs 2>/dev/null | sort -V | tail -1)
```

Non-empty → plugin runtime (preferred: job ledger, tracked threads, structured review). Empty or misbehaving → raw CLI. Never route through the plugin's `/codex:*` slash commands or the `codex:codex-rescue` subagent — ceremony wrappers around this same runtime; call it directly via Bash.

| Task | Use |
|---|---|
| Review changes in a git repo | runtime `review` / `adversarial-review` → `references/git-review.md` |
| Review outside git | read-only `task` + adversarial prompt — recipe in `references/git-review.md` |
| Read-only investigation — diagnose, explain, find-the-bug | runtime `task` (read-only by default) |
| Edits confined to the workspace | runtime `task --write`, add `--background` if long |
| Needs full FS / network / writes outside the repo | raw CLI (bypass mode) |
| No plugin on this machine | raw CLI for everything |
| Hand this whole session to Codex to continue | runtime `transfer` → `references/companion-runtime.md` |

**Failure fallback**: a runtime call errors → `node "$RUNTIME" setup --json` or `codex doctor` to locate the cause (missing install / unauthenticated → user runs `codex login` / config drift); anything else, don't retry in place — switch to the raw CLI. Threads interoperate: continue a runtime-started session with `codex exec resume <id>`.

**Parallel dispatch**: fan out N × `task --background` (or N × CLI runs with distinct `-o` files) → `status` shows all jobs in one view → `result <id>` each. Follow up by explicit id (`codex exec resume <id>`), never `--resume-last` while multiple threads are live.

## Plugin runtime — interface

All commands: `node "$RUNTIME" <command ...>`.

| Command | Meaning |
|---|---|
| `task [--write] [--background] [--effort <lvl>] "<prompt>"` | One-shot agent run rooted at this repo. Read-only unless `--write` (ceiling: workspace-write; approvals always off). `--background` detaches and prints a job id. |
| `task --resume-last "<followup>"` | Continue this repo's most recent thread — Codex keeps its full context; follow up instead of re-briefing. "Most recent" is repo-global: with concurrent sessions or parallel delegations in the same repo it can grab the wrong thread — then resume by explicit id instead: `codex exec resume <session-id>` (id is in the job output). |
| `review` / `adversarial-review` | Git-scoped reviewers (git repo required) — semantics and the non-git fallback recipe in `references/git-review.md`. |
| `status` / `result <job-id>` / `cancel <job-id>` | Job ledger for background runs: list jobs, fetch stored output, kill an active one. Call from the same directory as the original task. |

Usage: always pass `--effort high` (runtime default is medium; `xhigh` for the hardest, lower only for trivial — floor is `low`, the API rejects `minimal`); never pass a model — config default is already the best. Verify outcomes yourself (`git diff`, run the tests) — Codex's "done" is a claim, not a fact.

## Raw CLI — interface

```bash
codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check \
  -c model_reasoning_effort="high" \
  -o codex_out.txt \
  "<TASK PROMPT>" < /dev/null
```

| Part | Meaning |
|---|---|
| `exec` | One-shot non-interactive agent loop. stdout = final message, stderr = streaming progress (`2> codex.log`). |
| `--dangerously-bypass-approvals-and-sandbox` | No approvals, no sandbox — full FS + network. House default for write tasks. Swap for `-s read-only` when Codex must inspect but not touch; if all you need is one extra writable dir, `-s workspace-write --add-dir <dir>` is the tighter choice. |
| `--skip-git-repo-check` | Allow running outside a git repo. |
| `-c model_reasoning_effort="high"` | Reasoning budget. Same discipline as runtime: high default, no `-m`. |
| `-o <file>` | Final answer to a file — essential for background runs. |
| `< /dev/null` | Required headless: with stdin open, Codex hangs forever waiting for EOF. |
| `exec resume --last "<followup>"` / `exec resume <session-id> "..."` | Continue a session, context kept. Always `exec resume` — plain `codex resume` opens the interactive TUI and captures nothing. Fresh `-o` filename per turn or it overwrites. |

Usage: for long runs, launch via Bash `run_in_background: true`, keep working, come back to read `-o`'s file. Write `-o` and stderr-log files to the scratchpad (absolute path), not the cwd — relative paths pollute whatever directory Codex is rooted in. For parallel dispatch, launch several with distinct `-o` files — each gets its own session id, individually resumable. Needs live web search → add `--search` (bypass alone doesn't enable it). Full guide with gotchas: `references/cli-usage.md`.

## Writing the task prompt

The prompt is the entire briefing — Codex sees none of your conversation.

- State the **goal**, not the steps; Codex plans.
- Pin **success criteria** — what makes it "done" (tests pass, file exists, output matches).
- Provide **context** — paths, repo conventions, what already exists, what to leave alone.
- Surface **constraints** — what must not change, libraries to use.
- Demand **verification** — "run the tests and confirm they pass".

**Directing Codex to its skills**: Codex has its own skills in `~/.claude/skills/`. It won't reliably invoke them on its own — when a task matches one, name it in the prompt: "Use your `pdf` skill to ...".

For any prompt where quality matters — nontrivial delegation, review contracts, research — not just high-stakes ones, read the XML prompt-contract templates first (path in the references table).

## When NOT to use

- Trivial edits you can do directly — faster than spawning Codex.
- Tasks needing your conversation context — Codex can't see it; inline the context into the prompt.
- When Claude Code is already a better fit — don't reflex-spawn the other agent. Pick one.

## References (route by need)

| Need | Read |
|---|---|
| Git review workflows: runtime/CLI review semantics, what requires git, non-git fallback recipe | `references/git-review.md` |
| Full CLI operating guide: read-only examples, multi-turn detail, background steps, gotchas | `references/cli-usage.md` |
| Runtime detail: full flags, job ledger + state dir, `transfer`, `setup`/auth, review gate, effort floor gotcha, bypassed plugin surface | `references/companion-runtime.md` |
| CLI flag/subcommand inventory: sandbox/approval modes, `--json`, `--output-schema`, images, `--search`, profiles, config precedence, `mcp-server`, models | `references/cli-reference.md` |
| Wiring Codex into CI / scripts / GitHub Actions; AGENTS.md precedence; automation pitfalls | `references/community-patterns.md` |
| XML prompt-contract templates — read for high-stakes prompts AND whenever prompt quality matters (nontrivial delegation, review contracts, research) | `~/.claude/plugins/cache/openai-codex/codex/*/skills/gpt-5-4-prompting/references/` |
| Setup & maintenance — new machine init or updating either component: CLI install/auth, plugin download source + install, enable/disable policy, update procedure, drift checklist | `references/setup-and-maintenance.md` |

When behavior contradicts any file, `codex <cmd> --help`, `node "$RUNTIME" help`, and `codex doctor` are ground truth.
