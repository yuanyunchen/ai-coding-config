---
name: bytedance-ftf
description: "Use when working with FTF system-level test tasks, Tesla-X task/flow URLs, aggregate reports, diff clusters, diff details, FTF diff root-cause analysis, code diff correlation, TeslaX plans, or bytedcli ftf commands."
---

# bytedcli FTF

## When to use

- 查询 FTF 任务、PSM、方法、聚合报告或 replay flow
- 分析 Tesla-X FTF task / flow diff URL，并分析 task 下 diff cluster
- 查看 FTF diff 记录、字段差异、相似 diff 分组或 inbound diff 查询
- 对 FTF task / flow diff 做根因分析、优先级排序或代码 diff 关联判断
- 触发 TeslaX / FTF 计划，或重试、停止已有任务

## Diff Analysis References

当用户要求“分析 FTF diff”“看 task 为什么有 diff”“判断是不是代码引入”“给 flow diff 归因”时，先按输入类型读取 reference：

| 输入或目标                                                 | 读取                                    |
| ---------------------------------------------------------- | --------------------------------------- |
| 要完整跑一次 diff 归因（标准流程、报告结构、常见误判）     | `references/diff-analysis.md`（编排层） |
| 术语口径、录制回放模型、任务形态、证据可见性边界           | `references/domain-model.md`            |
| FTF task URL、task id、一批 diff cluster（宏观选谁深挖）   | `references/task-diff-triage.md`        |
| flow diff URL、单条 record、字段差异、logid 根因           | `references/flow-diff-root-cause.md`    |
| 随机值 diff、数组乱序 diff 的降噪检查                      | `references/diff-denoise.md`            |
| 本地 git diff、Codebase MR、commit/branch 与 FTF diff 关联 | `references/code-diff-correlation.md`   |
| diff 取数命令、参数、JSON 输出和 API 形态                  | `references/diff-query-reference.md`    |
| TeslaX Plan CRUD、深字段 IDL、写操作保护                   | `references/plan-crud.md`               |
| FTF task/report/flow OpenAPI 字段和 CLI 映射               | `references/task-openapi.md`            |
| FTF OpenAPI 数字枚举、任务终态和协议口径                   | `references/enums.md`                   |

如果用户只给了 Tesla-X URL，先用 `bytedcli --json ftf target parse --url "<ftf-url>"` 判断 URL 类型，不要手工拆 URL。

## Quick Start

需要机器可读结果时，把 `--json` 放在 `ftf` 前面：

```bash
bytedcli --json ftf task get --task-id 1234567
bytedcli --json ftf target parse --url "<ftf-url>"
bytedcli --json ftf task get --url "<ftf-task-url>"
bytedcli --json ftf task evidence get --url "<ftf-task-url>" --page 1 --page-size 20 --top-n 10 --sample-size 3
bytedcli --json ftf diff path-profile get --url "<ftf-task-url>" --psm example.psm --method GetDemo --sample-size 20
bytedcli --json ftf diff array-check get --url "<ftf-task-url>" --similar-diff-id sample-similar-diff --key sample_id --sample-size 5
bytedcli --json ftf task analyze --url "<ftf-task-url>" --method GetDemo --with-values --sample-values 3 --with-similar-cases
bytedcli --json ftf flow diff get --url "<ftf-flow-diff-url>" --with-values --with-outbound
bytedcli --json ftf report method --task-id 1234567 --psm example.psm --method GetDemo
bytedcli --json ftf diff value --psm-task-id 123456701001 --record-id 1000000000001
bytedcli --json ftf diff-attribution get --record-id 1234567_sample_record
bytedcli --json ftf plan get --space-id 1000 --plan-id 2000
```

## Common Commands

