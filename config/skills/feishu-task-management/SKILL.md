---
name: feishu-task-management
description: "Entry point for Feishu/Lark operations. Use only when the user requests a Feishu action, supplies a Feishu resource to operate on, or the task has a confirmed Feishu destination. Read lark-* and domain subskills on demand. General documents, Markdown, sheets, slides, diagrams, development, deployment, workspace management and ByteDance knowledge searches do not trigger it."
---

# Feishu / Lark workspace index and operating rules

## Scope

Confirm the resource or delivery destination belongs to Feishu/Lark before using this entry point. Reviewing rules, citing historical Feishu projects or mentioning generic terms such as docx, sheets, wiki, drive, slides or Markdown does not establish a platform. In those cases, skip Feishu execution memory, authentication checks and cloud delivery. Route ByteDance intranet development, SQL and experiments to their business capabilities. The location of a capability file in this directory does not trigger the Feishu workflow.

**Discovery isolation.** Subdirectories alone do not provide isolation. Codex automatically exposes only this entry point. `skills.config` disables automatic registration of the other SKILL.md files here and `~/.agents/skills/lark-*/SKILL.md`. This router can still read them by path. During sync/deploy, the configuration repository's `scripts/codex-skill-isolation.py` rebuilds disabled entries from the actual files. Verify every new subskill against the actual skills/list.

## (0) Required lookup before execution

Before executing any Feishu operation (creating blocks, embedding images, importing/exporting, downloading from Drive, reading private chats, changing document structure or using capabilities outside the allowlist), match the operation or symptom below, then **`Read` only the corresponding `references/exec-*.md` file** before acting. Building blocks, embedding images or downloading from memory repeats known failures. The table indexes detailed pitfalls. Backend facts live in `references/` and full CLI syntax in `cli.md`.

> **Delegating any Feishu task.** Subagents do not invoke skills automatically. Include this SKILL.md path and the relevant subskill SKILL.md or `references/exec-*.md` path in the prompt, and tell the agent to `Read` them. Include lark-doc-writer for document writing and doc-trio where applicable. For ByteDance work, have it search first with `<repo>/bin/bm tool search-notes --project bytedance`. See the subagent dispatch section under Harness in the global AGENTS.md.

