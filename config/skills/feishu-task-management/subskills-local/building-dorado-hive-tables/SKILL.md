---
name: building-dorado-hive-tables
description: "Dorado/DataLeap Hive 生产链路建设。触发:Dorado 建表、自建 Hive 表、日更任务、历史回填、首日全量、bootstrap、生产上线、PSM/权限、写入 smoke。覆盖建表、任务发布、回填、接力与验收；业务 SQL 设计和通用取数走 sql-query。"
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
| 创建/更新正式日更任务、依赖、参数、首个周期接力 | `references/production-pipeline-rollout.md` |
| 多日回填、首日全量、状态表 bootstrap | `references/backfill-and-bootstrap.md` |
| 写前/写后质量门禁、失败保护、生产完成判定 | `references/production-validation.md` |

重要入口：

- SG Dorado/DataLeap 控制台：<https://dataleap-sg.tiktok-row.net/dorado>
- 官方鉴权说明：<https://cloud.bytedance.net/docs/dorado/docs/642811ff34fc6f02f390c219/6428122034fc6f02f390cd41>
- CLI 细节：`~/.codex/skills/bytedcli/references/subskills/bytedance-dorado/GUIDE.md`、`~/.codex/skills/bytedcli/references/subskills/bytedance-hive/GUIDE.md`

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
