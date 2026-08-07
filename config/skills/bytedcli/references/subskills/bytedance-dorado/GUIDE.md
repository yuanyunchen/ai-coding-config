---
name: bytedance-dorado
description: "Operate Dorado (DataLeap) via bytedcli: list projects/tasks/instances, get task details, create tasks, transfer task owners, rename/move tasks/IDE nodes, update SQL, diff versions, view history, execute adhoc Hive/Doris SQL, fetch adhoc run logs, manage task drafts (update/test/explain), inspect deploy package DIFF SQL, validate HSQL/DTS drafts, manage python/notebook nodes, debug notebook kernels/cells, check readiness, fetch notebook result JSON, resolve nodeUid from taskId, browse folders, manage backfills, query DECC endpoints/datas, list UDFs, update resources, query Flink realtime monitor URLs/logs, diagnose failures via Megatron/Spark History logs. Use when users mention Dorado, DataLeap, batch tasks, task owner transfer, task/node rename/move, deploy packages, DIFF SQL, HSQL/DTS drafts, notebook debugging/results, resource/explain, taskId URLs, instance failures, slow runs, backfill, spark-jar config, Flink realtime tasks, Flink monitor URLs, Flink Web UI, operation logs, or DECC."
---

# bytedcli Dorado

## 如何调用 bytedcli

推荐：先全局安装一次，后续所有命令直接调用 `bytedcli`。

```bash
# 推荐方式：先全局安装，后续直接调用 bytedcli
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npm install -g @bytedance-dev/bytedcli@latest
bytedcli <command> [options]
```

```bash
# Fallback：仅在无法全局安装时使用 npx 临时执行
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest <command> [options]
```

## When to use

- Dorado/DataLeap 批处理任务管理
- Dorado 实例失败根因定位（实例日志、log-summary、Megatron app/log-link、Spark History）
- Dorado/TQS/Hive 权限失败定位（`NoPrivilegeException`）以及转 Coral 权限申请
- Dorado 慢任务性能分析（Stages/SQL、shuffle/spill/skew、小文件、资源等待）
- 查看项目、任务、实例列表
- 获取任务详情（包括源/目标数据库信息、SQL 代码、依赖任务 ID）
- 获取任务监控配置（告警规则、基线绑定，`dorado task alarms`）
- 关闭 / 开启 Dorado 任务（`dorado task close` / `dorado task open`）
- 检查补数据 (Backfill) 进展和触发器详情 (`dorado backfill triggers`)
- 下载 Dorado 实例日志（页面态 cookie，`dorado download-instance-log`）
- 获取 notebook 实例“运行结果”JSON（`dorado instance notebook-result`，默认读取 `{taskId}_{instanceId}.ipynb`）
- 创建任务（指定 `--type`）
- Resolve the task-template root folder with `bytedcli dorado task template root-folder get --region <region> --project-id <project-id>`, read a template detail with `bytedcli dorado task template get --region <region> --template-id <template-id> --project-id <project-id>`, then create an HSQL task template with `bytedcli dorado task template create --region <region> --project-id <project-id> --name <template-name> [--description <text>]`. `template create` can also accept `--folder-id <folder-id>` directly; when `--folder-id` is omitted it resolves the template root folder from `--project-id`. The create command posts a template form to the region's Dorado `/develop` endpoint (`type=template`, `subType=hsql`); use placeholder values such as `demo-template`, `12345`, `24680`, and `67890` in examples.
- 转交任务 owner（`dorado task transfer-owner`）
- 更新 SQL 任务（hsql/fsql/stream_sql）的查询（`task update --query`/`--type`）
- MySQL->Hive binlog 状态检查与接入（`task binlog status` / `task binlog connect`）
- 通过 ad-hoc query API 执行临时查询（Hive SQL；doris_sql 任务会走 Doris IDE debug），并按 debugId 查看运行日志（`dorado adhoc log`）
- 对比 SQL 版本差异（草稿 vs 发布版本、任意两个版本）
- 查看发布包详情里的 DIFF SQL（`dorado deploy diff-sql`）
- 查看任务版本历史
- 浏览项目文件夹结构、查看文件夹下的任务和子文件夹
- 创建子目录（`folder create --parent-uri --name`）
- 查看项目可用的 Yarn 队列（支持按 `--task-type` 过滤）
- 更新任务草稿配置（队列、集群、调度时间等）
- 测试运行任务草稿（debug run）
- 校验 HSQL 任务草稿 / 线上版本语法（`task-draft explain`）
- 校验 DTS 任务 reader SQL 语法（`dts-draft explain`）
- 查询 DTS 元数据（`dorado dts region/database/datasource/table/column ...`），用于任务创建、草稿补全和 agent 自动化 lookup
- 根据任务 SQL 获取依赖推荐（推荐可依赖的上游任务）
- 创建 python/notebook/spark(pyspark) 任务节点，支持创建时指定 Docker 镜像（`node create --type python/notebook/spark --image-name/--image-id`）
- 获取 python/notebook/spark 节点草稿内容（`node get`）
- 保存 python/notebook/spark 节点草稿（`node save`）
- 启动 notebook kernel 会话（`node start`，支持 `--restricted`/`--no-restricted`，非 cn region 默认开启合规模式）
- 调试执行 notebook 的单个 code cell（`node debug-cell`，会启动/复用 kernel，并通过 Dorado notebook WebSocket 收集 Jupyter 输出）
- 探测 notebook kernel 是否真正就绪可执行代码（`node kernel-status`，单次探测、无副作用，适合在多次 `debug-cell` 前由调用方自行轮询）
- 提交 python/notebook/spark 节点上线（`node submit` / `node submit-approval`）
- 查看节点生产版本历史（`node history`）
- 恢复草稿到指定生产版本（`node rollback --commit-id`）
- 快捷恢复到最新生产版本（`node rollback --latest`）
- 重命名 IDE 节点 / 任务显示名（`node rename --node-id` / `task rename --node-id|--task-id+--project-id`）
- 移动 IDE 节点到目标父目录 URI（`node move --node-id --parent-uri`，默认 dry-run，确认后加 `--yes`）
- 管理 Spark-jar 任务的 Operator 配置（`spark-jar create/get/update`，例如读取/更新 `mainClass`、`params`、`sparkConf`）
- 在仅有 taskId、缺少 nodeUid 时解析 IDE nodeUid（`node resolve-uid`，通过 tree-nodes 的 name+type filter 单路径下钻 + node-relations 校验）
- 查询项目可用镜像列表（`image list`），返回镜像 id + name，用于配置 node 的运行镜像
- **注意**：`node` 子命令仅适用于 python 和 notebook 类型任务；SQL 类任务（hsql/fsql/stream_sql 等）请使用 `task-draft` 相关命令；Spark jar 任务的 Operator 配置（如 `mainClass`、`sparkConf`）推荐使用 `dorado spark-jar` 子命令更新草稿
- 查询 DECC endpoint ID 和注册的 table data ID（`decc endpoints` / `decc datas`）
- 列出项目 UDF（用户自定义函数），包括 Hive 函数和目录（`tree-nodes udf list`）
- 获取 UDF 详情，包括 HDFS 路径、绑定名称和版本（`tree-nodes udf get`）
- 通过 UDF nodeUid 或资源 nodeUid 获取 ID，该 ID 可用于创建函数、更新资源等操作（`tree-nodes id get`）
- 列出所有项目资源，包括文件、jar 包、zip、scm、image、thrift 和目录（`tree-nodes resource list`）
- 获取单个项目资源详情（`tree-nodes resource get`，含 SCM 镜像资源的 imageStatus / imageLatestJobId）
- 更新资源详情，包括 scmVersion（`tree-nodes resource update`）
- 在 SCM 镜像资源上只刷 `scmVersion`，触发后端异步重建镜像（`tree-nodes resource update-scm-version`）
- 创建并保存新的函数（`tree-nodes function create`）
- 上传本地 jar 到 Dorado 全局资源库（页面 `/dorado/settings/resource-file`）：`resource upload --file <local.jar> --name <n>`
- 列出 / 获取全局资源库中的资源（`resource list`、`resource get --id`）
- 更新全局资源（默认只改元信息；带 `--file` 则替换 jar）：`resource update --id <id> --name <n> [--file <local.jar>]`
- 在全局函数库（页面 `/dorado/settings/functions`）创建 UDF/UDTF/UDAF 并绑定到刚上传的 jar 资源（`function create --resource-id ... --name ... --class-name ... --function-type udf|udtf|udaf`）
- 列出 / 获取全局函数库下的函数（`function list --resource-id`、`function get --id`）
- 更新全局函数（`function update --id <id> --resource-id ... --name ... --class-name ... --function-type udf|udtf|udaf`）
- **区别**：`dorado resource` / `dorado function` 操作的是 `/dorado/settings/*` 全局资源库，无需 `--project-id`、支持本地 jar 直传；`dorado tree-nodes resource` / `dorado tree-nodes function` 操作的是项目 IDE 树节点，需要 `--project-id` 等项目级参数，仅能登记已存在的 hdfsPath/SCM 资源
- 获取 Flink 实时任务监控 URL（Grafana 指标、ByteLake、Flink Web UI 等）：`flink monitor get`
- 列出 Flink 实时任务运维操作日志（启动、重启、停止等）：`flink operation-log list`
- 查看 Flink 单条操作日志详情（含事件时间线与 Flink Web UI 链接，仅 start/restart 类日志包含 events）：`flink operation-log get`
- 当目标机房不在内置 region 列表里时，优先引导用户在环境变量或 `~/.local/share/bytedcli/data/.dorado.env` / `./.dorado.env` 中配置 `DORADO_REGION_<NAME>_API_BASE_URL`，再继续调用 Dorado 命令
- 内置 region 里 `sglark`、`jplark`、`uspipo` 和 `mycis` 固定走页面态 session；其余 built-in region 默认走 JWT。自定义 region 可通过 `DORADO_REGION_<NAME>_AUTH=session` 显式声明页面态授权。未显式声明时，先按正常请求处理，只有命中明确的页面态鉴权迹象时，再执行 `bytedcli auth login --session`
- 对 Dorado / DataLeap 的 `MY-BD` 环境，请特别使用 `bytedcli --site i18n-bd auth login --session`（或 `BYTEDCLI_CLOUD_SITE=i18n-bd bytedcli auth login --session`）先准备浏览器态 session；该环境的页面能力依赖 session/cookie，单独做普通 `auth login` 往往不够。

## Agent Guidance

- **处理 403 错误**：如果 Dorado API 返回 403 认证错误，可以尝试使用 titan 鉴权模式重试。通过环境变量配置对应 region 使用 titan 鉴权（注意 region 名中的 `-` 在环境变量名里要替换为 `_`）：

  ```bash
  # 对 gcp region 使用 titan 鉴权
  export DORADO_REGION_GCP_AUTH=titan

  # 对 us-eastred region 使用 titan 鉴权
  export DORADO_REGION_US_EASTRED_AUTH=titan

  # 对 eu-ttp2 region 使用 titan 鉴权
  export DORADO_REGION_EU_TTP2_AUTH=titan

  # 对 us-ttp region 使用 titan 鉴权
  export DORADO_REGION_US_TTP_AUTH=titan
  ```

  配置后重新执行命令即可。

- Dorado web URL 常见格式：
  - 任务开发页：`<host>/dorado/development/node/<taskId>?groupName=<region>&project=<region>_<projectId>`
  - 临时查询页：`<host>/dorado/development/query/<taskId>?groupName=<region>&project=<region>_<projectId>`
  - 从任务开发页读取当前任务详情时，优先使用 `dorado task get <taskId> --region <region>`；`project` 查询参数主要用于补充上下文，`task get` 本身通常只需要 `taskId + region`
  - 从这两类 URL 中解析 CLI 参数时，路径里的 `<taskId>` 对应 task ID，`groupName` 对应 `--region`，`project` 去掉 `<region>_` 前缀后对应 `--project-id`
- Dorado 任务页“任务监控/基线监控”配置默认走 `GET /dorado_api/task/{taskId}/alarms?projectId={projectId}&supportTaskAlarm=true`
- 读取任务监控配置时，优先使用 `dorado task alarms --task-id <taskId> --region <region>`（`--project-id` 省略时自动从任务详情解析）；不要再复用 `task get` 猜测 `alarmRules`/`baseline` 字段是否存在
- 按名字搜任务优先用 `dorado task list --project-id <projectId> --keyword <keyword>`（task list v2 端点，匹配 name/uid/owner）；`task search` 的 keyword/status 检索同样走 v2 端点，但 `--folder-id` 会切到 legacy 批量端点，该端点在部分 cn 项目稳定报 `Dorado API error: Unknown error`
- `task advanced-search` 的参数是 `-k/--keyword` + `--project-id`（均必填），没有 `--name`；JSON 结果在 `data.nodes`（不是 `items`/`tasks`/`list`），且按 IDE 树节点返回 `uid` 而非数字 task ID
- 读取任务 SQL 用 `dorado task code --task-id <taskId>`（`--project-id` 省略时自动从任务详情解析），支持 `--output <path>` 落盘
- 当用户已经明确给出一个不在内置列表里的 Dorado region 名称时，不要遍历或试探 `cn/sg/va/mycis/gcp/boe/boei18n`
- 优先引导用户在环境变量或 `~/.local/share/bytedcli/data/.dorado.env` / `./.dorado.env` 中配置 `DORADO_REGION_<NAME>_API_BASE_URL`
- 若该机房已知依赖页面态 cookie，再补充 `DORADO_REGION_<NAME>_AUTH=session`
- 只有用户没有提供 region 名称时，才允许在内置 region 中选择或追问
- Dorado 审批提交类命令（如 `dorado task commit-approval`、`dorado node submit-approval`）中的 `--review-policy-id`、`--review-users` 必须由用户按当前项目显式提供；不要从项目默认配置、历史记录或页面上下文自动推断后代填
- 对于页面提交类写操作，如果页面 payload 对字段顺序、字段缺省或附加字段敏感，优先使用与页面一致的专用命令和参数语义，不要复用“相近但不完全一致”的旧命令再额外拼接页面未发送字段
- 发布包详情读取与发布操作统一走 `dorado deploy` 命令组；不要把发布包读取或提交流程混入 `task` 相关命令语义
- 查看发布包 DIFF SQL 使用 `dorado deploy diff-sql` 对接 `/deploy/{deployId}/detail?projectId=...`；若接口未返回显式 diff SQL，可基于 `rawCommitVo` / `newCommitVo` 代码快照生成 diff，但这仍属于发布包详情语义，不要混入 `task diff`
- Dorado 页面提交流程若走专用 `deploy/v2/create` 接口，优先使用专门的 deploy/approval 命令；审批人、commit ID 列表在命令层按数组心智传参，页面默认结构（如 `deployPackage.developConf`）由实现层补齐
- 对于 Dorado 页面镜像型提交/发布 payload，若 body 同时包含告警/监控字段（如 `openDefaultSystemAlarm`、`customAlarmRuleIds`、固定 `alarmVersion`），只把用户有明确心智的字段暴露出来；固定默认值继续视为页面默认透传
- 排查 Dorado 权限失败时，先确认用户给的是 task ID 还是 instance ID；通过 `task get`、`instance record/list` 定位失败 instance，再下载实例日志解析 `NoPrivilegeException`。后续使用 Coral 权限申请流程，详见 `references/dorado.md` 的 “Debug permission failures and apply via Coral” 以及 `bytedance-coral` skill。
- 不要用 `bytedcli hive` 或 `bytedcli iam` 处理 Dorado 任务执行时的 Hive/TQS 权限缺失；`hive` 只适合查元数据，`iam` 只适合查员工身份。权限申请应走 `bytedcli coral permission apply`。

### 中止一个持锁作业，等于给自己埋一颗雷

发布类任务常用 HDFS 上的租约文件防双写，释放写在 `finally` 里。**`finally` 在进程被 kill 时不执行**——所以主动中止一个正在发布的作业，几乎必然留下孤儿锁，下一次发车会在一分钟内失败于 `chain is already claimed`。

实证：为了换更快的签名方案主动 kill 掉一个跑了 2 小时 20 分的 S4，锁留下；随后的全量在 60 秒内失败。

**中止前先问：它现在持有什么？** 如果答案是"一把发布锁"，就把清理成本算进中止的代价里，而不是发现失败了才补。

清理孤儿锁的正确姿势（顺序不能反）：

1. **先确认没有活着的持有者。** 查任务实例，`running`/`pending` 必须为 0。顺便留意**系统调度实例**——日更 cron 可能刚好排上队，它一旦启动就是第二个 writer，要先终止。
2. **确认没有已发布状态。** 判据是"有没有 ACTIVATION 行"，**不是"有没有数据行"**——一次成功的 `stage` 冒烟会合法写入大量 DATA，用行数当判据会把安全情况误判成危险。
3. **读出锁再决定，不要凭记忆删。** 清理脚本要先打印锁载荷和持有者 application ID，只有当持有者在**已逐个核实终止**的名单里才删除；不在名单就拒绝并打印——未知持有者是一次诊断，不是一次删除。
4. **删完立刻验证文件已消失**，别信删除接口的返回值。
5. **还原被临时替换的任务体**，并校验任务体 SHA 与生产文件一致。清理脚本通常要借生产任务当载体运行，用完必须还原。

工作区里可能留有前人的清理脚本，但它大概率把当时的 application ID 和载荷 SHA 硬编码了，**不能直接复用**，只能当模板。

### 冒烟必须覆盖发布路径，否则锁和指针永远验不到

`action=stage` 只写数据不发布，所以它证明不了：租约获取与释放、原子指针切换、发布后回读。上面那颗雷正是这么漏过去的——冒烟全绿，全量在发布路径第一步就死。

**冒烟要走和生产同一个 action**，规模靠分桶压小，不靠换 action 绕开。缩规模用哈希分桶（1024 桶起，便于做到 1/1024），不要用"跳过发布"来省时间。

### "预计很快"不是不挂监控的理由

给每个远端长作业挂监控是默认动作，不是看情况。一个"两三分钟就完"的清理作业跑了 260 秒，期间只能手动轮询——而手动轮询既费轮次又容易漏掉终态。**判断"这个很快"本身就是估算，而估算正是最不该依赖的东西。**

### 长作业的运行纪律（用户明确要求，2026-08-06 固化）

一条链路返工三次的代价远高于事前想清楚。以下按"何时可以开跑"排列。

**1. 凡是高耗时任务，先冒烟。** 没有例外。冒烟证明链路能走通——算得出、签得上、写得进、读得回。冒烟不通过，不许上规模。

**2. 主链路上跑 20 分钟以上的规模，必须保证一遍过。** 这是判断"准备够不够"的硬线：如果你不能说清楚它为什么会成功，就说明冒烟没覆盖到，回去补冒烟，不要赌。

**3. 超大任务（10 小时以上）即使链路已验证，也不要直接刷全量。** 分桶逐步放量：先一个桶，再 1/16，按实测速度往上加。理由不是怕失败，是**失败的代价不对称**——10 小时后失败，损失的是 10 小时加一个决策窗口。

**4. 质量检验的总开销上限是整体计算的 1/100，且必须在几分钟内完成。** 超了就重新设计，不是调参。实证：某条链的发布签名普查预计 7 小时，而业务计算只有 2 小时 20 分（占比 300%）；换成可交换求和后降到分钟级，检测能力一项没少。校验的意义是让错误可发现，不是让流程看起来严谨。

**5. 质量门禁要防误杀。** 会随上游漂移的数字（行数、日期窗口、快照口径）**报告即可，不要拿来卡**；只有会让数据本身错或有歧义的判据才硬卡——唯一发布指针、计数自洽、主键唯一、数组与结构体逐位置一致、各类上限。实证教训：一个写死的 `248,383,965` 行基线挡住了本来合理的抽样跑；而同一套验收里另有两处对同一个数字一硬一软，自相矛盾。

**6. 复杂中间结果落中间表。** 收益有三：省重复计算、把链路切成可独立调试的段、失败后不必从头再来。**但要认清代价**——一旦落表，"这张中间表来自哪次可信运行"就成了新问题，同作业内证明的来源可信性会丢失。所以：**为调试和迭代落表是对的；为绕过来源证明落表要先想清楚**。也别为落表而落表，它本身是 overhead。

**7. 卡点、性能反常、瓶颈要立刻上报，不要等跑完。** 包括：某阶段耗时与数据量明显不成比例；调度开销超过计算；失败任务或 OOM 出现趋势性增长；实测与预估偏离一倍以上。**发现即报，不要"再看看"。**

**8. 给时间估算之前先读实现。** 按数据量拍脑袋是本轮最大的教训——曾估"写入加发布 45 分钟"，实际是 7 小时的串行签名。**没量过就明说没量过**，不要给一个听起来精确的数字。已经量过的和推算的要分开标注。

### 冒烟只为验证链路，规模要压到最小——而且要缩对维度

冒烟的唯一目的是**证明这条路能走通**：算得出、签得上、写得进、读得回。它不产出可用数据，也不证明性能。所以**规模越小越好**，目标是分钟级、可反复迭代。一个要跑半小时的冒烟已经失去意义——它既拖慢迭代，又不比全量多告诉你什么。

**关键在于缩对维度。** 缩错了，规模降不下来，还会得出"这条链本来就慢"的错误结论。

实证：给 S4 做冒烟时把 30 天源窗口缩到 3 天，以为是 1/10。实测：

| 指标 | 3 天 | 30 天 | 实际比例 |
|---|---|---|---|
| 来源扫描任务数 | 2,872 | 26,614 | 11%（如预期） |
| **输入数据量** | 1,725 GB | 6,370 GB | **27%** |
| **映射聚合任务数** | 19,744 | 67,228 | **29%** |