| Operation or symptom | Read | Pitfall |
|---|---|---|
| Create a docx table | `references/exec-blocks.md` | Cells in the creation tree always cause **1770041**. Create the empty table, populate it, and patch column widths individually. Use raw REST for a true header row. |
| Create a callout or set its emoji | `references/exec-blocks.md` | Explicit child blocks cause 1770041. Raw REST `children` with emoji_id can set the emoji. **Only the MCP path falls back to the default 🎁.** See the reference for details. |
| Create nested blocks or insert at several locations | `references/exec-blocks.md` | Use descendant to build the tree in one operation. Insert in **descending index order**. |
| Embed an image in docx | `references/exec-blocks.md` | **First try `docs +media-insert --file … --selection-with-ellipsis "<exact caption text>"`.** It wraps four steps plus rollback and inserts below the caption. Fall back to the curl pipeline only for unsupported placements (inside a callout/table or replacing an existing image block). Bind upload_all to `parent_node=<image block ID>`, not the document ID, or it returns **1770013**. Always `Read` the PNG before embedding to catch cropping. |
| Insert an image in a user-owned/UAT-created document when writes return **1061004** | `references/exec-blocks.md` (procedure in  `references/exec-permission.md`) | A UAT-created document belongs to the user. Fetch the bot open_id with `GET /bot/v3/info`. Then use the three-step sequence: UAT `permissionMember_create` adds the bot as a `full_access` collaborator, tenant uploads the image, and tenant removes its own access with `DELETE …/permissions/{token}/members/{bot}?type=docx&member_type=openid`. |
| Reuse an image from another person or source document | `references/exec-blocks.md` | Image tokens cannot be reused across documents (relation mismatch). Download the bytes and re-upload with a user token. |
| **Cross-tenant** original image retrieval returns an empty array | `references/exec-blocks.md` | A `.us.` token **silently returns empty** for a CN/.sg source image. If retrieval is impossible, create a high-quality redraw labeled “(重绘)” (redrawn) or ask for a screenshot. |
| Folder/document creation returns **99991679 / 1255002** | `references/exec-permission.md` | Creating in the user's Drive requires `--as user` (UAT). Repeat OAuth to grant new scopes to an existing token. |
| Markdown import into docx leaves Mermaid/callouts unrendered | `references/exec-import-export.md` | Import accepts **standard Markdown only**. Mermaid becomes plain code blocks and `<callout>/<lark-table>` XML is flattened into plain text. Use ASCII diagrams or the block API. |
| Count images in a document | `references/exec-import-export.md` | Markdown export omits image/whiteboard blocks. Count images through the block API with `block_type==27`. |
| Download a Drive **image or embedded media** | `references/exec-import-export.md` | Use `media.batchGetTmpDownloadUrl` (UAT) for a temporary link. Read the media token from the image block. |
| Download a **standalone Drive file (type=file)**, or a private file returns 403/an empty array | `references/exec-import-export.md` (authorization procedure in  `references/exec-permission.md`) | Use `GET /files/{token}/download`. Calling the media endpoint with a file token **silently returns an empty array** (false negative). A private user file requires bot `full_access`. UAT `permissionMember_create` (perm=full_access,type=file), then tenant download, then tenant removes its own access with `DELETE …?type=file&member_type=openid`. `view` is insufficient. |
| Read **a user's private chat or a group the bot has not joined** | `references/exec-im-browser.md` | `search_v2` (UAT) returns message_id only, without the body. Bot identity cannot access `message.get/list` (230002). The only supported route described here is the Chrome extension with the Feishu web client. |
| View rendered documents/sheets or check a newly created result | `references/exec-im-browser.md` | Follow the Chrome extension procedure. Default to “浏览器1(bytedance)” (Browser 1, bytedance). `data.tiktok-row.net` renders blank. |
| Reorder sections, move images across sections or change document structure | `references/exec-docstruct.md` | Large `block_move` operations can silently fail from OT merge conflicts. Recreate at the destination, delete the original, and re-fetch after each step. Verify the raw dump independently of a single agent's summary. |
| Embed HTML as a docx attachment | `references/exec-docstruct.md` | `docs +media-insert --type file --file-view card` |
| Use a less common capability (sheet cells, calendar rooms, contact search) | `references/exec-workflow-internal.md` (§5 allowlist) | Most are outside the MCP allowlist. Official lark-cli exposes all capabilities without an allowlist. See `cli.md`. |
| Confirmed Feishu document/file search | `references/exec-workflow-internal.md` (§6.1 search semantics) | Within confirmed Feishu scope, the default is a Feishu doc in Drive. Look in “🤖 个人知识库索引(AI)” (personal knowledge base index) before scanning Drive. |
| Create a task folder or identify the task | Global `workspace-management` skill (sole layout authority) and `references/exec-workflow-internal.md` §6.2 | workspace-management owns the two-sided layout and old/new conventions. Keep interim work and memory off Feishu. **Interpret the task solely from its input materials and current prompt.** Do not infer it from messages. |
| Internal task blocked, need permission, locate a table or run SQL | `references/exec-workflow-internal.md` (§10 escalation ladder) | Escalate in order: lark-cli → Chrome → in-page agent → Knowledge AI (ask.feishu.cn) → oncall. Portals include SYS360/Coral/Dorado/Megatron/TCC. |
| Look up historical Feishu backend MCP capabilities | `references/exec-appendix-legacy.md` | Historical reference only. MCP is retired. Execute via lark-cli. |

## (1) Overview

Feishu skills and rules are isolated from general skills in the workspace. This skill is their **sole global entry point**. Start every Feishu task here, then follow the route to its subskill.

**Three layers, all loaded on demand**

1. **Index (this skill).** Find a subskill's purpose and location, and the execution rules. Start here.
2. **Methods (subskill `SKILL.md` and `references/`).** Each describes a kind of Feishu work (documents, tables, diagrams, business domains or workflow components). **Do not preload individual subskills.** Use section (2) to `Read` the relevant path as needed.
3. **Execution (official `lark-cli`).** Skills supply rules and the CLI reads/writes Feishu. See the adjacent `cli.md` for its three command levels, authentication and pitfalls.

