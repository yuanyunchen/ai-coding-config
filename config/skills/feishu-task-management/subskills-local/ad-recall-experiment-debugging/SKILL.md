---
name: ad-recall-experiment-debugging
description: "字节广告召回实验的端到端排查与证据整理。遇到 Libra 实验无 AID/CID 打点、召回量异常、Intent 有点但倒排无结果、跨 ROW/TTP/EU 机房差异，或需要检查 Link、Intent Center、Engine、Targeting、DAG、TCC、指标和源码时使用；只做诊断和证据链，线上发布、改实验、改 TCC 或代码须另行授权。"
---

# 广告召回实验排查

## 目标

找出链路中最早出现异常的阶段，并产出能复核的结论。完成标准：

1. 对齐实验实际生效时间、机房、流量、`recall_type` 和健康对照支路。
2. 从 Link 一直检查到最终 AID/CID，每层都给出指标或配置证据。
3. 用源码解释错误码或分支语义，不用稀疏报错替代根因。
4. 结论附可点击链接、时间窗、标签和排除项；不把推测写成事实。

## 边界

- 默认只读。可以打开页面、查询指标、比较版本、查看源码、申请只读/Viewer 权限。
- 不默认创建或启动 Libra 实验，不发布 TCC，不启用版本，不改线上参数或代码；这些动作需要用户另行授权。
- 权限被挡时记录页面和申请单链接，继续排查其他层，不把“看不到”写成“没有”。

## 开始前读取

- 每次都读 [指标目录](references/metrics-catalog.md) 和 [平台、文档与源码入口](references/platforms-and-source-code.md)。
- 排查 Search Travel、EU 或 `recall_type=713` 时再读 [EU 713 案例](references/case-eu-713.md)。它是案例，不是固定结论。
- 需要向 mentor 或群里同步时读 [证据与汇报模板](references/report-template.md)。

## 排查流程

### 1. 冻结观察口径

先记录：flight ID、实验名、机房/region、`recall_type`、实验实际开始时间、流量比例、是否 shared base、观察时区、目标 DAG/TCC 版本。至少留出一个指标聚合周期再下结论。

选择同机房、同时间窗、刚上线且有打点的健康支路作对照。跨机房数据只证明链路设计可行，不能直接证明目标机房发布完整。

### 2. 静态检查本地参数和 DAG

按身份链逐项对齐，任何一处错位都可能让打点归到别处或让节点取不到数据：

`targeting_test_recalls.<key>` → `recall_type` → `collect_xid_deps_args` → `PrepareXidOp` → `engine_strategy_name`/`field_name`/`recall_key` → `FetchXidResultOp` → merge/output node → `recall_flag`。

检查：

- `collect_xid_deps_args` 中的节点确实存在，并指向预期 L1/L2/L3 路。
- `PrepareXidOp.input_type`、`engine_strategy_name`、`strategy_name`、`field_name` 和 `recall_key` 与机房配置一致。
- `FetchXidResultOp.recall_key` 与对应 Prepare 节点完全一致。
- output 的 `recall_flag` 与实验 `recall_type` 一致；merge 依赖落到真正输出节点。
- 节点前缀不混机房：当前项目常见 ROW=`wojz`、TTP=`onav`、EU=`bqlt`，但以后以线上 DAG 为准。
- 去重、scatter、rerank、拆 quota 参数只影响各自阶段；不要用它们解释更上游的 `PrepareXidOp` 缺 key。
- JSON 先通过解析，再与健康支路按语义字段 diff；不要只比较文件名或发布内容文本。

### 3. 按数据流逐层定位

固定顺序：

`Libra 生效` → `Link/TCC 开关` → `Intent Center 产意图` → `Engine 收到并写入 profile/strategy` → `PrepareXidOp 取 key` → `FetchXidResultOp 查倒排` → `bitmap/去重/rerank/scatter` → `AID/CID`。

每层先看吞吐，再看非空/size，再看错误。上一层没有非空数据时，不提前查模型或倒排。

### 4. Libra 与 TCC

