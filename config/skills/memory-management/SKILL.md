---
name: memory-management
description: "Manage global memory in the hub's three stores and the ByteDance domain via basic-memory. Use for writing or maintaining global memory, semantic work-knowledge retrieval, project location, TIMELINE, preferences, backfilling or conflict resolution. Use harness-management for placement and workspace-management for workspace files. A lightweight hub read does not require this skill."
---

# Global memory management (unified BM, 2026-07-29)

Global memory uses one `global-memory` repository and two separate, hierarchical basic-memory projects.

| BM project | Directory | Contents | Hierarchy |
|---|---|---|---|
| **hub** | `hub/` | Project location, time index, preferences and cross-task topics | `MEMORY.md` → `ns/<domain>/INDEX.md` → `ns/<domain>/<slug>.md` → `_detail/<slug>/<section>.md` (the post-P5 target described below) |
| **bytedance** | `bytedance/` | ByteDance ads work knowledge, recorded as atomic facts | `MEMORY.md` → `ns/<domain>/INDEX.md` → `ns/<domain>/<fact>.md` |

The three conceptual stores (location, time and knowledge) reside in `hub/`. Domain-specific work knowledge resides in `bytedance/`, isolated at the BM project level.

```
hub/
  MEMORY.md                  L0 routing index generated from frontmatter by bin/build-index.py. Do not handwrite.
  ns/<domain>/INDEX.md       L1 domain index, generated
  ns/<domain>/<slug>.md      L2 card, body ≤6,000 characters
  _detail/<slug>/<section>.md L3 sections of long bodies, each separately indexed
  timeline/                  TIMELINE.md and records/. Excluded from semantic indexing by .bmignore.
```

This is the intended state after P5. At the time of the checks described here, `hub/ns/` had not been created and the cards lay flat in `hub/`. The timeline consisted of `hub/timeline/TIMELINE.md` and `hub/timeline/records/`. Both had been added to `.bmignore`, but the semantic index still contained them pending reindex. Searching for `"TIMELINE"` returned `hub/timeline/records/2026-06-21` first with a score of 1.154.

Hub domains: `search-city-signal`, `user-preference`, `agent-harness`, `memory-workspace`, and `travel-embedding`. After P5, `hub/MEMORY.md` is the authoritative list. At the recorded stage, it had no domain list. It contained three hand-written groups: ① preferences and user, ② projects, subsystems and references, and ③ timeline.

Frontmatter is authoritative for classification. The directory expresses one primary grouping. Keep `type`, `status`, `updated` and the multivalued `topics` at the top level. Nesting them under `metadata:` makes every BM filter return 0. See `references/*.md`.

## Resolve paths

Never hardcode a local absolute path.

1. The hub runtime symlink commonly points to `…/global-memory/hub`. Each machine's `bin/setup` establishes the actual link.
2. The repository root is the hub directory's parent. Alternatively consult `manifest.json` in the repository.
3. Use `<repo>/bin/bm`, the basic-memory wrapper. After migration, cloning and running `./bin/setup` suffice.
4. Every MCP call must include `project=hub` or `project=bytedance`.

On a new machine: `clone global-memory` → `./bin/setup` → `./agent-config memory status`. See the repository's `manifest.json` / `README.md` for the contract.

## Domain boundaries

Search the hub as needed for everyday work. Search bytedance only when the task genuinely involves ByteDance work knowledge. A historical Feishu project in an index does not select the delivery platform or warrant loading a Feishu skill or execution memory. Use Feishu execution memory only for confirmed Feishu operations.

## Retrieval contract

`bin/bm tool search-notes` accepts `--page-size`, `--page`, `--type`, `--status`, `--meta k=v`, `--tag`, `--after_date`, `--permalink`, `--title`, `--vector`, `--hybrid`, `--entity-type` and `--category`. **Always include `--page-size 3` by default.** The actual query `--project hub "浏览器"` (“browser”) returned 74,927 characters without the option and 11,835 with it. Each item's content is truncated at 4,000 characters (`CONTENT_DISPLAY_LIMIT`). Much of the default 10-item response consists of truncated fragments.

