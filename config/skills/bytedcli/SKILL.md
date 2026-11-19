---
name: bytedcli
description: "Unified skill for the bytedcli command surface. Use for ByteDance internal R&D platforms when agents should prefer bytedcli CLI/MCP/references instead of opening web pages or hand-writing APIs. Covers auth, insearch, Feishu/Lark, Jinshu, Cloud Docs/Ticket/Kani, Lark Oncall, FundEye/Fullink/TCheck, Codebase, BAM, Dora, BITS/Anywheredoor, Devflow, SCM, AGW, Argus Hybrid ticket generation, Luban, Lynx, Overpass, Goofy, Fornax, Helix, Meego, AIME, Tika, TMates, Starling, TikTok Gecko, Holmes, Byterec, Live Trace, NVQoS/vqos rootcause/space/dataset, TCE/TCC/Spark Platform/ByteFlow/ENV/ByteCopy/TrafficRoute/TOS/FaaS/TAE/Volcano/ByteCloud/Bytetree/Ent Platform/Netlink/Neptune/Settings/Kross, BMT/RDS/ByteHouse/ByteDoc/MongoDB/Merlin/Magnus/Hive/Dorado/Blade/Academy/Oceanus/Aeolus/DataQ/TQS/Forge/ES/Cache/BMQ/RMQ, Cronjob/Log/Footprint/Primus/APM/Slardar/Codecov/Archer, DKMS/KMS/IAM, ByteStable WCC, MCP."
---

# bytedcli

## Invoking bytedcli

Install globally once, then call `bytedcli` directly.

```bash
# Recommended: install globally, then invoke bytedcli directly
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npm install -g @bytedance-dev/bytedcli@latest
bytedcli <command> [options]
```

```bash
# Fallback: use npx for a one-off invocation only if global installation is impossible
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest <command> [options]
```

- Default to the globally installed `bytedcli ...`. Keep `npx -y @bytedance-dev/bytedcli@latest` out of automation and routine calls.
- Only if the environment cannot run `npm install -g` (for example, an ephemeral container or CI without write access), replace `bytedcli` in the examples with `NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest`.

Use this entry point to identify the command domain for a ByteDance internal development platform, then read its guide as needed.

## How to use

0. **Consult the `bytedance` knowledge base first.** This skill covers the official interface (commands, parameters, schemas). Practical platform usage, metric definitions, experimental findings, mechanisms, historical decisions and known pitfalls live in the `global-memory` repository's BM project **`bytedance`** (directory `bytedance/`). Search it before internal platform or advertising algorithm work.
   ```
   <repo>/bin/bm tool search-notes --project bytedance "<your question>"
   ```
   `<repo>` is the `global-memory` repository root. Alternatively, use MCP `search_notes` with `project=bytedance`. Use matches directly after checking that the fact's `source.quote` is current. Queries with names or entities work best.
   Relevant domains include `platforms` (internal platform catalog, 167 cards), `ad-algo-core` (advertising algorithms, formulas and structures, 145 cards), `psort-recall`, `project-cid-recall`, `signal-pixel`, `experiment-method` (A/B methods and parameters), `ads-foundation`, `ops` and `weekly-notes`.
   The two resources complement each other. This guide gives command syntax. `bytedance` describes real-world failures and how to calculate a metric. Skipping it can duplicate earlier investigations.

1. Identify the platform or object type.
2. Select the command domain, then run its bytedcli command.
3. For stable machine-readable output, place `--json` before `<domain>` by default.
4. Check `--help` before using an unfamiliar command or parameter.
5. Prefer console URLs, document URLs and automatic repository-context inference wherever supported.

## Quick start

```bash
bytedcli --help
bytedcli --json auth status
bytedcli <domain> --help
bytedcli self update --check
bytedcli self skill list --installed -g
bytedcli self skill update -g
bytedcli self tracking enable
bytedcli self plugin install --repo demo-tools/plugin-demo
bytedcli self plugin list
bytedcli self plugin doctor --name demo-tools
```

## Self-management and skill updates

A global bytedcli installation checks the CLI and installed skill versions during ordinary commands. The `self` commands do not trigger auto-upgrade. Disable automatic upgrades with either the global option or the environment variable.

```bash
bytedcli --no-auto-upgrade <domain> <command> [options]
export BYTEDCLI_NO_AUTO_UPGRADE=1
```

Manage bundled agent skills with `self skill`. Do not delete their directories manually.