原因：S4 的成本由**唯一 (商品, 广告) 配对数**决定，不由天数决定。同一广告在 3 天和 30 天里覆盖的商品高度重叠，去重后 3 天就能凑出全量三成的配对。缩到 1 天也救不了聚合那部分。

**正确的旋钮是对键做哈希分桶**，因为它切的是基数本身：

- S4 的输出键是 `product_bucket = pmod(xxhash64(product_id), 1024)`
- F1 的输出键是 `user_bucket = pmod(xxhash64(user_id), 128)`

抽 1/64 就是精确的 1/64，而且分桶列通常是分区列，属于纯分区裁剪，不引入额外 join。同时哈希分桶对分布无偏，短序列和长序列按原比例保留，冒烟观察到的形态可以外推。

**选维度的判据**：问"这个作业的代价正比于什么"。正比于**行数**就缩时间窗口；正比于**唯一键的基数**就缩键空间。两者常常不是一回事——这次踩的就是这个。

**配套要求**：冒烟开关必须 fail-closed。缩了规模就禁止发布（S4 的窗口开关拒绝与 `publish` 同时生效），或强制显式声明范围（F1 要求 `SCOPE` 明确写成 `full`/`sample`，与桶配置矛盾即报错）。否则一个丢失的环境变量会把冒烟悄悄变成全量生产运行——这个项目已经发生过 CLI 抹掉环境变量列表的事故。

### 校验开销必须是生产计算的零头，而不是它的两倍

**硬预算（2026-08-06 操作者定，不是建议）：所有校验/质量/普查/签名的总成本
**上限 = 主任务的 1/10**，**目标 ≤ 1/100**。超过上限就重新设计，不是重新调参。**

**两个动作缺一不可：**

1. **设计时先估规模。** 写下这道校验会扫多少行、shuffle 几次，再和主计算的量级比。
   `countDistinct(a,b,c,d)` 是一次全量 shuffle；`groupBy(...).agg(countDistinct(...))` 又是一次。
   在 41.9 亿行上写这两句，等于在写任何输出之前先做两次几十亿行的 shuffle。
2. **跑起来实时监测各阶段成本**，不要等作业结束或等人来问：

```bash
bytedcli --site i18n-tt --json megatron spark-ui stages list --app-id <APP> | python3 -c "
import json,sys
from collections import Counter
rows=json.load(sys.stdin).get('data') or []
t=Counter(); k=Counter()
for s in rows:
    n=s.get('name') or ''
    key='WRITE' if 'saveAsTable' in n or 'insertInto' in n else ('VERIFY(collect)' if 'collect' in n else 'other')
    t[key]+=(s.get('executorRunTime') or 0); k[key]+=(s.get('numTasks') or 0)
for x in t: print(x, 'tasks=', k[x], 'executorRunTime=', round(t[x]/1000), 's')"
```

**VERIFY / WRITE 的比值就是判据。** 实测两例，都远超上限：

| 链路 | 校验 | 写入 | 比值 |
|---|---|---|---|
| S4 7 天发布（152 分钟时） | 75,048 task / **623 executor·小时** | **0 个写入 stage** | ∞ |
| F1 1/1024 冒烟 | 46,700 task / 42,967s | 296 task / 957s | **45×** |

S4 那一栏值得单独看：**跑了 152 分钟、一行都没写**，全在校验。
这条链路长期被记成"写入阶段慢"，是错的——从来就没到写入。

**注意采样会让比值失真**：F1 那个 45× 里，大头是"扫全量映射表算签名"这类**固定成本**，
它不随样本缩小。所以冒烟上的比值是悲观的，不能直接外推到全量；
但反过来，**固定成本在冒烟上没有任何价值**（采样/staged 运行本来就禁止发布），
正确的做法是把它挪到 `action=publish` 分支，而不是接受"冒烟就是慢"。

**便宜的替代品，按优先级：**

- 结构性属性（键唯一、一 ad 一 advertiser）用**哈希分桶抽样**测：违规是链路性的，
  会出现在整个population里，1/64 样本照样报错，shuffle 量降 64 倍。**但必须在回执里写明抽样基数**。
- 把多次 `.collect()` 合并成一次 `agg`：每一个 action 都是一次全量遍历。
- 只在发布路径上做的校验，就只在 `action=publish` 时做。

**判据：一条链路里所有完整性校验/普查/签名的总耗时，应当远小于业务计算本身。**

实证（同一条 ROW 链路，同一次运行）：业务计算——30 天来源扫描 + 映射聚合 + 完整域隔离 + 质量门禁——合计约 2 小时 20 分。之后的发布签名普查预计 **6 小时**，是业务计算的 2.5 倍，且几乎不含计算，全是调度。

根因是签名方案的选择，不是数据量：

| 方案 | 形态 | 24 亿行的代价 |
|---|---|---|
| 全局排序 + `toLocalIterator` 逐分区折叠 | **一个分区提交一个 Spark job，串行** | ~1,196 个 job × 10.7s ≈ 3.5h，写前写后各一次 |
| 可交换求和（`commutative-result-hash/v1`） | 一次 `agg`，与顺序无关 | 一次聚合，分钟级 |

两者的检测能力**等价**：都对行数、内容、重复敏感。区别只在前者靠"排序后按序折叠"获得确定性，后者靠"加法可交换"天然获得。

**设计规则：**

- 完整性签名要用**可交换/可结合的折叠**（求和、XOR、多路哈希求和），一次聚合完成。任何需要"先全局排序再按序消费"的方案，在大表上都会退化成串行调度。
- 警惕 `toLocalIterator`：它每个分区提交一个 job（实测 ~10.7 秒/个，几乎全是调度）。它解决的是 driver 内存问题，但把内存问题换成了调度问题，在分区数上千时代价更糟。
- 同一代码库里出现两套签名方案时，**先问便宜的那套为什么不能用**，而不是默认贵的那套更严格。ROW 的 S4 用排序流式、F1 用可交换求和，同一套发布协议、同一份审查——贵的那套没有换来更强的保证。
- 校验的成本要**随数据量线性**，不要随分区数线性。分区数是执行细节，不该进入正确性成本。

**这条同样适用于测试和质量门禁**：门禁的价值是发现真错误，不是穷举断言。一道门禁如果既不改变产出、又不能指出具体哪里错了，它的成本就该被质疑。校验存在的意义是让错误可发现，不是让流程看起来严谨。

### 默认不加校验，要加就必须先算它的规模（2026-08-06 操作者裁定）

**这条推翻了此前"发布路径不减校验"的写法。** 现实代价：一条链路上校验把
623 executor·小时花在写第一行数据之前，另一条把 9,094s 花在同一件事上，
两条都从未产出过任何可用数据。操作者的裁定是**校验和质量检测默认全部不放**，
算力留给核心生产。

落地形态（关键在**默认值的方向**）：

```python
def verification_disabled():
    # 默认 True。只有显式 `X_VERIFY=full` 才打开。
    return (os.environ.get("X_VERIFY") or "").strip().lower() != "full"
```

**开关必须写成"默认关、显式开"，不能写成"默认开、显式关"。** 后者是我第一版写法，
它会因为某次有人忘了设变量而悄悄把成本全付回来——而这正是这个开关要防的事。
（同源规则见 AGENTS「规则要放在忘不掉的地方」。）

配套三条，缺一条这个开关就会变成谎言：

1. **摘要位写非十六进制的标记**（本项目用 `verification-disabled`），
   让下游一眼看出这批数据没被证明过，而不是看到一个像哈希的东西。
2. **`count()` 也要去掉。** 它看着便宜，但它是一次完整物化；缓存一旦被淘汰
   就变成第二次全量计算。实测一个 800 task 的 count 卡在 796/800 十分钟，
   而它对写入毫无必要。行数写完之后对已落盘分区数——ORC 走文件统计，便宜一个量级。
   返回 `-1` 而不是 `0`：`0` 是合法测量值，下游会据此分支。
3. **测试要自己显式开启**（`setUp` 里设 `=full`）。测试的职责就是验这些门禁，
   不能靠生产默认值——生产默认值恰恰是相反方向的。

**什么时候把它打开**：正式发布、需要可审计指针、或者要对外承诺数据完整性时。
其余情况——冒烟、分桶、补数、联调——一律不开。

### 单点采样不能当趋势 —— 报速率，不要报状态

2026-08-06 一晚上四次误判，全是**看一眼就下结论**：

| 单点看到的 | 我的结论 | 采两次之后的事实 |
|---|---|---|
| 长尾 stage 5 分钟推进 392 task | "要 80 分钟" | executor 还在爬坡，实际 12 分钟 |
| executor = 16 | "被饿死了，要换队列" | 十分钟内涨到 56，一直在爬 |
| 监控连报 queued | "还在排队" | 一小时前就成功了（list 漏行） |
| `python.stderr` 为空 | "跑的是旧任务体" | 输出在 `stdout`，作业已成功 |

**规则：任何关于"快/慢/卡住"的判断，都必须基于至少两次采样的差值。**
监控脚本要报**增量**而不是绝对值——`task=650 (+120/2min)` 一眼看得出趋势，
`task=650` 什么也说明不了。

```bash
prev=0
while true; do
  cur=$(<取当前完成 task 数>)
  echo "task=$cur (+$((cur - prev))/2min)"   # 增量是判据，绝对值不是
  prev=$cur
  sleep 120
done
```

**尤其是 Spark 作业的前几分钟**：动态分配在爬坡，此时的速率必然偏低，
用它外推会得到一个吓人且错误的数字。**至少等两个采样周期再谈估计。**

### 监控脚本本身会骗你：别用 `instance list` 盯已知实例

**实证代价：一个清锁作业 22:10 就成功了，我的监控一直报 "queued"，
S4 因此白等了一小时。** 而 skill 里早就写着「`instance list` 会漏行甚至返回空，
盯单个实例必须用 `instance get`」——我写完规则，转头又用 list 写了监控脚本。

**规则要落到监控脚本的写法上，不是只落在人的记忆里：**

```bash
# 错：靠 list + 客户端过滤去"找"实例。漏一行就永远显示排队。
rows=$(dorado instance list --task-id T | filter id > threshold)

# 对：发车时记下 instance id，之后只用 instance get 查它
dorado instance get <INSTANCE_ID> -r <region>   # statusAlias 是权威
```

拿不到 instance id 时（backfill 刚建、实例还没生成），用
`dorado backfill get --backfill-id` 的 `succeedInstanceCount` /
`completeInstanceCount` 做判据，它不依赖 list 的分页与过滤。

**配套的怀疑纪律**：监控连续 N 次报同一个"未开始/排队"状态，且时长明显超出该
作业的历史分布时，**先怀疑监控，再怀疑平台**。用第二个来源（`instance get`、
`backfill get`、Spark UI）交叉验证一次的成本是几秒，而误信的成本是整段等待时间。

同源提醒：**监控是代码，会有 bug，而它的 bug 表现为"什么都没发生"**——
这是最难察觉的一种失败，因为它和"确实什么都没发生"完全一样。

### 运行中的止损判据：VERIFY 在涨而 WRITE 恒为 0，就是该停了

**挂上监测还不够，要有明确的停机线，否则监测只是把浪费看得更清楚。**

实测一次 F1 冒烟：VERIFY 从 729s → 1,939s → **9,094s，WRITE 始终为 0**。
它没有卡住、没有报错、状态一直是"执行中"——但它在写第一行数据之前已经烧掉了
比整个主计算还多的资源。**这种形态不需要等它结束，直接停。**

判据（任选其一命中即停机诊断，不要等终态）：

- `WRITE == 0` 且 `VERIFY` 已超过该作业预期总时长的 ~1/3
- `VERIFY/WRITE` 超过 10（硬上限）
- 某个 stage 十分钟内推进的 task 数是个位数，且它不是最后一个 stage

停之前先问一句：**这个作业持有发布锁吗？** 见下条。

### 中止作业前必须先问：它持锁吗

skill 里早有「中止一个持锁作业等于给自己埋一颗雷」，我今天仍然踩了：
为了换新版本直接 abort 了一个正在发布的 S4，JVM 在 `lease.release()` 之前被杀，
下一次运行立刻死在 `ERROR: S4 publication chain is already claimed`，
还得再走一遍清锁流程。**规则存在不等于会被执行——把它变成中止前的固定动作：**

1. 这个作业的 action 是 `publish` 吗？是 → 它可能已经拿到链锁。
2. 能等它自己结束吗？能就等。发布阶段的作业通常离终态不远。
3. 必须停 → 停完**立刻**把这次的 application id 加进清锁脚本的 `TERMINAL_OWNERS`
   并跑清锁，不要留到下一次运行失败时才想起来。

`action=stage` 的作业不持链锁，可以直接停。

### 读指针/控制行必须带分区谓词

`record_type` / `publish_status` 是**普通列**，只按它们过滤会整表扫——
实测 755s 只为取回几行指针。控制行按构造固定落在
`run_id='__ACTIVE_POINTER__'`、`activation_generation=1`、`bucket=-1` 这组**分区**坐标上，
把它们写进 where 是剪枝而非收窄，行集完全相同。

同源的一般规则：**任何"只取几行"的读取如果耗时以分钟计，先检查它有没有走分区剪枝。**

### `action=stage` 可能根本不写数据 —— 先读收据再找"写入缺陷"

本项目的 F1 里 `stage` 按设计是**只算不写**：算完打印一行
`compute_only_stage={"authorization":"NONE","status":"PASS",...}` 就返回，
只有 `publish` 才落表。我为此在"F1 成功了但表里没数据"上耗了几轮，
一直在找不存在的写入缺陷——**而收据里那句 `authorization: NONE` 一直摆在那里**。

⇒ **作业报成功但目标表为空时，第一个动作是读它自己的收据，不是查写入路径。**
收据会告诉你它以为自己做了什么。语义不符合需要时再改语义
（本项目已改成：`stage` 落 DATA 分区但**不切 ACTIVE 指针**——
下游按 `run_id` 直取，生产读到的仍是旧指针，互不影响）。

### 动一条链路之前，先确认目标任务真的在这条链路上

我沿着仓库里 `合同 → 区域绑定 → 任务体` 那条"发射器验证"链路做了完整的参数分叉，
**而线上那个 EU 任务根本不在这条链路上**——它是一个 150KB 的独立脚本，
开头写着"未经发射器验证，代码身份由人工保证"，要改的值是它里面的一个模块常量。
仓库结构和线上现实是两回事。

⇒ **改之前先把线上任务体拉下来读**（`node get` 取 `conf…parameter.code`），
确认它 import 了什么、常量从哪来。判据：在任务体里 grep 你打算改的那个符号名，
grep 不到就说明你改错了地方。这和"S4 写入慢"那次同型：**从结构推断，而非从现场确认。**

### 关掉一个校验，必须同时关掉检查它的那个校验器

**2026-08-06 一晚上五次失败，全是同一个形状**：跳过了"算证据"，却留着"验证据"。
于是每次都在做完全部昂贵工作之后，死在一个检查根本没被计算过的东西的断言上。

| 死法 | 缺的是什么 |
|---|---|
| `KeyError: 'data_bucket_count'` | 占位字典少一个调用方要索引的键 |
| `expected_row_count must be non-negative` | `-1`（未测量标记）撞上非负约束 |
| `source provenance mode must be SAME_JOB_HIVE` | 占位字典少 `provenance_mode` |
| `content fingerprint is malformed` | 校验器要 64 位十六进制，占位标记不是 |
| `row count must be a non-negative integer` | 同上，另一处门禁 |

**三条规则，一条也不能省：**

1. **占位字典必须和真实字典同形。** 值可以是"未测量"，**键不能少**——调用方是按键索引的。
   把这条写成静态断言放进本地冒烟（比对两条路径的键集合），它就再也不会发生。
2. **"未测量"要用调用方已有的语义表达，不要发明。** 这套发布器用 `None` 表示未测量并
   跳过整块比对；用 `-1` 会撞非负约束，用 `0` 是**在断言一件假事**。
   先去读消费方怎么表达"没有值"，再决定占位符。
3. **校验器本身也要短路。** 最省事也最正确的位置是验证函数入口：
   `if verification_disabled(): return dict(evidence)` ——它要检查的东西压根没算，
   它就没有工作可做。在占位值上编造能骗过校验的假数据是错的方向。

### 发车前的静态检查清单（比一次集群往返便宜三个数量级）

一次失败的集群往返 = 10~20 分钟排队 + 数分钟运行；一次静态检查 = 几秒。
**改完任何"跳过路径"之后、提交之前，按这个顺序过一遍：**

```bash
# 1) 语法
python3 -c "import ast;ast.parse(open('<改过的文件>').read())"
# 1.5) 未定义名字 —— ast.parse 看不见它，只有运行到那一行才炸
python3 -m pyflakes <改过的文件> | grep "undefined name"
# 2) 合同测试（纯 Python，不启 JVM）
python3 -m pytest <contract tests> -q
# 3) 本地真 Spark 冒烟（秒级，覆盖 Catalyst / codegen / 字段名 / 占位形状）
JAVA_HOME=... <venv>/bin/python <local smoke>
# 4) 顺着消费链读一遍：这个占位值会流到哪些函数？它们对它有什么要求？
grep -n 'evidence\["\|census\["' <module> | ...        # 找消费点
grep -n '_valid_digest\|must be\|raise' <module> | ... # 找约束
```

第 4 步是最容易跳过也最值钱的一步：**它抓到的是"还没发生的失败"**。
实测一次这样的走查在发车前抓到三个必然失败，其中一个正在跑的作业已经注定死于它。

**第 1.5 步是用一次代价换来的**：往一个 15 万行的任务体里加了个函数，用了 `pathlib` 和一个
叫 `SUCCESSOR_REL` 的常量——**两个在该模块里都不存在**。`ast.parse` 全绿，索引照建了 337 秒，
然后死在发布前一行的 `NameError`。`pyflakes` 一秒钟就会指出来。
**往一个自己没写过的大文件里加代码时，这一步是必须的，不是可选的。**

**还有一步比 pyflakes 更强，在"改的是别人的大文件"时值得做：把新函数单独抽出来，
用真实的依赖在本地跑一遍。** 上面那个函数抽出来 exec 一次、喂给它真实的发布包目录，
就能同时验证四件事：路径找得到、合同能解析、改完的摘要自洽（加载方正是按这个拒绝的）、
`_step` 的输出长什么样。这比再赌一次集群往返便宜三个数量级。

### 不发布的运行就该信任上游

内容签名、双向对账、全量普查，它们保护的是**已发布指针的可审计性**。
采样/staged 运行在代码层面就被拒绝发布，所以这些校验在那里保护不了任何东西，
却常常比主计算还贵。**统一做法：`action != "publish"` 时走便宜分支**——
保留身份（日期、版本、行数、桶覆盖），跳过内容摘要；
并在产物里写明它是 `unsigned-staged-*`，不要让人误以为它被签过。

### 诊断「某阶段慢」：先按用途给 executor 时间分组，再谈原因

**凭现象推断阶段瓶颈，是这条链路上代价最大的习惯。** 实证：S4 被记成"写入阶段慢"并围绕它
调了很久的写入并行度和分桶策略；一次测量推翻了全部——152 分钟的运行里
**写入 stage 数量为 0**，623 executor·小时全在校验 collect。

命令见上一节（`spark-ui stages list` 按 stage 名分组求 `executorRunTime`）。
**它只要一条命令、几秒钟**，而据此避免的是几周的错误方向。
在说出"XX 阶段慢"之前先跑它，不要用作业时长和直觉去分配注意力。

**再进一步：stage 名里带着源码行号，可以把代价归到某一个调用点。**
分组求和只告诉你"校验很贵"，把 `name` 原样打出来会告诉你是哪一行贵：

```bash
bytedcli --site i18n-tt --json megatron spark-ui stages list --app-id <APP> | python3 -c "
import json,sys
from collections import defaultdict
rows=json.load(sys.stdin).get('data') or []
agg=defaultdict(lambda:[0,0])
for s in rows:
    n=s.get('name') or ''
    if 'hasNext' in n: continue          # 元数据 job，1 task，忽略
    agg[n][0]+=(s.get('executorRunTime') or 0); agg[n][1]+=1
for n,(v,c) in sorted(agg.items(), key=lambda kv:-kv[1][0]):
    print(round(v/1000),'sec x',c,'|',n)"
```

实测一次：九个 stage 全部归到 `122_product_ad_mapping_v2.py:1574` 这一个调用点，
**52 万 executor 秒（158 小时），零写入**，后面还排着七个同量级的 stage。
去看那一行，是一个对 23 亿行做 `groupBy(ad_id)` 并带两个 `countDistinct` 的完整性体检。

**这类"既过滤数据又产出审计数"的函数最容易被漏掉**：它不叫 validate，也不在校验开关后面，
看起来是业务逻辑。判据不是它叫什么，而是**它买到了什么**——该数据集实测广告与广告主严格
一对一，也就是说它在找一个不存在的东西。关掉它的正确形态是：跳过整段、审计位报"未测量"
而不是报零、并在 stdout 上明说跳过了什么，同时给本地冒烟补一条"关掉后审计字典的键不能少、
打开后仍然必须隔离"的双向检查。

### 物化表必须采用它所物化的视图的过滤规则

快照表直接读了底表的 DATA 行，绕过规范视图的可见性谓词
（`pair_cost > 0 AND ad_cost > 0`，合同里签着
`visibility: pair_cost_positive_and_ad_cost_positive_and_not_delete`）。
结果 2562 万行里混进 **138,999 行（0.54%）按合同不该被任何消费者看到的行**，
下游在 Python worker 里逐条抛错。

