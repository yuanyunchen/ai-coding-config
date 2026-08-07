---
name: building-dorado-hive-tables
description: "Dorado/DataLeap Hive 生产链路建设。触发:Dorado 建表、自建 Hive 表、日更任务、历史回填、首日全量、bootstrap、生产上线、PSM/权限、写入 smoke、Spark/Python 任务 body 与资源包(pyFiles/archives)、Spark 算力配置与实例诊断。覆盖建表、任务发布、回填、接力与验收；业务 SQL 设计和通用取数走 sql-query。"
---

# 在 Dorado 自建正式 Hive 表

目标是完成一个可验证的正式表生命周期：**确认鉴权主体 → 创建 Catalog 表 → 补权限 → Dorado 小规模写入 → 验数 → 按需清理**。

## 0. 边界与入口

- 本 skill 管“表生命周期与 Dorado 生产链路上线”。表发现、字段分析和通用 SQL 执行细节走同域 `../sql-query/SKILL.md`。
- 平台命令统一走全局 `bytedcli` skill；参数拿不准先看 `bytedcli <domain> --help`，不要猜接口。
- 不自动修改项目级开发/生产鉴权方式。需要切换用户账号与项目账号时，先报告影响并取得明确授权。
- 不把临时查询成功等同于生产任务可运行；正式任务必须用实际生产鉴权主体复验权限。

场景路由：

| 场景 | 必读 |
|---|---|
| 建正式表、补权限、临时 HSQL smoke、按需清理 | 本文 §1–§6 |
| 创建/更新正式日更任务、依赖、参数、首个周期接力；**部署动作本身的陷阱**（`task-draft update` 静默清空 `authParam`/并行度、conf 含 SQL 本体导致「恢复配置」撤销「部署 SQL」、`deployed=true` 不代表你的版本上线、上线前置检查用任务运行身份）；**告警规则是独立对象**（`task alarms` / `alarm-rule`，及其 read-modify-write 风险） | `references/production-pipeline-rollout.md` |
| 多日回填、首日全量、状态表 bootstrap；**「盯错对象」的五种面孔与正确写法**（实例 id 锚定、`--page-size`、`--biz-date = p_date+1`、匹配不到必须失败而非等待） | `references/backfill-and-bootstrap.md` |
| **Spark / Python 任务**（body 是 Python 不是 SQL）：读写 body 的 CLI 面（`node save/get/submit/resolve-uid`，与 SQL 的 `task-draft` 完全不同）、**两个草稿存储互不相通**（`update-conf` 改不动 `node save` 那份）、pyFiles 与 **`archives`**（扩展模块的唯一活路，会解包且顶替同名文件）、资源包指纹重钉的判据、**Hive 写入侧三个会杀掉长任务的默认值**（driver 内存 / 动态分区上限 / Kryo 缓冲）、三态出口的判词在哪、队列两个仪器矛盾时信哪个 | `references/spark-task-bodies-and-resources.md` |
| 写前/写后质量门禁、失败保护、生产完成判定；**两条通用判据律**（§8.0：判据必须锚定身份且匹配不到即失败 · 先问信号回答的是哪个问题）+ **检查器本身怎么写**（变异验证、判据真空成立与阳性对照、不适用必须判失败、闸门具名分档、先测再改门禁、结构恒等式不是判据） | `references/production-validation.md` |

重要入口：

- SG Dorado/DataLeap 控制台：<https://dataleap-sg.tiktok-row.net/dorado>
- 官方鉴权说明：<https://cloud.bytedance.net/docs/dorado/docs/642811ff34fc6f02f390c219/6428122034fc6f02f390cd41>
- CLI 细节：`~/.claude/skills/bytedcli/references/subskills/bytedance-dorado/GUIDE.md`、`~/.claude/skills/bytedcli/references/subskills/bytedance-hive/GUIDE.md`

## 1. 先判断现在能不能建

先拿到 `region`、`project_id`、目标 `database.table`，再做只读体检：

```bash
bytedcli --json auth status
bytedcli --json dorado project get <project_id> --region <region>
bytedcli --json hive detail <database> --region <region>
bytedcli --json dorado project yarn-queues --project-id <project_id> --region <region>
```

检查项目详情里的项目账号 PSM、开发鉴权方式、生产鉴权方式。结论必须分别写清：

1. 当前用户是否能创建 Catalog 表。
2. 调试阶段实际以用户还是项目 PSM 读写。
3. 生产阶段实际以谁读写。
4. 目标库是否存在，项目是否有可用队列。

“能自建表”至少要求：能创建目标 Catalog 表，并且实际运行主体能写目标表。源表读取权限是另一件事，按整表范围确认，不使用列级申请。

## 2. 创建表

建表前固定显式定义：