**Mandatory Feishu document writing workflow (fixed 2026-06-24, rework required if skipped).** Every task to write or edit a Feishu document, including proposals, analyses, summaries and reports outside doc-trio's five types, must follow this sequence. (1) Before writing, invoke `lark-doc-writer` and follow §0 on readability, text density, natural language and diagram choices by document type. Use the two-part close for learning documents and consult the transcript and three-diagram standard for technical data-pipeline delivery. (2) For learning documents, operating guides, checklists, meeting notes and AI handoffs, first use `doc-trio` to classify the document and obtain its outline. (3) Execute with `lark-cli docs`. (4) Unless the user specifies another audience, before delivering a link to an agent-created document, follow lark-doc-writer L2 to set “ByteDance 内获得链接的人可查看” (anyone at ByteDance with the link can view), keep external access closed, and verify with a fresh readback. Never bypass lark-doc-writer by importing Markdown directly with `docs +create` or substituting a custom recipe for the writing rules.

**Required `memory.md` reading.** The adjacent `memory.md` records Feishu execution pitfalls for permissions, blocks, images, import/export and allowlist boundaries. Read it **only when confirmed to be performing Feishu document, spreadsheet or image operations** to avoid repeating known issues. The sole authority for Feishu writing is `lark-doc-writer`, §0 General writing rules and §1 Feishu XML requirements.