**规则：一张物化表如果不采用它所物化的视图的过滤规则，它就不是那个视图的快照，只是长得像。**
谓词要**照抄**，不要凭理解重写。修好后加一道自检（写完统计违规行数并 fail-closed），
让错误出现在"哪张表错了"的地方，而不是消费端的每个分区里。

对账判据要能算得清：过滤前 25,625,370 − 过滤后 25,486,371 = 138,999，
与实测的零成本行数一条不差——**能对上数的验证才算验证过**。

### 生产者与消费者的字段名，没有任何东西在比对

F1 的内核按 `candidate_product_id` / `candidate_catalog_id` 取值，
线上 S2 表发布的是 `product_id` / `catalog_id`。两侧从未被比对过，
于是不一致一直睡着，直到某次运行第一次真正执行到那个内核，
以 Python worker 里一句光秃秃的 `ValueError: candidate_product_id` 冒出来。

**修法不是把名字改成另一边**（那只是把赌注押到另一侧），而是**在驱动侧从表的 schema 读出字段名**：
两种命名都接受，遇到都不认识的结构立刻失败并打印它实际看到的字段。
下次上游改名，报错出现在启动阶段、带着完整信息，而不是在几十个分区里各抛一次。

同源提醒：**只在真实数据上才会执行到的路径，等于没被测过**。
纯 Python 合同测试跑不到那里；本地真 Spark 冒烟（见上文四级阶梯第 1 级）才是这一层的归属。

### 门禁自身的三种常见腐坏

1. **门禁在测过期的常量。** 上限从 20/200 改成 10/100 后，两处门禁仍按 20/200 判——
   它们继续宣称"上限已强制"，实际抓不住 10~20 之间的违规。
   **门禁的阈值要从参数读，不要写字面量。**
2. **测试只断言拒绝路径，成功路径没覆盖。** 我为快照写的测试断言了三种拒绝，
   全部在真正的签名调用之前就返回了——于是"签名器按列名工作"这个契约完全没被测到，
   缺陷照样上了集群。**写完拒绝路径，回头问一句：成功路径被执行到了吗？**
3. **测试依赖执行顺序。** patch 模块的某个属性（`task.impl._spark_modules = ...`）
   在单跑时报 `NoneType`，全量跑却通过——因为别的测试先把模块加载了。
   **要替换就替换整个模块对象**（`types.SimpleNamespace`），别 patch 属性。

### Spark 行转普通对象的边界要归一化类型

`DecimalType` 聚合结果 collect 回来是 Python `Decimal`，进 `json.dumps` 直接
`Object of type Decimal is not JSON serializable`——而这发生在**整条用户血缘算完之后**。
在 Spark Row 变成普通 payload 的那一处统一转换（签名合同本来比较的就是字符串形式，值不变）。

### 不要在 Dorado 链路上留静默截断，卡点当场就说

全局规则见 `~/.claude/AGENTS.md` 的「不要静默截断，不要人工卡点」与「卡点当场就说」。
这里只补 Dorado 上具体长什么样——**这些都是实际踩过或差点踩到的形态**：

| 形态 | 具体表现 | 为什么危险 |
|---|---|---|
| SQL 里的 `LIMIT` / `row_number() <= N` | 跨机房向量同步每分区**恰好 1,000,000 行** | 1674 万的源被砍成 0.9% 交集，下游 ANN 低于训练下限，**整条 EU 链路堵了数天**；任务全程报成功 |
| 手工裁剪依赖 | 为了让任务能发车，临时删掉一个父任务 | 删除会活得比理由久，之后某次运行在残缺输入上开跑；必须存原始列表、跑完还原、**回读确认** |
| `--max-parallelism` / `maxExecutors` 压小 | 为"先跑通"调低，然后忘了调回 | 全量按这个速度要跑几十小时，看起来像"平台慢" |
| 抽样知识变默认 | `F1_V2_USER_BUCKETS` 之类的分桶变量掉了却仍能跑 | 本项目已因此把 1/128 的样本当成全量；解法是**要求显式声明 scope**，变量丢失变成报错而不是变成更大的运行 |
| 下线的任务 | 同步任务 `status=3` 静静躺着 | 没有任何告警，下游只表现为"没有数据" |

**判据**：整数得可疑的数字（1000000、10000、200）几乎一定是人手放的。
看到就去找它的出处并质疑，不要接受"它一直就是这样"。

**必要的截断怎么写**——三件事缺一不可：

```python
# 1) 显式命名，2) 同处说明理由，3) 结果里带出去，让下游看得见
SMOKE_ROW_CAP = 1_000_000   # 冒烟专用：全量约 1674 万，压到 1/16 以便 5 分钟内出结论
frame = source.limit(SMOKE_ROW_CAP)
print("SMOKE_CAP_APPLIED rows<={} full_size≈16.7M".format(SMOKE_ROW_CAP))  # 回执里必须有
```

反例是把 `.limit(1000000)` 直接写进生产 SQL：跑出来一切正常，收据全绿，
**没有任何一处告诉消费者他拿到的是一片而不是全部**。

**卡点当场就说**（Dorado 上最常见的四类，都不要等人来问）：

- **资源**：实例 `等待通过并发检查` 超过 ~15 分钟、或队列 `available_now.memory = 0`
- **权限**：接口 401/403、资源库拒绝上传、跨机房网关不通
- **速度**：长尾 stage 几十分钟只推进个位数 task；全量按当前速度会撞上 `timeoutSeconds`
- **配置**：需要改但改不动的东西（已下线的上游任务、别的团队 own 的任务）

报的时候带上：任务/实例 id、你试过什么、需要谁做什么。**不要攒到最终报告**。

### 长任务的四级放量阶梯：本地 → 分桶冒烟 → 小规模 → 全量（分区/分窗）

**默认流程，不是可选项。** 每一级都比下一级便宜一到两个数量级，且只有本级全绿才准进下一级。
2026-08-06 实测代价：跳过第一级，六个缺陷全靠集群往返一个一个抠出来，
每轮 10~20 分钟（并发检查还要另等），**而且 Spark 遇到第一个错就停，一轮只收获一个缺陷**。

| 级别 | 跑什么 | 量级 | 抓什么 |
|---|---|---|---|
| 1. 本地真 Spark | `local[2]` + 三行 fixture | **秒** | 表达式解析、codegen、结构体字段名、签名器列契约、UDF 反序列化 |
| 2. 分桶冒烟 | 1/1024 哈希分桶，**走生产同一个 action** | 分钟 | 锁与指针、发布回读、真实数据形态 |
| 3. 小规模 | 1/128 或单日 | 十分钟级 | 倾斜初现、资源配比、真实耗时的外推基数 |
| 4. 全量 | 按分区 / 时间窗切开 | 小时级 | —— |

**第 4 级必须切开跑，不要一发到底。** 一次 6 小时的全量在写入长尾被超时杀掉，
损失是全部已完成工作；按日期或分桶切成 N 段，单段失败只损失 1/N，且能续跑。
判据来自第 3 级的实测耗时，不是估算。窗口口径本身也可以是切分维度
（本项目从 30 天全量改为"7 天为单位补齐"就是这个思路）。

**第 1 级怎么搭（macOS，一次性）**：

```bash
# JDK 往往已经装着、只是不在 PATH——`java -version` 说"找不到运行时"不等于没装
ls /opt/homebrew/opt | grep -i openjdk
python3 -m venv sparkenv
sparkenv/bin/pip install "pyspark==3.2.1"        # 版本必须对齐集群，否则 codegen 差异抓不到
JAVA_HOME=/opt/homebrew/opt/openjdk@11 sparkenv/bin/python local_smoke.py
```

冒烟脚本的写法：用 `importlib` 直接加载交付物文件，把 `spark.createDataFrame` 造的三行
fixture 喂给真实函数，**schema 要照抄线上表的 DDL**（字段名写错就白测了）。
断言只验"能跑通 + 形状对"，业务正确性留给纯 Python 合同测试——两者互补，不要混。
本项目的实现见 `deliverables/160_local_spark_smoke.py`。

**为什么合同测试挡不住这些**：纯 Python oracle 从不启动 JVM，
凡是依赖 Catalyst 的东西（表达式解析、代码生成、struct 字段名、按列名工作的签名器）对它全部隐形。
本项目 168 条合同测试全绿的同时，上述六个缺陷一个都没被拦住。

### 花集群时间之前，先在本地跑同一道门禁

生产 Spark 作业一次失败的代价是小时级，而绝大多数早期失败都能在本地秒级复现。**提交前，把这次运行即将
面对的每一道门禁，用最便宜的等价物先跑一遍**；只有本地全过才发车。实证：一条 ROW 链路连续四次失败，
其中三次本来都能在几秒内本地抓到（2h15m + 3m + 3m 的集群时间全部白付）。

按成本从低到高，能覆盖绝大多数早期失败：

| 门禁 | 本地等价物 | 抓到过什么 |
|---|---|---|
| SQL 能否规划 | `aeolus query-editor query parse -r <region> --engine hive --file x.sql`（只校验、不提交作业） | 验收语句里 CTE 双重引用导致的无条件连接，跑之前就会报错 |
| PySpark API 是否存在 | 把代码里所有 `F.<name>` 与目标版本 `dir(pyspark.sql.functions)` 求差 | `F.pmod` 在 3.2 不存在（3.4 才加），作业跑满 2h15m 后死在这一行 |
| 表达式能否构造 / 语义是否等价 | 装 JDK + 对应版本 pyspark，起本地 SparkSession 真跑目标函数 | 同上；并可对拍新旧实现逐值相等 |
| UDF 能否在 executor 反序列化 | `cloudpickle.dumps` 后，在**干净解释器**里 `pickle.loads`，`sys.path` 只放构建产物 | UDF 按名引用自身模块，而包内是数字开头的嵌套路径，executor 永远 import 不到 |
| 发布包完整性 | 解压产物，按任务体 `_verify_manifest` 的逻辑本地比对（必需闭包 / 成员集合双向 / 逐个摘要） | 清单漏声明成员，Driver 3 分钟 fail closed |

**最强的一招：把任务体原样搬到本地跑一遍。** Spark 任务在 `SparkContext` 初始化之前挂掉时，
容器日志里**看不到任何 Python 输出**——`stdout` 只有 JVM 的 GC 日志，`stderr` 只有 SLF4J 那几行，
平台只给你一句 `user application exited with status N before SparkContext inited`。这时不要靠猜，
把线上环境完整复制到本地：

```bash
mkdir preflight && cd preflight
cp <task_body>.py body.py                      # 任务体，文件名不重要
cp <release>.zip .                             # 发布包，放在同名位置
cp <deliverables>/*.py .                       # 任务体按 `here / FILE` 加载的兄弟文件
eval $(bytedcli dorado task get -j -r <region> <taskId> | python3 -c '...把 appMasterEnv.* 转成 export...')
PYTHONPATH="$PWD/<release>.zip" python body.py "{release:...,component:...}"   # 末尾这段模拟平台追加的 params
```

两个细节决定它是否忠实：**`PYTHONPATH` 必须指向发布包本体**（模拟 `--py-files` 在驱动 sys.path 上的效果，
否则会得到"路径上找不到发布包"这种本地专属的假错误）；**末尾要带上平台追加的 params 串**。
这样能一路跑到 `SparkSession.getOrCreate()`，最后停在"本地没有 Java"——那正是该停的地方，
说明所有 pre-Spark 门禁都过了。实证：连续两次盲发（各 4 分钟且报错不可见）之后，本地一次就拿到了真实错误。

**当两道规则互相打架时，必须裁定哪一方过时，不能两边都留。** 本次实例：97 的按值序列化规则判定
「发布包根目录有一份字节完全相同的别名 ⇒ executor 能 import ⇒ 按引用是安全的」，而 120 的守卫
**无条件**拒绝任何按名引用，于是恰好否决了那些别名被加进来所要支持的布局。别名是清单里的正式成员、
是更晚加入的修复，所以守卫是过时的一方——让它复用同一条判据（`release_module_is_reimportable`），
而不是放松成不检查。**同一份代码里两处对同一事实各自表态，就是缺陷本身**，见全局规则「单边声明是信号」。

两个反直觉点，不写下来一定会再踩：

- **`local[*]` 和 `local-cluster` 都不能用来判断 executor 行为。** 它们的 Python worker 从驱动进程 fork，
  继承 `sys.modules`，于是本该失败的 UDF 反序列化会通过。唯一忠实的模型是**另起一个干净解释器**做
  `pickle.loads`。我自己写的冒烟第一版就栽在这。
- **纯 Python oracle 测试给的是假信心。** 用手写模型复刻 Spark 语义，可以做到 74/74 全绿，同时线上第一行
  PySpark 调用就崩——模型证明"函数算得对"，不证明"函数存在、表达式能构造、闭包能传到 executor"。
  这类项目必须额外有一条真正执行 PySpark 的路径；已有但长期 skip 的夹具等于没有，
  给它一个 `<PREFIX>_REQUIRE_REAL_SPARK=1` 之类的开关把 skip 变成 fail。

### Dorado 会在脚本后追加一段参数，任务体不能按 argv 长度分支

提交 Spark 任务时，平台会把任务配置里的 `params` 字段渲染成一个花括号串，**接在脚本路径后面**：

```
spark-submit ... /.../<instanceId>.py {release:single-stage-v2,component:f1,region:sg,action:publish}
```

于是 `sys.argv` 永远长度 ≥ 2。任何形如「命令行非空 ⇒ 改用命令行、忽略环境变量」的逻辑都会在平台上
100% 触发：argparse 拿到一个孤立的位置参数，必填项全缺，**在 SparkContext 初始化之前就 exit 2**。
诊断信息只有一句 `user application exited with status 2 before SparkContext inited`，容器 stderr 里
没有任何 Python traceback——真正的证据在 dorado 实例日志里那行完整的 `spark-submit` 命令，
必须把它整行取出来看结尾。

要保留「手工命令行」的逃生口，判据用**是否出现 `-` 开头的 token**，而不是 token 数量：

```python
if any(str(t).startswith("-") for t in process[1:]):
    return None          # a human is driving it by hand
return build_runtime_argv_from_env(os.environ)
```

实证：同一条链路里 S4 的任务体完全不读 `sys.argv`，所以一直正常；F1 读，于是**从未在平台上启动成功过**，
而这个缺陷被"等上游验收"的流程挡了很久没暴露。**同一仓库里两个任务体对同一平台行为的假设不一致，
就是一颗定时炸弹**——发现其中一个能跑而另一个不能时，先比对两者对运行时输入的假设，别急着怀疑本次改动。

### 上传 zip 类资源：官方 CLI 走不通，用打过补丁的临时副本

`dorado resource upload/update` 只认 `--type jar`，传 zip 会被服务端顶回来
（`自定义函数资源文件格式不支持`，code 11002）；CLI 自己也承认这件事：
`--type must be one of: jar. zip/file/scm/image/thrift mappings are not yet captured`。
**换 `--site` 没用，换 `--type zip/python/pyfile/file` 也没用**——这四个我都试过，
`--site i18n-tt` 那条也一样被拒；报错来自 CLI 的类型表，不是服务端。

真正可用的路径是把 0.118.0 装到一个**一次性前缀**里，改它的类型表，只用来做这一次上传，
不动用户的全局安装：

```bash
npm install --prefix ./cli118 @bytedance-dev/bytedcli@latest \
  --registry https://bnpm.byted.org --no-audit --no-fund
# 在 cli118/node_modules/@bytedance-dev/bytedcli/dist/{index.js,bytedcli-core.js} 里
# 把 GLOBAL_RESOURCE_TYPE_VALUES = { jar: 0 } 改成 { jar: 0, zip: 2, file: 2 }
# 注意还有一个独立的 RESOURCE_TYPES = ["jar"] 数组由 parseResourceType 读取，
# 两处都要改；值在多个 bundle 里各有一份，逐个替换。
./cli118/node_modules/.bin/bytedcli --site i18n-tt --json dorado resource upload \
  -r sg --type zip --name <唯一名字> --description "..." \
  --file <本地zip> --timeout-ms 300000
```

三条配套事实：

- **资源名必须唯一**，重名报 `资源名已存在`；版本信息放名字里（`..._v21_sg_20260806`）。
- **本地文件的 basename 会一路带到执行端**，而 `--name` 只是标签。任务体如果按固定名字在
  `sys.path` 上找归档（本项目找 `single_stage_v2_release.zip`），本地文件叫别的名字就会得到
  `driver Python path must contain exactly one <name>, found 0`。
  想区分版本就复制到不同目录、保持同一个文件名。
- `resource update --file` 原地替换存在 CDN 缓存风险；**传新资源、改 pyFiles 指向新 id 更干净**，
  且天然避开缓存。

### 部署一个任务体：三处代码、三处环境变量，只有一处生效

2026-08-06 实测，一次改动要同时落到下面这些位置，漏一处的表现是**跑的是旧的、配的是新的**，
任务自检不过（`ERROR: executing F1 task body SHA differs from the pin`），而且报错完全不提示是部署问题。

| 内容 | 有效位置 | 陷阱 |
|---|---|---|
| 任务体代码 | `node save --content-file <path>` | `--metadata` 里的 `configuration.code` **是只读展示副本**，写进去不生效，`node get` 回读它也是旧的——别用它判断部署成功 |
| 归档 zip | `conf...parameter.pyFiles = [{id, type:2}]` | 生效 |
| 环境变量 | `sparkConf["spark.executorEnv.<K>"]` 和 `sparkConf["spark.yarn.appMasterEnv.<K>"]` | `parameter.envs` 那个 `K=V` 列表**只是编辑态**，spark-submit 不读它 |

**最阴的一种回退**：`node get` 回读的 metadata 里带着那份**过期的** `configuration.code`，
把它原样喂回 `node save` 就会把任务体退回旧版——而此时所有 sha pin 读起来仍然是对的，
`conf...parameter.code` 的回读也"同意"这个旧版本，看不出任何异常。
EU 侧一次**只改依赖、完全不碰代码**的编辑就这样静默回退了任务体。
⇒ **任何一次 `node save` 都必须带 `--content-file <交付物文件>`**，哪怕这次编辑与代码无关。

判据只有一个：`dorado download-instance-log` 里的 `spark-submit` 命令行。它是最终真相——
`--py-files` 后面挂的是哪个资源、`--conf spark.yarn.appMasterEnv.*` 是哪一版 sha，一眼可见。
今天我先后按"代码没部署上"和"pyFiles 没生效"两个错误假设各改了一轮，都是因为没先看这行。

另外两条同源的：

- **上传的 zip 文件名必须等于任务体期望的归档名**（本项目是 `single_stage_v2_release.zip`）。
  资源的 `--name` 只是标签，**文件 basename 会一路带到执行端**；本地文件叫 `release_v20.zip`
  就会得到 `driver Python path must contain exactly one single_stage_v2_release.zip, found 0`。
  想区分版本，靠 `--name`，不要靠改文件名。
- **只有 status=2（已上线）的任务能建 backfill**。`task open` 只是打开编辑器，不是上线；
  上线是 `task online --project-id`。已退役的任务（本项目里代码级 `RETIRED_*_TASK_IDS` 明写了的那些）
  上不了线，别在它们身上耗——先去代码里查这个常量，比试错快。

### 驱动的 Python 报错在 `python.stderr` 里 —— 别去 stdout/stderr 找

**先给结论**：`bytedcli dorado get-container-log --file python.stderr`。
任务体 `sys.stderr.write("ERROR: …")` 写的内容原样落在这个文件里。

**但 `print()` 落在 `--file stdout`**，和 GC 日志混在一起。今天我据此犯了一个更糟的错：
一个清锁作业跑了 8 分钟，我在 `python.stderr` 里看到空白，就推断"它跑的是旧任务体"，把它中止了——
实际上它已经成功执行完毕，`CLAIM DELETED AND VERIFIED ABSENT` 就躺在 `stdout` 里。
**一个通道为空不是"什么都没发生"，只是"这个通道里没有"**；两个通道都要看，尤其当作业运行时长
和你的假设不符时——时长本身就是证据。

我一度在这里写下"驱动输出取不到、七条路径全失败"，**那是错的**——
我试遍了下表却唯独没试过这个文件名，于是把一次 2h27m 失败的原因当成了不可知，
还据此编造了一个后来被证伪的假设（源漂移）。实际那句话一直躺在 `python.stderr` 里：
`ERROR: the date is claimed by another publication`。

| 路径 | 内容 |
|---|---|
| **`--file python.stderr`** | **驱动 Python 的真实报错。先看这个。** |
| `--file stdout` | 只有 JVM GC 日志 |
| `--file stderr` | 只有 SLF4J 那 5 行 |
| `dorado download-instance-log` | 调度器日志 + 完整 `spark-submit` 命令行（查生效配置用它） |
| `megatron app get` → `am_container_logs` | 同 stdout |
| `insearch get <container>/stdout` | 同上，能拿到更多行但仍是 GC |
| `megatron spark-ui` | SparkContext 起来之前没有；History Server 早期常 404 |
| `dorado instance diagnose` | `diagnoseStatus: to_diagnose`，通常无内容 |

**方法论的教训比这条路径本身更重要**：穷举失败之后，我下的是"不可能"的结论，
而正确的结论只是"我试过的这些不行"。前者会让人停止寻找并转向猜测。
EU 侧的同一问题由另一个人找到了这条路径——**"我找不到"不等于"不存在"**。

