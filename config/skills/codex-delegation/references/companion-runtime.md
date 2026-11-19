# codex-companion runtime — reference

The execution core of the official OpenAI Codex plugin for Claude Code (`openai-codex` marketplace, plugin `codex`). A dependency-free Node script that drives Codex through `codex app-server` (a persistent JSON-RPC broker) instead of `codex exec`, which is what buys it thread tracking, a job ledger, and structured review output. Verified against plugin v1.0.5, 2026-07-04.

## Locating it

```bash
RUNTIME=$(ls ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs 2>/dev/null | tail -1)
```

The version glob survives plugin updates (`tail -1` = newest). Requires `node` and the `codex` CLI installed + authenticated. If the glob is empty, the plugin isn't installed on this machine — use the raw CLI path in the main skill.

## Command surface

```
node "$RUNTIME" setup   [--enable-review-gate|--disable-review-gate] [--json]
node "$RUNTIME" review  [--wait|--background] [--base <ref>] [--scope <auto|working-tree|branch>]
node "$RUNTIME" adversarial-review [--wait|--background] [--base <ref>] [--scope ...] [focus text]
node "$RUNTIME" task    [--background] [--write] [--resume-last|--resume|--fresh]
                        [--model <model|spark>] [--effort <none|minimal|low|medium|high|xhigh>] [prompt]
node "$RUNTIME" transfer [--source <claude-jsonl>] [--json]
node "$RUNTIME" status  [job-id] [--all] [--json]
node "$RUNTIME" result  [job-id] [--json]
node "$RUNTIME" cancel  [job-id] [--json]
```

### task

- **Sandbox**: `read-only` unless `--write` (→ `workspace-write`). Approval policy is hardcoded `never`. There is **no bypass/full-access mode** — tasks needing network or out-of-repo writes go to the raw CLI.
- **Model**: Resolve the requested selector once per new task. Reuse the full ID for CLI fallback. Keep Fast in the Codex service tier configuration. Resume with the original model unless the user explicitly requests a switch.
- **Effort**: unset → medium. House default: pass `--effort high`. Verified gotcha: `--effort minimal` gets rejected by the API (400: incompatible with the image_gen/web_search tools the app-server enables) — the floor in practice is `low`.
- **Prompt**: positional arg, or piped stdin, or a prompt file.
- **`--resume-last`**: resumes the most recent *tracked* task thread for this workspace root (threads are persisted and named automatically on first run). Prompt optional — omitting it sends a default "continue" instruction.
- **`--background`**: spawns a detached worker, prints a job id immediately. Job then lives in the ledger (`status` / `result` / `cancel`).

### review / adversarial-review

- Both are **read-only by construction** and require a git repository.
- Target selection: `--scope auto` (default) picks working-tree if dirty, else branch vs default base; `--base <ref>` forces a branch diff. Untracked files count as reviewable.
- `review` = Codex's **native reviewer** (same engine as `codex review`), no custom prompt or focus text accepted.
- `adversarial-review` = plugin-built prompt that challenges design choices, tradeoffs, and assumptions (not just defects), output constrained by a JSON schema (`schemas/review-output.schema.json`), and **accepts focus text** after the flags.
- `--wait` runs in-process (foreground); `--background` puts it in the job ledger. When calling from Claude Code, foreground + Bash `run_in_background: true` works equally well.

### transfer

Converts the **current Claude Code session transcript** (auto-located, or `--source <jsonl>`) into a persisted Codex thread and prints `codex resume <session-id>` — the user can pick up your whole conversation inside Codex. Unique to the runtime; no CLI equivalent.

### status / result / cancel — the job ledger

- Every run (foreground included) is recorded as a job: id, kind (task/review), status, phase, elapsed, summary. `status` lists the current session's jobs (`--all` for every session), `status <id> --wait --timeout-ms <ms>` blocks until done, `result <id>` prints the stored final output, `cancel <id>` kills an active background job. Ledger keeps the last 50 jobs per workspace.
- **State location**: `$CLAUDE_PLUGIN_DATA/state/<slug>-<hash>` when that env var is set (plugin-command context), else fallback `$TMPDIR/codex-companion/<slug>-<hash>`. Calling the runtime directly from Bash uses the fallback — consistent as long as *all* your calls are direct (they are, per the main skill). Keyed by workspace root, so run `status`/`result` from the same directory as the original `task`.
- **Paths interoperate**: every job's output includes its Codex session ID and a ready-made `codex resume <id>` line — a runtime-started thread can be continued with the raw CLI (`codex exec resume <id> "<followup>"`) and vice-versa-adjacent workflows are safe to mix.

### setup

`setup --json` reports install/auth health (offers guidance, doesn't fix). If Codex is missing: `npm install -g @openai/codex`; if unauthenticated: `codex login`. `--enable-review-gate` / `--disable-review-gate` toggles the **stop-time review gate**: a plugin Stop hook that auto-runs a Codex review of uncommitted changes every time Claude finishes a turn. Off by default; leave it off — it adds latency to every stop and duplicates on-demand `review`.

## Plugin surface deliberately bypassed

The plugin also registers user-facing wrappers around this same runtime. The main skill routes around them on purpose:

- **`/codex:*` slash commands** (rescue, review, adversarial-review, status, result, cancel, setup, transfer) — add AskUserQuestion ceremony, "return output verbatim" rules, and a review-then-never-fix constraint. Fine for manual use by the user; wrong layer for an orchestrating agent.
- **`codex:codex-rescue` subagent** — a deliberately dumb forwarder (one `task` call, no repo inspection, no follow-up allowed). Calling the runtime directly is strictly more capable.
- **Internal skills** `codex:codex-cli-runtime`, `codex:codex-result-handling` — the forwarder's contract; superseded by the main skill.
- **Worth keeping**: `gpt-5-4-prompting` — XML prompt-contract guidance with reusable blocks and recipes in `<plugin>/skills/gpt-5-4-prompting/references/` (prompt-blocks.md, codex-prompt-recipes.md, codex-prompt-antipatterns.md). Read when composing high-stakes Codex prompts.
- **Hooks**: the plugin registers SessionStart/SessionEnd lifecycle hooks (broker cleanup) and the Stop review gate (inert unless enabled). Harmless; no action needed.

## Runtime vs raw CLI — decision summary

| Dimension | Runtime | Raw CLI |
|---|---|---|
| Sandbox ceiling | workspace-write | full bypass available |
| Multi-turn | `--resume-last`, auto-tracked per repo | `exec resume --last` / session id |
| Background | built-in job ledger (`status`/`result`/`cancel`) | Bash `run_in_background` + `-o` file |
| Git review | native + adversarial, schema-constrained | `codex review` (native only) |
| Session handoff | `transfer` | — |
| Availability | only where the plugin is installed | anywhere `codex` is installed |
