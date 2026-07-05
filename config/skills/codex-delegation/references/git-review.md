# Git-dependent features — review & diff workflows

Read this when the working directory is a git repository and the task is reviewing changes (or applying cloud diffs) — plus the fallback recipe for reviews outside git.

## What requires git, what doesn't

| Feature | Git required? |
|---|---|
| Runtime `review` / `adversarial-review` | Hard requirement — review scope comes from git diff, no way around it |
| Runtime `task` / `status` / `result` / `cancel` / `transfer` | No — workspace root falls back to cwd outside git |
| CLI `codex exec` / `exec resume` | Refuses outside git by default; `--skip-git-repo-check` lifts it |
| CLI `codex review` / `codex apply` | Hard requirement (reviews diffs / runs `git apply`) |

## Runtime review (preferred in a git repo)

```bash
node "$RUNTIME" review --wait [--base <ref>] [--scope auto|working-tree|branch]
node "$RUNTIME" adversarial-review --wait [--base <ref>] [focus text]
```

- `review` = Codex's native reviewer: defect pass, severity-ordered findings. Auto-scope: dirty working tree (untracked files count) else branch vs base. No focus text accepted.
- `adversarial-review` = challenge review: questions design choices, tradeoffs, assumptions — not just defects. Accepts focus text after the flags; output is JSON-schema-constrained.
- Both are read-only by construction.
- `--background` is a **no-op for reviews** (verified v1.0.5: flag parsed, run stays foreground). To detach, run the `--wait` form under Bash `run_in_background: true` — it lands in the job ledger either way.

## CLI review

```bash
codex review --uncommitted            # staged + unstaged + untracked
codex review --base main              # current branch vs base
codex review --commit <sha>           # one commit
echo "focus on race conditions" | codex review -   # custom review prompt
```

Headless, read-only, separate from `exec`. `codex apply <task-id>` applies a Codex Cloud task's diff to the local tree.

## Not a git repo? Fallback recipe

Neither review command can run — use a read-only `task` (or CLI `codex exec -s read-only`) and carry the review contract in the prompt:

- Name the files to review (absolute paths) and state read-only explicitly.
- Frame it adversarially: challenge the approach, assumptions, and real-world failure modes — not just defects.
- Demand the contract: findings ordered most-severe first, each with severity / file:line / concrete failure scenario / observed-fact vs inference; end with overall verdict + residual risk.

```bash
node "$RUNTIME" task --effort high "Adversarial design review — challenge the approach, not just find defects.
<task>Review <files>, read-only. Design intent: <what it's supposed to be>.</task>
<review_focus>1. ... 2. ...</review_focus>
<structured_output_contract>Ordered findings, most severe first: severity, file:line, failure scenario, fact vs inference. End with verdict + residual risk. No code changes.</structured_output_contract>"
```