```bash
# 任务与报告
bytedcli ftf task get --task-id 1234567
bytedcli ftf task get --url "<ftf-task-url>"
bytedcli ftf task list --page 1 --page-size 20 --psm example.psm
bytedcli ftf aggregate task --task-id 1234567
bytedcli ftf aggregate psm --task-id 1234567 --psm example.psm
bytedcli ftf report method --task-id 1234567 --psm example.psm --method GetDemo

# 方法与流量
bytedcli ftf psm get --psm example.psm
bytedcli ftf method list --psm example.psm
bytedcli ftf method search --psm example.psm --payload '{}'
bytedcli ftf flow list --task-id 1234567 --psm example.psm --method GetDemo --page 1 --page-size 20
bytedcli ftf flow get --task-id 1234567 --pid sample-pid
bytedcli ftf flow diff get --url "<ftf-flow-diff-url>" --with-values --with-outbound

# diff 明细
bytedcli ftf target parse --url "<ftf-url>"
bytedcli ftf task evidence get --url "<ftf-task-url>" --page 1 --page-size 20 --top-n 10 --sample-size 3
bytedcli ftf diff path-profile get --url "<ftf-task-url>" --psm example.psm --method GetDemo --sample-size 20
bytedcli ftf diff array-check get --url "<ftf-task-url>" --similar-diff-id sample-similar-diff --key sample_id --sample-size 5
bytedcli ftf task diff-cluster list --url "<ftf-task-url>" --direction all --method GetDemo --sort diff-count-desc --top 20
bytedcli ftf task diff-cluster get --url "<ftf-task-url>" --similar-diff-id sample-similar-diff --with-values --sample-values 3 --with-similar-cases
bytedcli ftf diff record --psm-task-id 123456701001 --record-id 1000000000001
bytedcli ftf diff value --psm-task-id 123456701001 --record-id 1000000000001
bytedcli ftf diff similar --psm-task-id 123456701001 --method GetDemo
bytedcli ftf diff-attribution get --record-id 1234567_sample_record
bytedcli ftf diff-attribution list --record-id 1234567_sample_record --similar-case-id sample-similar-case --diff-id sample-diff
bytedcli ftf diff-attribution list --record-id 1234567_sample_record --similar-case-id sample-similar-case --diff-id sample-diff --all

# TeslaX plan
bytedcli ftf plan list --space-id 1000 --psm example.psm
bytedcli ftf plan get --space-id 1000 --plan-id 2000
bytedcli ftf plan records --space-id 1000 --plan-id 2000
bytedcli ftf plan create --space-id 1000 --plan-name "sample plan" --psm example.psm --replay-env sample_env --execute
bytedcli ftf plan update --space-id 1000 --plan-id 2000 --plan-name "updated sample plan" --execute
bytedcli ftf plan delete --space-id 1000 --plan-id 2000 --execute
```

## Diff Query Shortcuts

当用户给的是 Tesla-X FTF URL，而不是短 task id 或 psm_task_id，先走 URL harness，不要手工拆 URL。综合 task 分析优先从 `task evidence get` 取统一证据包，避免不同 agent 各自绕不同命令。要完整跑一次归因（按什么顺序、出什么报告）见编排层 `references/diff-analysis.md`；随机值和数组乱序降噪见 `references/diff-denoise.md`；命令参数与 JSON 字段细节见 `references/diff-query-reference.md`。

```bash
# 1. 解析 URL 类型。task URL 会得到 task selector；flow diff URL 会得到 psm_task_id/method/log_id selector。
bytedcli --json ftf target parse --url "<ftf-url>"

# 2. task URL：获取 task 上下文和 psm_task_id 映射。
bytedcli --json ftf task get --url "<ftf-task-url>"

# 3. task URL：一次性获取结构化证据包，包含任务/PSM/接口汇总统计、top diff 聚类和代表样本。
bytedcli --json ftf task evidence get \
  --url "<ftf-task-url>" \
  --page 1 \
  --page-size 20 \
  --top-n 10 \
  --sample-size 3

# 4. 随机值候选：按 task + psm + method + diff path 聚合 base/replay value 分布。
bytedcli --json ftf diff path-profile get \
  --url "<ftf-task-url>" \
  --psm example.psm \
  --method GetDemo \
  --sample-size 20

# 5. 数组乱序候选：对某个 diff path 或内部 similarDiffId 拉数组明细并尝试按候选主键排序比较。
bytedcli --json ftf diff array-check get \
  --url "<ftf-task-url>" \
  --similar-diff-id sample-similar-diff \
  --key sample_id \
  --sample-size 5

# 6. task URL：按 method/标注状态筛选高频 diff cluster。
bytedcli --json ftf task diff-cluster list \
  --url "<ftf-task-url>" \
  --direction all \
  --method GetDemo \
  --sort diff-count-desc \
  --top 20

# 7. task URL：一键分析 top diff cluster，串联 value diff 与相似 case。
bytedcli --json ftf task analyze \
  --url "<ftf-task-url>" \
  --direction inbound \
  --method GetDemo \
  --with-values \
  --sample-values 3 \
  --with-similar-cases \
  --top-n 10

# 8. 单个 diff 聚类：按内部 similarDiffId 拉详情。用户报告正文用 method + path 描述，不直接展示 ID。
bytedcli --json ftf task diff-cluster get \
  --url "<ftf-task-url>" \
  --similar-diff-id sample-similar-diff \
  --with-values \
  --sample-values 3 \
  --with-similar-cases \
  --with-outbound

# 9. flow diff URL：拉单条流量 inbound/outbound diff 上下文。
bytedcli --json ftf flow diff get \
  --url "<ftf-flow-diff-url>" \
  --with-values \
  --with-outbound
```