**仍然值得装错误落表**（下面这段）：`python.stderr` 需要应用还在、容器日志未被清理，
而落表是持久的、可 SQL 查询、且能带完整 traceback 而不只是异常消息。两者互补。

```python
def _record_failure_for_operator(exc):
    try:
        from pyspark.sql import SparkSession
        spark = SparkSession.getActiveSession()
        if spark is None:
            return                      # pre-Spark failures: use the local preflight instead
        spark.createDataFrame(
            [(datetime.datetime.utcnow().isoformat(),
              str(spark.sparkContext.applicationId),
              "".join(traceback.format_exception(type(exc), exc, exc.__traceback__)))],
            "ts string, app string, message string",
        ).write.mode("append").saveAsTable(DEBUG_TABLE)
    except Exception:                   # diagnostics must never mask the real failure
        pass
```

三个要点：**best-effort**（拿不到 session 就放弃，绝不用自己的异常盖掉原异常）、
`saveAsTable` 首次自动建表（省掉 DDL 步骤）、写完仍返回原来的退出码。
Spark 起来之前的失败它救不了——那类靠本地 preflight（见上文）。

### `hive rows` 会对有数据的表报 0 分区 —— 查表内容一律用 query-editor

`bytedcli hive rows --database … --table …` 实测对一张**确定持有 3.84 亿行**的表
返回 `partitions: 0`。它不报错，就是给 0。**据此判断"表是空的"会得出完全相反的结论**——
本轮我差点据此认定一个子智能体虚报了交付成果。

⇒ 判断表里有没有数据，用 `aeolus query-editor query one` 跑真实 SQL（`COUNT(*)` 按
`record_type` / `publish_status` 分组），不要用元数据接口。

**更普遍的一条**：任何"返回空"的接口结果，在当成事实之前先做**对照实验**——
拿一个已知有数据的对象跑同一条命令。今天有五次初判被对照推翻
（yarnAppState、Spark UI 缺席、项目并发、队列饥饿、这条）。
对照的成本是一条命令，误判的成本是几小时。

### `instance list` 会漏行甚至返回空，盯单个实例必须用 `instance get`

`dorado instance list --task-id <id>` 的返回不稳定：同一时刻实测过 `n=0`，
而 `dorado instance get <instanceId>` 对同一个实例正常返回 `pending`。
分页顺序也不可靠——默认排序不是按 id，`--page-size 3` 会把刚创建的实例挤掉，
看上去像"实例消失了"。

⇒ **监控一旦拿到实例 id，就切到 `instance get <id>`**。用 list 做监控会产生
"NO_INSTANCE" 这类假终态信号；而假信号比没有信号更危险——它会让人以为作业没了，
从而去做多余的重发（每次重发都会把调度等待的时钟归零，见下条）。

### 并发检查可能要等几十分钟，反复重发只会重置它

`等待通过并发检查` 不总是几秒就过。实测同一任务：一次 8 秒启动，另一次 **33 分钟**。
期间 `maxParallelism` 够用、无其它运行实例、项目 `maxParallelism = -1`，
即没有任何可见的东西在挡——就是调度器的评估周期。

⇒ **不要因为"等太久"就 abort 重发**：新实例重新开始排队，等待时间归零。
本轮我在这个闸门上反复重启，很可能是自己把自己挡住了。
判断作业是否真的有问题，看 `statusDesc` 与 `instance yarnAppState`，不看等待时长。

### 队列"有授权、有空闲"不等于"能派发"——虚拟队列会静默卡在并发检查

`dorado project yarn-queues` 会把 `cluster=virtual-*` 的虚拟队列一并列出，
`megatron queue usage` 也会显示它有大量 `available_now`。但把任务的
`computeResourceParam` 指过去之后，实例会**永远停在 `等待通过并发检查`**，
既不报错也不派发。实测：同一个 S4 任务在 `byodel26` 上 **8 秒**启动，
改到 `root.virtual_ad_general_mix` 后 **42 分钟未启动**；F1 上同样复现。

⇒ **换队列后必须验证"确实派发了"，不能只看队列有没有空闲。** 判据是实例离开
`pending` 并出现 `startTime`。若几分钟内没有，换成 `cluster` 为真实集群名的队列
（`snake` / `byodel26` / `byodel28` / `badge` 等），不要用 `virtual-*`。

**`instance yarnAppState` 不能用来判断是否拿到容器**（这条一度被我写反，实测推翻）：
一个确实计算了 2h27m 的 S4 运行，日志里同样只有 `ACCEPTED`（21 次）；
一个 19 分钟零工作的 F1 运行是 104 次 `ACCEPTED`。**两者唯一的差别是次数，而次数只反映时长。**
Dorado 根本不更新这个字段，它恒为 `ACCEPTED`。

**Spark UI 可读时**（`megatron spark-ui executors list --app-id`）它是可信的：
`active` 数就是实际拿到的容器数，`stages list` 给出真实进度。

**但 `megatron spark-ui` 不吃 `-r sg`，要用 `--site i18n-tt`**（`-r` 会被解释成 Megatron
virtual region，默认 site 是 `cn`，于是报 `Megatron site "cn" does not use -r/--region`）。
参数给错时输出是 **`executors total 0 | active 0`**——**看起来和"作业一个容器都没拿到"一模一样**，
而这恰恰是本文上一段警告过的那个误判。用对参数后同一个应用立刻显示 380 个 active executor。
⇒ 拿到 `total 0` 时先确认命令本身没报错，再谈作业。

```bash
bytedcli --site i18n-tt --json megatron spark-ui stages list    --app-id application_...
bytedcli --site i18n-tt --json megatron spark-ui executors list --app-id application_...
```

`instance get` 有时取不到 application id（字段缺失），此时从
`download-instance-log` 的日志里 `grep -o "application_[0-9]*_[0-9]*"` 一定拿得到。

**但"取不到"不能反过来当证据。** 它走的是 History Server（`spark3-history-*`），
应用早期常返回 `HTTP 404 SPARK_UI_NOT_FOUND`，且不保证多久之后才可用——
实测一次 S4 运行在启动约 58 分钟后才第一次读到。我曾据"19 分钟取不到 UI"
判定一个 F1 运行被饿死并中止了它，**这个证据其实不成立**。

⇒ **这套环境里没有可靠的早期进度信号。** 能信的只有三样：
`statusDesc`（判断为什么没派发）、实例的终态、以及 UI 一旦可读之后的数据。
在这之前，唯一正确的动作是**等**——不要用缺席的证据去支持"它坏了"的结论。

### 选队列：先看内存再看核，`available_now` 才是判据，机房要和数据同侧

两条命令，各有各的用处，**都要看**：

```bash
# 队列自身的配额与占用（需要同时给 cluster 和 queue，缺一个就返回空）
bytedcli --json dorado task get-queue-resource -r sg --clusters snake --queues root.snake_data_ad
#   -> cpu_quota/used_cpu, mem_quota/used_mem, jobs_num, pending_jobs_num, queue_status

# 我这个用户此刻真正能拿到多少（entitlement/ceiling 常为 null，但 available_now 是实数）
bytedcli --site i18n-tt --json megatron queue usage -r sg --queue-name root.snake_data_ad
#   -> available_now: {cpu, memory}

# 枚举我有权限的队列（--site i18n-tt；region 值按 site 不同：i18n-tt 用 sg|va|eu|id|...）
bytedcli --site i18n-tt --json megatron queue list -r sg --page 1 --page-size 25
```

三条实测判读（2026-08-06）：

1. **卡住 Spark 长作业的通常是内存不是核。** `root.snake_data_ad` 当时 CPU 还空 4.5k，
   内存却已超卖（`mem_quota 29900 / used 28648`），14 个作业排队。只看
   `queue_status: free`（它按 CPU 算）会得出完全相反的结论。
2. **`available_now.memory` 可能是 0 而 CPU 看着很宽。** `byodel03_ads_lead_algo_batch`
   当时 cpu 7,290 / memory **0**，零排队——只看核会选中它然后饿死。
3. **容量最大的队列往往不在数据同侧机房。** byodel21（MY，cpu 8.1万/mem 200万）、
   virtual_ad_general_mix（virtual，cpu 7.8万/mem 187万）远超 SG1 的 snake，
   但数据在 SG1；已知 MY 集群派发慢（byodel28/03 排队 25 分钟），snake(SG1) 只要 14 秒。
   ⇒ **跨机房先用小作业验派发，别拿长作业赌**；SG1 本地零排队的备选是
   `root.snake_ad_catalog_dw_batch`。

（上一节说 `virtual-*` 会静默卡住，仍然成立；这里补的是"即使不用虚拟队列，也要按内存和机房选"。）

### EU（`eu-ttp2`）发车用 `task rerun`，`backfill create` 在那边是坏的

实测：`dorado backfill create` 在 `eu-ttp2` 上**无论 `-r` / `--site` 给什么都会打到 CN 网关并返回 401**，
两个 CLI 版本都一样。EU 侧发车用 `dorado task rerun`。
⇒ 写交接文档时别把 ROW 的命令原样抄给 EU——交出去一条你知道跑不通的命令，
比不写更糟，因为对方会先怀疑自己的环境。

### 一次远端作业的标准诊断回路（照这个顺序，别跳）

```bash
# 1) 发车后拿实例：默认 list 常常看不到刚建的 backfill 实例，按状态过滤才稳
bytedcli --json dorado instance list -r sg --project-id <P> --task-id <T> --status running --page-size 5
bytedcli --json dorado instance list -r sg --project-id <P> --task-id <T> --status pending --page-size 5

# 2) 已经结束了？backfill 汇总一眼看出"跑完但没成功"
bytedcli --json dorado backfill get -r sg --backfill-id <B> --project-id <P>
#   -> totalInstanceCount / completeInstanceCount / succeedInstanceCount

# 3) 实例详情 + 从整段 JSON 里正则抠 application id（字段位置不稳定，正则最省事）
bytedcli --json dorado instance get <INSTANCE_ID> -r sg | python3 -c \
  "import json,sys,re;print(sorted(set(re.findall(r'application_\d+_\d+', json.dumps(json.load(sys.stdin))))))"

# 4) 驱动报错看 python.stderr，print 输出看 stdout（两个都要看）
bytedcli dorado get-container-log -r sg --application-id <APP> --file python.stderr --tail 40
bytedcli dorado get-container-log -r sg --application-id <APP> --file stdout --tail 40

# 5) 生效配置的唯一真相：spark-submit 命令行 + instance conf
bytedcli dorado download-instance-log --instance-id <ID> -r sg --project-id <P> -o inst.log
grep -o "spark-submit.\{0,4000\}" inst.log | head -1      # --py-files / appMasterEnv.* 都在这里
python3 -c "import json;s=open('inst.log').read();i=s.index('instance conf = ');\
print(json.JSONDecoder().raw_decode(s[i+16:])[0]['configuration']['operator']['parameter']['pyFiles'])"
```

配套的节点操作（改任务体/环境/资源绑定时用）：

```bash
bytedcli --json dorado node resolve-uid -j -r sg -p <P> --task-id <T>     # taskId -> nodeUid
bytedcli --json dorado node get --node-id <UID> -r sg                      # 取草稿（先存一份做还原）
bytedcli --json dorado node save --node-id <UID> -r sg \
  --metadata "$(cat node.json)" --content-file <任务体.py>                  # 代码走 --content-file
bytedcli --json dorado node submit --node-id <UID> --project-id <P> -r sg --message "..."
bytedcli --json dorado task online <T> -r sg --project-id <P>              # 上线（backfill 的前提）
bytedcli --json dorado backfill create -r sg --task-ids <T> --project-id <P> \
  --start-date <D> --end-date <D> --max-parallelism 1 --skip-check --message "..."
```

**借生产任务当临时载体**（清锁脚本之类）时的固定动作：先 `node get` 存还原文件 →
确认该任务没有 running/pending 实例 → 换任务体跑 → **还原后校验任务体 SHA 与生产文件一致**
（本项目的任务体自己会比对 `TASK_BODY_SHA256`，所以还原不彻底会立刻暴露，这是好事）。
已退役的载体任务上不了线，白费时间——**先去代码里查 `RETIRED_*_TASK_IDS` 这类常量**。

### 作业在整 15 分钟被杀、三个日志通道都没有报错 = AM 在等 SparkContext

症状很有辨识度：**耗时几乎正好等于 `spark.yarn.am.waitTime`**（默认 100s，很多任务已调到 900s），
`stdout` 的 STEP 流在中途戛然而止，`python.stderr` 与 `stderr` 都是空的，实例只报"执行失败"。
去 `megatron app get` 读 `diagnostics`，那里写得清清楚楚：

```
SparkContext not inited, check driver to determine why
Uncaught exception in initializing SparkContext:
java.util.concurrent.TimeoutException: Futures timed out after [900000 milliseconds]
    at org.apache.spark.deploy.yarn.ApplicationMaster.runDriver
```

**触发条件是任务体在建 SparkSession 之前有长耗时的纯 Python 工作**——本项目是 FAISS 建索引。
最阴的一点：**它由"提速"触发**。同一个任务体，上一轮老老实实导了一遍检索池（Spark 作业，
1071 秒），SparkContext 早早就起来了，跑 33 分钟一切正常；下一轮命中缓存直接复用导出结果，
反而把那段唯一会初始化 Spark 的工作跳过了，于是 900 秒到点被判死。

两种修法，按"规则要放在不会被忘记的地方"选：

- 改配置 `spark.yarn.am.waitTime`（`sparkConf` 里，写成 `7200s`）——立刻见效，但下一个复制这份
  配置的人不会知道为什么。
- 改代码，在长耗时段之前就把 SparkSession 建出来——更durable，但要先确认这个会话的建法与
  后续一致（本项目就不行：先建的会话没有 Hive 支持，`getOrCreate()` 会把它原样还给后面的代码）。

### 为一个机房分叉参数合同，必须分叉给**每一个从它派生身份的阶段**

分叉合同这件事今晚做了三次才做对，每次都是"只改了一半"：

1. 只把 `--nlist 4096` 传给建索引器 —— 发布器自己从合同算训练下限，仍按 8192 拒绝。
2. 把合同传给发布器，索引建成并发布了 —— **下游 S2 又从默认合同派生它期望的 `ann_version`**，
   于是拿着 `...aa6944094f5a`（索引实际声明的）去比 `...7c2e3bf346cb`（它按 8192 算出来的），
   6 分钟后拒绝了那个索引。
3. 把同一份合同也传给 S2，两边才对上。

**判据不是"谁用了这个参数"，而是"谁从这个合同派生了会被别人比对的身份串"。**
在改之前先 grep 整个发布包里 `load_.*parameters\(` / `--contract` 的所有调用点，
一次把它们全部纳入，而不是等下一个阶段报不匹配。

代价对比：每一轮"只改一半"的验证成本是 6~36 分钟的集群往返；把调用点列一遍是一次 grep。

### 缓存产物的复用会把旧的上游状态一起带回来

同一个日期的中间产物目录存在，不代表它是用当前上游算出来的。实测：上游向量补全之后，
`p_date=20260804` 的检索池导出是 **204,303** 个候选，而 `p_date=20260801` 的导出还是补全前的
**8,223** —— 后者被原样复用，索引照建，直到发布阶段撞上训练下限才失败，白烧 8 分钟。

日志里其实**披露了**这个数（`STEP 11_export_pool_done` 的 `candidate_pool_count`），
但没有任何门禁去看它。**复用缓存产物的地方，要么把它的规模与下游门槛比一次，要么就别复用。**
排查时先看 `export_reused_from_hdfs` 这类字段——它决定了这一轮到底算没算。

### EU（`eu-ttp2`）取容器日志：`--application-id` 会 404，要走 `--logs-url`

EU 的 app 不在 `bc-iedt-gw` 网关上，`dorado get-container-log --application-id` 直接
`{"code":-1,"message":"app not found"}`。可用的两步：

```bash
# 1) 实例 -> app id -> AM 容器日志地址（region 是 megatron 的 eu_ttp_no，不是 dorado 的 eu-ttp2）
bytedcli --json dorado instance log-summary <INSTANCE> -r eu-ttp2 --project-id 237   # trackingUrls 里有 app id
bytedcli --site eu-ttp --json megatron app get --app-ids <APP> -r eu_ttp_no          # am_container_logs / diagnostics

# 2) 用那个 URL 直接取文件（stdout / python.stderr / stderr）
bytedcli --site eu-ttp --json dorado get-container-log -r eu-ttp2 --logs-url "<am_container_logs>" --file stdout
```

返回体是 `data.content`（HTML 包着 `<xmp>`），不是纯文本，按 `data.content` 取。
`instance log-summary` **必须带 `--project-id`**，否则只回 help。

### EU 的资源库接口要用打过补丁的 CLI，官方 CLI 会说"用户未登录"

`dorado resource get/update` 在 `eu-ttp2` 上走 function-library 网关，官方 CLI 报
`Dataleap JWT error: 用户未登录`，`--site eu-ttp` 与 `BYTEDCLI_FUNCLIB_TITAN_FALLBACK=1`
都救不回来。打过补丁的副本加同一个环境变量可以：

```bash
export BYTEDCLI_FUNCLIB_TITAN_FALLBACK=1
<patched>/bytedcli --site eu-ttp --json dorado resource get --id <RID> -r eu-ttp2
<patched>/bytedcli --site eu-ttp --json dorado resource update -r eu-ttp2 --id <RID> \
  --type zip --name <新名字> --file single_stage_v2_release.zip --timeout-ms 300000
```

`--file` 会把资源的 `fileName` 改成本地文件名，而容器里的 archive 路径由它派生
⇒ **本地文件名必须等于任务体期望的名字**，`--name` 只是标签。上传后回读 `fileName` 确认。

### 多机房同一条链路会悄悄产生版本漂移，发车前先比 bundle sha

一条链路在两个机房各有一套任务，改动通常只发生在主力机房。实测：ROW 已经到 v39，
EU 还挂着 **v24**——中间十五个版本里正好包含"`action=stage` 其实一行都不写"的修复。
如果不查这一步，EU 侧会一路跑通然后交出一张空表，而每个环节都报成功。

**判据：拿两边节点的 `F1_V2_BUNDLE_SHA256`（或同类 pin）直接对比，不要看更新时间。**
把主力机房的发布包 zip 原样传到另一机房的资源 id 上，然后把
`BUNDLE/CODE/MANIFEST/TASK_BODY/RELEASE_ID` 这几个 pin 整组搬过去，
只保留 `EXPECTED_PROJECT_ID` / `EXPECTED_TASK_ID` / `REGION` / `P_DATE` 这些机房相关项。
**pin 要整组搬**：只改其中一两个，任务体的自校验会在容器里当场拒绝。

### 长作业在 same-job provenance 架构下会被源漂移打败

发布前重读源、与作业开始时捕获的证据比对，是这类架构的正确设计。但它有个隐含代价：
**作业越长，上游在这期间改写源分区的概率越大**，而 30 日窗口天然包含仍在变动的近期分区。
一次 2.5 小时的运行在最后一步被这道门禁拒绝，等于整轮作废。

⇒ **提高资源不只是为了快，也是为了缩小这个暴露窗口。** 把 2.5 小时压到 20 分钟，
漂移概率降到约 1/7。资源充足时不要"够用就行"——长作业的时长本身就是一种风险敞口。

### 实例 pending 有三种完全不同的原因，`statusDesc` 才是判据

看到实例长期 `pending` 时**不要猜"队列没资源"**——先读 `dorado instance get <id>` 的 `statusDesc`：

| statusDesc | 真实原因 | 处理 |
|---|---|---|
| `等待上游依赖完成` | 任务拓扑上的父任务实例未完成 | 这是**运行时**依赖等待，见下条 |
| `等待通过并发检查` | 任务 `innerScheduleParam.maxParallelism` 已被占满 | 放宽该值，或终止占位实例 |
| （已 RUNNING 但 YARN 侧不动） | 才是队列资源问题 | 查 `megatron queue usage` 的 `available_now` |

实证：一个 F1 实例 pending 了 40 分钟，我据此判断"被队列饿着"并据以规划换队列，
实际 `statusDesc` 写的是等待上游依赖——**队列毫无问题，我的整个诊断方向都是错的**。
一条命令能读到的事实，不要用现象去推。

### `backfill create --skip-check` 不解除运行时的上游等待

该参数只影响**补数创建时**的检查（结果体现在 `instanceChecks` 的 `upstream-instance-status: not_check`），
实例真正被调度时仍会等待父任务同业务日的实例完成。父任务正在跑长作业时，子任务会一直 pending。

要让子任务真正独立于父任务运行，必须**从任务依赖里摘掉那个父任务**
（`innerScheduleParam.dependencies` 里删除对应 `parentTaskId`），跑完再恢复。
只有当这一轮**语义上确实不消费该父任务的产物**时这么做才是正当的——
例如本例中 F1 以 PID-only 模式运行，映射帧是空表，确实不读 S4。摘依赖前先存一份原始列表以便还原。

### 提交新任务版本会终止正在排队的实例

`node submit` 之后，该任务所有 `pending` 实例会变成 `aborted / 系统终止`。
所以顺序必须是**先改完配置并提交，再创建 backfill**；
反过来做（先发车、再改配置）会把刚发的车直接报废，而且现象上很像"任务莫名消失"。

**同一个业务日再发一次，会杀掉正在跑的那一个 —— `maxParallelism` 管不到这件事。**
实测：一个已经跑了 1 小时 31 分的实例，在我为**同一任务同一业务日**创建新 backfill 的**同一秒**
变成"系统终止"，而该任务 `maxParallelism = 2`。
⇒ `maxParallelism` 约束的是**不同业务日**之间的并发，同一业务日只有一个位置，新的顶掉旧的。

