# Codex CLI — community & CI usage patterns

Real-world patterns from official cookbook + community write-ups (2026). Complements `cli-reference.md` (which is the flag/subcommand source of truth). Cited at the bottom.

## Output capture (headless)

Three levels, pick by how much structure you need downstream:

1. **Plain** — final message to stdout, progress to stderr. Safe to pipe:
   ```bash
   codex exec "generate release notes" > notes.md 2> codex.log
   ```
2. **JSONL events** — every state change as one JSON line, parse with `jq`:
   ```bash
   codex exec --json "run tests, summarize failures" | jq -r 'select(.type=="item.completed") | .item'
   ```
3. **Schema-constrained** — force the final answer into stable fields (job summaries, risk reports, release metadata):
   ```bash
   codex exec --output-schema ./audit-schema.json -o ./result.json "audit deps for CVEs"
   ```

## Sandbox / approval combos (the mental grid)

| Use case | `--sandbox` | `--ask-for-approval` |
|---|---|---|
| Review / analysis (no writes) | `read-only` (default) | — |
| Unattended local edits in a repo | `workspace-write` | `never` |
| Interactive dev, let model ask | `workspace-write` | `on-request` |
| Reviewing untrusted code | `read-only` | `untrusted` |

Rule the docs stress: **never pair `-a never` with `-s danger-full-access`** outside a throwaway VM ("LLMs can hallucinate and delete files"). When Codex needs to touch one more directory, reach for `--add-dir <dir>`, not `danger-full-access`.

## CI / automation

- **Auth**: use an **API key**, not ChatGPT browser auth. Scope it to the single command, never a job-level env var in workflows that check out untrusted code:
  ```bash
  CODEX_API_KEY=$KEY codex exec --json --ephemeral "your task"
  ```
- **Official GitHub Action** is the safe path — it installs the CLI, runs a Responses API proxy, and handles key exposure:
  ```yaml
  - uses: openai/codex-action@v1
    with:
      openai-api-key: ${{ secrets.OPENAI_API_KEY }}
      prompt: "fix ESLint errors, preserve logic"
  ```
- **Detect whether Codex actually changed anything** — don't rely on exit code alone:
  ```bash
  git diff --exit-code || echo "has_patch=true" >> "$GITHUB_OUTPUT"
  ```
- **Perf**: `--ephemeral` (skip session persistence), `-c model_reasoning_summary="none"` (drop explanations), `--ignore-user-config` (keep CI hermetic — stop your personal config.toml bleeding in).

## AGENTS.md precedence

Codex reads `AGENTS.md` for project/user instructions, nearest-wins:
1. `~/.codex/AGENTS.override.md` (highest)
2. `~/.codex/AGENTS.md`
3. Project-level `AGENTS.md`, the file closest to the working directory winning.

Subsystem overrides work: drop `services/payments/AGENTS.override.md` to tighten rules in a sensitive dir without touching the rest. Watch `project_doc_max_bytes` (~32 KiB default) — an oversized AGENTS.md silently truncates.

## Profiles for context-switching

Snapshot approval+sandbox combos in `config.toml` and select with `-p`:
```toml
[profiles.ci]
approval_policy = "never"
sandbox_mode = "workspace-write"

[profiles.paranoid]
approval_policy = "untrusted"
sandbox_mode = "read-only"
```
```bash
codex exec -p ci "..."
```

## Codex as a peer tool for another agent

`codex mcp-server` runs Codex over stdio as an MCP server — so Claude Code (or any MCP client) can call Codex as a tool instead of shelling out. Inverse of this skill's usual direction (we normally shell `codex exec`). Use when you want Codex available as a first-class tool inside another agent loop rather than a one-shot subprocess.

## Pitfalls people actually hit

- **stdin hang** (the big one for headless): a `codex exec` with an open, non-terminal stdin blocks on `Reading additional input from stdin...` waiting for EOF. In background/subprocess runs, redirect `< /dev/null`. Only omit when you deliberately pipe a prompt/context via stdin.
- **`--full-auto` deprecation warning** — replace with `-s workspace-write` (see cli-reference).
- **CLI flags beat config beat profiles** — if behavior surprises you, a flag is overriding your profile. `codex doctor` / `--strict-config` help surface layering + typos.
- **API-key tier can lag new models** vs ChatGPT sign-in; keep CI on a stable model rather than chasing the newest.
- **Misconfigured MCP servers hang** — set `timeout_secs` and test endpoints in isolation before wiring them in.

## Sources
- developers.openai.com/codex/noninteractive · /codex/cli/reference · /codex/cli/features
- developers.openai.com/cookbook/examples/codex/autofix-github-actions (official CI cookbook)
- developersdigest.tech/blog/codex-exec-ci-headless-guide
- shipyard.build/blog/codex-cli-cheat-sheet
