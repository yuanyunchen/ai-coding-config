---
name: write-agent-file
description: "Create, edit, review, restructure, or audit agent guidance files — AGENTS.md, CLAUDE.md, agent.md, .cursorrules, .github/copilot-instructions.md, or any persistent agent instructions ('agent rules', 'Claude config', 'the agent keeps doing X — fix the rules'). Also when the user asks to check, audit, update, improve, or fix CLAUDE.md, or mentions 'CLAUDE.md maintenance' / 'project memory optimization' (audit mode, absorbed from claude-md-improver 2026-07-02). Use whenever the deliverable is the agent file itself, even if unnamed. Internal subskill of harness-management (deregistered from global, loaded via its update module step 7)."
---

# Writing AGENTS.md / CLAUDE.md files

> Typical asks: 'write an AGENTS.md for this repo' · 'add a rule to CLAUDE.md' · 'review my agent instructions' · 'clean up the agent file' · 'instructions for the AI'.

> **Internal subskill of harness-management** (2026-07-03; formerly the global write-agent-file skill). All lasting rule changes route through harness-management's update module (bucket → layer → conflict check → mode-based approval) before this subskill touches any live file; drafts outside live files are exempt.

An agent file is a persistent operating contract for a coding agent. Its job is to reduce what the agent has to guess — not to teach it things it already knows.

## Modes

**Quick mode is the default.** Make the requested change well, then stop. Most edits land here; users typically batch-review and unify after several changes.

**Full mode** runs quick mode plus a whole-file review (Step 4). Use it when the user asks for "full mode," asks for a cleanup or review, or signals they want a unification pass after a batch of edits.

**Audit mode** — auditing/scoring existing repo CLAUDE.md files (discovery → quality report → targeted fixes): read [references/audit-claude-md.md](references/audit-claude-md.md) (absorbed from the retired claude-md-improver skill, 2026-07-02) and follow it; the writing principles below still apply to any fix you author.

## Workflow

### 1. Understand the current file

Read the existing agent file end-to-end before proposing anything. Note its section structure, tone, list style, and any rules that already cover the territory you are about to touch.

If no file exists yet, the seed is what the project itself reveals — package manifest, test command, top-level layout.

### 2. Design the change from the requirement

Before editing, decide:

- **What failure does this rule prevent?** Prefer rules that prevent a real or likely failure. A rule with no failure behind it is usually filler.
- **Where does it belong?** Extend an existing section if one fits. Add a new section only when the rule does not belong anywhere current.
- **Does it conflict with anything in the file?** Plan the resolution before touching the file.

### 3. Apply the change

Make the smallest diff that satisfies the requirement.

- Reuse existing headings, voice, and phrasing patterns.
- Do not rewrite or polish sections you are not modifying.
- If a new rule overlaps an old one, prefer merging into the old rule over adding a parallel one.
- If a new rule conflicts with an existing one, understand why the existing rule exists before replacing it. If the resolution is not obvious, surface the conflict — in conversation when interactive, in the diff or report when async.

**If you notice an inconsistency, triage by type** (applies in Step 4 review as well):

- **Stale or factually wrong** (broken link, renamed path, removed feature, outdated command, typo) — fix it as part of this change.
- **Principle conflict** (e.g., a "think deeply" rule alongside a "control cost" rule; "always ask" alongside "implement directly") — surface to the user. You cannot decide which value should win.
- **Pre-existing structural issue unrelated to the request** (duplicate rule, vague rule, missing failure mode, redundant section) — report it with a proposed fix. Do not silently rewrite unrelated areas.

### 4. Whole-file review — full mode only

Re-read the entire file and check:

- **Single source of truth.** Each rule has one canonical phrasing. Cross-references to it (e.g., "apply the triage from Step 3") are fine; parallel restatements that can drift apart over edits are not. When two rules say the same thing in different words, merge them and replace the secondary copy with a reference.
- **No redundancy.** No rule restates something visible in a representative source file, enforced by tooling, or known to a capable agent by default.
- **Sections are unified.** Each rule lives where a reader would look for it. Voice and structure are consistent.
- **No conflicts.** No pair of rules tells the agent to do opposite things in the same situation.
- **Instructions are clear and executable.** Each behavioral rule names a trigger and an action.
- **Diff is minimal.** Nothing changed that did not need to.

