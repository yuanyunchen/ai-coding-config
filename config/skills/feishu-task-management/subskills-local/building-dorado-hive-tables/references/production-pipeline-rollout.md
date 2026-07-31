# Dorado Hive 生产任务上线

适用于“正式表已设计，需要创建或更新日更任务并接入生产依赖”的场景。业务 SQL 本身不由本文件设计。

## 1. 上线前合同

每张产出表先固定：

- 业务粒度、唯一键和分区键。
- 逻辑日期与源日期的对应关系。
- 窗口闭区间、TopK、阈值和确定性破平局键。
- 写入方式、同日重跑语义和失败保护。
- 业务保留期与物理 TTL 缓冲。
- 下游读取列、排序和事件语义。

版本表必须先取业务键唯一最新行，再判断资格；明细表必须先降到目标粒度再 join。不要用截断后的结果表反推精确原子事实。

## 2. 生产资源预检

分别验证用户账号和生产 PSM：

1. 源表读权限。
2. 目标表写权限。
3. 项目成员与发布权限。
4. cluster、DC、queue 可列出且能提交。
5. 上游任务、Sensor 或完成水位真实存在。

“表存在”“申请已提交”“个人调试成功”都不能替代生产 PSM 验证。跨机房还要检查源数据新鲜度和等价 schema；陈旧或空源不能标记 READY。

## 3. 草稿配置

正式任务草稿显式配置：

- SQL/代码。
- cluster、DC、queue。
- 调度频率和时间。
- 自定义参数与默认值。
- 上游依赖及 offset。
- 最大并发、失败重试、`runLatestWhilePending`。
- 任务 Owner、业务 Owner 和告警。

状态任务通常要求：

```text
max_concurrency = 1
self_dependency = previous cycle
runLatestWhilePending = false
failed date blocks later dates
```

只配置其中一项不能保证跨日状态一致。

## 4. 验证顺序

固定顺序：

```text
静态合同
→ sql-schema
→ task-draft explain
→ 单日真实 smoke
→ 负向失败测试
→ 发布 production version
→ 回读生产配置
```

Explain 必须带真实逻辑日期和全部模板参数，并确认窗口表发生分区裁剪。`sql-schema` 只证明粗粒度解析，不能证明 Spark 函数、模板、类型和 overwrite 安全。

## 5. 首个周期接力

若任务依赖自身前一周期，首个周期没有合法前驱：

1. 临时去掉自身依赖。
2. 用首个逻辑日期执行真实任务实例，不用 debug 冒充。
3. 与 bootstrap 分区做行数、唯一键、双向差集和全字段指纹复验。
4. 恢复自身前一周期依赖。
5. 回读依赖图，确认下一周期能解析所有父实例。

任务上线晚于当日调度点时，上游历史实例可能不会自动补建。首个自然周期前主动检查所有父实例，缺失时只补对应日期，不跳过上游检查。

## 6. 发布后的完成判定

不能只看单一状态字段：

- `check-online=false` 不一定表示 production 未运行。
- task shell 可为 runnable，但没有 production version。
- Explain 成功不等于正式实例成功。

完成证据至少包含：

- production version 与 deployed 状态。
- system instance 或正式回填实例成功。
- 目标分区验数通过。
- 参数、依赖、资源、并发、重试和告警回读一致。

等待上游、已创建任务壳、已提交发布都属于进行中，不写成完成。

---

## 7. 部署动作本身的陷阱(2026-07-31 实测 · bytedcli 0.111.0 · ROW/sg)

> 本节四条都是「工具说成功但没成功」或「改了 A 顺带毁了 B」。
> 时效:2026-07-31 · bytedcli 0.111.0 · region sg;换版本前先重验。

### 7.1 `task-draft update` 会**静默清空** conf 的多个字段

