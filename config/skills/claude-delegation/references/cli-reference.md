# `claude` CLI — authoritative reference

Verified against the local binary `claude 2.1.201 (Claude Code)` via `claude --help` on 2026-07-06. When this drifts, `claude <cmd> --help` and `claude doctor` are ground truth — re-dump them rather than trusting this file.

## Invocation

`claude [options] [command] [prompt]` — interactive by default; `-p`/`--print` makes it headless (the delegation mode). A bare positional string is the prompt. Put the prompt **first** (`claude -p "<prompt>" --flags…`): the variadic flags below (`--tools`, `--allowedTools`, `--disallowedTools`, `--add-dir`) otherwise consume it as one of their values.

## `-p` / headless flags that matter for delegation

| Flag | Meaning |
|---|---|
| `-p, --print` | Non-interactive: run the loop, print result, exit. The delegation entry point. |
| `--output-format <fmt>` | `text` (default) · `json` (a JSON **array** of the run's messages; result is the final `type:"result"` element) · `stream-json` (JSONL event stream). Print-only. |
| `--input-format <fmt>` | `text` (default) · `stream-json` (realtime streaming input). Print-only. |
| `--model <alias\|id>` | `opus`/`sonnet`/`haiku`/`fable` alias, or full id (e.g. `claude-fable-5`). Pass `default` when unspecified. |
| `--effort <lvl>` | `low` · `medium` · `high` · `xhigh` · `max`. |
| `--permission-mode <mode>` | `acceptEdits` · `auto` · `bypassPermissions` · `manual` · `dontAsk` · `plan`. |
| `--dangerously-skip-permissions` | Bypass all permission checks. Sandboxes/trusted repos only. |
| `--allow-dangerously-skip-permissions` | Make bypass mode *available* without defaulting to it. |
| `--tools <list...>` | Allowlist from the built-in set. `""` disables all, `default` = all, else e.g. `Bash,Edit,Read`. |
| `--allowedTools`, `--allowed-tools <list...>` | Allow specific tools/patterns (`"Bash(git *)" Edit`). |
| `--disallowedTools`, `--disallowed-tools <list...>` | Deny specific tools/patterns. |
| `--add-dir <dirs...>` | Extra directories tool access is allowed in. |
| `--session-id <uuid>` | Use a specific (valid UUID) session id — pin it to resume deterministically. |
| `-r, --resume [id]` | Resume by session id (or interactive picker). |
| `-c, --continue` | Continue the most recent conversation in the cwd. |
| `--fork-session` | On resume/continue, mint a new session id instead of reusing the original. |
| `--bg, --background` | Start as a background agent, return immediately (manage with `claude agents`). |
| `-w, --worktree [name]` | Create a git worktree for this session (isolated tree). |
| `--tmux` | tmux pane for the worktree (requires `--worktree`). |
| `--json-schema <schema>` | Constrain final output to a JSON Schema. |
| `--max-budget-usd <amt>` | Hard dollar ceiling (print-only). |
| `--fallback-model <m,...>` | Fallback model(s) when primary is overloaded (print-only). |
| `--no-session-persistence` | Don't persist the session (breaks `--resume`; print-only). |
| `--include-partial-messages` | Emit partial chunks (needs `--print` + `--output-format=stream-json`). |
| `--include-hook-events` | Include hook lifecycle events (needs `--output-format=stream-json`). |
| `--agent <name>` | Use a named agent for the session (overrides the `agent` setting). |
| `--agents <json>` | Define custom agents inline as JSON. |
| `--system-prompt <p>` | Replace the default system prompt. |
| `--append-system-prompt <p>` | Append to the default system prompt. |
| `--mcp-config <cfg...>` | Load MCP servers from JSON files/strings. |
| `--strict-mcp-config` | Only use MCP servers from `--mcp-config`. |
| `--settings <file-or-json>` | Load additional settings. |
| `--setting-sources <list>` | Which setting sources to load (`user,project,local`). |
| `--plugin-dir <path>` / `--plugin-url <url>` | Load a plugin for this session only. |
| `--betas <b...>` | Beta headers (API-key users). |

## Isolation / hermetic flags

| Flag | Effect |
|---|---|
| `--bare` | Minimal mode: skip hooks, LSP, plugin sync, attribution, auto-memory, keychain reads, CLAUDE.md auto-discovery. Auth strictly `ANTHROPIC_API_KEY`/`apiKeyHelper`. Sets `CLAUDE_CODE_SIMPLE=1`. |
| `--safe-mode` | Disable all customizations (skills/plugins/hooks/MCP/agents/…) for troubleshooting. Auth/model/tools still work. Sets `CLAUDE_CODE_SAFE_MODE=1`. |
| `--disable-slash-commands` | Disable all skills. |
| `--exclude-dynamic-system-prompt-sections` | Move per-machine sections out of the system prompt (better cross-user prompt-cache reuse). |

## Subcommands

| Command | Purpose |
|---|---|
| `agents [--json] [--all] [--cwd <p>]` | Manage/list background agents. `--json` → scriptable array (`pid`, `cwd`, `kind`, `startedAt`, `sessionId`, `name`); `--all` includes completed. The job-ledger analog. |
| `auth [login\|logout\|status]` | Manage authentication. `status` prints `{loggedIn, authMethod, apiProvider}`. |
| `setup-token` | Mint a long-lived auth token (requires subscription) — best for headless delegation. |
| `doctor` | Health check for install/config/auth. Run first when something's off. |
| `mcp` | Configure/manage MCP servers. |
| `plugin` / `plugins` | Manage plugins and marketplaces. |
| `project` | Manage Claude Code project state. |
| `update` / `upgrade` | Update the CLI. |
| `ultrareview [target]` | Cloud multi-agent review of the current branch / a PR / a base branch. |

## Model aliases

`opus` · `sonnet` · `haiku` · `fable` resolve to the latest of each family; full ids (e.g. `claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5-20251001`, `claude-fable-5`) pin exact versions. Prefer aliases so the lineup can drift; pin only when reproducibility demands it.

## `claude agents` (background management) flags

`--json`, `--all`, `--cwd <path>`, plus dispatch defaults for sessions started from the agent view: `--agent`, `--model`, `--effort`, `--permission-mode`, `--add-dir`, `--mcp-config`, `--settings`, `--plugin-dir`, `--dangerously-skip-permissions`.

## Ground truth

`claude --help` · `claude <cmd> --help` · `claude doctor` · `claude auth status`. Re-dump on any surprise.
