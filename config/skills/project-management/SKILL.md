---
name: project-management
description: "Coordinate workspace, memory and harness with one command. Use /project-init for project kickoff or initialization, /project-recall for a full three-layer recall, and /project-update for a full wrap-up or three-layer update. For a single layer, invoke that system directly in conversation."
---

# Project management across three systems

workspace-management owns task state, memory-management owns long-term memory and harness-management owns behavioral constraints. This orchestration layer combines the workflows and maps modes. The three systems' modules implement all mechanisms. Request single-layer routines directly in conversation. The only manual commands here are the three /project-* commands.

## Mode mapping

Set the mode with /project-init --mode. The default is auto. Workspace v4 has no mode: all its rules apply whenever a workspace exists. --mode maps only to harness.

| Project mode | Harness | Memory (global across projects) |
|---|---|---|
| **--none** | none | Keep the global mode, default auto |
| **--auto (default)** | auto | Keep the same global mode |

Write `harness=<m>` in the workspace AGENTS.md header, or in the ws block header for a repo workspace. It overrides the harness-management global default in that workspace.

## Modules

Each file in `modules/` describes a combined workflow with its own sequencing and shared inputs.

| Intent | Module |
|---|---|
| Start a project: recall global memory, create the workspace, establish the first task and inputs, then set harness mode | `modules/init.md` (manual command: `/project-init`) |
| Reorient across all three layers: reread each and give one summary of where work stands, what is known and which rules apply | `modules/recall.md` (manual command: `/project-recall`) |
| Persist a full update: collect once, classify and distribute to the three systems, execute in order, then combine their checklists | `modules/update.md` (manual command: `/project-update`) |

All three commands support `--deep` and pass it unchanged to the underlying modules. Each layer defines its meaning in its own modules.

## Mandatory rules

1. **Keep the order fixed.** For update, always run workspace → memory → harness. The workspace is the source of truth, global memory relies on its artifacts, and harness changes go through approval last. For init, begin with memory recall and then initialize the workspace with that history.
2. **Apply the harness approval rules.** The harness part of project-update follows its mode: in none mode, propose, ask and obtain approval. In auto mode, make project-level changes directly and propose global changes for approval. Always show hooks to the user.
3. **Collect once.** Share one review of the session across the three layers and give each layer only its own category of information.