使用规则（本段只讲命令怎么调用；"怎么判断、怎么写报告"见下方指路块）：

- `ftf task get` 支持两种入口：`--task-id` 走官方 OpenAPI 任务查询，可拿 `env`、PSM replay 参数、commit 和 method mock 配置；`--url` 走 Tesla-X URL 上下文查询，只用于拿 task/space/report/psm_task_id 映射。两者不能同时传。
- `ftf task evidence get` 支持 `--url` 或 `--task-id`，输出统一证据包：task meta、psm_task_id 映射、任务/PSM/接口汇总统计、top method、top diff path/diff 聚类、代表 log_id/record_id/base/replay value 样本。传 task URL 时自动应用 URL 里的 `diffReasons` 筛选；无 URL 筛选时默认看未处理聚类，需要全部时传 `--annotation-op-type all`。
- `ftf target parse` 只解析 URL，不发起后端查询。遇到未知 FTF 链接时先用它确认 selector。
- `ftf task analyze` 默认 `--direction inbound`。传 task URL 时自动应用 URL 里的 `diffReasons` 筛选；无 URL 筛选时默认只分析未处理聚类。需要看全部或某类已标注内容时显式传 `--annotation-op-type all` 或语义值：`system-bug`、`biz-change`、`system-noise`、`task-invalid`、`exception`、`confirming`、`stability`、`low-risk`、`case-noise`、`big-json`。
- `ftf task diff-cluster get` 未显式传 `--direction` 且带 `--with-values` / `--sample-values` / `--with-similar-cases` 时，自动按 inbound 聚类查询；只有明确要查 outbound 聚类时才传 `--direction outbound`。
- `--with-values`、`--sample-values`、`--with-similar-cases` 只适用于 inbound value diff；`--direction outbound` 只能搭配 `--with-outbound` 分析外调 diff。
- `ftf flow diff get` 没有 URL 时必须同时提供 `--psm-task-id`、`--method`、`--log-id`；`--protocol` 默认可按 URL/平台上下文保留。
- 要定位某一条 diff 的两边值，在 `ftf flow diff get` 上补 `--diff-id`、`--similar-case-id` 或 `--diff-number`。

判断规则不在本入口，按需读对应 reference：

- 任务形态判定（系统级/沙箱/混合）、术语口径、证据可见性边界 → `references/domain-model.md`
- 选哪些 diff 聚类深挖、Top N 阈值、三张表报告结构、一行一聚类、代表流量详情链接 → `references/task-diff-triage.md`
- 随机值 / 数组乱序降噪工序（path-profile、array-check 怎么用于定性） → `references/diff-denoise.md`
- `clusterSelection` / `displayPath` / `inbound.samples` / `outbound.*` 等 JSON 字段解读 → `references/diff-query-reference.md`
- 单条流量根因、outbound mock 两步 → `references/flow-diff-root-cause.md`

## Find Plans By PSM

当用户问“某个 PSM 当前有哪些 FTF/TeslaX 计划”时，按这个最短路径查，不要先去翻文档或猜 space：

```bash
# 1. 先确认 PSM 接入信息。api_test_config 里的 base_plan_ids 是基准任务线索，不等于完整当前计划列表。
bytedcli --json ftf psm get --psm example.psm

# 2. 如果已知 space，直接列当前 TeslaX plan。
bytedcli --json ftf plan list --space-id 1000 --psm example.psm

# 3. 如果 space 未知，先用近期任务反查 space_id / parent_plan_id / parent_plan_name / test_plan_id。
bytedcli --json ftf task list --psm example.psm --recent-days 30 --page 1 --page-size 20

# 4. 再用任务里出现的 space_id 回查完整 plan 列表。
bytedcli --json ftf plan list --space-id 1000 --psm example.psm
```