实测被清空的:`conf.authParam`(整个对象 → null)、`maxParallelism`、`runLatestWhilePending`。
**不报错、不提示**。其中 `authParam` 最致命 —— 任务的运行身份没了,
下次调度会静默落回项目 PSM,而报错要到**次日调度**才出现。

⇒ **改 SQL 或改 queue/cluster 之后,必须回读 conf 并逐字段比对**,
不能只看命令返回 `✓ Successfully updated`。

### 7.2 conf 里**含 SQL 本体** ⇒「恢复配置」会撤销「部署 SQL」

SQL 存放在 `conf.configuration.operator.parameter.code`。
若按「先 `task-draft update --sql-file` 推新 SQL,再 `task update-conf` 拿改前 conf 恢复配置」
这个直觉顺序做,**第二步会把第一步刚推的 SQL 盖回旧版**。

⇒ 要恢复的 conf 必须是「捕获的 conf **同时**套上新 SQL 与参数覆盖」后的产物。

### 7.3 `deployed=true` **不回答**「我的版本上线了没有」

它只说「该任务有某个已发布版本」。实测:`task online` 因权限被拒后,
`deployed` 仍是 `true`,而 `task diff` 显示 `version 8 → draft` 差异 1576 行。

⇒ 唯一诚实的判据是 **`bytedcli dorado task diff <id>` 显示 `No differences`**(已发布 == 草稿)。
更强的判据:**线上 SQL 的 sha256 == 磁盘文件的 sha256**,以及 SQL 内关键常量的实际取值。

⚠️ 另一形态:`online` 返回 `Request timeout after 20000ms` **而操作其实成功了**。
所以**成功与失败两个方向都不能信返回码**,一律回读内容。

### 7.4 `task online` 的前置检查用**任务的运行身份**校验权限

若任务要读的表只对个人账号授权、项目 PSM 无权限,**上线会被直接拒绝**
(报 `No valid privileges ... username=dorado.project.xxx` 并列出所有缺权限的列)。

解法是把任务身份显式设为个人:

```json
{"prodAuthType":"user","authMetas":[{"env":"prod","authType":"user"}],"useDoradoDefaultPsm":false}
```

**注意与 7.1 的联动**:`task-draft update` 会把它抹掉。
所以「先设身份、再部署」的顺序是错的 —— 身份会被静默还原,
而故障要到次日调度才暴露。正确做法是**部署流程内保证 conf 恢复时带上 authParam,并回读确认**。

## 8. 告警规则是独立对象(2026-07-31 实测)

任务上的 `conf.alarm.alarmRules` 常为 `null`,不代表没有告警 ——
liveness/timeout 规则是**独立对象**,入口:

```bash
bytedcli dorado task alarms     --task-id <id> --project-id <pid> -r <region>   # 列出绑定的规则名与 id
bytedcli dorado task alarm-rule get    --rule-id <rid> --project-id <pid> -r <region> -j
bytedcli dorado task alarm-rule update --rule-id <rid> ... --yes                # 不带 --yes 是干跑
```

阈值在 `timeoutAlarmItems`,常见三项:`latest_not_start` / `latest_not_end`(分钟)
与 `fixed_time_not_success`(`HH:MM`)。

⚠️ **`alarm-rule update` 是 read-modify-write,干跑输出里 `Task IDs` 为空** ——
若它清掉任务绑定,规则会**从任务上脱钩、彻底不再告警**,比不改糟得多。
⇒ 只为「补一句描述」这类装饰性收益去动它,**风险远大于收益**;
真要改先在干跑输出里确认绑定字段被保留。

**阈值推导口径**:每段容得下**本环节自身一次完整重试**,即
`起跑时刻 + 单次时长 + retryInterval + 单次时长 < 该环节的未完成阈值`,且各段严格递增。
⚠️ 增量口径与全量重算口径可能差 3 倍以上(本轮实测 16.5 分 vs 52.7 分),
**若周期内可能触发全量重算,必须为它单列一档**,否则天天误报。