- Libra：确认实验不是仅创建未启动；以实际开始时间而非创建时间切指标；确认流量、shared base、参数 payload 和目标机房。
- Link：确认正确的 `intent_center_*_exp_keys` 列表包含目标 config key，且发布覆盖目标 region。
- Engine/Targeting TCC：区分 `Latest` 与 `Online`。最新版本存在配置不等于线上版本已包含。
- 比较版本时输出精确 added/removed/changed 列表；“有 Search”必须具体到缺失的 intent key。

### 5. 指标证据链

使用 [指标目录](references/metrics-catalog.md) 的查询模板，按相同时间窗记录：

1. Intent Center `throughput` 与 `intents_not_empty.throughput`。
2. Engine 普通 source 与 strategy source 的 `throughput`、`intent.size`。
3. Targeting `PrepareXidOp` 的 `build_xid_list.fail`、`skip_recall` 和错误码。
4. `FetchXidResultOp` 的 `recall_aid_cnt`、`invalid_result`、`vector_output`。
5. bitmap、merge、rerank、最终 AID/CID。

所有指标截图或链接都写明 region、起止时间、聚合方式、关键 tags。没有 `recall_type` 标签的全局指标只能辅助定位，不能单独证明实验组请求命中。

### 6. 用决策表收敛

| 最早异常 | 优先结论 | 下一步 |
|---|---|---|
| Intent 无吞吐 | Libra/Link/config key 未生效或 source 未触发 | 查 flight 实际开始、Link key 与发布 region |
| Intent 有吞吐但非空为 0 | 意图模型、输入或 Intent Center 配置问题 | 查 intent payload、模型/配置版本 |
| Intent 非空，Engine 普通 source 无点 | Engine profile 路由、线上版本或 allowlist 问题 | 查 Online 配置及写入诊断 |
| 普通 source 有点，strategy source 无点 | profile 到 `strategy_recall_ids` 的映射/解析分支缺失 | 对比 Search/Pixel parser 与 Engine Online 版本 |
| Prepare 报 `100921` | 请求中目标 strategy key 缺失或 vector 为空 | 查 Engine strategy source 和源码 map lookup |
| Prepare 成功，Fetch 未运行 | DAG 依赖、条件或上游 op 中断 | 查节点级 throughput/skip/error |
| Fetch 运行但结果为 0 | 倒排字段、索引数据、字典或模型召回问题 | 查 `field_name`、索引覆盖和同字段健康支路 |
| AID 有而 CID 无 | Fetch 后的 bitmap/去重/rerank/scatter/CidStruct | 逐节点看输入输出与错误率 |

### 7. 源码只解释已经定位的断点

源码用于确认错误码和分支行为。例如 `100921` 在 Targeting 中表示 `RC_ERROR_RECALL_ID_NOT_FOUND`，对应目标 key 不存在或 vector 为空。它能证明失败发生在 Prepare 阶段，因此这时不能归因为倒排本身。

稀疏 reranker 报错必须计算量级：若只有 36 次/小时，而实验缺失输出的请求规模远大于它，它只能是旁路噪声或次要问题。根因必须能解释主要缺失量。

### 8. 结束条件

满足以下条件再结束：

- 已指出“最后正常层”和“第一个异常层”。
- 根因证据至少包含一个运行时指标和一个配置/源码证据；若只能定位不能定根因，明确写“已定位到 X→Y，根因待验证”。
- 已用同机房健康支路排除公共服务或公共倒排整体故障。
- 已列出仍需权限、发布或小流量实验才能验证的假设。
- 使用 [汇报模板](references/report-template.md) 输出简版结论和证据链接。

## 常见误判

- “发布内容一样”不等于各机房 Online 版本、profile config、模型和 region 覆盖一样。
- 字段名相同不等于用的是同一份倒排数据；先证明 Fetch 真正拿到了 XID。
- 有 Intent Center 打点不等于 Engine 写入了 `strategy_recall_ids`。
- 写入白名单诊断全通过且没有写指标，通常说明没有发生写入，不是白名单拒绝。
- 图上没有点要先检查实际生效时间、region 和 tags，不能直接判定链路为 0。
