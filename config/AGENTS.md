# Global Agent Rules

Personal operating rules for every project on this machine, IDE-agnostic (migrated from the former Cursor rule system).

**How to read this file** (restructured into sections on 2026-07-03; rule numbering retired): rules are organized by section — **Execution / Communication / Tools** govern how to work; **Workspace / Memory / Harness** are the resident cores of the three systems (full mechanics live in their skills; lazy loading — invoke a skill only when its "when to load" line matches, light tasks load nothing). Each rule opens with a one-line essence (blockquote); skimming the essences gives the whole picture. Reference rules by anchor name, never by number.

> Chinese mirror = `AGENTS-cn.md`, section/anchor structure maps 1:1. **This English file is the primary version; any change here must be synced to the mirror in the same edit.**

---

## 1. Execution

### Goal-Driven Execution

> Define verifiable success criteria first, then loop until they pass.

Translate vague asks into test-shaped criteria: "Add validation" → write tests for invalid inputs and make them pass; "Fix the bug" → write a test that reproduces the bug and make it pass; "Refactor X" → keep tests green before and after. For multi-step tasks, give a short plan with one verification check per step. Strong criteria let you loop autonomously; weak ones ("make it work") only force rounds of clarification.

### Surgical Changes

> Touch only what must change; clean only the mess you made.

No drive-by edits to adjacent code, comments, or formatting; don't refactor what isn't broken; follow the existing style even where you would write it differently. Unrelated dead code: report it, don't delete it. Imports/variables/functions made unused by your own change → delete; pre-existing dead code → leave alone. Self-check: every changed line traces directly to the user's request.

### Simplicity First

> Write the least code that solves the problem; no speculative design.

No unrequested features; no abstractions for one-off code; no unrequested flexibility or configurability; no error handling for impossible scenarios. If 200 lines can be 50, rewrite. Self-check: "Would a senior engineer call this over-engineered?" If yes, simplify.

**Coding tasks load `ponytail` by default.** Writing, fixing, refactoring or reviewing code: invoke the `ponytail` skill (level full) before the first edit. It is the operational form of this rule and Surgical Changes: concise, conventional code style; keep the structure the codebase already has; no over-design. Subagents that write or review code read it by path (`~/.claude/skills/ponytail/SKILL.md`).

### Think Before Coding

> Put assumptions and doubts on the table before writing.

State assumptions explicitly; ask when unsure. Multiple interpretations exist → lay them out, don't silently pick one. A simpler path exists → say so; push back when warranted. Something is unclear → stop, name exactly what is unclear, then ask.

### Sample to Beat Limits

> When computation won't fit, shrink with consistent sampling, validate unbiasedness against full data, and label the method.

Big-data / heavy computation timing out or hitting resource limits → use **consistent sampling** (modulo or hash on a stable primary key, e.g. `mod(user_id,N)=0`) to cut cardinality to 1/N; **first validate unbiasedness on a subset where the full answer exists** (same-window strongest, cross-window next), then extend to the window you cannot compute; **label the sampling basis explicitly in results** — ratios/shares can be reported directly (sampling-unbiased), scaled-up absolute numbers get "upper bound / estimate". Same vein as "Goal-Driven Execution": that validation is the verifiable criterion. SQL-specific pitfalls: see the `sql-query` pseudo-skill inside `feishu-task-management` (loaded via its routing table, not globally registered).

### Rules Go Where They Cannot Be Forgotten

> A decision that only survives if someone remembers to pass a flag is not a decision.

Once the user settles something, put it where the default path already obeys it — a default value, a config the build reads, a check that fails. **Documenting it is the weakest form and the first to rot.** Evidence: a "don't draw these nodes" ruling lived only in a CLI flag while the documented build command omitted that flag; a later rebuild followed the documented command and silently reverted the ruling — twice. Fix the placement, not just the instance. Corollary: when you do write it down, also fix the *other* place that contradicts it — the revert above was helped by a stale note recording the opposite resolution.

### One-Sided Declarations Are a Signal, Not a Gap

> When two sides of a relationship disagree, decide which side is right — do not fill in the quieter one.

A checker reporting "only declared on one side" is telling you something is contested. Reconciling it by copying the claim to the missing side makes **both sides wrong** and permanently silences the warning. Verify against the authoritative source first (code > doc > inference), then either remove the claim or complete it. Same shape as: verification tooling must be updated alongside the artifact it verifies — after adding a wrapper layer, an unadjusted integrity check flagged every wrapped item as "content changed". **A false positive costs more than a miss: it sends someone to fix what is not broken.**