- 正文列和分区列；字段类型与注释。
- 表说明、TTL、安全级别。
- 文件格式与压缩方式；无特殊要求时沿用目标库同类正式表惯例。
- 唯一粒度或预期主键组合，写进表注释或任务记录。

禁止 `SELECT *` 反推 schema。先用 `dorado task sql-schema` 或显式字段合同核对输出列，再通过 Catalog 创建：

```bash
bytedcli dorado task sql-schema --sql "<SELECT SQL>" --region <region>

bytedcli hive create \
  --database <database> \
  --table <table> \
  --ttl <days> \
  --ddl "<CREATE TABLE DDL>" \
  --region <region>
```

创建后用 `hive detail` 验证字段、分区和元数据。Catalog 落库是异步的，创建成功后立即查询短暂报“not found”不代表建表失败；隔几秒重试后再诊断。

### 2.1 改已有表的字段(`hive modify field`)—— 退出码判不了任何事(2026-07-31 实测)

> 时效:2026-07-31 · bytedcli 0.111.0 · region sg。

`--fields` 是**整份列清单的全量替换**,不是追加;`--partition-keys` 必须一并传。
建议用服务端自己返回的字段对象做往返(round-trip),避免手敲类型或漏列。

**同一句报错 `✗ CoralNG API error: atlas消息处理异常` 对应过三种实况**:

| 实况 | 场景 |
|---|---|
| 写得**完全正确** | 正常改动 |
| 写了**一半** | 字段注释超长被截断 |
| **一个字节没写** | 元数据异步传播滞后 |

⇒ **退出码两个方向都错**:报错 ≠ 没写,报错 ≠ 写坏。
唯一判据是**回读 DDL 比对**(结构指纹 + 逐字比对注释字符串)。
若脚本用退出码当闸门,会在写成功时中止、写截断时放行 —— **正好反了**。

两条具体硬事实:

- **字段注释有 256 字节硬上限,超长静默截断成前缀**。
  实测 290 字节的注释落库成**恰好 256 字节**,断在半句话上,
  **读起来像一句完整的话** —— 这是它比报错更危险的地方。
  ⇒ 改注释前先量 `len(comment.encode())`。
- **元数据异步落地**:改完**立刻**回读可能拿到**改前**的指纹,判成「没写成功」。
  与上文建表的 `not found` 是同一机理的两种表现。
  ⇒ 回读前留沉降时间,或「回读不符 → 原样重发一次再判」;
  实测原样重发第一次即 MATCH。

## 3. 权限

- Dorado/TQS 缺 Hive 权限时走 `bytedcli coral permission apply`，不要用 `hive` 或 `iam` 代替权限申请。
- 权限申请统一按整表提交，不指定列；源表读权限和目标表写权限都遵循这一规则。
- TQS 前置检查返回的缺失列只用于定位缺权表，不缩小为列级申请。
- 项目账号运行时，给项目 PSM 申请源表读权限和目标表写权限；个人账号调试成功不能替代 PSM 权限。
- 返回 `under_approval` 只表示已提交，审批通过前不能当作权限已生效。
- 表未开放 Coral 申请时，保留返回的资源信息并报告阻塞，不编造申请成功。

## 4. 建临时 HSQL 载体并做 smoke

临时验证使用 Dorado“临时查询”目录，不上线周期任务：

```bash
bytedcli dorado folder structure --project-id <project_id> --root-id -2 --region <region>

bytedcli dorado task create \
  --project-id <project_id> \
  --folder-id <temp_query_folder_id> \
  --name <smoke_task_name> \
  --type hsql \
  --schedule-type 3 \
  --region <region>

bytedcli dorado task-draft update <task_id> \
  --cluster <cluster> --queue <queue> --region <region>

bytedcli dorado task-draft update <task_id> \
  --sql "SELECT 1 AS init" --region <region>
```

`root-id=-2` 必须配 `schedule-type=3`。放到任务开发目录 `root-id=-1` 会报“任务调度类型与目录不匹配”（4066）。dummy SQL 不能省，否则 `conf.configuration` 可能为空，`adhoc exec` 不会真正提交 Yarn。

先用稳定主键做小样本，再执行 `INSERT OVERWRITE/INTO`。多源 join 必须先把每个来源降到目标粒度，尤其是版本表先按业务键取一行、明细消耗先按目标键聚合，防止 join 扩行。

```bash
bytedcli dorado adhoc exec "<INSERT SQL>" --task-id <task_id> --region <region> --no-wait
bytedcli dorado adhoc status --debug-id <debug_id> --task-id <task_id>
bytedcli dorado adhoc log --debug-id <debug_id> --task-id <task_id>
```

