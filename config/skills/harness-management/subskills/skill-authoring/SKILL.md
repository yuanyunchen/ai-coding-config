---
name: skill-authoring
description: "Internal harness-management subskill. Read via step 7 of its update module before adding or editing skill text. Covers SKILL.md structure and length, the description trigger budget, lossless splitting, and boundaries for upstream copies."
---

# Skill authoring

The reviewed skill-refactor proposal was approved on 2026-07-01. On 2026-07-03 this guide moved from continue-learning/references/ into harness-management as a subskill. It applies to user-owned skills. Upstream plugin and lark-cli-managed copies are outside its scope and must keep their upstream structure.

## Structure

- Aim for **≤200 lines in SKILL.md**. Invocation loads the entire file. Context cost scales with line count times invocation frequency, so organize long, frequently invoked skills first.
- Put scenario-specific examples to copy, implementation instructions needed only during execution, and infrequent orchestration procedures in references/. Put a scenario routing table at the top of the main file so the reader can reach the right file in one hop. Carry existing mandatory-read requirements into the corresponding row with their original force.
- Keep policy or discipline documents in one file when every invocation requires the full document. Splitting these adds a hop.
- Put reusable examples in references/examples.md. Keep principles, a format reference and routing in the main file. Tell the reader to select the closest example and use its skeleton before writing.
- Keep one canonical instance of every caveat or statement about how a mechanism works. When it occurs ≥2 times within a skill, replace duplicates with short pointers.

## Description and trigger budget

- The description occupies every session's registry under skillListingBudgetFraction. Its only job is discovery. Use the fixed three-part form: one sentence on purpose and core function, trigger conditions and terms, and one sentence on scope boundaries. The user adopted this form on 2026-07-03 using the four management skills as examples. Mode tables, submodules, commands, usage, workflow steps and history belong in the body.
- Aim for **≤300 characters**, extending to about 450 for English with many trigger phrases. Preserve existing triggers when editing a description to avoid regressions. A deliberate narrowing requires a user decision. Move any detail removed from the description into the body if it is absent there.

## Lossless splitting

- Move content verbatim. Prefer cutting at line numbers or headings to retyping. Rewrite only the pointer sentences and relative paths affected by the move, such as `templates/` → `../templates/`. Record each adjustment.
- Compare lines after splitting. Every substantive line from the original must appear in the union of the new main file and references, or have a specific explanation such as a pointer substitution or a corrected path.
- Retain original § numbers in moved sections and put a note in the new file header that external references to §N refer to the corresponding section in that file. Point frequent cross-skill references directly to the new file.
- Before editing, save a tar backup in the task area. Afterwards use grep to check that the key anchors are reachable in one hop.

## Boundaries

- Keep the structure and order of upstream material: `plugins/**` in the current tool's home, lark-cli-managed `~/.agents/skills/**`, and the official Anthropic skill directory layout. Only thin header annotations such as a status note or preamble are permitted. Record the risk that a future update may overwrite them.
- Feishu skill changes no longer go in the sync ledger. Mira sync was frozen on 2026-07-03. Its ledger is archived in feishu-task-management's `mira-sync-archive.md`.

## Advanced guidance

Incorporated from writing-great-skills on 2026-07-02. See [writing-great-skills.md](writing-great-skills.md) and [writing-great-skills-glossary.md](writing-great-skills-glossary.md) for the full texts.

- **Predictability.** Skills should produce a consistent process even when the output varies. The choices below support that aim.
- **Choose the invocation model.** A model-invoked skill has a description, permits automatic triggering and incurs context load each turn. A user-invoked skill (`disable-model-invocation: true`) has zero context load and relies on the user's memory, a cognitive load. Choose model invocation only when the agent must find the skill autonomously. When users would have to remember too many skills, consolidate behind a router such as feishu-task-management, which registers the others at one entry point.
- **One trigger per branch.** Merge synonymous rewrites of the same trigger. Remove identity statements from descriptions when the body already covers them.
- **Two reasons to split.** Split by invocation when a part has its own leading word or another skill references it. This costs context load. Split by sequence when later steps cause premature completion. Each split incurs one of the two loads. Keep the original structure when splitting adds no benefit.
- **Leading word.** Replace a repeated, multiword expression with a compact concept already established in model pretraining, such as tight, red or relentless. This saves tokens and anchors both triggering and execution.
- **Check for failure modes.** Premature completion means the acceptance criteria are too hard to verify. Duplication repeats a meaning in several places. Sediment accumulates additions without removals. Sprawl leaves every line useful but the whole document too long. A no-op restates default behavior such as “be thorough”. Delete empty sentences outright.
