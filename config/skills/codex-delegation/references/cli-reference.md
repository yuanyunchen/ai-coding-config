# Codex CLI — authoritative reference

Verified against the local binary `codex-cli 0.133.0` (`codex --help`, `codex exec --help`, etc.) on 2026-07-04, cross-checked with the official docs at developers.openai.com/codex. When this drifts, the local `codex <cmd> --help` and `codex doctor` are the ground truth — re-dump them rather than trusting this file or the web.

## Top-level subcommands

| Subcommand | Purpose |
|---|---|
| `exec` (alias `e`) | Run Codex non-interactively (headless). Main delegation entry. |
| `review` | Headless, read-only code review against the repo. |
| `login` / `logout` | Manage auth (ChatGPT OAuth, API key, or access token). |
| `mcp` | Manage external MCP servers Codex can call: `add`/`get`/`list`/`remove`/`login`/`logout`. |
| `mcp-server` | Run **Codex itself** as an MCP server over stdio, so another agent/tool can call Codex as a tool. |
| `plugin` | Manage Codex plugins + marketplaces (this install has documents/spreadsheets/presentations/pdf/computer-use plugins). |
| `app` / `app-server` / `remote-control` | Desktop app + experimental app-server/remote daemon. |
| `completion` | Generate shell completion scripts. |
| `update` | Self-update the CLI to latest. |
| `doctor` | Diagnose install/config/auth/runtime health. Run this first when something is off. |
| `sandbox` | Run an arbitrary shell command under Codex's sandbox: `macos` (Seatbelt), `linux` (Landlock/bubblewrap), `windows` (restricted token). |
| `debug` | Debugging tools. |
| `apply` (alias `a`) | `git apply` the latest diff from a Codex agent/cloud task to the local tree. |
| `resume` / `fork` | Interactive session picker / fork (TUI only; `--last` for newest). |
| `cloud` | [experimental] Codex Cloud tasks: `exec`/`status`/`list`/`apply`/`diff`. |
| `features` | Inspect/toggle feature flags stored in config.toml. |

## `codex exec` flags (the ones that matter headless)

| Flag | Meaning |
|---|---|
| `[PROMPT]` / `-` | Prompt as arg. `-` (or no arg) reads prompt from stdin. If a prompt arg AND piped stdin both exist, stdin is appended as a `<stdin>` context block. |
| `-m, --model <name>` | Override model. Don't hardcode — see "Models" below. |
| `-s, --sandbox <mode>` | `read-only` (default) · `workspace-write` · `danger-full-access`. |
| `-a, --ask-for-approval <policy>` | `untrusted` (only trusted cmds auto-run) · `on-request` (model decides) · `never` (never ask; failures return to model) · `on-failure` (DEPRECATED). For headless use `never`. |
| `--dangerously-bypass-approvals-and-sandbox` | The real "yolo": no approvals, no sandbox. Only inside an externally sandboxed env/VM. |
| `--skip-git-repo-check` | Allow running outside a git repo (otherwise refuses). |
| `-C, --cd <dir>` | Set working root. |
| `--add-dir <dir>` | Extra writable dirs alongside the workspace. Prefer this over `danger-full-access`. |
| `--search` | Enable native live web search (`web_search` tool, no per-call approval). |
| `--json` | Emit JSONL event stream on stdout (`thread.started`, `item.completed`, `turn.completed`, `error`, ...). |
| `-o, --output-last-message <file>` | Write final message to file (also still prints to stdout). |
| `--output-schema <file>` | Constrain the final response to a JSON Schema. Pair with `-o` for machine-readable results. |
| `--ephemeral` | Don't persist session rollout to disk. Use in CI. Note: breaks `resume --last`. |
| `--ignore-user-config` | Skip `$CODEX_HOME/config.toml` (keeps CI hermetic; auth still from CODEX_HOME). |
| `--ignore-rules` | Skip user/project execpolicy `.rules` files. |
| `-p, --profile <name>` | Load a `[profiles.<name>]` block from config.toml. |
| `--profile-v2 <name>` | Layer `$CODEX_HOME/<name>.config.toml` on top of base config. |
| `-i, --image <file>...` | Attach image(s) to the prompt. |
| `--oss` / `--local-provider <lmstudio\|ollama>` | Run against a local OSS model instead of the hosted one. |
| `--color <always\|never\|auto>` | Output color. |
| `--strict-config` | Error on unrecognized config keys (catches typos/version drift). |

`--full-auto` and `--yolo`: **deprecated**. `--full-auto` still runs but now prints a warning; it historically meant `workspace-write` + auto-approve. Modern canonical for autonomous edits: `-s workspace-write` (add `-a never` for fully unattended). For no-sandbox automation use `--dangerously-bypass-approvals-and-sandbox` in an isolated env.

## `codex exec resume`

`codex exec resume [SESSION_ID] [PROMPT]` — resume a persisted session.
- `--last` — newest recorded session (no id needed).
- `SESSION_ID` — a UUID **or** a thread name (UUID wins if it parses).
- `--all` — don't filter by cwd when picking.
- Same model/sandbox/output flags as `exec`. Only works if the session was persisted (not `--ephemeral`).

## `codex review`

Headless, read-only reviewer, separate from `exec`. `codex review [PROMPT]` (`-` reads prompt from stdin).
- `--uncommitted` — review staged + unstaged + untracked changes.
- `--base <branch>` — review current branch vs base (e.g. `--base main`).
- `--commit <sha>` — review one commit.
- `--title <title>` — label shown in the review summary.

## TUI-only slash commands

Codex's interactive slash commands (`/model`, `/diff`, `/undo`, `/review`, `/approvals`) exist only in the TUI — no headless equivalent. Headless: switch model with `-m`, view diffs with `git diff`, control approvals/sandbox with `-a` and `-s`.

## Auth

`codex login` stores credentials in `~/.codex/auth.json` (ChatGPT subscription or API key). Don't pass `OPENAI_API_KEY` unless overriding intentionally. In CI, prefer `CODEX_API_KEY` scoped to the single command (not a job-level env var) — see community-patterns.md.

## Models (do NOT hardcode)

The model lineup drifts fast and differs by auth tier; the current best on your tier is chosen automatically when you omit `-m`. As of this capture the local config default is `gpt-5.5`, and config.toml records migrations `gpt-5-codex → gpt-5.3-codex → gpt-5.4`. Public docs and community posts disagree on which models are ChatGPT-only vs API-key-only (they change month to month) — so **let it default**, and only pass `-m` when you have a specific speed/cost tradeoff. To see what's actually available, check `codex --help` / the model picker / `codex doctor`. Reasoning effort is a separate axis: `--config model_reasoning_effort="minimal|low|medium|high|xhigh"` (default medium).

## Config precedence (config.toml)

CLI `-c key=value` overrides > `--profile` block > base `~/.codex/config.toml`. Relevant keys seen in practice: `model`, `model_reasoning_effort`, `approval_policy`, `sandbox_mode`, `model_reasoning_summary` (`"none"` to drop explanations in CI), `project_doc_max_bytes` (AGENTS.md byte cap, default ~32 KiB — oversized files silently truncate). `[profiles.<name>]` blocks let you snapshot approval+sandbox combos, e.g. a `ci` profile (`never` + `workspace-write`) vs a `paranoid` profile (`untrusted` + `read-only`).

## Sources
- Official: developers.openai.com/codex/cli/reference, /codex/noninteractive, /codex/config-reference, /codex/cli/features
- Local binary: `codex-cli 0.133.0` help output (see also `local_help.txt` snapshot in scratchpad research).