判断两个运行能不能并存，要同时看三样：**队列/资源**、`maxParallelism`、**业务日是否相同**。
只看前两样会得出"它们不争用"的错误结论。想让两个规模并存，就给它们不同的业务日
（或者不同的任务），不要指望并发度参数。

### 监控必须先确认它会说话，哑监控就是假安全

给长作业挂监控之后，**必须先看到它至少输出过一行**，才能认为自己在盯着它。一个查询少传了必填参数
（例如 `backfill get` 漏了 `--project-id`）的轮询脚本会一直输出空字符串：作业失败了，监控一声不吭，
而"没有告警"和"仍在运行"在观感上完全一样。实证：F1 失败 7 分钟后我仍以为它在跑，是主动去查才发现的。

写监控时把三种状态都显式区分，缺一不可：

- **成功** 与 **失败**（终态判定要覆盖全部失败态，不能只 grep 成功标记）
- **查询本身失败**（`QUERY_FAILED`），它必须和"作业正常运行"输出不同的内容

判定终态优先用计数而不是状态字符串：`complete >= total` 说明跑完了，
再用 `succeed >= total` 区分成功还是失败——`progress=100` 只代表跑完，**不代表成功**。

## 故障诊断与性能分析

优先路径使用 bytedcli 单工具，不再调用 dpcli。全流程保持只读；不要在诊断阶段执行 `rerun`、`online`、`commit`、`set-success`、`abort` 或任何 `update*` 命令。

```bash
# 1) 先拿 Dorado 实例与日志摘要；log-summary 通常能暴露 applicationId 或主要错误片段
bytedcli --json dorado instance get <instanceId> --region <region>
bytedcli --json dorado instance log-summary <instanceId> --project-id <projectId> --region <region>

# 2) 下载实例日志到本地做关键字扫描
bytedcli auth login --session
bytedcli --json dorado download-instance-log --instance-id <instanceId> \
  --project-id <projectId> --region <region> -o temp/instance_<instanceId>.log

# 3) 有 applicationId 时进入 Megatron：应用元数据 + Spark/Flink 日志链接
bytedcli --json megatron app get --app-ids <applicationId> -r <region>
bytedcli --json megatron spark log-link list --app-id <applicationId> -r <region>
bytedcli --json megatron flink log-link list --app-id <applicationId> -r <region> \
  --taskmanager-keyword <keyword> --resolve-taskmanager-downloads

# 4) Spark 深入分析继续用 spark-ui 原子命令
bytedcli --json megatron spark-ui summary get --app-id <applicationId> -r <region>
bytedcli --json megatron spark-ui jobs list --app-id <applicationId> -r <region>
bytedcli --json megatron spark-ui executors list --app-id <applicationId> --all -r <region>

# 兼容入口：已有 Spark History/Megatron diagnostics 链路仍可直接读取
bytedcli --json dorado get-spark-history --instance-id <instanceId> --region <region>
bytedcli --json dorado get-spark-history --application-id <applicationId> --region <region>
```

当 `get-spark-history` 返回 `MEGATRON_APP_ID_NOT_FOUND`（通常表示没有产生 YARN application）时，优先下载实例日志定位 SQL 编译/权限/参数问题：

```bash
bytedcli auth login --session
bytedcli dorado download-instance-log --instance-id <instanceId> --project-id <projectId> --region <region> -o temp/instance_<instanceId>.log
grep -nE 'NoPrivilegeException|permission|privilege|CalciteContextException|SemanticException|ParseException|AnalysisException|Number of INSERT target columns|TQS 查询失败|FAILED|ERROR' temp/instance_<instanceId>.log | head -n 200
```

更完整的失败诊断与慢任务性能分析方法见：`../../troubleshooting.md`

- 使用通用调用方式：`../../invocation.md`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

Commands are grouped under `dorado project`, `dorado task`, `dorado dts`, `dorado folder`, `dorado instance`, `dorado adhoc`, `dorado backfill`, `dorado spark-jar`, `dorado decc`, and `dorado flink` (realtime). Old flat names (e.g. `dorado list-projects`, `dorado get-task`, `dorado adhoc-exec`, `dorado folder-structure`, `dorado folder-children`, `dorado task diff-query`, `dorado task list-versions`, `dorado task update-query`) still work as hidden aliases.

```bash
# 创建 Spark-jar 配置（写入到 node draft）
# 说明：--spark-conf 为 k=v，可重复；--jars/--files/--py-files/--archives 接受 JSON 数组字符串
bytedcli dorado spark-jar create --node-id demo-node-id \
  --main-class com.example.Main \
  --main-file-path /path/to/app.jar \
  --main-resource-id 100001234 \
  --spark-conf spark.executor.memory=2g \
  --spark-conf spark.sql.shuffle.partitions=200

# 读取单个字段（示例输出：com.example.Main）
bytedcli dorado spark-jar get --node-id demo-node-id --field mainClass

# 更新 sparkConf（k=v，可重复；handler 会做 merge，不会清空未提及的 key）
bytedcli dorado spark-jar update --node-id demo-node-id \
  --spark-conf spark.sql.adaptive.maxNumPostShufflePartitions=6000 \
  --spark-conf spark.executor.cores=4
```