When the review surfaces an issue, apply the triage from Step 3.

## Less is more

The strongest agent files are short. Every extra rule has a cost: it consumes context, it can be misapplied, and it dilutes the rules that genuinely matter.

- **Do not restate what the agent already knows.** A capable coding agent already reads files before editing, follows conventions visible in surrounding code, runs the tests it can find, and writes idiomatic code. Lines like "write clean code" or "use meaningful names" change no behavior.
- **Do not restate what the project already shows.** If a convention is visible in a single representative file, or enforced by a linter / formatter / type checker, the agent will pick it up by reading. Re-encoding it in prose duplicates information and risks drift.
- **Do not over-specify or expand rules into examples and edge cases.** Over-elaboration creates accidental constraints — the agent treats your example as the only valid shape. A rule that fans out into many sub-rules is usually one missing tool away from disappearing entirely.

When in doubt, leave it out. You can always add a rule the next time the agent fails.

## What earns a place

Common categories — not a closed set. Each item answers a guessing question the agent would otherwise face.

1. **Context routing** — where things live ("for X, look at Y").
2. **Build, test, run commands** — the smallest commands that work, with notes on when to use which.
3. **Scope and permission boundaries** — what requires asking before acting.
4. **Workflow rules for hard cases** — when to plan, when to ask, how to handle ambiguity.
5. **Verification policy** — what "done" requires.
6. **Project-specific conventions the agent cannot infer** — non-default patterns not enforceable by tools.
7. **Final report format** — what the user expects at the end.
8. **Priorities and tradeoffs** — what the project values when rules conflict (speed vs. safety, breadth vs. depth, cost vs. thoroughness).
9. **Institutional memory** — approaches tried and rejected, so the agent does not relitigate.
10. **Escalation** — decisions the agent should not make alone.

If a candidate rule fits none of these, ask whether it belongs in the file at all.

## Layout

Different sections have different conventional shapes. Match them so the file reads consistently.

- **Context routing** — bullet list mapping name → path. No prose.
  ```
  - Prompt templates: prompts/
  - Tool definitions: agents/tools/
  - Architecture rationale: docs/architecture.md
  ```

- **Commands** — fenced code block, one command per line, short comment when the choice is not obvious.
  ```
  pnpm -F <pkg> test    # tests for one package
  pnpm test             # full suite, slow
  ```

- **Permission boundaries** — single short list of imperatives. Avoid nested bullets.
  ```
  Ask before installing packages, changing schemas, modifying CI, or deleting files.
  ```

- **Workflow rules** — short prose paragraphs in "When X, do Y" form. One rule per paragraph; blank line between.
- **Verification policy** — one or two sentences, or a single bullet. Resist expanding into a checklist.
- **Final report format** — bullet list of fields (files changed, verification run, known risks).

Use `##` for top-level sections and `###` only where a section has clearly distinct subsections. `####` almost always means the section should be split.

## Rule-writing form

For **behavioral rules**, use **"When X, do Y (verify by Z)."** That form makes a rule executable.

- Weak: *Be careful when changing prompts.*
- Strong: *When modifying a prompt template, describe the intended behavior change and run at least one targeted smoke example.*

- Weak: *Use good tests.*
- Strong: *For bug fixes, add a regression test that fails before the fix and passes after, when practical.*

Pointer rules ("prompt templates live in `prompts/`") and pure scope rules ("ask before deleting files") do not need the form.

Prefer **defaults with exceptions** over absolutes. A blanket "always ask before editing" makes the agent useless; a blanket "never ask" makes it reckless. Better:

> For one-file edits within the requested scope, implement directly. For ambiguous multi-file changes, propose a plan first. Ask only when missing information blocks safe implementation.

## Anti-patterns to refuse

- **Values masquerading as rules** ("be thoughtful", "think carefully", "write clean code") — they change no behavior.
- **Project encyclopedia** — long background sections that crowd out operational rules. Link to docs instead.