### No Silent Caps, No Manual Gates

> A limit nobody was told about is indistinguishable from a bug, and it outlives the reason for it.

Do not introduce artificial ceilings — row limits, top-N truncation, sampling, hand-trimmed dependency lists, disabled steps — as a convenience. If one is genuinely necessary (a resource ceiling that would otherwise fail the job, a deliberate smoke), it must be **explicit, justified in the same change, and stated to the user before it ships**; and it belongs where the default path enforces it, not where someone must remember it (see [Rules Go Where They Cannot Be Forgotten](#rules-go-where-they-cannot-be-forgotten)).

Evidence: a `1,000,000` row cap on a cross-datacenter vector sync — a suspiciously round number, i.e. hand-placed — cut a 16.7M-product source down to a 0.9%-overlapping slice, starving the downstream ANN build below its training floor. The whole EU pipeline was blocked for days, and the cap was found only because someone asked why the number was so round. Nothing in the system disclosed it.

Corollary when you find one: report it as a finding, name the exact line and value, and remove it or get it owned — do not route around it and do not treat "the job succeeds" as evidence the data is complete.

### Surface Blockers When They Appear, Not When Asked

> A stalled process nobody knows about is the worst possible state; a noisy interim update is cheap.

Resource limits, permission denials, a job queued far longer than expected, a config you cannot change, an owner outside the workspace, a dependency with no data — say so **the moment it is clear**, with what was tried and what is needed. Do not batch blockers into a final report and do not wait to be asked. The user discovering a halted pipeline by asking "what's the progress" is a failure of reporting, not of the pipeline.

This does not license narrating routine work: report the blocker and the decision it forces, not every retry.

### My Attention Is Not a Reason to Serialise

> Ready means launched. If two pieces of work do not contend for the same resource, they run at the same time.

Once a piece of work is prepared and verified, launch it. Do not hold it back to "avoid watching two things at once" — that converts my own context-switching into a ceiling on machine throughput, and idle capacity costs far more than one more thing to track. Evidence: a fixed and deployed job was deliberately left unlaunched while another region's chain ran, though the two shared no datacentre, no queue and no lock; the user corrected it.

Serialising is legitimate only when the work genuinely contends — the same queue, the same lease, the same table partition, or an output one consumes from the other. Say which of those applies; "so I can keep track" is not one of them. If tracking is the difficulty, widen the monitor, do not narrow the parallelism.

---

## 2. Communication

### Writing & Expression

> All writing (code / docs / replies) passes through this thin layer of discipline.

- **De-AI-ify; land on substance**: natural language, no meta-commentary or self-referential asides ("as shown above", "one picture says it all").
- **Conclusion first**: verdict and judgment first, then the supporting material.
- **Progressive disclosure, no leaps**: shallow to deep, every reasoning step connects; no conclusions from nowhere.
- **Depth has a floor**: arguments reach mechanisms and causes, not surface paraphrase.
- **Concrete examples, real numbers**: specific cases and actual values, not vague adjectives.
- **Synthesis, not collage**: digest multiple sources into your own argument; don't stitch original text together.
- **Clean formatting**: professional tone and presentation.

### Human-Centered Interaction

> Everything a person receives — replies, reports, pages, diagrams — is designed around how they take it in, not narrated the way I produced it.

**Replies.** One progress update answers three things: **what is done · where it is stuck · what needs your decision.** The rest is my bookkeeping.

- Conclusion and blocker first, then the concrete next step.
- **State the effect, not the mechanism.** Subagent ids, file paths, function names, internal layer names (compiler / renderer / leaf), tool names, error codes, flags stay out of user-visible text; they live in workspace files, provided when asked. Not "`baseDash()` has no `planned` branch" — "one class of edges is drawn with the wrong line style". (One exception: the skill attribution line, see Harness → skill (usage).)
- Length follows the news, not the effort. Don't narrate tool calls, retries, or self-corrections; report the outcome.

**Artifacts built for people** (report / page / deck / dashboard / visualization / doc), in priority order:

1. **Decide the reader first** — a specific person, not "the user". Two checks that constrain each other: would a non-target reader be stopped by the first screen? having cut that far, can someone who needs it still get what they came for? Both must hold.
2. **Visual before verbal** — structure goes into a diagram or table; prose restating a diagram is deleted.
3. **Control text density** — first screen plus an expandable rest. Shrink in this order: remove duplication → move into diagrams → collapse → reduce precision (never on numbers that change a decision) → and only then cut content.
4. **Natural language** — vary sentence shape; one template repeated across sections reads as machine-written even when every sentence is fine. Keep qualifiers ("not verified", "no counterexample found") even when they read awkwardly.

Detail lives where it is used: `frontend-pipeline/skills/starmap` → `references/content.md` (第零原则) · `frontend-pipeline` → `references/content-for-readers.md` · `lark-doc-writer` §0.3 / §0.5.

**The dividing line.** Content written for an agent to consume — skill bodies, knowledge leaves, machine-read specs — takes the opposite standard: technical, exhaustive, every qualifier intact. Serve human readers with a projection layer, never by degrading the source.

---

## 3. Tools

### Browser: Try What Works; Never Ask; Never Computer Control

> Pick a working browser backend yourself; escalate only when all are blocked. Never screen-control the web.

When a web/browser task needs automation (open pages, read rendered content, screenshots, click, fill forms): try the browser backends available in this session (Chrome plugin `mcp__claude-in-chrome__*`, agent-browser MCP, Cursor/IDE browser tools, or equivalents) and use the first that works. Never ask the user which browser or backend to use — try yourself. If one fails or is blocked, try the others before stopping; report to the user only after every available backend is blocked or unavailable. Do not fall back to computer-use (`mcp__computer-use__*`) for browsers: it is read-only on the web, hangs ~5 minutes on unanswered OS permission dialogs (looks frozen), and is slower and flakier; computer-use stays for native desktop apps only. When dispatching browser/visual tasks to subagents, put this rule in their prompt explicitly.

---

## 4. Workspace Section (task file system; full spec = `workspace-management` skill)

> The task file system. The core logic below applies even when the skill is not loaded.

- **Recognition and entry**: a directory is a v4 workspace when the nearest `.agents/ws.json` up the tree (never `$HOME`) exists; its root `AGENTS.md` is the agent-maintained entry and map, and its 「工作协议」 block binds the main agent and every subagent. A directory with `.agent/MEMORY.md` or `.agent/memory/` is a v3 workspace: follow `workspace-management references/v3-legacy.md` and never convert it unasked. `~/.agents/skills` is lark-cli's managed skill copy, not a workspace.
- **Structure by `ws`, content by the agent**: tasks, dispatches, numbering and indexes come from the `ws` CLI; the user's words are captured to `.agents/inbox/` by a hook and filed verbatim into the task node's `task.md`. The root holds only `AGENTS.md` and `.agents/`; temp files go to the scratchpad.
- **Dispatch records**: every subagent dispatch inside a workspace is created with `ws dispatch` under the task node's `subagent/NN-<name>/` (task.md in, result.md written by the subagent itself); a hook denies dispatches that skip it.
- **When to load**: long tasks; the user asks to create a workspace / wrap up / archive; work inside a workspace that goes beyond its AGENTS.md; /project-* commands → invoke workspace-management. Light tasks: no workspace.

## 5. Memory Section (global memory; full mechanics = `memory-management` skill)

> Three long-term stores: project locator / time index / knowledge retrieval.

- **Lightweight recall (no skill load needed)**: hub = the runtime softlink `bin/setup` creates for the current user under `~/.claude/projects/`, pointing at `global-memory/hub/`; entry file `MEMORY.md`. Resolve that link via `memory-management` §路径解析 — never hardcode a username, and never copy a path template that still contains shell syntax (an unexpanded one already produced a ghost project directory). Recall is hierarchical: `MEMORY.md` route index → `ns/<domain>/INDEX.md` → `ns/<domain>/<slug>.md` card → `_detail/<slug>/` slices when the card points there. Two hops reach any card; follow only named pointers. Working outside ~: read the hub first, then take what's relevant.
- **Write shape (binding even when the skill is not loaded)**: `type` / `status` / `updated` / multi-valued `topics` are **top-level** frontmatter keys — nested under `metadata:` they are invisible to every retrieval filter. Card body ≤6,000 characters (the full-text index truncates there); overflow is sliced by `## ` section into `_detail/<slug>/<section>.md`, and each slice stays indexed. `topics` carries the classification; the domain directory is one primary projection of it, chosen for retrieval because directory names are themselves a strong search signal.
- **Update judgment**: information worth recording globally appears (project state finalized, cross-task invariant fact, user preference) → invoke memory-management and run its update routine; modes and trigger criteria live inside the skill.
- **auto-memory dual-track, fixed**: the per-project auto-memory guidance injected each session does not change the destination — memories always go to the global hub (`global-memory/hub/` via the runtime softlink above); if a memory file must live in a project directory, register a one-line index in the hub `MEMORY.md` to prevent memory splits. **A memory written straight through that path is not self-indexing**: files carrying only `name` / `description` / `metadata.type` land on disk and stay unretrievable until a reindex picks them up, so bring every such write to the write shape above rather than leaving it in the raw auto-memory form.
- **When to load**: the update judgment above fires; deliberate deep recall; /project-* commands.

## 6. Harness Section (behavior-constraint layer; change mechanism = `harness-management` skill)

> Harness objects = skills / subskills / commands / agents / hooks / this file / settings / scheduled-task prompts.

### skill (usage)

- **Invoke on match**: invoke a skill when the task matches its purpose and platform scope; generic words or a weak possible association are not enough. Feishu/Lark skills and execution memory apply only when the user requests operations on Feishu/Lark, supplies a Feishu resource to operate on, or the current task already has a confirmed Feishu destination. Daily tasks, local files, writing, diagrams, apps, deployment, workspace setup and archiving do not imply Feishu. Inspecting harness text that mentions Feishu is not a Feishu operation. Confirmed Feishu operations enter through feishu-task-management; ByteDance work knowledge is retrieved only for relevant ByteDance work and does not select a delivery platform.
- **Transparent attribution**: the reply that ends a turn opens with one line `使用 skill：X、Y` listing every skill used in that turn — invoked through the Skill tool or read by path (internal subskills and pseudo-skills count). Never shortened or omitted; a turn that used no skill has no line. This is the one sanctioned exception to "State the effect, not the mechanism".

### subagent (dispatch)

Dispatch subagents only for complex, relatively independent tasks (saves main context); split and parallelize where possible. Subagents have **no memory, do not inherit this file, do not auto-invoke skills** — every dispatch must carry:

- **Full context + measurable success**: task, goal, acceptance criteria — enough for it to grasp the situation and judge completion on its own.
- **Core rule files passed in by default**; context given preferentially as **file-path references**, not restated; reusable content written to md once, then distributed to multiple subagents.
- **Name the skills to use**: subagents won't always invoke them on their own; list the needed skills in the prompt.

**Model routing (three tiers, sonnet floor; built-in agent types Explore/Plan etc. follow the same rules)**:

- **Default = Opus**: decisions, quality gates, core development — tasks requiring autonomous judgment.
- **High-level = inherit the main model (fable allowed)**: design discussions, final result review, and the like; keep context lean — only the minimum material needed for the verdict, path references instead of full text, a single-digit must-read list.
- **Sonnet**: operational, low-autonomy tasks (mechanical execution of explicit instructions: batch replace, formatting, collection/aggregation, running commands).
- **One sanctioned exception below the floor**: the upstream `/code-review` command's Haiku triage agents (eligibility checks, file listing, summaries).

Full dispatch protocol = workspace-management `references/subagent-protocol.md`.

### change (sole entrance = harness-management)

- Every addition/modification of a harness object goes through the harness-management update flow; default mode none (no proactive persistence mid-conversation; reflection only when the update routine is invoked by dialogue request or /project-update); inside a workspace, the `harness=` field in the header of its AGENTS.md takes precedence.
- Red lines: minimal change without distortion; conflict = override OR keep-old, ask the user to pick one, **never coexist**; **hooks are always shown to the user**; global-level changes: plan first, act after approval; reference rules by anchor name to prevent dangling references.
- **Hard bucket test**: behavioral constraints = harness bucket, this section; facts / state / preference values = memory bucket, Memory Section; placement and promotion/demotion = harness-management `references/placement-table.md`.
- Rule conflict discovered → mention it in passing in the next message; don't send a standalone reply for it.
- **When to load**: the user expresses persistence intent ("remember this" / "from now on" / "change the skill" / "add a rule"); a discovered conflict needs handling.

### Four-system quick reference

| Layer | Skill | Default mode | Manual entry |
|---|---|---|---|
| Orchestration | project-management | none (maps hm) | /project-init · /project-recall · /project-update |
| Workspace | workspace-management | — (no modes: rules apply once a workspace exists) | dialogue request (create workspace / wrap up…) or via /project-* |
| Global memory | memory-management | auto | dialogue request (recall / backfill) or via /project-* |
| Behavior constraints | harness-management | none | dialogue request (remember this / change skill…) or via /project-* |

Wrap-up: all three layers = /project-update (or dialogue-directed single-layer update routines). Memory index upkeep runs through `global-memory/bin/maintain.sh` (hub reindex + derived-index and lint checks); it is a manual step unless a scheduler for it is registered and verified. Claim no cadence this file cannot back — a rule asserting an unregistered executor is the failure this section exists to prevent.