```bash
# 项目列表
bytedcli dorado project list --region boei18n --page 1 --size 20

# 任务列表 / 按名字搜任务（首选；--keyword 匹配 name/uid/owner）
bytedcli dorado task list --region boei18n --project-id 458 --page 1 --size 20
bytedcli dorado task list --region cn --project-id 458 --keyword "demo_task" --limit 10

# 搜索任务（keyword/status 走 task list v2 端点；--folder-id 走 legacy 批量端点，部分 cn 项目会报错）
bytedcli dorado task search --region cn --project-id 458 --status "init" --keyword "test_task"

# 高级搜索（IDE 树节点检索；--search-scope 可选 owner/name/uid/metadata/content；JSON 结果在 data.nodes）
# metadata=按任务配置参数检索，content=按任务代码(SQL/脚本全文)检索；多个 scope 取交集(AND)，组合越多结果越少
bytedcli dorado task advanced-search --region boei18n --project-id 458 -k "demo_task" --search-scope "owner,name,uid" --owner username --limit 10
# 按引用表名/配置参数检索任务（推荐单独用 metadata）
bytedcli dorado task advanced-search --region boei18n --project-id 458 -k "demo_table" --search-scope metadata

# 获取任务详情（包括源/目标信息、SQL 代码、依赖任务 ID）
bytedcli dorado task get 100274211 --region boei18n

# 获取任务 SQL 代码（--project-id 省略时自动解析；--output 落盘）
bytedcli dorado task code --task-id 100274211 --region boei18n
bytedcli dorado task code --task-id 100274211 --output ./task.sql

# 获取任务监控配置（告警规则、基线绑定；--project-id 省略时自动解析）
bytedcli dorado task alarms --task-id 100274211 --region boei18n
bytedcli dorado task alarms --task-id 1204196659 --project-id 1200002135 --region mycis

# 按 taskId 反查绑定的 baseline（baseline_global task lookup）
bytedcli dorado baseline get --task-id <task-id> --region-value <region-value> --region <region>

# 按项目筛选 baseline 列表（支持 SLA 优先级 D1-D5、baseline 名称关键字和 i18n region_value；SLA 不筛选时用 default）
bytedcli dorado baseline list --project-id <project-id> --baseline "<keyword>" --sla-priority D1 --region-value <region-value> --region <region>

# 按项目筛选 baseline 实例列表（支持 baseline 名称关键字、实例 ID 和 i18n region_value；这些过滤可省略）
bytedcli dorado baseline instances --project-id <project-id> --baseline "<keyword>" --baseline-instance-ids <id1,id2> --start-baseline-time "YYYY-MM-DD HH" --end-baseline-time "YYYY-MM-DD HH" --region-value <region-value> --region <region>

# 按 baseline 实例读取 commit tasks 详情（baseline instance detail）
bytedcli dorado baseline commit-tasks --baseline-id <baseline-id> --baseline-instance-id <baseline-instance-id> --project-id <project-id> --baseline-time "YYYY-MM-DD" --region-value <region-value> --region <region>

# 按 baselineId 读取 baseline 详情（支持 i18n region_value）
bytedcli dorado baseline get --baseline-id <baseline-id> --project-id <project-id> --region-value <region-value> --region <region>

# 创建任务
bytedcli dorado task create --type hsql --project-id <project-id> --folder-id <folder-id> --name "demo_task" --region boei18n
bytedcli dorado task create --type global_hsql --project-id <project-id> --folder-id <folder-id> --name "demo_global_task" --region us-ttp

# 获取任务模板详情：按所选 region 发送 GET /develop/info?id=<template_id>&projectId=<project_id>
bytedcli dorado task template get \
  --template-id 24680 \
  --project-id 12345 \
  --region sg

# 保存任务模板内容：按所选 region 发送 PUT /develop/<template_id>
# --region sg 会使用 Dorado SG site config 中的 region base URL
# 可用 --params-json '[]' 显式传模板参数，或用 --conf-file ./conf.json 传完整 { "code", "engineType", "params" } 对象
bytedcli dorado task template save \
  --template-id 24680 \
  --region sg \
  --code-file ./template.sql \
  --engine-type spark \
  --description "CommonTemplate for demo-group; validation tasks"

# 创建 DTS 批处理任务（common-dts-batch）
bytedcli dorado task create --type common-dts-batch --project-id 300002016 --folder-id 300370052 --name "demo_dts_task" --region sg

# 创建 hive->clickhouse 任务（壳子与 common-dts-batch 同形态，type 升级在 update-conf 阶段完成）
bytedcli dorado task create --type hive-clickhouse --project-id 1200002135 --folder-id 1200221500 --name "hive2ch_demo" --region mycis
bytedcli dorado task update-conf 1204206582 --task-file ./hive2ch-patch.json --type 'hive->clickhouse' --region mycis

# 创建 DTS 流式任务（common-dts-stream，例如 bmq->hive），走 /realtime/create 接口，与 common-dts-batch 相对
bytedcli dorado task create --type common-dts-stream --project-id 300003392 --folder-id 300202455 --name "demo_dts_stream_task" --region sg

# DTS 元数据 lookup（创建/补全 DTS 配置时使用）
bytedcli -j dorado dts datasource list --project-id 300002016 --data-source-type mysql --region sg
bytedcli -j dorado dts database list --project-id 300002016 --data-source-type hive --region sg
bytedcli -j dorado dts table list --project-id 300002016 --data-source-type hive --database-name demo_db --region sg
bytedcli -j dorado dts sql-column get --sql "select id, name from demo_db.demo_table" --region sg
bytedcli -j dorado dts mysql-split-key list --database-name demo_db --table-name demo_table --region sg
bytedcli -j dorado dts clickhouse-shard-num get --cluster demo_ck_cluster --dts-region-name cn --region cn
bytedcli -j dorado dts doris-writer-metadata get --cluster demo_doris --region sg

# 创建 stream_sql 实时 SQL 任务壳子，同样走 /realtime/create；创建时不要传 --query / --query-file
bytedcli dorado task create --type stream_sql --project-id <project-id> --folder-id <folder-id> --name "demo_stream_sql_task" --region sg

# 创建 Java Flink 实时任务壳子，同样走 /realtime/create；创建时不要传 --query / --query-file
bytedcli dorado task create --type java-flink --project-id <project-id> --folder-id <folder-id> --name "demo_java_flink_task" --region sg

# 保存 DTS 流式任务草稿：写入完整 conf（reader=bmq / writer=hive / operator=flink）并指定运行队列
# 队列可先用 `project yarn-queues --task-type common-dts-stream` 找到最空的流式队列
bytedcli dorado task update-conf 306904995 --task-file ./bmq2hive-conf.json --queue root.demo_flink_queue --cluster Demo-Cluster --dc my2 --priority normal --owner demo.user --region sg

# 转交任务 owner（默认会读取任务名；单任务可用 --name 显式传入）
bytedcli dorado task transfer-owner --task-id <task-id> --project-id <project-id> --owner demo-owner --region va
bytedcli dorado task transfer-owner --task-id <task-id> --project-id <project-id> --owner demo-owner --name demo_task --region va
bytedcli dorado task transfer-owner --task-ids 1001,1002,1003 --project-id <project-id> --owner demo-owner --region va

# 更新 SQL 任务（hsql/fsql/stream_sql）的查询
bytedcli dorado task update 100274211 --query "SELECT * FROM table" --region boei18n
bytedcli dorado task update 100274211 --type hsql --region boei18n

# 更新 MySQL 到 Hive 任务配置（支持设置 split keys）
bytedcli dorado task update 123456 --type mysql-hive --split-keys id,name --region boei18n
bytedcli dorado task update 123456 --type mysql-hive --source-db source_db --source-table source_table --target-db target_db --target-table target_table --split-keys id,name --region boei18n

# MySQL 到 Hive Binlog 任务
bytedcli dorado task binlog status --task-id 67890 --dorado-region-name demo-region --region cn
bytedcli dorado task binlog status --src-database demo-db --src-storage-region demo-region --subscribe-type incremental --task-type mysql->hive --dorado-region-name demo-region --region cn
bytedcli dorado task binlog connect --tree-node-id 123456 --task-id 67890 --dorado-region-name demo-region --region cn
bytedcli dorado task binlog connect --tree-node-id 123456 --src-database demo-db --src-storage-region demo-region --owner demo-owner --task-type mysql->hive --dorado-region-name demo-region --region cn --wait

# 对比 SQL 版本差异（默认：最新发布版本 vs 草稿）
bytedcli dorado task diff 100274211 --region boei18n
bytedcli dorado task diff 100274211 --from 5 --to 6 --region boei18n  # 版本 5 vs 版本 6
bytedcli dorado task diff 100274211 --from 5 --region boei18n          # 版本 5 vs 草稿

# 检查任务是否在线
bytedcli dorado task check-online 100274211 --project-id 458 --region boei18n

# 重跑任务（默认仅回溯，不部署）
bytedcli dorado task rerun 100274211 --project-id 458 --biz-date 2026-03-12 --region boei18n

# 双跑任务默认使用最新线上版本；需要基于草稿版本双跑时显式加 --use-draft-version。
# CLI 会自动从 Dorado 草稿版本列表读取 C... commitId；只有自动查询失败时才需要用 --draft-commit-id 兜底。
bytedcli dorado task rerun 100274211 --project-id 458 --biz-date 2026-03-12 \
  --trigger-type dualRun --use-draft-version --region boei18n
bytedcli dorado task rerun 100274211 --project-id 458 --biz-date 2026-03-12 \
  --trigger-type dualRun --use-draft-version --draft-commit-id CsampleDraftCommit --region boei18n

# 切换队列重跑任务（默认仅回溯，不部署）
bytedcli dorado task rerun 100274211 --project-id 458 --biz-date 2026-03-12 --region boei18n --clusters "cluster1,cluster2" --queues "queue1,queue2"

# 区间回溯
bytedcli dorado task rerun <task-id> --project-id <project-id> --start-biz-date 2026-03-01 --end-biz-date 2026-03-31 --region sg

# 指定回溯范围类型（single_task_rerun / single_task_backfill / multi_task_rerun / multi_task_backfill / link_backfill）
bytedcli dorado task rerun <task-id> --project-id <project-id> --biz-date 2026-03-31 --scope single_task_backfill --region sg

# 重跑并提交部署（需显式加 --deploy）
bytedcli dorado task rerun 100274211 --project-id 458 --biz-date 2026-03-12 --deploy --message "rerun reason" --region boei18n

# 传入自定义输入参数（覆盖任务默认参数）
# --input-params 接受 JSON 数组，每个元素包含 name/paramValue/type 字段
# 注意：包含特殊字符（如单引号）的参数值，推荐通过环境变量传入，避免 shell 转义问题
DEMO_PARAM="{ 'key': 'demo-value' }"
INPUT_PARAMS=$(DEMO_PARAM="$DEMO_PARAM" node -e "
const params = [
  {name:'demo_param_a', paramValue:'demo-value-a', type:'task_custom'},
  {name:'demo_param_b', paramValue:'demo-value-b', type:'task_custom'},
  {name:'demo_param_c', paramValue:process.env.DEMO_PARAM, type:'task_custom'},
];
process.stdout.write(JSON.stringify(params));
")
bytedcli --json dorado task rerun <task-id> --project-id <project-id> --biz-date 2026-03-31 \
  --input-params "$INPUT_PARAMS" --region sg

# 指定具体实例（trigger-nodes）和时间区间参数
bytedcli dorado task rerun <task-id> --project-id <project-id> --region sg \
  --interval-start-time "2026-03-30 15:00:00" --interval-end-time "2026-03-30 16:00:00" \
  --trigger-nodes '[{"taskId":<task-id>,"projectId":<project-id>,"taskTime":"2026-03-30 00:00:00"}]'

# 上线任务（提交草稿并部署上线）
# realtime stream 任务（如 kafka2clickhouse / stream_channel_* / conf.typeGroup=stream）会自动走 PUT /realtime/{taskId}/online
bytedcli dorado task online 100274211 --project-id 458 --region boei18n
bytedcli dorado task online 100274211 --project-id 458 --message "deploy v2" --skip-codes "-1005" --region boei18n

# 提交审批（页面同款 commitAndDeploy payload）
# 对应 payload 字段：reviewPolicyId / reviewUserNames / openDefaultSystemAlarm / customAlarmRuleIds / baselineIds / agentConfig / projectId / skipCodes
# review-policy-id / review-users 必须由用户按当前项目显式提供
bytedcli dorado task commit-approval <task-id> --project-id <project-id> \
  --review-policy-id 24 \
  --review-users "demo-user-a,demo-user-b" \
  --custom-alarm-rule-ids 11870,14696 \
  --baseline-ids 33 \
  --agent-config '{"sessionId":"demo-session"}' \
  --region mycis

# 批量提交审批（deploy/v2/create，同一个 deploy package 可包含多个 commit）
# --skip-codes 会同时注入 body 与 URL query（与单任务 commit-approval/online 一致），可跳过 -10000 这类确认告警（如「已存在其他任务同步同名表，请确认上线」）
bytedcli dorado task commit-batch-approval --project-id <project-id> \
  --name demo_pkg_20260507 \
  --message "batch approval" \
  --review-policy-id 24 \
  --review-users "demo-user-a,demo-user-b" \
  --commit-ids "108103,108111,108110" \
  --skip-codes "-1005,-10000" \
  --region mycis

# 查看发布包详情里的 DIFF SQL（deploy/{deployId}/detail?projectId=...；无显式 diff 字段时比较 rawCommitVo/newCommitVo 代码快照）
bytedcli dorado deploy diff-sql --deploy-id <deploy-id> --project-id <project-id> --region mycis

# 仅提交（commit 草稿，不部署上线）
# realtime stream 任务会自动走 PUT /realtime/{taskId}/commit
bytedcli dorado task commit <task-id> --project-id <project-id> --region mycis
bytedcli dorado task commit <task-id> --project-id <project-id> \
  --message "commit draft" \
  --review-policy-id 33 \
  --no-open-default-system-alarm \
  --custom-alarm-rule-ids 14032 \
  --baseline-ids 33 \
  --agent-config '{"sessionId":"demo-session"}' \
  --region mycis

# 获取实例对应的 Spark History 链接
bytedcli dorado get-spark-history --instance-id 1088059891 --region sg

# 查看版本历史
bytedcli dorado task version list 100274211 --region boei18n

# 实例列表
bytedcli dorado instance list --region boei18n --project-id 458 --task-id 100274211

# 获取实例详情
bytedcli dorado instance get 258345284 --region boei18n

# 创建完整的回溯计划（批量多任务执行）
bytedcli dorado backfill create --project-id <project-id> --task-ids <task-id1,task-id2> --start-date 2026-03-01 --end-date 2026-03-10 --region sg

# 检查回溯状态（进度和实例数量）
bytedcli dorado backfill get --backfill-id 3614569 --region boei18n

# 查看回溯计划内的具体任务触发器详情
bytedcli dorado backfill triggers --region boei18n --backfill-id 3614569
bytedcli dorado backfill triggers --region sg --backfill-id 123456 -j

# 下载实例日志（纯文本，页面态 cookie）
bytedcli auth login --session
bytedcli dorado download-instance-log --instance-id 1102084977 --project-id 150000021 --region sg -o instance_1102084977.log

# 获取队列资源使用情况
bytedcli dorado task get-queue-resource --clusters snake,badge --queues root.snake_eprivacy_eng,root.badge_privacy_eng --region boei18n

# 查看项目可用的 Yarn 队列
bytedcli dorado project yarn-queues --project-id 458 --region boei18n
bytedcli dorado project yarn-queues --project-id 458 --task-type global_hsql --region us-ttp  # 按任务类型过滤
bytedcli dorado project yarn-queues --project-id 300003392 --task-type notebook --region sg --restricted  # 仅看合规队列（仅 i18n / 非 cn region 有此概念）

# 查看项目文件夹结构
bytedcli dorado folder structure --project-id 458 --region boei18n
bytedcli dorado folder structure --project-id 458 --root-id -2 --region boei18n  # 查看临时查询目录

# 查看文件夹下的子项（子文件夹和任务）
bytedcli dorado folder children --folder-id 268736 --project-id 458 --region boei18n

# 创建子目录
bytedcli dorado folder create --project-id 12345 --parent-uri "task:///HrdNGPWr" --name "demo-folder" --region cn
bytedcli dorado folder create --project-id 12345 --parent-uri "task:///HrdNGPWr" --name "demo-folder" --description "a demo subfolder" --region sg

# 更新任务草稿配置
bytedcli dorado task-draft update 100274211 --queue root.pns_data_infra_core --cluster model01 --region boei18n
bytedcli dorado task-draft update 100274211 --sql "SELECT * FROM table" --region boei18n  # 更新 SQL 代码
bytedcli dorado task-draft update 1204210031 --frequency hourly --schedule-time 5 --schedule-day 16 --region mycis  # 小时调度，直接传页面调度值
bytedcli dorado task-draft update 100274211 --dependencies "100274200:0:set,100274201:0:set" --region boei18n  # 更新同机房任务依赖
bytedcli dorado task-draft update 100274211 --outer-dependencies "306220763@sg" --region va  # 更新跨机房依赖（va 任务依赖 sg 任务）
bytedcli dorado task-draft update 100274211 --outer-dependencies "100@sg:0:set,200@va:1:set" --region cn  # 多个跨机房依赖

# 更新跨区域查询配置（queryType + sourceRegionInfos）
bytedcli dorado task-draft update 306215786 -r sg --sql "select 1" --query-type FLEXIBLE_UNION \
  --source-region-infos '[{"geo":"SG","yarnQueue":{"region":"sg","dc":"my","clusterName":"badge","queue":"root.badge_example"}},{"geo":"EU_TTP","deccDataId":"7491149792614072631","deccEndpointId":"7252920295022035206","yarnQueue":{"region":"i18n_gcp","dc":"useast2a","clusterName":"coati","queue":"root.coati_example"},"owner":"demo.user"}]'

# 更新 DTS 任务配置（common-dts-batch 类型）
# sourceType=sql: 通过 SQL 查询读取数据
bytedcli dorado task-draft update <task-id> -r sg \
  --dts-read-type hive --dts-read-idc sg --dts-read-source-type sql \
  --dts-read-query "select col1, col2 from example_db.example_table where date = '\${date}'" \
  --dts-read-connector-type hive \
  --dts-read-columns '[{"type":"string","name":"col1"},{"type":"bigint","name":"col2"}]' \
  --dts-writer-type clickhouse --dts-writer-idc sg \
  --dts-writer-cluster cnch_example_cluster \
  --dts-writer-database-name example_db --dts-writer-table-name example_table \
  --dts-writer-partitions '[{"name":"date","type":"TIME","value":"${date}"}]' \
  --dts-writer-shard-column col1 --dts-writer-shard-num 1200 --dts-writer-append-mode 2 \
  --dts-writer-columns '[{"type":"string","name":"col1"},{"type":"int64","name":"col2"}]' \
  --dts-writer-connector-type clickhouse

# sourceType=table: 通过指定库表名读取数据
bytedcli dorado task-draft update <task-id> -r sg \
  --dts-read-type hive --dts-read-idc sg --dts-read-source-type table \
  --dts-read-database-name example_db --dts-read-table-name example_table \
  --dts-read-connector-type hive \
  --dts-read-columns '[{"type":"string","name":"col1","description":"desc1"}]' \
  --dts-read-partitions '[{"name":"date","type":"string","value":"${date}"}]' \
  --dts-writer-type clickhouse --dts-writer-idc sg \
  --dts-writer-cluster cnch_example_cluster \
  --dts-writer-database-name example_target_db --dts-writer-table-name example_target_table \
  --dts-writer-partitions '[{"name":"date","type":"TIME","value":"${date}"}]' \
  --dts-writer-shard-column col1 --dts-writer-shard-num 1200 --dts-writer-append-mode 2 \
  --dts-writer-columns '[{"type":"string","name":"col1"},{"type":"int64","name":"col2"}]' \
  --dts-writer-connector-type clickhouse

# larksheet -> hive: 通过 LarkSheet URL 读取并写入 Hive
bytedcli dorado task-draft update <task-id> -r mycis \
  --dts-read-type larksheet --dts-read-idc pinnacle \
  --dts-read-url "https://example.com/wiki/demo?vwb=1.0.0&sheet=abc123" \
  --dts-read-sheet-type spreadsheet \
  --dts-read-template-param '{}' \
  --dts-read-connector-type larksheet \
  --dts-read-columns '[{"type":"string","name":"col1","extraType":null,"description":null},{"type":"string","name":"col2","extraType":null,"description":null}]' \
  --dts-writer-type hive --dts-writer-idc pinnacle \
  --dts-writer-database-name example_db --dts-writer-table-name example_table \
  --dts-writer-partitions '[{"name":"pdate","type":"TIME"}]' \
  --dts-writer-columns '[{"type":"string","name":"id","description":"col1"},{"type":"string","name":"obj_id","description":"col2"}]' \
  --dts-writer-connector-type hive

# 局部更新（只修改部分字段，其余保留原值）
bytedcli dorado task-draft update <task-id> -r sg --dts-writer-append-mode 3
bytedcli dorado task-draft update <task-id> -r sg --dts-read-query "select col1 from example_db.example_table"

# 测试运行任务草稿（debug run）
bytedcli dorado task-draft test 100274211 --project-id 458 --region boei18n
# 默认会打印本次提交调试所使用的 SQL（debug_sql）；`--json` 输出也会在 `data.debug_sql` 返回该 SQL

# 测试运行时抑制 Manta 数据质量监控触发（HSQL 等非 node-type 任务生效）
# 适用于反复调试 SQL、不希望产生 Manta test_check 告警的场景
bytedcli dorado task-draft test 100274211 --project-id 458 --region boei18n --disable-manta

# 传入自定义输入参数（覆盖任务代码中 {{param}} 占位符）
# --input-params 接受 JSON 数组，每个元素只需 name/debugVal 两个字段（debugVal 为调试时代入占位符的值）
# 注意：${date}、${bizdate} 等系统内置参数不属于自定义参数，不需要通过此选项传入
# 注意：task-draft test 用 name/debugVal（后端自动补全 type 等元数据），与 task rerun 的 name/paramValue/type 字段不同，不要混用
# 注意：doris_sql / spark / python / notebook 这类 node-type 调试会由 CLI 先替换提交内容中的 {{param}}，再调用 IDE debug endpoint
bytedcli dorado task-draft test 100274211 --project-id 458 --region boei18n \
  --input-params '[{"name":"data_version","debugVal":"2026-06-24"}]'

# 校验 HSQL / stream_sql 任务草稿语法
bytedcli dorado task-draft explain 100274211 --project-id 458 --region boei18n
bytedcli dorado task-draft explain 100274211 --project-id 458 --date 2025-04-20 --region mycis
bytedcli dorado task-draft explain 100274211 --project-id 458 --template-var hrbi_corehr_global=hrbi_corehr_global --region mycis
bytedcli dorado task-draft explain 100274211 --project-id 458 --online --region mycis
bytedcli dorado task-draft explain 100274211 --project-id 458 --version 6 --region mycis
bytedcli dorado task-draft explain 104905354 --project-id 1566 --region cn

# 校验 DTS 草稿 reader SQL 语法（resource/explain）
bytedcli dorado dts-draft explain 1204196358 --project-id 1200002135 --region mycis --date 2025-04-20
bytedcli dorado dts-draft explain 1204196358 --project-id 1200002135 --template-var hrbi_atsx_global=hrbi_atsx_global --region mycis
bytedcli dorado dts-draft explain 1204196358 --project-id 1200002135 --online --region mycis

# 获取依赖推荐（根据任务 SQL 推荐可依赖的上游任务）
bytedcli dorado task dep-recommendations 100274211 --region boei18n

# 获取目录树子节点（返回 UID-based uri，用于 node create 的 --parent-uri）
bytedcli dorado tree-nodes children --project-id {project-id} --region boei18n          # 查询根目录
bytedcli dorado tree-nodes children --project-id {project-id} --uri "task:///f{numericId}" --region boei18n   # 查询指定 uri 的子节点
bytedcli dorado tree-nodes children --project-id {project-id} --uris "task:///,task:///f{numericId}" --region boei18n  # 批量查询
# 返回每个子节点的 uid/name/type/uri/isLeaf；dir 类型子节点的 uri 即可作为创建任务时的 --parent-uri

# 列出项目 UDF（用户自定义函数），包括 Hive 函数和目录
bytedcli dorado tree-nodes udf list --project-id {project-id} --region {region}

# 列出所有项目资源（file, jar, zip, scm, image, thrift, dir），递归遍历目录
bytedcli dorado tree-nodes resource list --project-id {project-id} --region {region}

# 获取 UDF 详情，包括 HDFS 路径、绑定名称和版本
bytedcli dorado tree-nodes udf get --project-id {project-id} --bind-id {bind-id} --region {region}

# 通过 UDF nodeUid 或资源 nodeUid 获取资源 ID（bindId），该 ID 可用于创建函数、更新资源等操作
bytedcli dorado tree-nodes id get --node-ids {node-id-1},{node-id-2} --region {region}

# 更新资源详情，包括 scmVersion
# 注意：
# 1. 正确的参数名是 --owner-user-name（不是 --owner-ownerUserName）
# 2. --de-compression 需要明确传入布尔值：true 或 false
# 3. jar 资源的 --sub-type 应为 jar（不是 scm）
bytedcli dorado tree-nodes resource update --project-id {project-id} --resource-id {resource-id} --name {name} --description {description} --owner-user-name {owner-user-name} --sub-type {sub-type} --type {type} --engine-id {engine-id} --hdfs-path {hdfs-path} --download-url {download-url} --file-name {file-name} --hash {hash} --source-type {source-type} --scm-id {scm-id} --scm-name {scm-name} --scm-version {scm-version} --scm-source-file-path {scm-source-file-path} --de-compression {de-compression} --region {region}

# 获取单个项目资源详情（含 conf JSON：SCM 资源会含 scmName/scmVersion/imageStatus/imageLatestJobId/imageScms）
bytedcli dorado tree-nodes resource get --project-id {project-id} --resource-id {resource-id} -j

# 只刷 SCM 资源（如 Python 镜像）上的 scmVersion，触发后端异步重建镜像
# 仅适用于 conf.scmName 非空的资源；非 SCM 资源请用 `resource update`
# 写完不会阻塞，需要观察构建结果时再次调用 `resource get`，看 conf.imageStatus（1=building/2=ready）与 conf.imageLatestJobId 是否翻新
bytedcli dorado tree-nodes resource update-scm-version --project-id {project-id} --resource-id {resource-id} --scm-version {scm-version}

# 创建函数
bytedcli dorado tree-nodes function create --project-id {project-id} --name {name} --description {description} --type {type} --sub-type {sub-type} --engine-id {engine-id} --folder-id {folder-id} --bind-resource-id {bind-resource-id} --udf-type {udf-type} --class-name {class-name} --region {region}

# Dorado 全局资源库（页面 /dorado/settings/resource-file）：上传本地 jar
# 鉴权：发 x-dataleap-jwt-token，由 ByteCloud JWT 通过 /user/jwt 兑换得到，纯 token，不需要浏览器 session
bytedcli dorado resource upload --file ./demo-udf.jar --name demo_udf --description "demo udf" -r cn

# 全局资源库：列出 / 查看资源（含 fileLink）
bytedcli dorado resource list --type jar -r cn
bytedcli dorado resource get --id 100052827 -r cn

# 全局资源库：更新资源（默认只改 name/description；带 --file 才替换 jar）
bytedcli dorado resource update --id 100052827 --name demo_udf --description "updated desc" -r cn

# Dorado 全局函数库（页面 /dorado/settings/functions）：创建 UDF/UDTF/UDAF 并绑定到刚上传的 jar
bytedcli dorado function create --resource-id 100052827 --name demo_udf --class-name com.example.demo.HelloUDF --function-type udf -r cn

# 全局函数库：列出 / 查看函数
bytedcli dorado function list --resource-id 100052827 -r cn
bytedcli dorado function get --id 13333 -r cn

# 全局函数库：更新函数（body 形态与 create 相同，按 --id 定位）
bytedcli dorado function update --id 13333 --resource-id 100052827 --name demo_udf --class-name com.example.demo.HelloUDF --function-type udf -r cn

# 查询项目可用镜像（返回 id + name，用于 node create/save 的镜像配置）
bytedcli dorado image list --project-id {project-id} --region cn
bytedcli dorado image list --project-id {project-id} --region cn -k demo_image   # 按名称关键词过滤

# 仅有 taskId、解析 IDE nodeUid（tree-nodes name+type filter 单路径下钻）
bytedcli dorado node resolve-uid --project-id {project-id} --task-id 100274211 --region boei18n -j

# Python/Notebook/Spark 任务节点（非 SQL 类任务；SQL 任务请用 task-draft）
# 创建节点（返回 nodeId，后续操作均通过 nodeId 进行）
bytedcli dorado node create --project-id {project-id} --name demo-python-task --type python --region cn
bytedcli dorado node create --project-id {project-id} --name demo-notebook --type notebook --region cn
bytedcli dorado node create --project-id {project-id} --name demo-spark-task --type spark --region cn

# 创建时指定 Docker 镜像（先用 image list 查询可用镜像的 id 和 name）
bytedcli dorado node create --project-id {project-id} --name demo-python-task --type python --image-name demo-image --image-id 400012345 --region cn
bytedcli dorado node create --project-id {project-id} --name demo-notebook --type notebook --image-name demo-image --image-id 400012345 --region cn
bytedcli dorado node create --project-id {project-id} --name demo-spark-task --type spark --image-name demo-image --image-id 400012345 --region cn

# Spark (PySpark) 任务可额外指定语言和 Spark 版本（默认 language=python, spark-version=3.2）
bytedcli dorado node create --project-id {project-id} --name demo-pyspark --type spark --language python --spark-version 3.2 --image-name demo-image --image-id 400012345 --region cn

# 在子目录下创建
bytedcli dorado node create --project-id {project-id} --name demo-notebook --type notebook --parent-uri "task:///f{numericId}" --description "示例notebook" --region cn
# 创建时直接传入代码（inline）
bytedcli dorado node create --project-id {project-id} --name demo-python-task --type python --content "print('hello')" --region cn
# 创建时从文件读取代码
bytedcli dorado node create --project-id {project-id} --name demo-python-task --type python --content-file ./my_script.py --region cn

# 获取节点草稿内容
bytedcli dorado node get --node-id NxyzABC --region boei18n

# 提取完整 notebook JSON（可直接保存为 .ipynb 文件）
bytedcli dorado node get --node-id NxyzABC --region boei18n --notebook-only > my_notebook.ipynb

# 获取当前草稿（用于查看现有配置，包括 dataOutputs 等，再按需修改后回写）
bytedcli dorado node get --node-id NxyzABC --region boei18n --json

# 保存节点草稿（更新代码）
bytedcli dorado node save --node-id NxyzABC --content "print('hello')" --region boei18n
bytedcli dorado node save --node-id NxyzABC --content-file ./my_script.py --region boei18n

# 保存草稿同时登记任务产出（通过 metadata 中的 dataOutputs 字段）
# 登记 HDFS 产出
bytedcli dorado node save --node-id NxyzABC \
  --metadata '{"configuration":{"dataOutputs":[{"type":"hdfs","path":"/example/output/path"}]},"name":"demo-task","type":"python"}' \
  --region boei18n

# 登记 Hive 分区表产出
bytedcli dorado node save --node-id NxyzABC \
  --metadata '{"configuration":{"dataOutputs":[{"type":"partition","databaseName":"example_db","tableName":"example_table","partitions":[{"key":"date","value":"${date}"}],"namespace":"default"}]},"name":"demo-task","type":"python"}' \
  --region boei18n

# 登记其他类型产出
bytedcli dorado node save --node-id NxyzABC \
  --metadata '{"configuration":{"dataOutputs":[{"type":"other"}]},"name":"demo-task","type":"python"}' \
  --region boei18n

# 同时更新代码和产出登记
bytedcli dorado node save --node-id NxyzABC --content-file ./my_script.py \
  --metadata '{"configuration":{"dataOutputs":[{"type":"partition","databaseName":"example_db","tableName":"example_table","partitions":[{"key":"date","value":"${date}"}],"namespace":"default"}]},"name":"demo-task","type":"python"}' \
  --region boei18n

# notebook 草稿保存（含产出登记）
bytedcli dorado node save --node-id NxyzABC --content-file ./notebook.ipynb \
  --metadata '{"configuration":{"dataOutputs":[{"type":"hdfs","path":"/example/output/path"}]},"name":"demo-notebook","type":"notebook"}' \
  --region boei18n

# 更新任务镜像（支持 python/notebook/spark 三种类型，自动检测任务类型）
bytedcli dorado node save --node-id NxyzABC --image-name demo-image --image-id 400012345 --region cn
# spark 任务可额外指定语言和 Spark 版本
bytedcli dorado node save --node-id NxyzABC --image-name demo-image --image-id 400012345 --language python --spark-version 3.2 --region cn

# notebook 草稿保存到合规队列（把目标合规队列写进 computeResourceParam 即可，
# 服务端会原样落进 draft；合规队列对 kernel 真正生效的环节是 node start）
bytedcli dorado node save --node-id NxyzABC --content-file ./notebook.ipynb \
  --metadata '{"configuration":{"computeResourceParam":{"region":"sg","dc":"my","cluster":"nbyodel01","queue":"root.notebook_compliance_public2"}},"name":"demo-notebook","type":"notebook"}' \
  --region sg

# 启动 notebook kernel 会话（用 metadata 里指定的队列拉起 kernel；不会回写 draft）
# - --metadata 省略时会复用当前 draft 的 metadata，等同于 dorado web 点「启动 kernel」直接跑
# - 在非 cn region 默认会注入 X-Restricted-Status: restricted 头，让 kernel 真的落到合规队列；
#   不带这个头时，metadata 里就算写了合规队列，服务端也会把队列选择静默忽略
# - --no-restricted：在非 cn region 关掉合规模式（极少用到）
# - --restricted：在 cn/boe 上加这个 flag 不会报错但也无意义
bytedcli dorado node start --node-id NxyzABC --region sg                      # 用当前 draft 的 metadata 启动 kernel
bytedcli dorado node start --node-id NxyzABC --metadata-file ./meta.json \
  --region sg                                                                  # 用自定义 metadata 启动 kernel（一次性）
bytedcli dorado node start --node-id NxyzABC --no-restricted --region sg      # 非 cn region 关闭合规模式

# 调试执行 notebook 单个 code cell
# --code / --code-file / --cell-index 三选一；未传 --record-id 时会先启动 kernel
bytedcli dorado node debug-cell --node-id NxyzABC --code 'print("hello")' --region sg
bytedcli dorado node debug-cell --node-id NxyzABC --cell-index 0 --region sg --json

# 仅有 DataLeap 页面 taskId 时，可用 taskId + projectId 自动解析 nodeUid
bytedcli dorado node debug-cell --task-id 100274211 --project-id 12345 \
  --cell-index 0 --region sg

# 复用已有 kernel recordId；不会重新启动 kernel
bytedcli dorado node debug-cell --node-id NxyzABC --record-id 1234567 \
  --no-start-kernel --code-file ./cell.py --region sg

# 探测 kernel 是否就绪（单次探测，几秒内返回 ready:true/false，不执行任何代码）
# 重量级 kernel（如 spark32_python_yarn_cluster）启动后可能要等 1~3 分钟才真正就绪，
# 建议：node start 之后自行按固定间隔重复调用本命令轮询，ready:true 后再批量 debug-cell
bytedcli dorado node kernel-status --node-id NxyzABC --record-id 1234567 --region sg -j

# 查询 nodeId → taskId 映射（需要用 task 相关 API 时使用，如 get-task、list-instances 等）
bytedcli dorado node relation --node-id NxyzABC --region boei18n
# 批量查询（逗号分隔）
bytedcli dorado node relation --node-id NxyzABC,NxyzDEF --region boei18n

# 提交节点上线
# 普通提交上线（不带审批字段）
bytedcli dorado node submit --node-id NxyzABC --project-id {project-id} --region boei18n
bytedcli dorado node submit --node-id NxyzABC --project-id {project-id} --message "deploy via bytedcli" --region boei18n

# 带审批的提交上线
bytedcli dorado node submit-approval --node-id NxyzABC --project-id {project-id} --message "deploy with approval" \
  --review-policy-id 33 --review-users "demo.user1,demo.user2" --custom-alarm-rule-ids 17587 --baseline-ids 33 \
  --agent-config '{"sessionId":"demo-session"}' --region mycis

# 查看节点生产版本历史
bytedcli dorado node history --node-id NxyzABC --region cn
bytedcli dorado node history --node-id NxyzABC --page 1 --size 10 --region cn

# 恢复草稿到指定生产版本
bytedcli dorado node rollback --node-id NxyzABC --commit-id C61P1ztyn0R6dknxP --region cn

# 快捷恢复到最新生产版本
bytedcli dorado node rollback --node-id NxyzABC --latest --region cn

# 重命名 IDE 节点（按 nodeUid 直接改名；node create / dorado URL 中 N 开头的就是 nodeUid）
bytedcli dorado node rename --node-id NxyzABC --name new_task_name --region cn

# 重命名任务显示名（按 task 视角；与 node rename 走同一后端接口）
# A) 已知 nodeUid：跳过 task→nodeUid 解析
bytedcli dorado task rename --node-id NxyzABC --name new_task_name --region cn
# B) 仅有 taskId：自动用 resolveNodeUidFromTask 解析后再改名
bytedcli dorado task rename --task-id 120933017 --project-id 8026 --name new_task_name --region cn

# 临时查询（exec）
# 前置条件：需要先在 Dorado 平台创建一个专用的临时查询任务作为执行载体
#
# 创建方式 A（Web UI）：
#   Dorado 项目 > 临时查询 > 新建查询；建议把执行引擎切到 Spark，配 dc/cluster/queue 并保存
#   保存后从页面 URL 获取 task-id：`/query/<id>` 中的 `<id>` 就是 task-id，例如 `.../query/123456789?project=cn_123` 中的 `123456789`
#
# 创建方式 B（纯 CLI 三步，无需 Web UI）：
#   ① 在临时查询目录（root-id=-2，folder-id 通过 `folder structure --root-id -2` 获取）建 hsql 任务，必须 --schedule-type 3：
#      bytedcli dorado task create --project-id 123 --folder-id 456 --name demo_adhoc --type hsql --schedule-type 3 --region cn
#   ② 配 cluster + queue（cluster 会自动推导出 dc，不必单独传 --dc）：
#      bytedcli dorado task-draft update <new-task-id> --cluster demo_cluster --queue root.demo_queue --region cn
#   ③ 用 dummy SQL 初始化 conf.configuration（关键步骤，缺这步会让 adhoc exec 直接 fail 且 yarn 不提交）：
#      bytedcli dorado task-draft update <new-task-id> --sql "SELECT 1 AS init" --region cn
#   完成后 `task get <new-task-id> --json` 应能看到 conf.configuration 非 null、cluster/queue/dc 均不为空
#
#   只需创建一次，后续 exec 会自动继承该任务的 dc/cluster/queue 配置
#   ⚠️ --task-id 必须是临时查询任务；若传入已在线的生产任务，命令会拒绝执行以避免修改生产任务状态（--force 可绕过）
#   可通过 DORADO_EXEC_TASK_ID 指定默认执行载体任务；适合按项目保存不同 task-id
#   Doris SQL 可使用 doris_sql 任务作为执行载体；默认/auto 模式只读取 DORADO_EXEC_TASK_ID；显式 --engine-type doris_sql 时才优先读取 DORADO_DORIS_EXEC_TASK_ID

# 简单 SQL（默认同步等待结果）
bytedcli dorado adhoc exec "SELECT count(*) FROM db.table" --task-id 100274211                     # 等待完成并展示结果
bytedcli dorado adhoc exec "SELECT * FROM db.table LIMIT 10" --task-id 100274211 -o result.csv     # 等待完成并下载 CSV
DORADO_DORIS_EXEC_TASK_ID=123456789 bytedcli dorado adhoc exec "SELECT 1" --engine-type doris_sql --project-id 123 --region cn --no-wait  # Doris SQL，异步提交并返回 debugId
# 注意：dorado adhoc exec 在 Hive SQL 路径下，默认无条件注入 `executor.disableManta=true` 以抑制 Manta 监控，不提供 CLI 开关
# 因为 ad-hoc 查询本质是实验性调试，默认不希望在 Manta 上产生 test_check 结果

# 临时查询 — 复杂 SQL（异步提交，稍后查询）
# ⚠️ SQL 含 `--` 开头的注释（hsql 标准注释）时，commander.js 会把这些行当成 CLI 选项报错或显示 help
#    解决：在 SQL 位置参数前加 `--` 分隔符，告诉 commander 后面是位置参数
#    例：bytedcli dorado adhoc exec --task-id 100274211 --region cn -- "$(cat my_sql.sql)"
bytedcli dorado adhoc exec "复杂SQL" --task-id 100274211 --no-wait                                 # 异步提交，返回 debugId
bytedcli dorado adhoc status --debug-id 12977673 --task-id 100274211                               # 查询状态
bytedcli dorado adhoc log --debug-id 12977673 --task-id 100274211                                  # 查看运行日志
bytedcli dorado adhoc result --debug-id 12977673 --task-id 100274211                               # 展示结果
bytedcli dorado adhoc result --debug-id 12977673 --task-id 100274211 -o result.csv                 # 下载 CSV

# 查看临时查询执行历史
bytedcli dorado adhoc history --task-id 100274211                                                  # 查看临时查询执行历史
bytedcli dorado adhoc history --task-id 100274211 --only-mine                                      # 仅查看自己的执行记录

# 解析 Hive SQL 的输出列 schema
bytedcli dorado task sql-schema --sql "select col1, count(*) as cnt from example_db.example_table group by col1" --region sg

# 拉取 Hive 表列信息
bytedcli dorado task fetch-columns --data-source-type hive --idc sg --database-name example_db --table-name example_table --region sg

# 拉取 ClickHouse 表列信息（需指定 --schema-name 为集群名）
bytedcli dorado task fetch-columns --data-source-type clickhouse --idc sg --schema-name cnch_example_cluster --database-name example_db --table-name example_table --region sg

# DECC (Data Exchange & Cross-region Compute)
# 查询 DECC endpoint ID（按数据库名称搜索）
bytedcli dorado decc endpoints --database demo_db --decc-region US-TTP --target-region Singapore-Central --region sg

# 查询 endpoint 下注册的所有 table 及 data ID
bytedcli dorado decc datas --endpoint-id 7221281395346276614 --decc-region US-EastRed --target-region Singapore-Central --region sg

# Flink 实时任务监控与运维日志
# 获取实时任务监控 URL（Grafana 指标、ByteLake、Flink Web UI 等）
bytedcli dorado flink monitor get --task-id 100274211 --region cn
bytedcli dorado flink monitor get --task-id 100274211 --region sg -j

# 列出实时任务运维操作日志（启动/重启/停止/编辑等；start/restart 的 log_id 可用于查看事件时间线）
bytedcli dorado flink operation-log list --task-id 100274211 --region cn
bytedcli dorado flink operation-log list --task-id 100274211 --region sg --page 1 --page-size 20

# 查看单条操作日志详情（含 Flink Web UI 链接和事件时间线，仅 start/restart 类日志有 events）
bytedcli dorado flink operation-log get --log-id 83863872 --region cn
bytedcli dorado flink operation-log get --log-id 83863872 --region sg -j
```

