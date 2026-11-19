---
name: grill-me
description: "Relentless interview to sharpen a plan or design before building. Trigger phrases: grill, stress-test, and corresponding Chinese requests to interrogate or stress-test a plan. Optional --docs also maintains CONTEXT.md glossary and ADRs as terms crystallise."
argument-hint: "[--docs]"
disable-model-invocation: true
---

# grill-me — challenge a plan (manual invocation)

Question the plan or design one point at a time until you reach agreement. With `disable-model-invocation`, only a manual `Skill(grill-me)` invocation or its equivalent starts the interview.

## Arguments

| Argument | Behavior |
|------|------|
| *(none)* | Run the interview only. |
| `--docs` | Interview and maintain the domain glossary and architecture decision records (ADRs) as the discussion progresses. |

## Required reading before the interview

| When | Module | Path |
|------|------|------|
| Always | grilling | `subskills/grilling/SKILL.md` |
| Additionally with `--docs` | domain-modeling | `subskills/domain-modeling/SKILL.md` |

Read the applicable SKILL.md files above, then conduct the session according to their instructions. With `--docs`, update `CONTEXT.md` during the interview and write ADRs when needed. See `CONTEXT-FORMAT.md` and `ADR-FORMAT.md` in the subskill for the formats.
