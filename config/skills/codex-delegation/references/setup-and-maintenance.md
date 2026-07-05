# Codex setup & maintenance — install, configure, update

Full lifecycle for the two components this skill depends on: the **Codex CLI** (required everywhere) and the **codex-companion plugin** (optional, preferred where present). Read when bootstrapping a new machine, or when updating either component.

## 1. Codex CLI (prerequisite, required)

```bash
npm install -g @openai/codex   # install / upgrade (or: codex update)
codex login                    # ChatGPT subscription or API key → ~/.codex/auth.json
codex doctor                   # verify install/config/auth health
```

House config lives in `~/.codex/config.toml` — relevant keys: `model` (keep at the best available; currently `gpt-5.5`), `model_reasoning_effort` (config default is fine — the skill passes effort per call), `approval_policy` / `sandbox_mode` (this machine: `never` + `danger-full-access`, matching the bypass house default). After install or upgrade, run the official docs sync (§4.1) — the CLI docs pages are the sources behind `cli-reference.md`, and the local `--help` is ground truth over both.

## 2. Plugin install (where to download)

Source: **GitHub `openai/codex-plugin-cc`** (official OpenAI marketplace repo, marketplace name `openai-codex`, plugin name `codex`).

```
claude plugin marketplace add openai/codex-plugin-cc   # register marketplace (once)
# then install plugin "codex" via the /plugin UI, or:
claude plugin install codex@openai-codex
```

Result on disk:
- Marketplace clone: `~/.claude/plugins/marketplaces/openai-codex/`
- Plugin cache (what the skill actually calls): `~/.claude/plugins/cache/openai-codex/codex/<version>/`
- Registration key: `"codex@openai-codex"` in `~/.claude/settings.json` → `enabledPlugins`

After a fresh install, run the official docs sync (§4.1) and the drift checklist (§5) once — the skill's references were verified against a specific version and a new machine may have pulled a newer one.

## 3. Configure (house policy)

**Registration OFF, runtime kept**: set `"codex@openai-codex": false` in `enabledPlugins`, restart. This unregisters the plugin's slash commands, skills, agent, and hooks (no user exposure, no per-turn context cost) while the cache stays on disk — this skill calls `codex-companion.mjs` directly via node.

- Verify: `jq '.enabledPlugins."codex@openai-codex"' ~/.claude/settings.json`
- Known costs (details in `companion-runtime.md`): no session-id env → `status` lists all workspace jobs; no SessionEnd broker cleanup; **no auto-update** — hence the procedure below.

## 4. Update procedure

1. Temporarily set the settings key to `true`, restart Claude Code — marketplace auto-update pulls the new version on startup (or update via the /plugin UI).
2. Confirm the new version dir exists and the glob picks it:
   `ls ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1`
3. **Pull the latest official docs and resolve conflicts** (see §4.1).
4. Run the drift checklist below; fix docs where reality moved.
5. Set the key back to `false`, restart. Re-verify `/codex:*` commands are gone.

### 4.1 Official docs sync (run on BOTH setup and update)

Fetch the current official documentation and diff it against this skill's references:

- **CLI docs**: developers.openai.com/codex — `/codex/cli/reference`, `/codex/noninteractive`, `/codex/config-reference` (the sources behind `cli-reference.md`). Fetch with WebFetch or `parallel-web-search`.
- **Plugin docs**: the GitHub repo `openai/codex-plugin-cc` — README + CHANGELOG.md (the local marketplace clone at `~/.claude/plugins/marketplaces/openai-codex/` updates with the plugin; read CHANGELOG first, it lists what moved).

Conflict resolution, in order:

1. Docs vs docs conflict (official page vs our reference) → verify against the **local binary/code** (`codex <cmd> --help`, plugin source); reality wins, update our reference, note the official docs were stale if so.
2. Our reference is simply behind → overwrite with the new fact (never keep both versions of a claim side by side).
3. Official behavior CHANGED (not just docs) in a way that breaks a house rule (e.g. a flag we rely on is deprecated) → fix all affected files in the same pass: SKILL.md + the specific reference + this file's version stamps. Grep the old flag/term across the skill dir to catch every mention.

## 5. Drift checklist (what to check, what to change)

Everything this skill asserts about the runtime was verified against **v1.0.5 code**, not just docs. After each update, re-verify the load-bearing claims:

| Check | How | Doc to fix if drifted |
|---|---|---|
| Command surface / new flags | `node "$RUNTIME" help`; diff against the Command surface section | `companion-runtime.md` |
| Smoke test end-to-end | `task --effort low "Reply exactly: SMOKE-OK"` then `status`, `result <id>` | — |
| `task` sandbox mapping | grep `executeTaskRun` in codex-companion.mjs: `--write` → `workspace-write`, else `read-only`; approval `never` | `companion-runtime.md`, SKILL.md task row |
| review `--background` still a no-op? | grep `handleReviewCommand` — still `runForegroundCommand` only? | `companion-runtime.md`, `git-review.md` |
| Git requirement scope | grep `ensureGitRepository` — still only in `executeReviewRun`? | `git-review.md` dependency table |
| `--resume-last` selection logic | `findLatestResumableTaskJob` — still workspace-global latest? | SKILL.md resume row, `companion-runtime.md` |
| State dir resolution | `lib/state.mjs` — still `$CLAUDE_PLUGIN_DATA/state` else tmpdir? | `companion-runtime.md` ledger section |
| Effort floor | does `--effort minimal` still 400? | `companion-runtime.md` |
| New hooks | diff `hooks/hooks.json` — **any new hook must be shown to the user** before accepting | this file + user approval |
| New commands/skills/agents | `ls commands/ skills/ agents/` — anything new worth adopting into this skill or explicitly bypassing? | SKILL.md route table |
| Prompting templates moved? | `skills/gpt-5-4-prompting/references/` still exists at that path? | SKILL.md references row |
| Version stamps | update "verified against vX.Y.Z" lines | `companion-runtime.md` header, this file |

Ground truth order: plugin source code > `node "$RUNTIME" help` > these docs. When they disagree, read the code and fix the docs — that's how the v1.0.5 findings (fake review `--background`, effort floor, state-dir env dependence) were caught.

## 6. File map inside the plugin cache

| Path | What |
|---|---|
| `scripts/codex-companion.mjs` + `scripts/lib/` | The runtime — everything this skill calls |
| `scripts/*-hook.mjs` | Session lifecycle + stop-review-gate hooks (unregistered while disabled) |
| `commands/*.md` | The 8 `/codex:*` slash commands (ceremony layer, bypassed) |
| `skills/gpt-5-4-prompting/references/` | XML prompt-contract templates — the one asset this skill still reads |
| `skills/codex-cli-runtime`, `skills/codex-result-handling` | Rescue-forwarder contracts (superseded by this skill) |
| `agents/codex-rescue.md` | The thin-forwarder subagent (bypassed) |
| `schemas/review-output.schema.json` | JSON schema constraining adversarial-review output |
