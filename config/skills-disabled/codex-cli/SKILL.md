---
name: codex-cli
description: "[DISABLED — superseded by codex-delegation] Former standalone Codex CLI delegation skill. Do not invoke; use ~/.claude/skills/codex-delegation/SKILL.md instead."
---

> **Retired 2026-07-04.** Merged into global `codex-delegation` (companion runtime + raw CLI). Kept in `skills-disabled/` for reference only.

# Codex as a worker

Codex is a peer engineer with its own filesystem, shell, and agent loop. You are the orchestrator: brief it like a capable colleague, let it work, read the result, follow up. Don't micromanage individual edits.

## Canonical invocation

```bash
codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check \
  -c model_reasoning_effort="high" \
  -o codex_out.txt \
  "<TASK PROMPT>" < /dev/null
```

- **Model — never pass `-m`.** The config default is already the best available model; the lineup drifts month to month, so let it default.
- **Reasoning effort — default `high`.** Bump to `xhigh` for the hardest problems; drop to `medium` only for genuinely trivial mechanical tasks.
- **Bypass mode is the house default.** `--dangerously-bypass-approvals-and-sandbox` = no approvals, no sandbox — fully unattended on this machine. Only switch to sandboxed modes (`-s` / `-a`, see reference) when running untrusted code.
- `--skip-git-repo-check` — allow running outside a git repo.
- `-o <file>` — final answer to a file; cleaner than parsing stdout and essential for background runs.
- `< /dev/null` — **required for headless/background runs.** With stdin open, Codex hangs forever on "Reading additional input from stdin...". Omit only when deliberately piping a prompt via stdin.
- stdout = final message, stderr = streaming progress (`2> codex.log` to keep for debugging, `2>/dev/null` to discard).

## Writing the task prompt

The prompt is the entire briefing — Codex sees none of your conversation.

- State the **goal**, not the steps; Codex plans.
- Pin **success criteria** — what makes it "done" (tests pass, file exists, output matches).
- Provide **context** — paths, repo conventions, what already exists, what to leave alone.
- Surface **constraints** — what must not change, libraries to use.
- Demand **verification** — "run the tests and confirm they pass".

**Directing Codex to its skills**: Codex has its own skills in `~/.claude/skills/` (`ls` it to see what's installed). It won't reliably invoke them on its own — when a task matches one, name it in the prompt: "Use your `pdf` skill to ...".

## Multi-turn interaction

Work with Codex the way a human works with an agent: dispatch, read the result, then follow up **in the same session** instead of re-briefing from scratch — resume keeps Codex's full context.

```bash
codex exec resume --last "Tests still fail on X — fix and rerun" < /dev/null   # continue newest session
codex exec resume <session-id> "<followup>" < /dev/null                        # a specific one
```

Resume takes the same flags as `exec` (bypass, effort, `-o`). `--last` only works if the session was persisted — don't use `--ephemeral` when you might follow up. Session ids appear in stderr / `--json` output. Resume writes *this turn's* final message to `-o`, so give each turn a fresh filename (`codex_out2.txt`, …) or it overwrites the previous one.

## Read-only tasks: review & inspection

When you want Codex to *inspect but not touch* your files — code review, "find the bug", explain-this — add `-s read-only` instead of the bypass default. It guarantees no edits regardless of what Codex decides.

```bash
codex exec -s read-only --skip-git-repo-check -o review.txt \
  "Review buggy.py for correctness bugs, with line numbers. Do not modify any files." < /dev/null
```

For git-diff-scoped review there's also a dedicated headless reviewer: `codex review --uncommitted` (or `--base main` / `--commit <sha>`). See `references/cli-reference.md` → `codex review`.

## Long tasks: run in background

Anything beyond a few minutes: don't block on it — launch, keep working, come back.

1. Run the canonical command via Bash with `run_in_background: true` (keep `-o codex_out.txt 2> codex.log`).
2. Continue other work; peek at `codex.log` for progress if curious.
3. On completion, read `codex_out.txt` and **verify the outcome yourself** — Codex's "done" is a claim, not a fact (`git diff`, run the tests).
4. Not satisfied → follow up with `codex exec resume --last "..."`, in background again if long.

## When NOT to use

- Trivial edits you can do directly — faster than spawning Codex.
- Tasks needing your conversation context — Codex can't see it; inline the context into the prompt.
- When Claude Code is already a better fit — don't reflex-spawn the other agent. Pick one.

## References (route by need)

| Need | Read |
|---|---|
| Any flag or subcommand beyond the above: `review` (headless code review), sandbox/approval modes for untrusted code, `--json` events, `--output-schema`, `-i` images, `--search`, profiles, config precedence, `apply`, `mcp` / `mcp-server`, `cloud`, `doctor`, models | `references/cli-reference.md` |
| Wiring Codex into CI / scripts / GitHub Actions; structured output capture patterns; AGENTS.md precedence; automation pitfalls | `references/community-patterns.md` |

When behavior contradicts either file, `codex <cmd> --help` and `codex doctor` are ground truth.
