# config/plugins

Git snapshot of the raw plugin packages for Claude Code, Cursor and Codex. Enable state is controlled by `manifest.json`; the [installed plugins](#installed-plugins) table below is regenerated automatically by `pull`, `sync` and `apply`.

```
config/plugins/
  manifest.json     per-platform enable state + hookPlugins + syncPlugins
  README.md         this file (includes the generated table)
  claude/ cursor/ codex/
    enabled/        raw packages with enabled: true in the manifest
    disabled/       raw packages with enabled: false in the manifest
  skills/
    enabled/        enabled skills
    disabled/       disabled skills
```

## Naming

Each package lives at `{platform}/{enabled|disabled}/{name}__{marketplace}/` and contains a `plugin-meta.json`.

`manifest.json` is the source of truth for enable state. `pull` and `sync` place each package in the matching subdirectory and move it when its state changes.

## Commands

```bash
./agent-config plugins status              # terminal summary
./agent-config plugins pull                # pull raw packages and refresh the table below
./agent-config plugins sync [--force]      # claude portable -> cursor/codex, then deploy
./agent-config plugins sync --no-deploy    # update snapshots and manifest only
./agent-config plugins vendor [--force]    # claude portable -> config/
./agent-config plugins deploy
./agent-config plugins install             # Claude Code marketplace
```

## Hook vs. portable plugins

| | hook | portable |
|--|------|----------|
| Cross-platform | No — installed separately on each platform | `plugins sync` (claude -> cursor/codex) |
| Claude Code | `plugins install` | marketplace + vendor |
| Cursor | Installed in the IDE (e.g. continual-learning) | sync or `plugins deploy --platform cursor` |
| Examples | ralph-loop, continual-learning | code-review, parallel |

## New machine

```bash
git clone https://github.com/yuanyunchen/ai-coding-config.git && cd ai-coding-config
./agent-config plugins install          # Claude Code marketplace
./agent-config plugins sync --force     # portable -> cursor/codex
./agent-config deploy                   # config + plugins deploy
```

To deploy Claude Code only, without syncing to other tools: `./agent-config deploy --no-sync`

Routine pull and commit:

```bash
./agent-config plugins pull
./agent-config plugins sync --force
git add -A && git commit && git push
```

### Native Cursor plugins

Entries under `cursor.enabledPlugins` in `manifest.json` that come from `@cursor-public` must first be enabled in the **Cursor IDE**, then pulled with `plugins pull --platform cursor`:

- `parallel@cursor-public`
- `browse@cursor-public`
- `continual-learning@cursor-public` (hook)
- `superpowers@cursor-public` (hook; on Cursor the marketplace is cursor-public, a different ID from Claude Code's superpowers-marketplace)

## Installed plugins

<!-- installed:start -->
_Updated: 2026-11-19 05:09 UTC_

## claude

**Enabled in manifest**: 6 · **Git snapshots**: 12

| pluginId | kind | version | snapshot |
|----------|------|---------|----------|
| `cc-plugin-you-should-know@builtin` | — | — | *(no snapshot; run `plugins pull --platform claude`)* |
| `claude-md-management@claude-plugins-official` | portable (off) | 1.0.0 | `claude/disabled/claude-md-management__claude-plugins-official/` |
| `code-review@claude-plugins-official` | portable (off) | 1.0.1 | `claude/disabled/code-review__claude-plugins-official/` |
| `code-simplifier@claude-plugins-official` | portable (off) | 1.0.0 | `claude/disabled/code-simplifier__claude-plugins-official/` |
| `codex@openai-codex` | hook (off) | 1.0.5 | `claude/disabled/codex__openai-codex/` |
| `feature-dev@claude-plugins-official` | portable (off) | 1.0.1 | `claude/disabled/feature-dev__claude-plugins-official/` |
| `hookify@claude-plugins-official` | hook | 0.1.1 | `claude/enabled/hookify__claude-plugins-official/` |
| `learning-output-style@claude-plugins-official` | hook | 1.0.1 | `claude/enabled/learning-output-style__claude-plugins-official/` |
| `ralph-loop@claude-plugins-official` | hook | 1.0.1 | `claude/enabled/ralph-loop__claude-plugins-official/` |
| `session-report@claude-plugins-official` | portable (off) | b5b01ac4f889 | `claude/disabled/session-report__claude-plugins-official/` |
| `skill-creator@claude-plugins-official` | portable (off) | b5b01ac4f889 | `claude/disabled/skill-creator__claude-plugins-official/` |
| `superpowers@claude-plugins-official` | hook | 7.0.2 | `claude/enabled/superpowers__claude-plugins-official/` |
| `superpowers@superpowers-marketplace` | hook | 5.1.0 | `claude/enabled/superpowers__superpowers-marketplace/` |

## cursor

**Enabled in manifest**: 3 · **Git snapshots**: 10

| pluginId | kind | version | snapshot |
|----------|------|---------|----------|
| `browse@cursor-public` | portable | 2.0.0 | `cursor/enabled/browse__cursor-public/` |
| `claude-md-management@claude-plugins-official` | portable (off) | 1.0.0 | `cursor/disabled/claude-md-management__claude-plugins-official/` |
| `code-review@claude-plugins-official` | portable (off) | unknown | `cursor/disabled/code-review__claude-plugins-official/` |
| `code-simplifier@claude-plugins-official` | portable (off) | 1.0.0 | `cursor/disabled/code-simplifier__claude-plugins-official/` |
| `continual-learning@cursor-public` | hook | 1.0.0 | `cursor/enabled/continual-learning__cursor-public/` |
| `feature-dev@claude-plugins-official` | portable (off) | unknown | `cursor/disabled/feature-dev__claude-plugins-official/` |
| `parallel@cursor-public` | portable (off) | 0.2.1 | `cursor/disabled/parallel__cursor-public/` |
| `session-report@claude-plugins-official` | portable (off) | unknown | `cursor/disabled/session-report__claude-plugins-official/` |
| `skill-creator@claude-plugins-official` | portable (off) | unknown | `cursor/disabled/skill-creator__claude-plugins-official/` |
| `superpowers@cursor-public` | hook | 6.1.1 | `cursor/enabled/superpowers__cursor-public/` |

<details><summary>Disabled in manifest (no snapshot directory)</summary>

- `codex@openai-codex`
- `hookify@claude-plugins-official`
- `learning-output-style@claude-plugins-official`
- `ralph-loop@claude-plugins-official`
- `superpowers@superpowers-marketplace`

</details>

## codex

**Enabled in manifest**: 1 · **Git snapshots**: 8

| pluginId | kind | version | snapshot |
|----------|------|---------|----------|
| `claude-md-management@claude-plugins-official` | portable (off) | 1.0.0 | `codex/disabled/claude-md-management__claude-plugins-official/` |
| `code-review@claude-plugins-official` | portable (off) | local | `codex/disabled/code-review__claude-plugins-official/` |
| `code-simplifier@claude-plugins-official` | portable (off) | 1.0.0 | `codex/disabled/code-simplifier__claude-plugins-official/` |
| `feature-dev@claude-plugins-official` | portable (off) | unknown | `codex/disabled/feature-dev__claude-plugins-official/` |
| `ralph-loop@claude-plugins-official` | hook (off) | 1.0.0 | `codex/disabled/ralph-loop__claude-plugins-official/` |
| `session-report@claude-plugins-official` | portable (off) | unknown | `codex/disabled/session-report__claude-plugins-official/` |
| `skill-creator@claude-plugins-official` | portable (off) | local | `codex/disabled/skill-creator__claude-plugins-official/` |
| `superpowers@openai-curated` | hook | 6.3.0 | `codex/enabled/superpowers__openai-curated/` |

<details><summary>Disabled in manifest (no snapshot directory)</summary>

- `codex@openai-codex`
- `hookify@claude-plugins-official`
- `learning-output-style@claude-plugins-official`
- `superpowers@superpowers-marketplace`

</details>

<!-- installed:end -->
