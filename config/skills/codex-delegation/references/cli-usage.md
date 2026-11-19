# Raw `codex` CLI — complete operating guide

Self-sufficient fallback: everything needed to run Codex with the CLI alone. Read this when the plugin runtime is unavailable (the `RUNTIME` glob in the main skill came back empty), the runtime is misbehaving, or the task needs what the runtime can't give — full filesystem access, network, or writes outside the repo (the runtime's ceiling is workspace-write).

The prompt-writing discipline and "when NOT to use" rules in the main skill apply unchanged; this file only covers execution.

## Canonical invocation (write tasks — house default)

```bash
codex exec -m "$MODEL_ID" -c "model_reasoning_effort=${EFFORT:-high}" --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check \
  -o codex_out.txt \
  "<TASK PROMPT>" < /dev/null
```

- **Model**: Resolve the requested selector once per new task. Reuse the full ID for CLI fallback. Keep Fast in the Codex service tier configuration. Resume with the original model unless the user explicitly requests a switch.
- **Reasoning effort — default `high`.** Bump to `xhigh` for the hardest problems; drop to `medium` only for genuinely trivial mechanical tasks.
- **Bypass mode is the house default.** `--dangerously-bypass-approvals-and-sandbox` = no approvals, no sandbox — fully unattended on this machine. Only switch to sandboxed modes (`-s` / `-a`, see cli-reference.md) when running untrusted code.
- `--skip-git-repo-check` — allow running outside a git repo.
- `-o <file>` — final answer to a file; cleaner than parsing stdout and essential for background runs.
- `< /dev/null` — **required for headless/background runs.** With stdin open, Codex hangs forever on "Reading additional input from stdin...". Omit only when deliberately piping a prompt via stdin.
- stdout = final message, stderr = streaming progress (`2> codex.log` to keep for debugging, `2>/dev/null` to discard).
- Needs live web search → add `--search`; bypass mode alone gives shell-level network but not the native `web_search` tool.
- Only one extra writable directory needed → `-s workspace-write --add-dir <dir>` is tighter than full bypass.

## Read-only tasks: review & inspection

When Codex should *inspect but not touch* your files — code review, "find the bug", explain-this — use `-s read-only` instead of the bypass default. It guarantees no edits regardless of what Codex decides.

```bash
codex exec -m "$MODEL_ID" -c "model_reasoning_effort=${EFFORT:-high}" -s read-only --skip-git-repo-check -o review.txt \
  "Review buggy.py for correctness bugs, with line numbers. Do not modify any files." < /dev/null
```

For git-diff-scoped review there's also a dedicated headless reviewer: `codex review --uncommitted` (or `--base main` / `--commit <sha>`). See `cli-reference.md` → `codex review`.

## Multi-turn interaction

Dispatch, read the result, then follow up **in the same session** instead of re-briefing from scratch — resume keeps Codex's full context.

```bash
codex exec resume --last "Tests still fail on X — fix and rerun" < /dev/null   # continue newest session
codex exec resume <session-id> "<followup>" < /dev/null                        # a specific one
```

Resume takes the same flags as `exec` (bypass, effort, `-o`). `--last` only works if the session was persisted — don't use `--ephemeral` when you might follow up. Session ids appear in stderr / `--json` output. Resume writes *this turn's* final message to `-o`, so give each turn a fresh filename (`codex_out2.txt`, …) or it overwrites the previous one.

A session started by the plugin runtime is also resumable here — runtime job output includes its Codex session ID.

## Long tasks: run in background

Anything beyond a few minutes: don't block on it — launch, keep working, come back.

1. Run the canonical command via Bash with `run_in_background: true` (keep `-o codex_out.txt 2> codex.log`).
2. Continue other work; peek at `codex.log` for progress if curious.
3. On completion, read `codex_out.txt` and **verify the outcome yourself** — Codex's "done" is a claim, not a fact (`git diff`, run the tests).
4. Not satisfied → follow up with `codex exec resume --last "..."`, in background again if long.

## Ground truth

When behavior contradicts this file, `codex <cmd> --help` and `codex doctor` beat both this file and the web. Full flag/subcommand inventory: `cli-reference.md`.