```bash
bytedcli self skill list
bytedcli self skill list --installed
bytedcli self skill install -s bytedance-feishu -g
bytedcli self skill install --all -g
bytedcli self skill update -g
bytedcli self skill remove -s bytedance-feishu -g
```

- `-g/--global` selects `~/.agents/skills/`. Omitting it selects the current project's `.agents/skills/`.
- `self skill remove` removes both the directory and the entry in `~/.local/share/bytedcli/data/skill-lock.json`. Deleting only the directory can leave a lock entry that restores the skill at the next upgrade.

## Production network (prod)

On VA, Maliva or a production development machine, run `export BYTEDCLI_NETWORK_PROFILE=prod` before calling i18n-tt, i18n-bd or sg commands. Skip this on the office network.

## Route by task

- Login, status, JWT and user information: `auth`
  - Examples: Log me in. Show the current account. Get a Codebase JWT.
- Repositories, MRs, issues, reviews, CI, files and cross-repository search: `codebase`
  - Examples: Show this MR. Reply to a comment on this MR. Check CI for this repository.
- Code review: `bits-code-guard` (full review skill), `code-review` (CLI for a repository's custom review rules and workflows).
  - Examples: Review this MR's code. Review my changes. Check this snippet for bugs.
  - List a repository's custom rules or workflows with `bytedcli code-review rule list --repo group/project` or `bytedcli code-review workflow list --repo group/project`. `--repo` also accepts code.byted.org SSH/HTTPS remote URLs or can be inferred inside the repository.
- Development task management (create release tasks, inspect details and deployment status, search tasks, query projects and requirements): `devflow`
  - Examples: Create a release task. Show this Devflow task's details. Find my release tasks. List this space's projects. List this project's requirements.
- FTF system tests, aggregate reports, diff details and TeslaX plans: `ftf` / `bytedance-ftf`
  - Examples: Show this FTF task. Show a method's FTF aggregate report. Fetch diff value details. Trigger an FTF plan.
- Dora cloud devices and phones: `dora` / `bytedance-dora`
  - Examples: Find Dora cloud devices. Request a cloud phone. Get the Dora ADB address.
- BITS development tasks, pipelines, MRs, releases, Anywheredoor proxy captures and mocks: `bits` / `bytedance-bits`
  - Examples: Show the BITS pipeline. Retry this jobRun. Debug an Anywheredoor capture. List devices. Convert a capture to curl. Create, start or stop a mock.
  - Use `bytedcli bits anywhere ...` for Anywheredoor. It has no top-level domain. See [references/subskills/bytedance-bits/references/anywheredoor.md](references/subskills/bytedance-bits/references/anywheredoor.md).
- ByteFlow workflow engine, app/state machine/revision queries, workflow JSON/ASL validation and safe write helpers: `bytedance-byteflow`
  - Examples: Find a ByteFlow app or state machine. Validate this workflow JSON. Create or update a ByteFlow revision.
- LG Admin Torch releases, image publishing, payloads matching the build-history page, cpu/cuda/mlu Torch versions, and advanced options such as use cache, skip arm and image rebuild: `lg-admin torch`
  - Route explicit ICM queries (ICM prod, release history, recent releases, build commit, build repository or repo/build information) to top-level `icm` first. Terms such as `lagrange`, `torch`, `cpu`, `cuda` or `mlu` in a product, package or repository name cannot alone trigger `lg-admin`. Do not suggest or try `lagrange torch`.
  - Examples: Release an lg-admin Torch DEV build/version → `lg-admin torch release package build`. Publish an LG image or LG Torch image → `lg-admin torch release image build`.
- Academy advertising feature development and management (source_v2, raw feature set groups and feature search): `academy`
  - Examples: Does Academy have this source? Search for a raw feature set group. Find an online feature by keyword.
- Feishu/Lark documents, comments, calendar, tasks, messages, spreadsheets and Base: `feishu`
  - Examples: Read this Lark document. Append a paragraph. Send someone a Feishu message.
- People self-service leave history and full-/half-day requests: `people`
  - Examples: How many days of leave have I taken today? Request one day of annual leave. Submit a retroactive half-day request for this afternoon.
- Jinshu / Cloud Jinshu message preview and delivery: `jinshu`
  - Examples: Preview this Jinshu message. Send this Jinshu message.
- Lark Oncall tickets, tag/attribution metadata, oncall group messages and duty information: `lark-oncall` / `bytedance-lark-oncall`
  - Examples: Find this business line's oncall tickets for the past 7 days. Get the oncall group chat for a ticket. List oncall tag/attribution options.
- VOC feedback details (Douyin CEM user feedback, cem.bytedance.net): `voc` / `bytedance-voc`
  - Examples: Show this VOC feedback. Get feedback from a VOC console URL. Get the feedback list from a shared link. Check whether the local VOC authentication cookie is still present.
- Vimo Web template resource lookup and ZIP downloads: `vimo` / `bytedance-vimo`
  - Examples: Download this Vimo template package. Get a ZIP using a Vimo template RID. Parse template_id from an lv.ulikecam.com sharevideo link and download the template.
  - `bytedcli vimo` only handles Vimo Web template RID/URL queries and ZIP downloads. Use `vimocli` for asset CRUD, panels, categories, uploads, publishing and service-account OpenAPI workflows.
- FundEye/Fullink reconciliation rules, diffs and alerts: `fundeye`
  - Examples: Show rule details. Get the last day's diff by rule_id. Look up the diff for an alarm_order_id.
- Starling copy platform, projects, spaces and copy search: `starling`
  - Examples: Show this Starling project. Create a Starling space. Search for a copy key.
- Luban npm package lookup and PyPI artifact repository search, version queries and publishing: `luban`
  - Examples: Does Luban have a particular TTP-US npm package? Show a package's 2.1.x versions. Find a Luban PyPI repository by pip package name. List its versions. Publish a PyPI version from master, dry-run first, then confirm publication and poll the result.
- Lynx tools and LynxExample artifact metadata/downloads: `lynx`
  - Examples: Find LynxExample artifacts. Download the LynxExample Android package.
- Argus Hybrid ticket generation: `argus hybrid`
  - Examples: Bind a Gecko channel to a Lynx app. Add a safe URL to an H5 app. Request H5/Lynx JSB permission. Request a secure method. Search for a host label.
  - The current identity comes from `bytedcli auth userinfo`. Argus Hybrid OpenAPI creates a ticket only by default, without executing it. `--hosts` supports fuzzy label-only search. A unique host or host group resolves automatically. Multiple matches return candidates.
- Mango task management: `bytedance-mango`
  - Examples: Log in to Mango. List Mango spaces. Query Mango tasks.
- Read-only Gecko CN console queries (diagnostics, App, Project, Deployment, Channel overview/groups/inspection, offline rule tree, packages and workflow/tag/scan/stats subresources): `gecko`
  - Examples: Show a Gecko CN channel's details. List its offline packages. View package processing logs.
- Read-only TikTok Gecko console queries (workbench, App, Channel, Ticket, Host App and Deployment): `tiktok-gecko`
  - Examples: Show a Gecko channel's details. List all channels in a deployment. Filter Gecko tickets by creator.
- Technical articles, knowledge Q&A, AI conversations and attachment prompts: `bitsai`, `tika`, `aime`.
- AI Dev Pro AFS / Agent File System development knowledge (code, interfaces, PSMs, call graphs, DB callers and FE wiki): `ai-dev-pro afs`
  - Examples: Show this PSM's interface parameters. Search for a code entity. Find an interface's downstream calls. Look up a PSM's AGENTS.md knowledge.
- Internal search (Feishu docs, ByteCloud docs, intranet, ByteTech articles, BitsAI Q&A) and read-only GET of internal URLs: `insearch`
  - Examples: Search for kitex ppe environments. Find a BMQ integration guide in Feishu documents. Ask BitsAI how to configure TCC. GET this internal endpoint using the current login.
  - Read internal HTTP(S) URLs with `insearch get <url>`. Allowed URLs that cannot be parsed structurally fall back automatically to read-only GET.
- SQL, database platforms, data assets, reports and offline tasks: `rds` (subgroups `db`/`slow`/`alert`/`ops`/`bpm`), `bytedoc` (ByteDoc/MongoDB), `tokadb` (TokaDB/Bytetable), `hive`, `magnus` (read-only Magnus GLS catalog, database, table and schema metadata), `dorado` (subgroups `project`/`task`/`instance`/`adhoc`), `blade` (subgroup `task`, currently supports `task get` and `--region mycis`, preferentially reuses the `blade.byteintl.net` site cookie and a fresh ByteCloud JWT), `oceanus` (subgroups `project`/`tree-node`/`node`/`task`), `aeolus`, `dataq`, `tqs`, `forge`.
  - Examples: Find the ByteDoc databases I follow. Show slow queries for this database. Execute SQL. Find the dataset behind this dashboard.
  - For hive-sql syntax checks, SQL task submission, status and results, use `tqs`.
- TEA / tea-next dashboards, reports, snapshots, DSL, analysis queries, behavior details, event metadata and reporting: `tea` / `bytedance-tea`
  - Examples: Read this TEA link's data. Extract DSL from a tea-next snapshot and query it. Group an event by dimension. Query the behavior-detail stream.
  - For a tea-captain SG link using `get-dsl | query`, pass the same `--url` at the query stage. See [references/subskills/bytedance-tea/GUIDE.md](references/subskills/bytedance-tea/GUIDE.md).
- NVQoS / VQoS spaces, datasets and intelligent attribution: `nvqos` / `bytedance-nvqos`
  - Examples: List datasets in an NVQoS space. Trigger rootcause attribution analysis. Start attribution using Filters JSON.
- Eventbus CN-only event details: `eventbus-cn`
  - Examples: Show this domestic CN event's details. Confirm its bound topics. Verify Eventbus OpenAPI availability.
  - Only domestic CN/BOE is supported. This skill does not support i18n, US or EU users.
- BMT multi-tenant services, tags, resources, isolation sets and user roles: `bmt`
  - Examples: Find the BMT service by PSM. Show the RDS or RocketMQ resources bound to this PSM. Find connection information for a BMT resource code.
- Forge task logs: `forge logs`
- Chronos scheduling platform: `chronos`
  - Examples: List namespaces with pagination. List tasks by namespace. Show the HTTP scheduling link and alert recipients by task_id.
- OneService query metadata, version details and SQL extraction: `oneservice`
  - Examples: Show this OneService query's metadata. Get the current ONLINE SQL by queryId. Show query details by versionId.
- Holmes TBase products, fields, submission of new fields for review and row-key queries: `holmes tbase` / `bytedance-holmes-tbase`
  - Examples: Get this TBase product's configuration. List product fields. Submit a new field for review. Query multiple fields or all-fields by row key.
- Byterec index service product information, configuration and model configurations, Viking service config queries/flag updates/ByteKV deployment, Viking DB debugging/resource queries, and Holmes proto/record debugging for the same component: `byterec indexservice` / `byterec model list` / `byterec viking` / `holmes indexservice` / `bytedance-byterec-indexservice`
  - Examples: Show Byterec indexservice product details. Find the Byterec config by PSM. Find Viking service config or flags by PSM. Dry-run a Viking service config flag change. Deploy the config to ByteKV and return the review URL. List models/versions in a Byterec namespace. Check whether a model is bound to Viking serving. Run Viking DB DSL recall. Inspect a Viking DB database/model. List Holmes IndexService protos. Read an IndexService record with explicit parameters.
- Merlin job submission/YAML extraction, job runs and job-to-trial resolution, trial diagnose/local-log, job/trial stdout/stderr, tracking projects/runs/metrics/job links, and read-only group/cluster queries for `merlin` compute quotas: `merlin`
  - Examples: Extract this Merlin job's YAML. Resubmit this `trial.yaml` to `seed-cn`. Show this tracking run's config/summary. Find the tracking link by job ID. Get this trial's stdout/stderr. Find out why this trial is still queued.
- Helix model and AI task lifecycle, currently covering Video AIPF data preparation, training/evaluation submissions, status, stopping and history: `helix`
  - Examples: Submit Video AIPF data preparation. Submit a Video AIPF training task. Check Helix evaluation status. Stop this Video AIPF Ray evaluation. Find recent Helix training records.
- Fornax prompt workspaces, drafts, versions, publishing, experiment creation and results: `fornax`
  - Examples: List prompts in this Fornax workspace. Read a personal prompt draft. Publish this prompt to ppe. Get the first page of experiment results. Configure a Fornax experiment's AK/SK or JWT.
- BES metadata change tickets: `bes`
  - Examples: `bytedcli bes metadata update --config '{"title":"demo-ticket"}'`
- Kani permission approvals: `kani`
  - Examples: Find tickets on the Kani request page. Show completed approvals from the reviewer's perspective.
- Expense reports and draft AI subscription reimbursements: `reimbursement`
  - Examples: Find recent reports. Check this report. Create an AI learning/research reimbursement draft from this subscription receipt. Close/delete the draft. Submit the report after confirmation.
- Configuration centers, lookup, creation, updates, publishing and access requests: `tcc` (subgroups `namespace`/`config`/`deployment`/`env`/`site`/`permission`), `bytestable` (subgroups `wcc` and `qcss`).
  - Examples: List configurations in a TCC namespace. Update and publish a TCC configuration. Request namespace read/write access. Create a WCC configuration. Update a WCC value. Open a WCC configuration ticket. Pass a QCSS check.
- Deployments, environments, ByteCopy, service tree, TrafficRoute PrivateZone, domain governance, object storage, cloud functions, Ent Platform Storage IAC new-table workflows/existing-table entry imports/field annotation validation, and MOSS test asset platform queries: `tce`, `env` (subgroups `site`/`service`/`bytecopy`/`device`/`ticket`), `bytetree`, `ent`, `trafficroute`, `goofy`, `netlink`, `neptune`, `tos`, `faas`, `volcano`, `bytecloud`, `moss`.
  - Examples: Find service instances. Show the release ticket. Update configuration. Make a Goofy preview. Submit a new-table workflow through Ent Platform. Import an existing RDS table into a Storage IAC entry. Query PrivateZone zone/record/resolver in TrafficRoute.
- TAE / AI PaaS (prefer `bytedcli tae mcp ...` for MCP Server/Tool. Use internal API guides for uncovered Agent, Sandbox, Memory and Skill capabilities): `bytedance-tae`
  - Examples: Bulk register RPC tools on a TAE MCP Server. Fix MCP Input Schema. Convert HTTP tools to RPC. Publish an MCP server revision. Research TAE Agent/Sandbox/Memory APIs.
- Read-only TMates sandbox run / managed agent / managed-agent space debugging: `tmates` / `bytedance-tmates`
  - Examples: Show the run details for this TMates share URL. Show the MP2C Regression Steward Agent config summary. Check whether the current bytedcli JWT can call TMates OpenAPI.
  - Only read-only commands are registered. Write paths such as reply/stop/update/archive are not exposed. Use `--site i18n-tt` for the TikTok ROW gateway.
- Janus / Janus Mini lanes, groups, configurations, IDL, endpoints, backends and release workflows: `janus` / `janus-mini` / `bytedance-janus` / `bytedance-janus-mini`
  - Examples: Create a Janus lane. Query a Janus Mini group's service_type. Create an endpoint/backend. Create a publish workflow and check its status.
- Spark Platform spaces and link resources: `spark-platform`
  - Examples: List Spark spaces. List links by business-line bid. Find links in a space. Use `link get` for the complete raw link, including all versions and original deployConfig. Use `link summary` for the latest released version and parsed schema, including schemaUrl, bundle and bundlePath. List a link's env configurations. Set its PPE env, inspecting the payload with `--dry-run` before executing. Delete an env. Specify a nondefault `--app-id`.
- Kross cross-platform container environments (workloads), listing, creation, remote execution and file transfers: `kross`
  - Examples: Use `kross workspace list` to find my workspaces, `kross template list` to find the workspace's available templates on the current cluster, then `kross workload list` to see existing workloads. Create a job workload directly. Quick create defaults to 1000m CPU, 2048 MB memory, 300 seconds timeout and automatic deletion. Delete a workload. Run a command in a workload container via webshell. Upload or download a container file.
- Logs, Footprint/TCE pod file logs, Megatron/Primus concrete log URL downloads, monitoring, alerts, dashboards, Kubernetes object lifecycle traces, app exception trends, App/OS symbols, Redis/ABase/Kafka/RocketMQ/EventBus and Vela per-machine metrics: `log` (Footprint uses `log footprint`), `apm` (subgroups `service`/`redis`), `kelemetry`, `slardar` (subgroups `web`/`app`/`os`), `vela` (subgroup `one-machine`), `cache`, `abase`, `bmq`, `eventbus-cn`, `rmq`.
  - Examples: Find this logid. Download this Footprint/mljob-log-proxy log URL. Tail a Footprint pod log file. Find an interface's overall bottleneck first. Show per-node latency by logid. Get a K8s object's Kelemetry trace. Find large Redis keys. Analyze this alert page. Look up metrics on this Vela one-machine page. Use the Slardar dashboard URL to inspect the configuration or change its title. Retrace a native stack from a Slardar App issue URL. Resolve the main-thread native stack from a Slardar OS issue URL. Search RocketMQ topics. List RocketMQ consumer groups.
- Primus History task summaries, AM environment variables, newStatus, role pods, log indexes, CRDs and Pod lifecycle: `primus` / `bytedance-primus`
  - Examples: Find why a Primus app failed. Get a role pod's log index. Show the Primus CRD and Pod lifecycle.
- ByteDog profiling: `bytedog`
  - Examples: Capture a CPU flame graph. Analyze profiling results at this ByteDog URL. Find past profiling tasks. Check the PID in this pod first. Analyze pthread lock contention. Show a jemalloc allocation flame graph.
- Libra / DataTester A/B experiments, metric groups and metric group templates: `libra`
  - Examples: Show this experiment's details. Get this flight's report. Inspect a metric-group template using its page URL.
- Tesla RM automated testing (trigger/query tasks, wait for runs, list tasks, attribute failures, test plan CRUD and statistics): `tesla`
  - Examples: Trigger a Tesla task for plan 507863 and wait for results. Check its status and failed cases. List this plan's tasks for the past 7 days. Show plan execution statistics.
- TestIDE / SmartQ (Little Q) UI automation, reading suites, steps and fragment references, creating/updating suites and steps, creating test tasks and querying progress/results: `smartq`
  - Examples: Read this TestIDE suite's automation steps and referenced fragments. Create a Little Q UI test task. Get TestIDE task results.
- Panama RPC tool execution: `panama rpc execute`
  - Examples: Call an RPC method with Panama. Execute this RPC body through Panama. Inspect Panama assertion results.
- OneService queries: `oneservice`
  - Examples: Show query metadata. Get query version details. Get the current ONLINE version's SQL.
- Life local-services live analytics platform: `life live-screen`
  - Examples: Show core live dashboard metrics by room ID. Get user information by host nickname, host ID, Douyin account or live room ID.
- Live Trace / message delivery diagnostics: `live trace`
  - Examples: Start ack_trace. Show details for this task_id. Parse this pb_payload.
- ByteIO event instrumentation, requirements, tracking points, test cases and advertising metadata: `bytedance-byteio`
  - Examples: Check whether this event_name exists under app_id. Validate this instrumentation parameter. Look up ByteIO requirement details/BTM tracking points/test cases/ad tags.
- Cross-region data exchange: `decc`
  - Examples: Create a DECC channel. Register DECC data. Request channel access.
- Security and access: `dkms`, `kmsv2`, `iam`
  - Examples: Check data key permissions. Add an ACL to a key. Find an employee.
- Chaos engineering, fault injection and exercise planning: `chaos`
  - Examples: Create a drill for xxx with an 80% CPU restriction lasting 300 s, using a new isolated environment and the latest rhino traffic.
- Dataleap Pontus cost and asset management, including Hive table storage size and growth: `pontus` / `bytedance-pontus`
  - Examples: Query a Hive table's storage size and growth.
- Expose bytedcli to its host, upgrade the local installation or manage trusted CLI plugins: `mcp`, `self`

## Common inputs

- Use MR, issue, document, configuration and alert console URLs directly before extracting IDs manually.
- For Footprint, `footprint.tiktok-row.net`, Primus `redirect_log.html` or a concrete `mljob-log-proxy` file URL, use the Log domain and `bytedcli log footprint ...`. There is no top-level `bytedcli footprint`. A Primus/History mljob landing URL is not a downloadable log file. Check `logResolutionStatus` from `primus log get` first. `landing-only` means the log backend exposed no concrete file.
- For Meego, use the work-item or view URL directly. Many commands accept `--url` to populate `project_key`, `work_item_id`, `view_id` and related identifiers.
- From a repository directory, let Codebase infer the repository from `origin`. It supports `code.byted.org` and `code-tx.byted.org` remotes. On failure, the CLI distinguishes a non-Git directory, missing `origin`, unsupported host and unparseable remote.
- For cross-site tasks, confirm `--site` or `BYTEDCLI_CLOUD_SITE` first.
- On failure, check `error.hint` and `error.auth_command` first, or consult the troubleshooting guide.

## Domain guides

Once the domain is clear, read its guide.

- Codebase: [references/subskills/bytedance-codebase/GUIDE.md](references/subskills/bytedance-codebase/GUIDE.md)
- Code Review: [references/subskills/bits-code-guard/GUIDE.md](references/subskills/bits-code-guard/GUIDE.md)
- Dora: [references/subskills/bytedance-dora/GUIDE.md](references/subskills/bytedance-dora/GUIDE.md)
- BITS / Anywheredoor: [references/subskills/bytedance-bits/GUIDE.md](references/subskills/bytedance-bits/GUIDE.md)
- Feishu: [references/subskills/bytedance-feishu/GUIDE.md](references/subskills/bytedance-feishu/GUIDE.md)
- Jinshu: [references/subskills/bytedance-jinshu/GUIDE.md](references/subskills/bytedance-jinshu/GUIDE.md)
- Lark Oncall: [references/subskills/bytedance-lark-oncall/GUIDE.md](references/subskills/bytedance-lark-oncall/GUIDE.md)
- VOC: [references/subskills/bytedance-voc/GUIDE.md](references/subskills/bytedance-voc/GUIDE.md)
- Vimo: [references/subskills/bytedance-vimo/GUIDE.md](references/subskills/bytedance-vimo/GUIDE.md)
- FundEye: [references/subskills/bytedance-fundeye/GUIDE.md](references/subskills/bytedance-fundeye/GUIDE.md)
- Starling: [references/subskills/bytedance-starling/GUIDE.md](references/subskills/bytedance-starling/GUIDE.md)
- Luban: [references/subskills/bytedance-luban/GUIDE.md](references/subskills/bytedance-luban/GUIDE.md)
- Lynx: [references/subskills/bytedance-lynx/GUIDE.md](references/subskills/bytedance-lynx/GUIDE.md)
- Argus Hybrid: [references/subskills/bytedance-argus/GUIDE.md](references/subskills/bytedance-argus/GUIDE.md)
- TCC: [references/subskills/bytedance-tcc/GUIDE.md](references/subskills/bytedance-tcc/GUIDE.md)
- Chronos: [references/subskills/bytedance-chronos/GUIDE.md](references/subskills/bytedance-chronos/GUIDE.md)
- BES: [references/subskills/bytedance-bes/GUIDE.md](references/subskills/bytedance-bes/GUIDE.md)
- WCC / QCSS: [references/subskills/bytedance-bytestable-wcc/GUIDE.md](references/subskills/bytedance-bytestable-wcc/GUIDE.md)
- TCE: [references/subskills/bytedance-tce/GUIDE.md](references/subskills/bytedance-tce/GUIDE.md)
- ENV / ByteCopy: [references/subskills/bytedance-env/GUIDE.md](references/subskills/bytedance-env/GUIDE.md)
- Ent Platform / UDS Storage IAC: [references/subskills/bytedance-ent/GUIDE.md](references/subskills/bytedance-ent/GUIDE.md)
- TrafficRoute: [references/subskills/bytedance-trafficroute/GUIDE.md](references/subskills/bytedance-trafficroute/GUIDE.md)
- ByteSD: [references/subskills/bytedance-sd/GUIDE.md](references/subskills/bytedance-sd/GUIDE.md)
- TQS: [references/subskills/bytedance-tqs/GUIDE.md](references/subskills/bytedance-tqs/GUIDE.md)
- Kross: [references/subskills/bytedance-kross/GUIDE.md](references/subskills/bytedance-kross/GUIDE.md)
- Bytetree: [references/subskills/bytedance-bytetree/GUIDE.md](references/subskills/bytedance-bytetree/GUIDE.md)
- BMT: [references/subskills/bytedance-bmt/GUIDE.md](references/subskills/bytedance-bmt/GUIDE.md)
- RDS: [references/subskills/bytedance-rds/GUIDE.md](references/subskills/bytedance-rds/GUIDE.md)
- ByteHouse: [references/subskills/bytedance-bytehouse/GUIDE.md](references/subskills/bytedance-bytehouse/GUIDE.md)
- TEA: [references/subskills/bytedance-tea/GUIDE.md](references/subskills/bytedance-tea/GUIDE.md)
- NVQoS: [references/subskills/bytedance-nvqos/GUIDE.md](references/subskills/bytedance-nvqos/GUIDE.md)
- ByteFlow: [references/subskills/bytedance-byteflow/GUIDE.md](references/subskills/bytedance-byteflow/GUIDE.md)
- LG Admin: [references/subskills/bytedance-lg-admin/GUIDE.md](references/subskills/bytedance-lg-admin/GUIDE.md)
- Blade: [references/subskills/bytedance-blade/GUIDE.md](references/subskills/bytedance-blade/GUIDE.md)
- Magnus: [references/subskills/bytedance-magnus/GUIDE.md](references/subskills/bytedance-magnus/GUIDE.md)
- OneService: [references/subskills/bytedance-oneservice/GUIDE.md](references/subskills/bytedance-oneservice/GUIDE.md)
- Merlin: [references/subskills/bytedance-merlin/GUIDE.md](references/subskills/bytedance-merlin/GUIDE.md)
- MOSS: [references/subskills/bytedance-moss/GUIDE.md](references/subskills/bytedance-moss/GUIDE.md)
- Helix: [references/subskills/bytedance-helix/GUIDE.md](references/subskills/bytedance-helix/GUIDE.md)
- Holmes TBase: [references/subskills/bytedance-holmes-tbase/GUIDE.md](references/subskills/bytedance-holmes-tbase/GUIDE.md)
- Byterec Indexservice: [references/subskills/bytedance-byterec-indexservice/GUIDE.md](references/subskills/bytedance-byterec-indexservice/GUIDE.md)
- AI Dev Pro AFS: [references/subskills/bytedance-ai-dev-pro/GUIDE.md](references/subskills/bytedance-ai-dev-pro/GUIDE.md)
- Recall Center: [references/subskills/bytedance-recall-center/GUIDE.md](references/subskills/bytedance-recall-center/GUIDE.md)
- AI Dev Pro AFS: [references/subskills/bytedance-ai-dev-pro/GUIDE.md](references/subskills/bytedance-ai-dev-pro/GUIDE.md)
- TMates: [references/subskills/bytedance-tmates/GUIDE.md](references/subskills/bytedance-tmates/GUIDE.md)
- Fornax: [references/subskills/bytedance-fornax/GUIDE.md](references/subskills/bytedance-fornax/GUIDE.md)
- Meego: [references/subskills/bytedance-meego/GUIDE.md](references/subskills/bytedance-meego/GUIDE.md)
- Libra: [references/subskills/bytedance-libra/references/libra.md](references/subskills/bytedance-libra/references/libra.md)
- Tesla: [references/subskills/bytedance-tesla/GUIDE.md](references/subskills/bytedance-tesla/GUIDE.md)
- SmartQ / TestIDE: [references/subskills/bytedance-smartq/GUIDE.md](references/subskills/bytedance-smartq/GUIDE.md)
- Panama: [references/subskills/bytedance-panama/references/panama.md](references/subskills/bytedance-panama/references/panama.md)
- FTF: [references/subskills/bytedance-ftf/GUIDE.md](references/subskills/bytedance-ftf/GUIDE.md)
- FaaS: [references/subskills/bytedance-faas/GUIDE.md](references/subskills/bytedance-faas/GUIDE.md)
- TAE / AI PaaS: [references/subskills/bytedance-tae/GUIDE.md](references/subskills/bytedance-tae/GUIDE.md)
- Log / Footprint: [references/subskills/bytedance-log/GUIDE.md](references/subskills/bytedance-log/GUIDE.md)
- Primus: [references/subskills/bytedance-primus/GUIDE.md](references/subskills/bytedance-primus/GUIDE.md)
- Archer: [references/subskills/bytedance-archer/GUIDE.md](references/subskills/bytedance-archer/GUIDE.md)
- ByteDog: [references/subskills/bytedance-bytedog/GUIDE.md](references/subskills/bytedance-bytedog/GUIDE.md)
- Kelemetry: [references/subskills/bytedance-kelemetry/GUIDE.md](references/subskills/bytedance-kelemetry/GUIDE.md)
- Slardar: [references/subskills/bytedance-slardar/GUIDE.md](references/subskills/bytedance-slardar/GUIDE.md)
- Vela: [references/subskills/bytedance-vela/GUIDE.md](references/subskills/bytedance-vela/GUIDE.md)
- Devflow: [references/subskills/bytedance-devflow/GUIDE.md](references/subskills/bytedance-devflow/GUIDE.md)
- Academy: [references/subskills/bytedance-academy/GUIDE.md](references/subskills/bytedance-academy/GUIDE.md)
- Safe: [references/subskills/bytedance-safe/GUIDE.md](references/subskills/bytedance-safe/GUIDE.md)
- Life: [references/subskills/bytedance-data-life-live/GUIDE.md](references/subskills/bytedance-data-life-live/GUIDE.md)
- Live Trace: [references/subskills/bytedance-live/GUIDE.md](references/subskills/bytedance-live/GUIDE.md)
- ByteIO: [references/subskills/bytedance-byteio/GUIDE.md](references/subskills/bytedance-byteio/GUIDE.md)
- Janus: [references/subskills/bytedance-janus/GUIDE.md](references/subskills/bytedance-janus/GUIDE.md)
- Janus Mini: [references/subskills/bytedance-janus-mini/GUIDE.md](references/subskills/bytedance-janus-mini/GUIDE.md)
- Search: [references/subskills/bytedance-insearch/GUIDE.md](references/subskills/bytedance-insearch/GUIDE.md)
- People: [references/subskills/bytedance-people/GUIDE.md](references/subskills/bytedance-people/GUIDE.md)
- Reimbursement: [references/subskills/bytedance-reimbursement/GUIDE.md](references/subskills/bytedance-reimbursement/GUIDE.md)
- Other domain paths: [references/subskills-index.md](references/subskills-index.md)

## References

- `references/command-surface.md`
- `references/invocation.md`
- `references/troubleshooting.md`