### DECC Region 枚举值

`--decc-region` 和 `--target-region` 支持以下值：`China-North`, `Singapore-Central`, `EU-TTP2`, `US-EastRed`, `EU-Compliance2`, `US-TTP`, `Asia-SouthEastBD`, `Asia_Saas`, `Singapore_Saas`, `Asia_CIS`

## 任务名 -> Task ID（稳定定位）

**首选**：`task list --keyword` 直接按关键词检索（v2 端点，匹配 name/uid/owner），结果行自带数字 `id`（即 Task ID）和 `owner`：

```bash
bytedcli dorado task list --project-id <projectId> --keyword <taskName> --region <region> -j
```

**备选**：若 v2 列表在目标环境不可用，再用 `advanced-search`（IDE 树节点检索）。如果是海外/特定站点的项目，请务必指定正确的 `--site`（例如 `i18n-tt`），避免 JWT 鉴权失败。

```bash
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli dorado task advanced-search --search-scope owner,name,uid -k <taskName> --region <region> --project-id <projectId> -j
```

在 advanced-search 返回的 JSON 结果中（节点列表在 `data.nodes`）：

- 匹配 `name === taskName` 的节点。
- 该节点的 `uid` 通常带有前缀（例如 `"uid": "t303071958"`）。
- 去除前缀 `'t'` 后的纯数字部分（`303071958`）即为准确的 **Task ID**。

## Supported Regions

| Region           | Description                                      | API Endpoint                     | Page Origin                 |
| ---------------- | ------------------------------------------------ | -------------------------------- | --------------------------- |
| `cn`             | China (default)                                  | data.bytedance.net               | —                           |
| `sg`             | Singapore Central                                | dataleap-sg.tiktok-row.net       | —                           |
| `sglark`         | Singapore Lark warehouse                         | dataleap-sglark.bytedance.net    | —                           |
| `jplark`         | Japan Lark warehouse                             | dataleap-jp.byteintl.net         | —                           |
| `uspipo`         | US PIPO warehouse; alias `gp-us`                 | dataleap-pipo-us.byteintl.net    | —                           |
| `va`             | US East (Virginia)                               | dataleap-va.tiktok-row.net       | —                           |
| `mycis`          | ByteIntl MYCIS                                   | dataleap-mycis.byteintl.net      | —                           |
| `gcp` / `eu`     | EU Compliance2                                   | dataleap.tiktok-eu.net           | dataleap-gcp.tiktok-row.net |
| `us-ttp`         | US TTP                                           | dataleap-bdee.tiktok-us.net      | dataleap-tx.tiktok-row.net  |
| `us-eastred`     | US EastRed                                       | dataleap.tiktok-eu.net           | —                           |
| `eu-ttp2`        | EU TTP2                                          | dataleap-no1a.tiktok-eu.net      | —                           |
| `eu-compliance2` | EU Compliance2 (IE2); aliases `ie2`, `eu-ttp-gp` | dataleap-gp-ttp-eu.tiktok-eu.net | dataleap-ie2.tiktok-row.net |
| `boe`            | BOE (CN)                                         | data-boe.bytedance.net           | —                           |
| `boei18n`        | BOE (International)                              | data-boe.bytedance.net           | —                           |

`sglark` / `jplark` / `uspipo` / `mycis` are built in and should be called directly with `--region`.

Custom regions can be added via `~/.local/share/bytedcli/data/.dorado.env` or `./.dorado.env`, for example:

```env
DORADO_REGION_PIPOUS_API_BASE_URL=https://dataleap-pipous.example.net/dorado_api
DORADO_REGION_PIPOUS_ALIASES=us_pipo,pipo-us,pipo_us,uspipo
# Optional: set PAGE_ORIGIN when the web UI uses a different domain than the API
# DORADO_REGION_PIPOUS_PAGE_ORIGIN=https://dataleap-pipous-page.example.net
# Optional: set REQUEST_VREGION when the API gateway expects a vregion different from the region key
# DORADO_REGION_PIPOUS_REQUEST_VREGION=us-pipo-prod
# Optional: only set this for Dataleap environments that require browser-session cookies
# DORADO_REGION_PIPOUS_AUTH=session
```

If the built-in region list does not cover the target IDC/region, prefer adding a custom region in `.dorado.env` instead of changing code. When `DORADO_REGION_<NAME>_SITE` is omitted, Dorado auth follows the global `--site` / `BYTEDCLI_CLOUD_SITE` setting.

`DORADO_REGION_<NAME>_AUTH` supports `jwt|auto|session`. Built-in regions default to `jwt`, except `sglark`, `jplark`, `uspipo`, and `mycis`, which are built in as `session`; custom regions default to `auto`. Use `session` for known special Dataleap environments that require browser-session cookies in addition to JWT. Without `AUTH=session`, keep the normal JWT flow first and only switch to `bytedcli auth login --session` when the target region shows explicit web-auth signals, such as JSON output already including `error.hint` / `error.auth_command`, login redirects, or web-side auth failures.

## Notes

- 需要结构化输出加 `--json`
- `task update --query` 支持 hsql、fsql、stream_sql 和 doris_sql 类型任务
- `task diff` 默认对比最新发布版本与草稿，可用 `--from`/`--to` 指定任意版本
- `instance list` 需要 `--project-id` 参数
- DTS 任务会显示源/目标数据库和表信息
- hsql 任务会显示 SQL 代码
- `task get` 文本输出会附带依赖任务 ID，便于快速查看上游关系
- `folder structure` 默认显示任务开发目录（root-id=-1），可用 `--root-id -2` 查看临时查询目录
- `folder create` 在指定项目下创建子目录，`--parent-uri` 为父目录 URI（如 `task:///HrdNGPWr`），可用 `tree-nodes children` 命令获取，`--name` 为新目录名称，可选 `--description` 添加描述
- `node` 子命令（create/get/save/start/debug-cell/kernel-status/submit/submit-approval）适用于 python、notebook 和 spark（含 pyspark）三种类型任务；hsql/fsql/stream_sql 等 SQL 类任务请使用 `task-draft update` 更新草稿、`rerun-task` 提交上线
- `node create` 返回 nodeId（字符串）；需要 taskId 时，用 `node relation --node-id <nodeId>` 查询对应关系，再用 taskId 调用 `get-task`、`list-instances` 等命令
- `node relation` 支持批量查询，多个 nodeId 用逗号分隔；响应中 taskId 与 nodeId 按顺序一一对应
- 仅有 taskId、需要 IDE nodeUid 时，用 `node resolve-uid`（通过 tree-nodes 的 name+type filter 单路径下钻 + node-relations 校验）
- `image list` 查询项目可用镜像列表，返回的 `id` + `name` 用于 `node save --metadata` 中 `configuration.conf` 里的 `operator.parameter.image` 字段；切换镜像时必须同时写入 `id` 和 `name`
- `node save` 调用时 **必须同时传入 `--metadata`**；API 要求 metadata 不能缺失。标准做法是先用 `node get --json` 获取当前草稿，取出 `data.metadata` 字段，按需修改后整体回写，避免覆盖现有配置
- `node save --content-file` 支持直接传入 Python 脚本路径或 notebook (.ipynb) 文件路径
- `node debug-cell` 用 Dorado IDE `node start` 启动 kernel，随后调用 `POST /datalab/v1/kernel/{nodeUid}/kernelId` 获取 `kernelId` 与 WebSocket token，再连接 `/socket-dorado/km/user/channels` 发送 Jupyter `execute_request`。CLI 输出不会打印 token。传 `--record-id --no-start-kernel` 可复用已有 kernel；不传 `--record-id` 时默认启动新 kernel。`--code`、`--code-file`、`--cell-index` 必须三选一；`--cell-index` 会读取当前 notebook 草稿中的 0-based code cell，并把执行后的 `outputs` / `execution_count` 保存回草稿，页面刷新后可见。`--code` / `--code-file` 只做临时代码执行，不改草稿内容。
- `node debug-cell` 和 `node start` 一样遵循合规队列规则：非 cn region 默认带 `X-Restricted-Status: restricted`，需要关闭时显式传 `--no-restricted`。若页面 URL 只有 taskId，优先用 `--task-id + --project-id` 让 CLI 自动 resolve nodeUid，或先执行 `node resolve-uid`。
- **`node debug-cell` 对重量级 kernel（如 `spark32_python_yarn_cluster`，跑在 YARN 队列上）内置了启动重试**：`kernelId`/`token` 在 kernel 启动请求被接受后很快就会返回，但底层 YARN 容器可能还要再等 1～3 分钟才真正起来；过早连接 WebSocket 会被服务端以 close code `1011` 立即断开（表现为 `Notebook WebSocket closed before execute_reply was received`）。只要还没收到任何 kernel 消息，CLI 会自动换新连接重试（间隔 5s），直到 `--timeout-ms`（默认 120000ms）耗尽；一旦已经收到过 kernel 消息（代码已经开始执行），后续连接异常不会重试，避免重复执行。文本模式下若发生过重试，输出会带一行 `note: kernel was still starting up; retried the WebSocket connection N time(s) ...`。若长期在超时前无法就绪，需要去 Dorado 控制台确认 kernel/YARN 应用状态，或加大 `--timeout-ms`。
- Dorado 后端**没有专门的 kernel 健康状态字段**：`kernel/{nodeId}/kernelId` 接口返回的 `kernelId`/`token`/`kernelCreateTime` 只代表"启动请求已受理、记录已创建"，判断 kernel 是否真正可执行代码只能靠连一次 WebSocket 探测。`node kernel-status` 就是把这个探测单独暴露出来：只连接、不发 `execute_request`，几秒内（默认 8000ms，`--timeout-ms` 可调）返回 `ready:true/false` 和 `detail` 说明，不会污染执行历史或重复跑代码。一个 notebook 要连续调试多个 cell 时，推荐流程是 `node start` → 自行按固定间隔重复调用 `node kernel-status --record-id <id>` 轮询直到 `ready:true` → 用同一个 `--record-id --no-start-kernel` 依次调用多次 `node debug-cell`（此时通常第一次尝试就能成功，不会再触发 debug-cell 内置的重试等待）。
- **`node start` 返回完全空白的 `{"code":"Error","message":null,"data":null}`（没有任何可诊断信息）常见根因是 metadata 里 `configuration.innerScheduleParam`/`businessContact`/`inputParams`/`outputParams` 缺失**：新建 notebook 的草稿默认把这几个字段留空，Web IDE 每次 `/start` 前都会补全，直接用草稿原样调用 `/start` 就会触发后端未捕获异常且不返回文本。`startNodeKernel`（即 `node start`/`node debug-cell` 内部启动 kernel 的路径）已经自动补齐这几个字段（`innerScheduleParam` 用固定默认值，`businessContact` 回退到 `metadata.owner`，`inputParams`/`outputParams` 回退到 `[]`），已设置的字段不会被覆盖，因此正常情况下不需要手工处理。仍然遇到空白 error 时，优先怀疑下面这条"kernel 已经启动过"的场景，而不是继续排查 metadata 字段。
- **`node start` 对已经启动过 kernel 的节点重复调用时，后端返回的错误提示不稳定**：符合预期的响应应该是 `{"data":{"status":"error","hints":[{"message":"Kernel has been started, record id: [xxxxx], please refresh the web page"}]}}`，可以从消息里提取已有的 `recordId` 直接复用；但实测同一个"重复启动"场景，后端有时会退化成完全空白的 `{"code":"Error","message":null,"data":null}`。遇到 `node start` 返回空白 error 或 `hints` 里没有 message 时，不要一直换 `--metadata`/`cluster`/`queue` 排查，优先假设"kernel 可能已经启动过"，直接去 Dorado 网页 IDE 刷新确认，或从网页里拿到 recordId 后跳过 `node start`，直接用 `node kernel-status --record-id <id>` 探测现状。
- **在项目根目录用 `node create --type notebook` 新建的 notebook，草稿默认是空的 `computeResourceParam`（`cluster`/`queue` 均为 `null`）**，直接 `node start` 会报 `"Yarn cluster or queue is empty"`；需要先用 `node save --metadata` 把 `configuration.computeResourceParam.cluster`/`queue`/`dc`/`region` 和 `configuration.kernelType` 补上有效值再启动。项目可用的合规队列可以用 `dorado project yarn-queues --project-id <id> --restricted` 查询（会返回 `cluster`/`queue`/`dc`/`region` 的完整组合，直接原样填入即可，不要只抄队列名而丢了 `dc`）。同理，**新建 notebook 的 `content` 是 `null`**，`node start` 前建议先用 `node save --content-file <ipynb.json> --metadata <json>` 至少写入一个合法的空 ipynb 结构（`node save` 要求 `content` 和 `metadata` 必须一起传，缺 `metadata` 会报 `PayloadMissingKey`）。
- `node submit` 默认启用 autoRelease=true（提交即部署），如需关闭可加 `--no-auto-release`
- `node submit-approval` 默认启用 autoRelease=true（提交即部署），如需关闭可加 `--no-auto-release`
- `task commit-approval` 与 `node submit-approval` 的 `--review-policy-id`、`--review-users` 必须由用户按项目显式提供，不要从项目默认配置或页面上下文自动推断
- `node history` 列出节点的生产版本历史（上线部署后的版本），返回版本号、commitId、创建者、更新时间、提交说明
- `node rollback` 将草稿恢复到指定的生产版本，`--commit-id` 和 `--latest` 二选一
- `node rollback --latest` 等价于先 `node history` 取第一个版本的 commitId，再执行 rollback
- 回滚操作只覆盖草稿，不影响线上；如需线上生效，回滚后需重新 submit
- `node rename` / `task rename` 直接调 IDE 节点重命名接口（`POST /datalab/v1/ide/nodes/{nodeUid}/rename`），按 nodeUid 操作，对 python / notebook / spark / HSQL 等所有节点类型通用；改的是节点显示名，不会改任何代码或调度配置
- `task rename` 提供两种入参方式：`--node-id <uid>` 直传跳过解析；`--task-id <id> --project-id <id>` 自动通过 `resolveNodeUidFromTask` 解析。当只有 Dorado URL 里的数字 taskId 时优先用后者
- `node save --metadata` 中的 `configuration.dataOutputs` 用于登记任务产出，支持三种类型：
  - `{"type":"hdfs","path":"<hdfs路径>"}` — 登记 HDFS 产出
  - `{"type":"partition","databaseName":"<库名>","tableName":"<表名>","partitions":[{"key":"date","value":"${date}"}],"namespace":"default"}` — 登记 Hive 分区表产出
  - `{"type":"other"}` — 登记其他类型产出
