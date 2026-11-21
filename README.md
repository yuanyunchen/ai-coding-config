# AI Coding Config

A single, version-controlled source of truth for the agent configuration of **Claude Code, Cursor, Codex and Trae** — global rules, skills, subagents, slash commands, hooks, plugins and personal settings — with one CLI to deploy it to a new machine and keep all four tools in sync.

```bash
git clone https://github.com/yuanyunchen/ai-coding-config.git
cd ai-coding-config
./agent-config deploy
```

## Why

Each AI coding tool keeps its own configuration tree (`~/.claude`, `~/.cursor`, `~/.codex`, `~/.trae`) with slightly different layouts. Maintaining rules and skills by hand across four tools and several machines drifts quickly. This repository solves that with:

- **One snapshot tree** (`config/`) holding real files — no symlinks — so it travels across machines through Git.
- **One canonical runtime** (`~/.claude`) that the other three tools are synced from.
- **One entry point** (`./agent-config`) for deploy, pull, cross-tool sync, plugin management and memory sync, every command supporting `--dry-run`.

## How it works

```
                 deploy                      sync
  config/  ─────────────────▶  ~/.claude  ─────────────────▶  ~/.cursor
 (Git snapshot) ◀─────────────── (canonical)                    ~/.codex
                  pull                                          ~/.trae
```

| Command | Direction | Purpose |
|---|---|---|
| `deploy` | `config/` → `~/.claude` (+ sync) | Restore a machine: rules, skills, agents, commands, hooks, plugins, personal settings |
| `pull` | local tools → `config/` | Capture local changes back into the snapshot |
| `sync` | `~/.claude` → Cursor / Codex / Trae | Incremental, add-only propagation between tools |
| `plugins` | `pull` · `sync` · `vendor` · `deploy` · `install` · `apply` · `status` | Manage raw plugin packages and enable/disable state |
| `memory` | `setup` · `pull` · `push` · `status` | Register and sync the companion `global-memory` repository |
| `migrate` | `~/.cursor` → `~/.claude` | One-time migration from an existing Cursor setup |

Run `./agent-config <command> -h` for full options. Every command except `pull` writes to the tools' home directories — preview with `--dry-run` first.

### Path mapping per tool

| Category | Claude Code / Cursor / Trae | Codex |
|---|---|---|
| Global rules | `AGENTS.md` | `AGENTS.md` |
| Slash commands | `commands/*.md` | `prompts/*.md` |
| Subagents | `agents/*.md` | — (not supported) |
| Skills | `skills/*` (enabled), `skills-disabled/*` (disabled) | same |
| Personal settings | Claude: `settings.json` | `config.toml` |

## What's included

| Path | Contents |
|---|---|
| [`config/AGENTS.md`](config/AGENTS.md) | Global operating rules deployed to every tool (English primary; [Chinese mirror](config/AGENTS-cn.md) kept 1:1) |
| [`config/skills/`](config/skills/) | Enabled skills (flat layout, one directory per skill) |
| `config/skills-disabled/` | Disabled skills, kept as a sibling so tools do not load them |
| [`config/agents/`](config/agents/) | Subagent definitions |
| [`config/commands/`](config/commands/) | Slash commands |
| [`config/hooks/`](config/hooks/) | Self-owned Claude Code hooks, with tests |
| [`config/plugins/`](config/plugins/README.md) | Raw plugin packages per platform and the `manifest.json` that controls enable state |
| `config/claude-personal/`, `config/codex-personal/` | Portable subset of personal settings and status-line layout |
| [`scripts/`](scripts/) | Implementation behind `./agent-config` |
| [`tests/`](tests/) | Tests for settings merging, skill isolation and platform behavior |

### Skills

| Area | Skills |
|---|---|
| Engineering workflow | `coding-partner`, `ponytail`, `webapp-testing`, `claude-delegation`, `codex-delegation` |
| Planning and design | `design-partner`, `grill-me`, `design-principles`, `teach` |
| Agent system management | `harness-management`, `memory-management`, `workspace-management`, `project-management`, `claude-md-improver`, `writing-rules` |
| Content extraction | `file-content-extraction`, `webpage-content-extraction`, `pdf` |
| Output and reporting | `frontend-pipeline`, `explainer`, `write-report` |
| Integrations | `slack-bot`, `feishu-task-management`, `bytedcli` |
| Personal | `ethan-job-apply` |