| Question | Route |
|---|---|
| What do we know about X? | `search-notes --project hub "X" --page-size 3` |
| Which projects are closed or active? | `--status closed` or `--status active`. Both return 0 before the P5 reindex. Manually filtering `hub/MEMORY.md` is a valid fallback during that period. |
| Only project or preference cards? | `--type project` or `--type feedback`. Repeat the option for multiple values. The preference type is `feedback`. There are no `user` cards in the hub. |
| Which cards changed recently? | `--after_date 7d` (also accepts `'1 week'`) filters indexed file mtime. Use it only to cross-check recently touched files. It does not use the frontmatter's `updated` date. |
| What happened last week or in a given month? | Read `hub/timeline/TIMELINE.md` or run `rg '<keyword>' <repo>/hub/timeline/records/`. TIMELINE is authoritative for chronology. `--after_date` cannot replace it. |
| What belongs to a domain? | Query the domain name itself. FTS indexes directory names. On bytedance, `"signal-pixel"` scored 1.170 on the first result. On the hub this works only after P5 creates `ns/`. At the recorded stage, the first `"user-preference"` result scored just 0.647, in the noise range. |
| An exact card, tool or table name? | Use the name as the query for an FTS match. |
| Search again with different wording? | `--vector` uses semantic search without FTS. `--hybrid` merges both routes. |

Two facts prevent an empty result from being mistaken for missing knowledge:

- Frontmatter filters are largely ineffective before the P5 reindex because the database still reflects the pre-migration state. Measured totals: `--type note` → 58, while `--type project`, `--type feedback` and `--status closed` each returned 0. On disk those three groups had 22, 10 and 9 cards respectively. Investigate index lag before concluding a card is missing.
- `--after_date` uses indexed file mtime (`sync_service.py:1101`, `updated_at = file_metadata.modified_at`). Cloning, bulk rewrites and reindexing can reset mtimes together. The filter answers when a file was touched, not when its knowledge became valid. On the hub, `--after_date '30d'` returned all 59 items. Use `hub/timeline/TIMELINE.md` for chronology.

**Measured score interpretation for searches with a query term:**

- **≥1.0:** FTS matched a literal query token, a reliable signal. Exact-token queries scored 1.14–1.21 in tests.
- **0.5–0.7:** vector distance alone, overlapping the measured noise floor of 0.52–0.65 in that database. This score alone does not establish a hit. Try a more exact token or read the original to confirm.
- **<0.5:** noise. Results below `semantic_min_similarity` are cut off.

Without query terms the scores have different meanings. Applying the three ranges would discard correct results:

- **Title matches score negative.** SQLite FTS5 returns raw bm25, where more negative means a closer match. Measured examples: `--title "doc-system"` → -2.340 and `--title "codex-plugin-cc-install"` → -4.103. Both are matches.
- **Pure filters score 0** (observed as `-0.0`). With only `--type`, `--status` or `--after_date`, relevance is never calculated. Inspect `total` and `results`.

See `modules/recall.md` for parameter semantics, pitfalls and combinations.

## Memory modes (v3)

The mode is recorded in the header of `hub/MEMORY.md`. The default is **auto**.

| Mode | Behavior |
|---|---|
| **--none** | Write only on an explicit request in conversation or via /project-update. |
| **--auto (default)** | After a milestone, refresh the locator card status, add one TIMELINE entry and record enduring knowledge. Run update when the discrepancy is large. |
| **--full** | Write as soon as information settles. Automatically recall in a new session or when switching projects. |

## Write rules

