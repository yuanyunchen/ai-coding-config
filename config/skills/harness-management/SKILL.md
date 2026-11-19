---
name: harness-management
description: "Manage persistent agent skills, commands, agents, hooks, rules and settings. Use for “remember this”, “from now on”, “use this next time”, “stop doing that”, saving a rule/template/skill, editing skills or AGENTS.md, adding rules, commands, hooks or subagents, distilling or iterating skills, three-source sync, sync skills, deploy harness, agent-config, or rereading core rules after a long or compressed chat. Route memory to memory-management."
---

# Harness management

The harness comprises persistent settings that constrain agent behavior: skills (including subskills and pseudo-skills), commands, agents (dispatch types), hooks, global rules (AGENTS.md) and settings. **All additions and changes to this layer go through this skill.** Classify the content, determine its level, check for conflicts, obtain approval as required by the mode, and route execution. Like workspace-management and memory-management, the harness has recall and update modules and thin command wrappers. Workspace v4 has no mode. Memory and harness each have their own modes. Workspace recall restores task state, memory recall restores long-term memory, and harness recall restores behavioral constraints.

As of 2026-07-03, this skill is the sole successor to the archived/removed continue-learning. An instruction to pass the former continue-learning gate means to follow this skill's update workflow and its current approval mode. The higher-level `project-management` skill runs the three systems together via /project-init, /project-recall and /project-update.

## Modes

The mode setting lives in this section. Change this line when the user requests a mode change.

**模式:auto** (On 2026-11-04 the user changed none to auto so recurring requests become defaults without reminders. Global changes still require approval.)

| Mode | Required behavior |
|---|---|
| **none** | Make no proactive additions or changes during conversation. Only when the user requests the update routine, in conversation or via /project-update, review the session for mismatches with existing skills and reusable procedures. Propose which level to change, what to change and why. Ask and apply after approval. |
| **auto (default)** | Watch for requirements that differ from existing skills or rules, and for reusable procedures worth retaining. For project-level changes, edit directly and report in one line. These include project agent configuration directories, project AGENTS/CLAUDE guidance, workspace .agents/skills and the workspace AGENTS.md rules section (`规则`). For global-level changes in the current tool's home, such as skills, rules, commands and agents in `~/.claude`, `~/.codex` or `~/.cursor`, briefly explain the issue and proposed change and wait for approval. |

The `harness=` field set by project-init in the workspace AGENTS.md header, or the ws block header for a repo workspace, overrides the global mode in that workspace. In every mode show hooks at every level to the user for review. Route facts, state and preference values to memory-management. Its independent default auto mode silently writes to its three stores regardless of the harness mode.

## Principles inherited from continue-learning

1. **Classify by content.** Behavioral constraints, prohibitions, procedures and triggers belong to the harness. Facts, status, preference values and environmental information belong to memory-management. Never rephrase a behavioral constraint as knowledge to bypass the harness workflow.
2. **Give each rule one home.** Start at the lowest level where it originated. On the second use elsewhere, promote it one level and leave a pointer in the old location. Avoid duplicate rules at multiple levels. See `references/placement-table.md`.
3. **Resolve conflicts.** Ask the user to choose between replacing the old rule and keeping it. If both behaviors must survive, express the two conditions in one rule.
4. **Make the smallest faithful change.** Change only what is necessary. Preserve the user's meaning and stay close to their wording.
5. **Attribute skills visibly.** In user-facing messages, name the skills used that turn with `使用 skill:X、Y`. When the same skill continues across turns, the first full attribution can be shortened subsequently, but attribution must remain visible.

## Modules and routing

The built-in recall and update submodules live in `modules/`. A user can request them in conversation or through /project-*. In auto mode the agent also invokes update under the rules above.

| Situation | Route |
|---|---|
| Long conversation, context compaction, suspected behavioral drift or lost constraints. Reread the core files. | `modules/recall.md` (manual request or /project-recall) |
| Add or change any harness object. Classify, place, check conflicts, obtain approval, execute, verify and register. | `modules/update.md` (manual request, /project-update, or automatic invocation in auto mode) |
| Select a level, representation or promotion point | `references/placement-table.md` |
| Check a CLI location or version, presence of a capability path or availability of a dependency | Read the output of `scripts/harness-probe.py` at `~/Library/Logs/harness/probe.md`. If stale, rerun `python3 scripts/harness-probe.py [--net]`. |
| Write SKILL.md: structure, description trigger budget and splitting | `subskills/skill-authoring/SKILL.md` and the two advanced writing-great-skills documents in that directory |
| Scaffold a new skill, run evals or tune its description | `subskills/skill-creator/SKILL.md` (the former global skill-creator, incorporated in full) |
| Write or audit AGENTS.md, CLAUDE.md and other agent guidance | `subskills/agent-file/SKILL.md` (formerly the global write-agent-file) |
| Sync Claude/Cursor/Codex/Trae and GitHub (“three-source sync” is a synonym), deploy, pull, links, or update from GitHub and propagate to the tools from any working directory | `subskills/multi-source-sync/SKILL.md` |
| Hooks, permissions, settings.json or environment | The session's built-in update-config skill is the external execution layer. Show hooks before applying them. |
| Workspace .agents/skills structure and registration | workspace-management's `references/capability-layer.md` defines implementation. This skill decides what to persist. |

Use the internal equivalents of superpowers:writing-skills and anthropic-skills:skill-creator. Preserve the structure of plugin and lark-cli-managed copies (`plugins/**` under the current tool's home and `~/.agents/skills/**`). See the boundaries in skill-authoring.

## Platform-specific entry points

**qa-loop (user decision, 2026-11-14).** Codex alone uses the native `skills/qa-loop/SKILL.md` entry point, which loads its `prompts/qa-loop.md` workflow. Claude Code, Cursor and Trae keep their existing `commands/qa-loop.md` entry points. Do not migrate them to skills or change other entry points or behavior. Cross-tool sync boundaries are in “Platform-specific entry points” in `subskills/multi-source-sync/SKILL.md`.

## Mandatory rules

1. Before editing any harness object, follow `modules/update.md`, even when the user has already granted permission. Classification, placement and conflict checks determine the right home. Do not skip them and directly edit the target.
2. Always show hooks to the user. Never edit AGENTS.md silently. For global changes, always propose the plan first.
3. Resolve conflicts as specified in principle 3. For skill removal or archiving, propose the action to the user. Never delete silently.
4. Subskills are deregistered from the global registry and read only through this skill's routing. Register any new subskill in this table in the same change.
5. **Every local capability claim requires a date, the tool version and the verification method.** Include all three before writing that the machine can or cannot do something. For machine-verifiable facts, refer to the output of `scripts/harness-probe.py` rather than hardcoding values. In the 2026-07-29 audit, none of the dated claims were stale. Every stale item was an undated capability claim treated as permanent. For example, “the Feishu API cannot create a whiteboard” was verified only for `document_convert`. Applying it unconditionally to the default `docs +create --doc-format xml` route affected over 20 places across 11 files.