### Subagents and commands

- **Subagents:** `executor` (hands-on implementation), `verifier` (senior-level code review), `qa-specialist` (output-only quality inspection), `report-writer` (LaTeX reports end to end), `file-extractor` (document and web extraction), `conversation-analyzer` (finds behaviors worth guarding with hooks).
- **Commands:** `/project-init`, `/project-recall`, `/project-update` (orchestrate workspace, memory and harness together), `/qa-loop` (plan → delegate → QA-and-fix until passing), `/code-review`, `/revise-claude-md`.

### Hooks

- `workspace-guard.py` — activates only inside a v4 workspace (nearest `.agents/ws.json`). Injects workspace status on session start, records user prompts verbatim, and requires every subagent dispatch to reference a task file created by `ws dispatch`.
- `discipline-reminders.py` — warn-only `PreToolUse` reminders when an edit touches persistent harness files (rules, skills, scheduled-task prompts) outside the managed update flow.

## Getting started

### 1. Prerequisites

Install each tool you use and **run it at least once** so its home directory exists; `deploy` and `sync` skip tools whose directory is missing.

| Tool | Install |
|---|---|
| Claude Code | `curl -fsSL https://claude.ai/install.sh \| bash`, then `claude` to sign in |
| Codex | `npm install -g @openai/codex` (Node 22+), then `codex` |
| Cursor | Download from [cursor.com](https://cursor.com), sign in, open any folder |
| Trae | Install the IDE from [trae.ai](https://www.trae.ai) and open it once; CLI is `traecli` |
| Status line | `npm i -g ccstatusline` and `brew install jq` |

The full first-time checklist — including Cursor plugin setup and optional dependencies — is in [SETUP.md](SETUP.md).

### 2. Deploy

```bash
./agent-config plugins install     # Claude Code marketplace plugins
./agent-config deploy              # or: deploy --no-sync to touch Claude Code only
```

### 3. Day-to-day

```bash
# After changing configuration in any tool
./agent-config pull
git add -A && git commit -m "sync config" && git push

# On another machine
git pull && ./agent-config deploy
```

If the change was made in Cursor, propagate it first with `./agent-config sync --source cursor`.

## Design decisions

- **Personal settings are deep-merged, never overwritten.** `scripts/settings-personal.py` (Claude) and `scripts/codex-personal.py` (Codex) extract only a declared set of portable keys — default model, reasoning effort, permissions, status line — and merge them back on deploy. Machine-local or secret-bearing keys (`auth`, `mcp_servers`, `enabledPlugins`, third-party hooks) are never touched.
- **Secrets stay out of Git.** Local MCP servers are not synced because their `env`/`headers` commonly carry credentials; re-add them per machine with `claude mcp add`. Account-level connectors follow the signed-in account automatically.
- **Disabling a skill means moving it, not nesting it.** Tools treat every subdirectory of `skills/` as a skill, so a `skills/disabled/` folder would itself be loaded as a skill. Disabled skills live in the sibling `skills-disabled/`.
- **Hook plugins are per platform; portable plugins are synced.** Plugins that register hooks are installed separately on each tool. Prompt-only plugins are vendored from Claude Code and synced to Cursor and Codex. See [config/plugins/README.md](config/plugins/README.md).
- **Sync is add-only.** `sync` never deletes files in a target tool, so a partial run cannot remove working configuration.

## Development

```bash
bash -n scripts/*.sh                              # syntax check
python3 -m pytest tests config/hooks/tests        # test suite (Python 3.11+)
./agent-config deploy --dry-run                   # verify paths before a real deploy
```

`SETUP.md` and the plugin README are currently written in Chinese.

## Related

- **global-memory** — companion repository for long-term agent memory, cloned next to this one and managed with `./agent-config memory`.