**Check the `bytedance` knowledge base first when relevant.** ByteDance advertising algorithm knowledge lives in BM project **`bytedance`** in the unified `global-memory` repository (directory `bytedance/`, formerly feishu-memory). **Search it first only for tasks that depend on ByteDance advertising knowledge. Skip it for ordinary Feishu operations and everyday tasks.** Resolve the repository root (the hub's parent) and run `<repo>/bin/bm tool search-notes --project bytedance "<your question>"`, or MCP `search_notes` with `project=bytedance`. For platform purposes, metric definitions, experimental findings, mechanisms and historical decisions, use matches directly after checking that the fact's `source.quote` remains current. Search here before seeking uncertain ByteDance background elsewhere to avoid duplicate research. Name/entity queries work best. Read `memory.md` for execution pitfalls and `bytedance` for work knowledge independently, as needed.

**Execution rules**

- Always use the official `lark-cli` (`@larksuite/cli`, installed on PATH) to read and write Feishu. Look up the absolute path and version in `~/Library/Logs/harness/probe.md` rather than hardcoding them. The old `mcp__feishu__*` MCP is retired as an execution path. Its historical ledger is in `mira-sync-archive.md`. The adjacent `cli.md` documents three invocation levels, self-discovery (`schema`/`skills`), authentication, app and brand details and troubleshooting. Explore the full interface with `lark-cli <domain> --help`, `lark-cli <domain> schema` or `lark-cli skills read lark-<domain>`. The old `~/feishu-cli/deliverables/cli-interface.md` was deleted with its task area.
- Identities are `--as bot` (tenant) and `--as user` (user UAT). Use `--as user` to create items in a user's Drive/My Space (tenant gets 1255002). **Run `--dry-run` before writes.** High-level shortcuts can execute without a confirmation gate.
- **Permission approval reminders (exception to IM reconfirmation).** When the user authorizes requesting access and sending reminders in the current task, read the actual approval workflow after submission. Deduplicate across all resources by approver, merging requests to the same approver into one request and one private message. Contact external approvers only. Exclude the user's mentor Yi Li (`liyi.turing`). Send the exact message “麻烦帮忙审批下工单，感谢。” (“Please approve the ticket, thank you.”) with the current valid ticket link. Send nothing without a valid link. This specific case may proceed directly under the user's authorization. All other IM follows the second-confirmation rule in `memory.md` §15.
- Start with read-only checks: `lark-cli doctor` / `auth status`. Proceed when both identities are `ready`. Reauthenticate via `cli.md §4` only if needed.

**Mira sync frozen (2026-07-03).** Migration is complete and bidirectional sync is off. The full asset map, authoritative hierarchy, sync protocol and outstanding unpublished queue are frozen in the adjacent `mira-sync-archive.md`. Resume there if sync restarts. Feishu system changes no longer update the sync ledger.

## (2) Subskill directory

Route on demand. **Do not preload individual subskills.** Use this directory to `Read` the required `SKILL.md` and its `references/` before acting.

> Document and diagram subskills from the former Feishu workspace now live in `subskills-workspace/` under this skill. The old `feishu-mira-workspace/` is archived and no longer referenced remotely. As with lark-*, `Read subskills-workspace/<domain>/SKILL.md` and its `references/` before acting. All `subskills-workspace/…` locations are relative to `~/.claude/skills/feishu-task-management/`. General tools have a separate group.

### Writing and content
| Skill | Purpose | Location (SKILL.md) |
|---|---|---|
| `lark-doc-writer` | Entry point for Feishu writing, authoritative layout/format rules and readability methods. For technical data pipelines, read its reference transcript and three-diagram template. | `subskills-workspace/lark-doc-writer/SKILL.md` |
| `doc-trio` | Classify five Feishu document types (learning, operating guides, checklists, meeting notes and AI handoffs), select the outline and check completeness. Invoke before writing these five types (§1), then apply lark-doc-writer's general rules. | `subskills-workspace/doc-trio/SKILL.md` |
| `feishu-doc-gotchas` | Consult for formatting, blockID, color, upload or import anomalies while reading/writing documents, spreadsheets and whiteboards. | `subskills-workspace/feishu-doc-gotchas/SKILL.md` |
| `whiteboard-design` | Design architecture diagrams, flows, funnels, pyramids, fishbones and org charts. Formerly lark-whiteboard. Render a PNG and embed Image(27), with ASCII fallback. The official execution subskill is `lark-whiteboard`. | `subskills-workspace/whiteboard-design/SKILL.md` |
| `data-analysis-report` | Orchestrate ByteDance intranet analysis end to end, from SQL extraction through multi-window/controlled-pool analysis to Feishu docx. Optional core/full HTML uses analytical-report and internal hosting. Coordinates sql-query, analytical-report, bytedance-internal-hosting and lark-doc-writer without repeating their mechanics. | `subskills-workspace/data-analysis-report/SKILL.md` |

### Diagrams and charts
| Skill | Purpose | Location |
|---|---|---|
| `ascii-strategy-diagram` | Plain-text ASCII overview diagrams for algorithms, bidding, billing, ranking and pipelines. Preferred for formulas and multistage flows. | `subskills-workspace/ascii-strategy-diagram/SKILL.md` |
| `dag-flow-diagram` | DAGs for variable dependencies, end-to-end workflows, the three technical data-pipeline diagrams and concept relationships. | `subskills-workspace/dag-flow-diagram/SKILL.md` |
| `chart-gen` | Generate clean standalone static SVG charts (bars, lines, pies, Sankey and others) from data/metrics. Upload to Feishu if needed. | `subskills-workspace/chart-gen/SKILL.md` |

### Official Feishu domain subskills (`lark-*`, linked through `subskills/` without global registration)
> The sources in `~/.agents/skills/` are managed by lark-cli and reachable via the `subskills/` symlink. Route only through this table, then `Read subskills/lark-<domain>/SKILL.md` (equivalent to `lark-cli skills read lark-<domain>`). Each frontmatter defines the full triggers and boundaries. See `memory.md` §13/§15 and `references/exec-permission.md` for ByteDance tenant/behavior pitfalls (IM 232043 group creation, reconfirming sends, Calendar's ban on mental date calculations and its primary calendar requirement, 1255002/`--as user`, gmail/1063001).

| Subskill | Scope |
|---|---|
| `lark-doc` | Read/edit cloud Docx/Wiki, insert images and download attachments by document URL/token, including doubao.com /docx and /wiki paths. For embedded sheets/Base/whiteboards, extract the token and route to the corresponding skill. |
| `lark-base` | Base multidimensional tables, fields, records, views, statistics, formulas/lookups, forms, dashboards, workflows, role permissions and /base/ links. File import goes to lark-drive. |
| `lark-sheets` | Create spreadsheets, structure worksheets, read/write cell values, formulas, styles and comments, find/replace, atomic batches, charts, pivot tables, conditional formatting and financial modeling. Search files by name with lark-drive. |
| `lark-drive` | Cloud storage uploads/downloads, folders, copy/move/delete, metadata, comments, permissions and versions. Import Word/MD/Excel/CSV/PPTX/.base as online documents. Edit content with lark-doc or another relevant skill. |
| `lark-im` | Send, receive, reply, search chat history, manage groups, upload/download files and images (multipart for large files), reactions, urgent messages, interactive cards and card.action.trigger callbacks, and Feed pinning. |
| `lark-calendar` | Find/create/edit events, attendees, availability suggestions and room bookings. Completed meetings go to lark-vc. To-dos go to lark-task. |
| `lark-task` | Tasks, lists, subtasks, assignment, attachments, task-agent registration and records. |
| `lark-mail` | Email intent only: draft, send, reply, forward, read, search, folders, labels, contacts and incoming-mail rules. |
| `lark-wiki` | Knowledge spaces, members, node hierarchy, documents and shortcuts. Upload files with lark-drive. Edit content with lark-doc or the relevant content skill. |
| `lark-minutes` | Search Minutes, inspect basic details, upload/download audio/video, edit output and change speaker labels. Prefer it for local audio/video to minutes, without ffmpeg/whisper. |
| `lark-vc` | Completed video meetings: search history, minutes (summaries, to-dos, chapters and transcripts) and participant snapshots. Future events go to lark-calendar. Live meetings go to lark-vc-agent. |
| `lark-vc-agent` | Live meetings: have the bot actually join/leave, handle in-meeting events, send messages/reactions and discover active meeting IDs. |
| `lark-contact` | Resolve names/email addresses and open_id in both directions. Look up departments, email, status and signatures. Use native OpenAPI for department-tree traversal and org structure. |
| `lark-okr` | OKR cycles, objectives, KRs, alignment, quantitative metrics and progress records. |
| `lark-approval` | Pending/completed approvals, instances, finding definitions open for submission and initiating native approvals. Use lark-task for other to-dos. Excludes creating approval definitions. |
| `lark-attendance` | Look up your own attendance punches. |
| `lark-apps` | Spark/Miaoda app development and hosting, static HTML publishing, local full-stack work, cloud iteration, logs/Trace/PV/UV monitoring and environment variables (*.aiforce.cloud). |
| `lark-event` | Real-time `lark-cli event consume` NDJSON stream for IM, tasks, VC, Minutes and whiteboard events. Persistent bot subscriptions. |
| `lark-markdown` | View, create, upload, edit, patch and diff Markdown files. Use lark-drive to import as an online document. |
| `lark-note` | Direct meeting Note lookup using a known note_id for details, associated doc token or unified raw transcript. |
| `lark-whiteboard` | Whiteboard execution: export previews/raw nodes and update content. Use workspace whiteboard-design for design methodology. |
| `lark-slides` | Create/read slides, manage pages and replace selected content, including doubao /slides/. |
| `lark-shared` | lark-cli installation/authentication, auth login/status/logout, user vs bot, --domain permissions, missing scopes and _notice. |
| `lark-openapi-explorer` | Find native OpenAPI endpoints in official documentation when existing skills and CLI coverage are insufficient. |
| `lark-skill-maker` | Wrap Feishu APIs as custom lark-cli skills at the execution layer. Use harness-management update for persistent changes. |
| `lark-workflow-meeting-summary` | Compile meeting minutes in a date range into a structured report. |
| `lark-workflow-standup-report` | Summarize a specified day's schedule and outstanding tasks. |

### Local Feishu task subskills (`subskills-local/`)
> **Required layout.** Every Feishu task-domain skill must be an internal subskill physically located in `subskills-local/<skill>/` with one routing row here. Never register it directly under `~/.claude/skills/` as a global skill. Create it through harness-management update. As with lark-*, `Read subskills-local/<domain>/SKILL.md`. Triggers and boundaries live in its frontmatter.

| Subskill | Scope |
|---|---|
| `sql-query` | ByteDance intranet SQL extraction. Fixed priority: bytedcli CLI → Aeolus web → iDA. Covers authentication, queues, one-off/async queries, parallel execution, sampling validation, dialects, CSV and fallback conditions. |
| `building-dorado-hive-tables` | Dorado/DataLeap Hive production pipelines: table creation, permissions, smoke tests, production tasks, historical backfill, bootstrap, first-day handoff and production acceptance. Use `sql-query` for business SQL design and general extraction. |
| `bitcode-repository-publishing` | Decision guide for BitCode/Codebase repository creation and local code publishing. Choose based on destination domain, permissions, CLI/UI capabilities, Git and protected branch state. No fixed workflow. Reuse global `bytedcli` commands. |
| `analytical-report` | General-purpose engine for rigorous analysis in self-contained offline HTML (core/full versions, SVG charts, collapsible SQL, three-part chart reading and honest metric definitions), with a starter kit and build → Playwright → adversarial review loop. For end-to-end Feishu analysis use `data-analysis-report`. |
| `bytedance-internal-hosting` | Authoritative guide to shareable intranet hosting of HTML reports, pages and interactive artifacts. Goofy fast preview (gf-preview URL, create/redeploy preserves link, **hard limit ≤50MB**) or Feishu Drive Preview (single-file reports, real ACLs, Upload New Version preserves link). Covers the decision tree, file_upload injection, layered size reduction, keychain issues, false success and large-file freezes. |
| `libra-experiment-weekly-report` | Update the Libra weekly experiment report in place using last week's/0721 template. Read experiment records and pages, collect decision ADVV and p-values after clicking, compute 0.5d/post-closure return flow from the last complete data day, capture the correct regions and preserve Feishu layout. |
| `libra-ad-recall-metrics` | Read-only review and attribution of Libra ad recall metrics: decision ADVV/p-values, Travel Recall branches, pid product recall spend/billing ratios and Travel Catalog Event conversions. Use for daily/ad hoc metrics. Route weekly report edits and pipeline anomalies to their dedicated skills. |
| `building-feishu-bots` | Build and operate Feishu group bots end to end: create apps, configure permissions/events, group mentions/reactions/replies, scheduled pushes, a dedicated daily-report subworkspace, subscriptions, LaunchAgent hosting and real-group tests. Business data queries remain with their domain skills. |
| `ad-recall-experiment-debugging` | Diagnose ad recall experiments end to end and collect evidence: missing Libra AID/CID instrumentation, abnormal recall volumes, Intent events with empty inverted index results and differences across ROW/TTP/EU. Inspect Link / Intent Center / Engine / Targeting / DAG / TCC / pipeline metrics / source code layer by layer. Diagnosis and evidence only. Release, experiment, TCC and code changes require separate authorization. Route ordinary metrics to `libra-ad-recall-metrics` and weekly reports to `libra-experiment-weekly-report`. |

### General tools (also used outside Feishu)
> See the change history in `mira-sync-archive.md` §1 for removed or moved items (long-task-workflow, choice-card, the daily-report split and frontend-design-pro's move into frontend-pipeline).
| Skill | Purpose | Location |
|---|---|---|
| `workspace-management` | Sole authority on the agent workspace filesystem (two-sided layout: local tasks/<kebab-name> and Feishu Task/<Chinese name>). Use for creating task folders, wrap-up, archiving and identifying a task. | `~/.claude/skills/workspace-management/SKILL.md` (global) |
| `harness-management` | Sole entry for harness changes (skills, commands, hooks and rules). Preserve preferences/processes via its update workflow. | `~/.claude/skills/harness-management/SKILL.md` (global) |
| `feishu-daily-report` | **Compile a daily report** (Feishu scope): compile a dictated list and verified outputs into a Feishu daily report in Drive `Daily Report/WeekN`. For “记录日报” (record a daily report), use the global `memory-management` time index. | `subskills-workspace/feishu-daily-report/SKILL.md` |

### Other global skills
Route non-Feishu tasks directly through the global `~/.claude/skills/` registry using each skill's description. This index does not duplicate those entries.

## Notes
- These Feishu subskill sources have a single workspace copy, without global symlinks. When working in the workspace, Codex/Cursor can read its `AGENTS.md` for the same index.
- For unfamiliar commands or parameters, check `lark-cli <domain> +<shortcut> --help` or `lark-cli schema ...` first (self-discovery in `cli.md §3`).
