---
name: multi-source-sync
description: "Internal harness-management subskill for syncing the Claude, Cursor and Codex harnesses, repository snapshots and GitHub. Read via the parent router for three-source sync, sync skills, deploy harness, agent-config sync/deploy/pull, or propagating GitHub updates to all three tools. Works from any directory."
---

# Multi-source harness sync with agent-config and GitHub

Use `ai-coding-config`'s `./agent-config` entry point from any working directory. The single repository configuration tree is `$REPO/config/`. A full sync includes GitHub by default: commit and push repository changes, and pull first when updating from the remote.

## Resolve the repository path

Never hardcode a machine-specific absolute path. Resolve `REPO` in this order, stopping at the first match:

1. The `AI_CODING_CONFIG` environment variable pointing at the repository root with the `agent-config` entry point.
2. The local path in the hub's `agent-harness-config` locator card. Search the hub or read the card.
3. The repository next to `global-memory`: `realpath(<hub runtime symlink>)/../ai-coding-config`. The hub link commonly targets `…/global-memory/hub`.
4. Walk up from the current directory until reaching a directory containing both `agent-config` and `config/skills/`.

Run the CLI without `cd $REPO`:

```bash
"$REPO/agent-config" <command> [options]
```

Verify with `test -x "$REPO/agent-config" && test -d "$REPO/config/skills"`. If the repository cannot be found, stop, report the resolution steps and ask for its root or for `AI_CODING_CONFIG` to be set.

| Live tool | Home |
|---|---|
| Claude Code | `~/.claude` |
| Cursor | `~/.cursor` |
| Codex | `~/.codex` |

Claude (`~/.claude`) is the default canonical live source. Keep the repository snapshot in `$REPO/config/`. The GitHub remote is `yuanyunchen/ai-coding-config`.

## Repository configuration tree

- Browse, edit and snapshot the single `config/` tree in git. Keep no parallel `config-links` or other copy directory.
- Edit `config/` directly. A symlink for the tree itself would not be portable across devices.
- Sync and deploy intentionally use rsync to materialize files in each tool's home. Do not replace `~/.claude/skills/X` with a symlink to the repository's `config/skills/X` to save a copy. The scripts already skip a destination that points to the source.

## Command reference

Run these from any working directory.

| Intent | Command |
|---|---|
| Preview an incremental three-source sync | `"$REPO/agent-config" sync --dry-run` |
| Claude → Cursor and Codex | `"$REPO/agent-config" sync --source claude` |
| Select source and destination | `"$REPO/agent-config" sync --source cursor --target codex` |
| Mirror, deleting destination-only entries | `"$REPO/agent-config" sync --source claude --mirror` |
| Repository → Claude, followed by sync by default | `"$REPO/agent-config" deploy` |
| Deploy only, skipping cross-tool sync | `"$REPO/agent-config" deploy --no-sync` |
| Live files → repository snapshot | `"$REPO/agent-config" pull` |
| Plugin enablement and portable packages | `"$REPO/agent-config" plugins …` |
| Global-memory git sync | `"$REPO/agent-config" memory …` |

Use each command's `-h` for all parameters. Incremental sync is the default and does not delete destination-only files. Only `--mirror` prunes them. Before overwrites, the default backup location is `.claude-sync-backup-<timestamp>/` under the destination root.

## Platform-specific entry points

Follow “Platform-specific entry points” in `../../SKILL.md`. `scripts/sync.sh` excludes `qa-loop` from both shared-skill copying and mirror pruning. `scripts/pull.sh` excludes the adapter from shared `config/skills/` and `config/skills-disabled/`. Preserve each tool's existing command files. Never copy the Codex adapter to Claude or Cursor, or delete Codex's own entry point because the sync source lacks it.

## Full sync (the default, including GitHub)

A request to sync three sources, “sync skills”, or propagate to three tools invokes the whole procedure below unless the user requests `--dry-run` or “local only”. Every applicable step is required for completion.

1. **Sync all three live homes.** Run `"$REPO/agent-config" sync --source <canonical>`, defaulting to `claude`. Honor the user's source, destination and `--mirror` selection.
2. **Update the repository.** For changes originating in a live installation, run `"$REPO/agent-config" pull`. For changes already in `$REPO/config/`, skip pull and ensure the live copies were deployed/synced.
3. **Update GitHub.** In `$REPO`, inspect `git status` and `git diff`. Add changed files according to the user's git rules, exclude secrets, commit using a HEREDOC and run `git push`. If clean and ahead, push only. If behind, run `git pull --rebase` first or report conflicts, then push. Under the explicit user ruling of 2026-07-12, invoking this subskill for a three-source sync or “sync” authorizes commit and push for this pipeline alone. The normal rule against unrequested commits still applies elsewhere. Skip this step only for `--dry-run` or an explicit “do not push to GitHub” or “local only”.
4. **Verify.** Target files must exist in all three homes with tool-root paths rewritten. Confirm with `git status` that local and remote align, or state why the changes were not pushed.

When global memory also changed, apply the same git sync separately to `global-memory`, or use `"$REPO/agent-config" memory push`.

## Scenario routing

| Scenario | Procedure |
|---|---|
| Three-source sync | Run the complete full-sync procedure above, including GitHub. |
| Preview only | Use `sync --dry-run`. Do not write live files, commit or push. |
| Restore a repository snapshot or set up a new machine | Run `git pull`, then `deploy`. Push any remaining local unpushed commits. On failure, check the personalization scripts' Python version. Codex TOML requires Python 3.11+ with `tomllib`. |
| Update from GitHub and distribute to all three homes | Follow the multi-source protocol below. |

## Multi-source protocol for GitHub, repository and three live homes

When the user requests updates from GitHub for harness, skills or rules followed by sync to the tools, proceed in order:

1. **Fetch the repository.** In `$REPO`, use `git fetch` / `pull` before overwriting any live files.
2. **Inspect conflicts.** Compare GitHub, local uncommitted repository changes, and the three live homes (`~/.claude`, `~/.codex`, `~/.cursor`). Identify local paths, tool differences and uncommitted user work that must survive.
3. **Report.** Describe conflicts and the proposed resolution. If the user has authorized autonomous conflict resolution, proceed while preserving still-valid harness updates.
4. **Merge.** Merge/localize in the repository, then `deploy`. Alternatively write to the live Claude home first and then `sync`.
5. **GitHub.** For local commits or merged results, commit if needed and **push**. Separately push `global-memory` if it also changed.
6. **Verify all three sources.** Check target files in all three homes, rewritten tool-root paths in their contents, and alignment between the remote and local repository.

## Boundaries

- This is the execution layer for the CLI and synchronization protocols. Before changing a skill or rule, follow harness `modules/update.md` for classification, placement, conflict checks and approval. Invoke this subskill for three-source and GitHub propagation as needed.
- `agent-config sync` and `plugins sync` have distinct scopes. The latter manages plugin enablement and portable packages.
- Do not sync hook-based Claude plugin commands to Cursor or Codex. Codex has no subagents in the sync layout. Incremental mode skips some skills for Codex. See `scripts/sync.sh`.
- `$REPO/CLAUDE.md` is authoritative for detailed repository conventions. This file contains the executable summary.