整理结果时区分：

- `plan list` 返回的 `id` 是 TeslaX parent plan id。
- `task list` 里的 `parent_plan_id` / `parent_plan_name` 可用于识别近期实际在跑的计划。
- `task list` 里的 `test_plan_id` 是 FTF test plan id，不要误当成 TeslaX parent plan id。

## Guarded Writes

以下命令有外部副作用，默认会拒绝执行；确认后必须加 `--execute`：

```bash
bytedcli ftf task stop --task-id 1234567 --execute
bytedcli ftf task retry --task-id 1234567 --psm example.psm --method-list GetDemo --execute
bytedcli ftf plan create --space-id 1000 --plan-name "sample plan" --psm example.psm --replay-env sample_env --execute
bytedcli ftf plan update --space-id 1000 --plan-id 2000 --payload '{}' --execute
bytedcli ftf plan delete --space-id 1000 --plan-id 2000 --execute
bytedcli ftf plan trigger --space-id 1000 --plan-id 2000 --payload '{}' --execute
bytedcli ftf plan execute --plan-id 2000 --psm example.psm --replay-env sample_env --execute
```

创建用于代码 diff 的 FTF 任务前，必须先确认并记录：

- PSM、parent plan id、replay env。
- 目标 branch 或 commit；如果用户没有给，先问清楚，不能用默认分支替代。
- 是否现在执行外部写入。

通过 OpenAPI 创建分支任务时，优先同时透传三种常见分支字段，并在 PSM 参数里显式写 replay cluster：

```bash
bytedcli --json ftf plan execute \
  --plan-id 2000 \
  --psm example.psm \
  --replay-env sample_env \
  --idl-version master \
  --trigger-type third-party \
  --payload '{"branch":"feature_x","code_branch":"feature_x","git_branch":"feature_x","psm_trigger_params":{"example.psm":{"replay_cluster":"default"}}}' \
  --execute
```

触发后不要只返回创建结果里的 task id。必须立刻复查任务详情，至少确认：

```bash
bytedcli --json ftf task get --task-id <task_id> \
  | jq '.data.data.data | {id,parent_plan_id,code_branch,commit_hash,run_psm,env,psm_param:((.psm_replay_param_detail["example.psm"] // (.psm_replay_param|fromjson)["example.psm"]) | {commit_hash,replay_env,replay_cluster,idl_version,psm_task_id})}'
```

注意：有些 FTF OpenAPI 任务会把分支解析成 `psm_replay_param.<psm>.commit_hash`，但顶层 `code_branch` 仍为空。遇到这种情况，不要直接判定未绑定分支；用历史同分支任务、Codebase/Git 分支 head 或平台可查分支信息交叉确认 commit 是否一致。结论里要同时返回 task id、直达链接、branch/commit 证据和任何未能验证的权限限制。

Tesla-X 直达链接不是单独的 `/task/<task_id>`。先通过 plan records 找到 `ftf_task_id` 对应的 record/report id：

```bash
bytedcli --json ftf plan records --space-id 1000 --plan-id 2000 \
  | jq '.data.data.data[] | select(.ftf_task_id == "<task_id>") | {record_id:.id, ftf_task_id}'
```

链接格式：

```text
https://tesla-x.bytedance.net/space/<space_id>/report/<record_id>/ftf/task/<task_id>
```

## Notes

- 默认环境是 `cn`；当 `--site` 为 i18n 系列（i18n / i18n-bd / i18n-tt）时自动升级为 `i18n`，无需显式传递。需要 BOE 时加 `--env boe`，需要强制 i18n 时加 `--env i18n`。
- 鉴权优先使用 bytedcli 的 ByteCloud JWT；推荐通过 `BYTEDCLI_USER_CLOUD_JWT` 注入。
- `diff-attribution` 的 inbound 命令使用复合 `recordId`，会从第一个 `_` 之前自动提取 case id；diff 查询参数细节见 `references/diff-query-reference.md`。
- 不确定参数或命令层级时先执行 `bytedcli ftf --help --all-help`。
- 如果 MCP `list_commands(domain="ftf")` 或 `run_command("ftf ...")` 报 unknown command，不要直接判定没有 FTF 能力；再用本机 shell 执行 `bytedcli --all-help | rg 'bytedcli ftf'` 或 `bytedcli ftf --help` 验证当前安装的 CLI 命令树。MCP 包装层和本机 CLI 版本可能不同步。