大 DWD 明细即使只输出少量用户，也可能扫描完整分区。正式任务优先先做 `业务键 × 日期` 预聚合，或缩短窗口；不要用“小 cohort”推断“输入扫描也小”。

## 5. 验收

至少跑以下检查，并记录 SQL、region、project、task/debug ID、鉴权主体和分区：

- 输出行数、目标主键 distinct 数、单主键最大重复数。
- 每个来源的命中数/命中率。
- 关键字段非空数；金额、计数等字段的基本范围。
- 目标分区是否存在，字段顺序和类型是否与合同一致。
- 预期唯一粒度下 `max_rows_per_key = 1`；否则先查版本表或明细表 fanout。

资源准入类失败（如 Godel/kubelet Admit）不是 SQL 逻辑错误。对同一只读验数 SQL 可原样重试一次；仍失败再转资源诊断。

## 6. 清理

用户要求“测完删除”时：

1. 先 `DROP TABLE <database>.<table>`。
2. 再跑 `SHOW TABLES IN <database> LIKE '<table>'`，以返回 0 行作为数据面已删除证据。
3. Coral/Data Catalog 仍可能保留 `OFFLINE`、物理大小 0 的历史资产记录；这是审计元数据，不代表表仍在线。
4. 临时 HSQL 载体未上线即可；`task close` 对 ad-hoc shell 可能仍显示 `runnable`，最终检查 `check-online=false` 且 `deployed=false`，确认没有调度。

## 7. 完成标准

- 已明确用户账号与项目 PSM 在开发、生产阶段各自的权限结论。
- 表 schema、TTL、分区和安全元数据可复核。
- 小规模写入成功，粒度、来源命中和关键字段通过验数。
- 涉及正式链路时，草稿 Explain、单日 smoke、历史回填、bootstrap、日更接力和生产验收按对应 reference 的门禁完成。
- 正式任务的版本、参数、资源、依赖 offset、最大并发、重试和告警均已回读。
- 失败路径已证明不会覆盖既有正式分区；未满足时明确为 BLOCKED，不降级成“已上线”。
- 未上线临时任务；要求清理时，数据面已查无目标表。
- 只记录可复用入口、流程和坑，不把一次性表名、任务 ID、申请单 ID 或样本指标写回本 skill。

### 2.2 建表通道与元数据读取通道的选择(2026-08-01 EU 实测)

**要求逐字节同构时必须走 `hive create --ddl`,不能用 `--fields`。**
`--fields` 会把**空字符串注释规范化成 `NULL`**,`--ddl` 不会。
实测:某表 8 个列在源侧注释是 `''`,用 `--fields` 建出来变成无注释 ——
这是整轮建表里**唯一出现过的 diff**。用一张两列的一次性表做决定性探针确认成因后 drop 重建才归零。

**判 `TBLPROPERTIES` 不能读 `hive detail` 的 `parameters`。**
SQL 侧 `ALTER TABLE ... SET TBLPROPERTIES` 之后,`hive detail` 的 `parameters` **9 分钟后仍是旧快照**,
而 `hive ddl` 与 Spark `DESCRIBE FORMATTED` 都能读到。
**这不是 Atlas 的短暂滞后,是 Coral 实体缓存不订阅 metastore 变更。**
用错通道会把"已经写进去"判成"一条都没写",进而去做一次根本不需要的重写。

**判排序键行为只有 Spark `DESCRIBE` 有资格。**
Coral 实体与 DDL 正文读的都是元数据服务;决定 `sort_array` 实际行为的是**引擎看到的 schema**。
表结构同构性建议三条通道各自判定(Coral 逐字段 / DDL 正文整段相等 / Spark `DESCRIBE`),
差异集合为空才算同构 —— 三条读的是三个不同的东西,不是重复劳动。

**`numBuckets = 0` 不代表没分桶。** 若"N 桶"是靠**分区键的取值规则**实现的
(例如 `user_bucket = pmod(xxhash64(...), 128)`),那它不是 Hive 物理分桶,
建表时**不该加 `CLUSTERED BY`**。照着"128 桶"去加物理分桶会建出一张与源侧不同构的表。

### 2.3 跨机房移植时,**不要把源机房的窗口/范围声明抄进目标表的 TBLPROPERTIES**

源表上写着形如 `..._WINDOW_22D_20260703_20260724` 的契约声明时,那是**源机房的**回填窗口。
照抄到目标机房 = 在表上钉一个**当下就是假的声明**,而且会与 SQL 里依赖该声明的门禁互咬。
正确做法:**先留空,等目标机房的窗口实测确定后再写**。
(同源规则见全局 AGENTS「One-Sided Declarations Are a Signal, Not a Gap」——
两侧不一致时要先判哪边是对的,不是把声明补齐到缺的那侧。)
