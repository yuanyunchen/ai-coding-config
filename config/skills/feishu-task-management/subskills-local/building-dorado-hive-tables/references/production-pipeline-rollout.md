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