- Prefer `bin/bm tool {search-notes,read-note,write-note,edit-note} --project …` for memory reads, writes and edits. Hub index entries and TIMELINE can also be edited directly in Markdown.
- **Mandatory size check.** After every write, run `<repo>/bin/lint.py --path <changed-file>`. Split a body over 6,000 characters into `_detail/<slug>/`. The three milestone operations all refresh or add content, so neglecting the gate causes one-way growth. Observed degradation: 21.5 KB/day. Details in `modules/update.md`.
- Derived indexes `MEMORY.md` / `INDEX.md` are generated by `bin/build-index.py`. Do not handwrite generated content. Manual edits will be overwritten.
- In auto/full, write the three stores directly without approval or reporting. The `updated` field and git provide the audit trail.
- Precedence: parent instructions verbatim in workspace task.md, then workspace artifacts, then global memory. Never delete files silently. Check for conflicts at the end of update.
- Keep domain execution pitfalls in the domain skill's memory, such as `feishu-task-management/memory.md`. They do not belong in bytedance's factual store.

## Index synchronization and maintenance

There is no `bm sync` subcommand in 0.22.1. The only synchronization path is `bm reindex`, which has no concurrency protection. Before manual execution, `pgrep -fa 'basic-memory mcp'` must return no results. Run reindex with embeddings as a detached process: foreground model loading can time out and leave orphaned chunks. The read-only commands `bm status`, `bm doctor` and `search-notes` can be used at any time.

Under normal operation there is one maintenance executor. Avoid routine manual reindex when it is running.

| Layer | Executor | Duties |
|---|---|---|
| L2 background | `~/Library/LaunchAgents/` loads `<repo>/bin/maintain.sh` (900s) | `build-index.py --check` (check only), then `lint.py --json`, then `bm reindex -p hub` (detached without waiting in this run), then write `~/Library/Logs/global-memory/lint.json`. |

L2 only reads git (`git status --porcelain` / `git rev-parse`). It never pulls, stashes, adds, commits or pushes. Committing remains a human action. Skip reindex if any of these four conditions applies: `GM_NO_REINDEX=1`, presence of `<repo>/.gm-maintenance-hold`, nonempty `git status --porcelain`, or a running `basic-memory mcp` process. Also skip starting a new run when the prior detached reindex is unfinished. To disable reindex during migration, run `touch <repo>/.gm-maintenance-hold`. Drift reconciliation and monthly TIMELINE compaction also fall under L2. There is no automatic weekly layer. Run these manually when needed.

**Verify that the executor exists.** Historically 12 specifications assigned duties to a weekly executor that did not exist. Check `ls <repo>/bin/maintain.sh` and `launchctl print gui/501/com.yunchen.global-memory-maintain`. As of 2026-11-01 this job was unregistered: no plist under `~/Library/LaunchAgents/`, launchctl reported “service not found”, and the last `maintain.sh` log was dated 2026-09-18. At that point L2 was inactive, reindex was manual, and the index regularly lagged behind disk. Report an absent executor and avoid claiming the store is current.

## Routing

| Situation | Read or run |
|---|---|
| Locate a project and check its status | `--project hub --type project` and locator card rules in `references/project-index.md`. Before P5 the filter returns 0. Fall back to group ② in `hub/MEMORY.md`. |
| List completed projects | `--project hub --status closed` (same limitation before the P5 reindex). |
| Find what happened when | Read `hub/timeline/TIMELINE.md` or use `rg` on `hub/timeline/records/` (`hub/timeline/` after P5). See `references/time-index.md` for structure. Use `--after_date` only to cross-check which files were touched. |
| Preferences and cross-task knowledge | `--project hub`. Use `--type feedback` for preference cards. |
| ByteDance ads work knowledge | `--project bytedance`. Include an entity name and verify `source.quote` on a hit. |
| Choose card `type` and `topics` | Section one of `references/knowledge.md` is the sole authoritative controlled vocabulary. Register new terms there before use. |
| Write rules and gates | `references/update-rules.md` (silent-write boundaries, mandatory limits and `lint.py` after every write). |
| Update / targeted retrieval | `modules/update.md` / `modules/recall.md` |
| Whether to record something and at what level | The `harness-management` placement table. |

## Boundaries

- Route placement questions to harness-management and workspace files to workspace-management.
- Do not depend on the `~/feishu-memory` directory name. If the legacy path exists it should symlink to `bytedance/`.