- `node create` 对 `spark` / `python` / `notebook` 在未传 `--data-outputs` 时默认写入 `[{"type":"other"}]`（与命令 help 一致），避免 `node submit` 报「任务产出登记为空」；显式传 `--data-outputs` 时以用户值为准
- 修改产出登记时，建议先用 `node get --json` 获取当前 metadata，在现有配置基础上修改 `dataOutputs` 后整体回写，避免覆盖其他配置字段
- Python 任务提交上线（`node submit`）前，须在 metadata 的 `configuration.conf` 中设置 `operator.parameter.jobType`，默认填 `"cronjob_with_image"`；否则会报"部署类型不能为空"
- `tree-nodes children` 返回的是 IDE 层的 UID-based URI（如 `task:///f{numericId}/{nodeUid}`），与 `folder-structure`/`folder-children` 返回的老式数字 ID 不同；创建 `node create` 时的 `--parent-uri` 必须使用 `tree-nodes children` 返回的 URI，不能用 `task:///f{numericId}` 格式
- `task create --type global_hsql` 创建跨区域 HSQL batch 任务壳子，走普通 `/task/create`，请求体保持 `type=global_hsql`、`typeGroup=global_hsql`；不要把它误分流到 realtime `/realtime/create`。
- `task create --type common-dts-batch` 创建 DTS 批处理任务，创建后可用 `task-draft update` 配置 reader/writer
- `task create --type hive-clickhouse` 创建 Hive→ClickHouse DTS 任务（壳子在 server 端与 `common-dts-batch` 同形态，type 升级在 update-conf 阶段完成）；后续用 `task update-conf <taskId> --task-file <patch.json> --type 'hive->clickhouse'` 把顶层 `type` 升级为 `hive->clickhouse`，并写入 `conf.configuration.reader`（`type=hive`、`engineType=spark`、`sourceType=sql`、`query`、`columns[]`）和 `conf.configuration.writer`（`type=clickhouse`、`chClusterName`、`chDbName`、`chTableName`、`shardColumn`、`shardNum`、`partition`、`partitionTypes`、`columns[]`）
- `task create --type common-dts-stream` 创建 DTS 流式任务壳子（`typeGroup=type=common-dts-stream`，与 batch 的 `common-dts-batch` 相对，适用于 bmq->hive 等流式同步）；该类任务走 `POST /realtime/create?projectId=<id>` 接口，不能用 batch 的 `/task/create`（后端会报“当前操作不支持流任务”），创建后用 `task update-conf` 配置 reader/writer
- `task create --type stream_sql` 创建实时 SQL 任务壳子（`typeGroup=type=stream_sql`），同样走 `POST /realtime/create?projectId=<id>`，不能用 batch 的 `/task/create`；创建命令暂不支持 `--query` / `--query-file` 自动写入 SQL，先建壳子，再用 `task update-conf` 写入已确认的 realtime 配置补丁
- `task create --type java-flink` 创建 Java Flink 实时任务壳子（`typeGroup=stream / type=stream_managed_java_flink`），同样走 `POST /realtime/create?projectId=<id>`，不能用 batch 的 `/task/create`；创建命令暂不支持 `--query` / `--query-file` 或 jar/mainClass 等深字段，先建壳子，再用 `task update-conf` 写入已确认的 realtime 配置补丁
- `task update-conf --type <type>` 可选地覆盖 batch / DTS 草稿顶层 `type`，专为“先用通用壳子创建、再升级到具体 DTS 子类型”的场景设计；realtime stream draft 不支持这个覆盖，不设置时保留 server 上现有 `type`
- `task-draft update` 支持更新队列、集群、调度时间、SQL 代码、任务依赖、跨区域查询配置、DTS 读写配置等
- `task-draft update` 支持小时调度字段；日调度可继续传 `--schedule-time 00:00`，小时调度请按页面原始值传 `--schedule-time <minute>` 与 `--schedule-day <value>`（例如 `--schedule-time 5 --schedule-day 16`）
- realtime stream 任务（如 `kafka2clickhouse`、`stream_channel_*`，或草稿 `conf.typeGroup=stream`）在 `task online` 时自动走 `PUT /realtime/{taskId}/online`，在 `task commit` / `task commit-approval` 时自动走 `PUT /realtime/{taskId}/commit`
- 对 realtime stream 草稿，`task-draft update` 当前只支持 `name` / `description` 和写入 `conf` 的字段（如 `--sql`、`--query-type`、`--source-region-infos`）；`--queue`、`--schedule-time`、`--priority`、`--dependencies`、`--outer-dependencies` 等 top-level 草稿字段会直接报错，避免 `/realtime/{taskId}/draft` 静默丢字段
- `task-draft explain` 会按任务类型分流：`type=hsql` 走 Dorado `resource/explain`，校验 HSQL 草稿或线上版本语法；`type=stream_sql` 走 `realtime/sqlCheck/{taskId}`，校验目标版本的完整实时 SQL 配置；支持 `--online` / `--version <n>` 校验指定发布版本配置
- `task-draft explain` 的 `${DATE}` / `${date}` / `${date-1}` 替换、`--template-var k=v` 与 `--auto-strip-mustache` 仅用于 HSQL 分支；`stream_sql` 分支直接提交目标版本的完整 `conf` 给后端校验
- `task-draft explain` 不适用于 DTS；如果任务是 DTS，请改用 `dts-draft explain`
- `task update-conf` 支持直接保存 stream 类实时任务（包括 `kafka2clickhouse`、`common-dts-stream` 的 bmq->hive）的抓包 `conf`；当任务 `conf.typeGroup=stream` 或 `type` 形如 `stream_channel_*` 时，CLI 会自动走 `POST /realtime/{taskId}/draft`，并保留原始顶层 `conf.typeGroup`
- 保存 DTS 流式任务（common-dts-stream）草稿时，可用 `task update-conf` 的 `--queue`/`--cluster`/`--dc`/`--priority`/`--engine-id`/`--enable-failover`/`--owner` 指定运行位置；这些字段只会附加到 realtime 草稿 body（不传则维持最小 body，避免影响 kafka2clickhouse 仅改运行参数的保存）。运行队列建议先用 `project yarn-queues --task-type common-dts-stream` 找到资源最空的流式队列
- **DTS 流式任务（bmq->hive）端到端保存方案**：用 `task create --type common-dts-stream` 建壳子后，按下面三步组装 `conf` 再 `task update-conf` 保存。Agent 在用户只给出 bmq 源信息时，应主动补齐 hive 表、队列与资源配置，不要直接用空/默认值保存：
  1. **缺少 hive 目标表时，提醒用户提供，不要尝试根据 bmq 自动建表**：目前没有“直接根据 bmq topic 创建 hive 表”的能力——bmq topic 自身元数据（`bmq topic get`/`bmq topic list`）只有 qps/分区/owner/psm，**不含字段 schema**，无法据此推导出 hive 表结构。因此当用户未提供 writer 的 `databaseName`/`tableName` 时，应直接提醒用户提供已存在的 hive 目标表（库名+表名），不要自行猜测或新建。若用户已有目标表但缺字段映射，可用顶层 `hive` 命令（注意不是 `dorado hive`）查已存在表的字段：`bytedcli hive ddl <db> <table> --region <region>` 拿到 `CREATE TABLE` 字段与分区，再写入 `conf.configuration.writer.parameter`；reader 侧设 `fieldSyncMode:auto` + operator 设 `autoParseConnectors:true` 让平台对齐字段，但目标 hive 表必须由用户事先建好并真实存在
  2. **队列必须显式带且要选充足的**：先 `dorado project yarn-queues --project-id <id> --task-type common-dts-stream --region <region>` 列出流式队列，再结合资源使用（Allocated Rate 越低、Free CPU/Free Memory 越多越充足）挑一个，保存时务必带齐 `--queue`/`--cluster`/`--dc`（三者要同属一个机房/集群）；缺队列会落到默认或无法部署
  3. **资源配置（operator.parameter.commonConfig）按吞吐合理设置，不要照搬默认**：页面“资源设置”各项对应 `commonConfig` 字段——`TaskManager 个数=tmNum`、`单 TaskManager CPU 数=containerVcoresD`、`单 TaskManager 内存(MB)=tmMemoryMb`、`单 TaskManager slot 数=slotsPerTm`、`JobManager CPU 数=jmMemoryVcoresD`、`JobManager 内存=jmMemoryMb`、`启用智能资源=enableIntelligent`。默认 `tmNum=4 / containerVcoresD=4 / tmMemoryMb=4096 / slotsPerTm=4 / jmMemoryVcoresD=3 / jmMemoryMb=4096 / enableIntelligent=false` 适合中等吞吐；低吞吐 topic 可下调 `tmNum`（如 1~2）与单 TM 资源以省队列资源，高吞吐再上调 `tmNum`/`slotsPerTm`。`slotsPerTm` 一般与 `containerVcoresD` 对齐，`tmMemoryMb/slotsPerTm` 单 slot 内存不要过低。也可开 `enableIntelligent:true` 交由平台智能调度
- `dts-draft explain` 使用 Dorado `resource/explain` 校验 DTS reader SQL（`conf.configuration.reader.parameter.query`），支持 `typeGroup=dts`、`typeGroup=common-dts-batch` 和 `typeGroup=hive->clickhouse`；如果 DTS reader 是 table 模式、没有 `reader.parameter.query`，命令返回 `status=not_applicable`，不是失败
- `dts-draft explain` 同样支持 `--date`、`--template-var k=v`、`--online`、`--version <n>`；若任务详情无法推导 `dc` 或 `ownerUserName`，调用时需显式传 `--dc` / `--username`
- `task-draft update --query-type` 设置查询类型（如 `FLEXIBLE_UNION`、`COMPLEX_QUERY`），写入 `conf.configuration.operator.parameter.queryType`
- `task-draft update --source-region-infos` 设置跨区域数据源配置，接受 JSON 数组，每个元素包含 `geo`（区域标识）和 `yarnQueue`（含 region/dc/clusterName/queue），可选 DECC 字段（`deccDataId`/`deccEndpointId`/`deccTransmissionTaskId`/`deccTransferJobId`/`owner`），写入 `conf.configuration.operator.parameter.sourceRegionInfos`
- `task-draft update` DTS 参数说明（`common-dts-batch` 类型任务）：
  - DTS 草稿更新统一通过 `task-draft update --dts-read-*` / `--dts-writer-*` 做增量字段映射；尤其是 LarkSheet 等 reader 的 `url`、`urls`、`sheetType`、`templateParam` 这类参数，按调用方传值原样写入，不重建整段 reader/writer 配置
  - **Reader 参数**（写入 `conf.configuration.reader`）：
    - `--dts-read-type`：reader 类型（如 `hive`），写入 `reader.type`
    - `--dts-read-idc`：reader IDC（如 `sg`）
    - `--dts-read-source-type`：数据源模式，`sql`（SQL 查询读取）或 `table`（指定库表读取）
    - `--dts-read-query`：SQL 查询语句（`sourceType=sql` 时使用）
    - `--dts-read-database-name` / `--dts-read-table-name`：库名和表名（`sourceType=table` 时使用）
    - `--dts-read-url` / `--dts-read-urls`：源 URL；LarkSheet 场景下 `--dts-read-url` 会同时写入 `url` 与单元素 `urls`
    - `--dts-read-sheet-type` / `--dts-read-template-param` / `--dts-read-data-source-name`：LarkSheet 等 reader 的补充参数
    - `--dts-read-columns`：列定义 JSON 数组，格式 `[{"type":"string","name":"col1"}]`；`sourceType=table` 时可加 `extraType`、`description` 字段
    - `--dts-read-partitions`：分区定义 JSON 数组（`sourceType=table` 时使用），格式 `[{"name":"date","type":"string","value":"${date}"}]`
    - `--dts-read-connector-type`：连接器类型（如 `hive`）
  - **Writer 参数**（写入 `conf.configuration.writer`）：
    - `--dts-writer-type`：writer 类型（如 `clickhouse`），写入 `writer.type`
    - `--dts-writer-idc`：writer IDC（如 `sg`）
    - `--dts-writer-cluster`：集群名称
    - `--dts-writer-database-name` / `--dts-writer-table-name`：目标库名和表名
    - `--dts-writer-columns`：列定义 JSON 数组，格式 `[{"type":"string","name":"col1"},{"type":"int64","name":"col2"}]`
    - `--dts-writer-partitions`：分区定义 JSON 数组，格式 `[{"name":"date","type":"TIME","value":"${date}"}]`
    - `--dts-writer-shard-column`：hash 分布列
    - `--dts-writer-shard-num`：分片数（如 `1200`）
    - `--dts-writer-append-mode`：写入模式（默认 `1`），`1`（覆盖写）、`0`（追加写）、`-2`（删除分区）、`2`（覆盖写2）、`11`（1 + 数据强一致检查）、`12`（2 + 数据强一致检查）
    - `--dts-writer-connector-type`：连接器类型（如 `clickhouse`）
  - `--dts-read-source-type` 传入时有严格校验：`sql` 必须同时传 `--dts-read-query`；`table` 必须同时传 `--dts-read-database-name` 和 `--dts-read-table-name`
  - 不传 `--dts-read-source-type` 时，其他 DTS 参数支持局部更新，只传需要修改的字段即可
- `task-draft update --dependencies` 接受 `taskId[:offsets:offsetsType]` 格式的逗号分隔列表，offsets 默认 0，offsetsType 默认 set（如 `123,456` 等同于 `123:0:set,456:0:set`），可配合 `task dep-recommendations` 获取推荐依赖
- `task-draft update --outer-dependencies` 配置跨机房依赖，格式为 `taskId@region[:offsets[:offsetsType]]` 逗号分隔；例如 `--outer-dependencies "306220763@sg"` 表示依赖 sg 机房的任务 306220763，默认 offsets=0、offsetsType=set；支持多 region 混合（如 `"100@sg,200@va:0:set"`）
- `task-draft test` 返回 Debug ID，并默认输出本次调试提交的 SQL（`debug_sql`）；`--json` 输出会在 `data.debug_sql` 返回该 SQL。可用 `adhoc status` 查询状态，用 `adhoc result` 获取结果。HSQL 等非 node-type 任务可通过 `--disable-manta` 抑制 Manta 监控触发。支持 `--input-params` 传入自定义参数覆盖任务代码中的 `{{param}}` 占位符（只需 name/debugVal 两字段，debugVal 为调试代入值；与 task rerun 的 name/paramValue/type 不同）。doris_sql / spark / python / notebook 这类 node-type 任务走 IDE debug endpoint，CLI 会先把 `{{param}}` 替换成 `debugVal` 再提交，避免后端忽略 runOptions 中的临时参数覆盖值；Python node 调试会保留/继承草稿里的 `image`、`resources`、`targets` 等运行字段，若缺运行参数再补 `jobType="cronjob_with_image"`、`version="3.7"`、`packages=[]`、`envs=[""]`，规避 Dorado 返回“任务设置信息填写不全”或未进入自定义镜像
- `task dep-recommendations` 解析任务 SQL 并推荐产出相关表的上游任务，便于快速配置任务依赖
- `node save --image-name/--image-id` 支持为 python/notebook/spark 三种任务类型更新 Docker 镜像；save 时会自动获取当前草稿并检测任务类型，将镜像写入对应位置（spark 写入 `conf.configuration.operator.parameter.image`，python 写入 `conf.configuration.operator.parameter.image` 并设置 `jobType`，notebook 写入 `executeParam.image`）
- `node create` 同样支持 `--image-name/--image-id`，适用于 `--type python/notebook/spark`；创建后会自动补写镜像配置（平台 create API 不完全持久化嵌套 conf，CLI 自动做一次 save 补充）
- Spark 任务创建时默认 `--language python --spark-version 3.2`，可通过 option 覆盖
- 三种非 SQL 任务的镜像存储位置不同（spark/python 存在 `conf.configuration.operator.parameter.image`，notebook 存在 `executeParam.image`），`node create` 和 `node save --image-name/--image-id` 会自动处理差异
- `project yarn-queues` 支持 `--task-type` 按任务类型过滤队列（如 `global_hsql`）
- `project yarn-queues --restricted` 走「合规视图」：注入 `X-Restricted-Status: restricted` 请求头，服务端只返回合规授权的队列子集和合规默认队列；输出会同时打印 `Default queue:` 一行。该开关只对 i18n / 非 cn region（sg、va、mybd、gcp、us-ttp、us-eastred、eu-ttp2、eu-compliance2、boei18n 等）有意义，cn 没有合规队列概念，加不加无差别
- `task sql-schema` 解析 Hive SQL 语句，返回输出列的 name 和 type，可用于构造 `--dts-read-columns` 参数
- `task fetch-columns` 拉取 Hive 或 ClickHouse 表的列元数据（名称、类型、是否分区列、是否主键等），可用于构造 `--dts-read-columns` 或 `--dts-writer-columns` 参数；ClickHouse 表需额外传 `--schema-name`（集群名）
- `decc endpoints` 按数据库名称查询 DECC endpoint ID，需指定 `--decc-region`（源区域）和 `--target-region`（目标区域）
- `decc datas` 按 endpoint ID 查询该 endpoint 下注册的所有 table 及其 data ID
- `us-ttp`、`us-eastred`、`eu-ttp2` 等 TTP 区域使用 Dataleap JWT 认证（`x-dataleap-jwt-token`），CLI 会先按该 region 在 `site.ts` 里配置的 **cloud site**（如 `i18n-tt`、`eu-ttp`、`us-ttp`）取 ByteCloud JWT，再向 SG 的 `/user/jwt` 换成 Dataleap JWT；因此 `eu-ttp2`、`eu-compliance2` 请先执行 **`bytedcli --site eu-ttp auth login`**（不要用错成仅 `i18n-tt`）；`us-ttp` 等则对应用 `--site us-ttp` 或 `i18n-tt`。
- **`eu-compliance2`（IE2）**：控制台在 **`dataleap-ie2.tiktok-row.net`**，Dorado API 在 **`dataleap-gp-ttp-eu.tiktok-eu.net/dorado_tx_api`**（与 Hive `eu-compliance2` 同 API 主机）；CLI 请求带 **`Origin`/`Referer` = IE2 控制台**、`x-bcgw-vregion: ie2`。任务草稿里 `region`/`dc` 常为 `eu-ttp-gp` / `ie2`，与 CLI `-r eu-compliance2` 对应。
- **EU-TTP OG 分层（`gcp` / `eu-ttp2` / `eu-compliance2`）**：这三个 region 共用 `*.tiktok-eu.net/dorado_tx_api` 的 OG 网关，OG 策略一致，CLI 已内置全套绕过，无需手动加环境变量：
  - `task`/`folder structure`/`task online` 等批处理 API 使用 sg 颁发的 Dataleap JWT。登录的 `--site` 必须匹配该 region 在 `site.ts` 里配置的 **cloud site**（CLI 用 `cloudSiteForRegion(region)` 取对应 ByteCloud JWT，不是固定 `eu-ttp`）：`eu-ttp2` / `eu-compliance2` 用 **`bytedcli --site eu-ttp auth login`**，而 **`gcp` 的 cloud site 是 `i18n-tt`，须用 `bytedcli --site i18n-tt auth login`**（用错成 `--site eu-ttp` 会因取不到 `i18n-tt` 的 ByteCloud JWT 导致鉴权失败）。
  - **`tree-nodes children`、`node create`、`task advanced-search`、`node resolve-uid`、`folder create`（IDE）** 等走 `getIdeHeaders`：这些 region 的 datalab IDE 网关拒绝 `X-Dataleap-Jwt-Token`（`invalid tagging: header`），CLI 固定改用 **Titan**（`X-Titan-Token`）；其他 TTP region 在有 Dataleap session cookie 时走区域 `/user/jwt`，否则回退 Titan。`auth login --session` 对这些 region 的 IDE 不是必需条件。
  - **`task-draft update`（batch `POST /task/{id}/draft`）** 的 OG 拒绝 GET-draft 回传的多余字段（`id`/`projectId`/`status`/`version`/`deployed`/`slaTime` 等，`invalid tagging: body`）。CLI 只发字段白名单 body，并在 `dc` 为空时按 region 默认队列回填 `dc`/`region`（`gcp`→`useast2a`/`i18n_gcp`，`eu-ttp2`→`no1a`/`eu-ttp-no`，`eu-compliance2`→`ie2`/`eu-ttp-gp`）。
- **`node create` OG body**：上述 IDE 网关对 `POST .../nodes` 的 `metadata`/`content` 字段有 OG 白名单（与 HSQL `task-draft update` 同类）。CLI 会先以最小 body 创建节点壳，再通过 `saveNodeDraft` 写入 spark/python 配置与代码；`--parent-uri` 须来自 `tree-nodes children` 返回的 URI（如 `task:///` 或 `task:///f{numericId}/{nodeUid}`），不要用 `task:///f{folderId}` 数字 folder ID。当前实测 **spark / python** 可创建；**notebook** 在 IE2 上 `POST .../nodes` 仍返回业务 `Error`（非 OG），需在控制台创建或待平台开放 API。
- 若错误为 **`Failed to parse JSON`** 且预览里出现 **`Restrict Notice`**：多半是打到了 **`dataleap-ie2.../dorado_tx_api`** 而非 **`dataleap-gp-ttp-eu...`**；请使用含 IE2 主机拆分的构建后重试。
- `gp-us` 是 `uspipo` 的兼容别名，使用 DataLeap 页面态 session cookie，首次使用前先执行 `bytedcli --site i18n-bd auth login --session`

## References

- `references/dorado.md`

### 从 DataLeap URL 解析 nodeId

用户经常给出 DataLeap 页面 URL，格式类似：

```
https://dataleap-{region}.tiktok-row.net/dorado/development/node[/notebook]/{taskId}?project={region}_{projectId}&version=-1
```

URL 中的数字 ID 是 **taskId**；对 `dorado node get` / `node save` 等 IDE 接口需要的是 **nodeUid**（`N...`）。

**Step 1：解析 URL**

- `taskId`：URL 路径中的数字，如 `/node/305851780` → `305851780`
- `projectId`：query 参数 `project={region}_{projectId}` 中去掉 region 前缀后的数字（可能不带 region）
- `region`：从 hostname 推断，如 `dataleap-sg` → `sg`

**Step 2：调用 `dorado node resolve-uid`**

```bash
bytedcli dorado node resolve-uid --project-id {projectId} --task-id {taskId} --region {region} -j
```

该命令通过 `get-task` 获取任务名称和类型，然后向 `tree-nodes children` 发起带 `name+type` filter 的请求，后端会只返回沿路径向下命中的那个子节点；沿着这条单路径逐层下钻到匹配的叶子节点后，再用 `node-relations` 与入参 `taskId` 校验；输出中 `verified: true` 表示校验通过。
