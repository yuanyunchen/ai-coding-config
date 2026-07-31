# 指标目录与判读方法

## 使用规则

1. 先用 Libra 的实际开始时间划窗；实验刚开时至少等一个聚合周期。
2. EU、TTP、ROW 分开查，不把跨机房 QPS 直接比较成性能结论。
3. 保存可点击 Metrics 链接，并在汇报中写 region、绝对时间、时区、聚合粒度和 tags。
4. 同时画目标召回和同机房健康对照。没有 `recall_type` 的指标只作辅助。

## Intent Center

| 目的 | 指标模板 | 判读 |
|---|---|---|
| 是否接到意图 | `ad.lead.intent_center_cpp.intents.throughput{source=...,intent_name=...}` | 无点优先查 Libra、Link 和 source |
| 是否产出非空意图 | `ad.lead.intent_center_cpp.intents_not_empty.throughput{source=...,intent_name=...}` | throughput 有、nonempty 无，问题在 Intent Center 内或输入 |

Travel Search 常见 intent：

- `cs_all_scenario_search_travel_l1_geoname_id`
- `cs_all_scenario_search_travel_l2_geoname_id`
- 需要时继续查 `normalized_city`、L0、L3，不能用“Search 有点”概括不同 key。

## Engine

| 目的 | 指标模板 | 判读 |
|---|---|---|
| Engine 是否收到普通 intent | `ad.enginecpp.tiktok.shopping_ads.intent.throughput{source=intent_center_ole_ad,type=...}` | 证明普通 profile 输入存在 |
| 是否写入策略召回 | `ad.enginecpp.tiktok.shopping_ads.intent.throughput{source=intent_center_strategy_recall_ole_ad,type=...}` | Targeting Prepare 依赖这一类 strategy key |
| intent 是否非空 | `ad.enginecpp.tiktok.shopping_ads.intent.size{source=...,type=...}` | throughput 有而 size 为 0，仍不足以进入倒排判断 |

关键区分：`intent_center_ole_ad` 与 `intent_center_strategy_recall_ole_ad` 不是同一层证据。前者有点不能推出后者完成了 `strategy_recall_ids` 映射。

## Targeting：PrepareXidOp

| 目的 | 指标模板 | 判读 |
|---|---|---|
| 召回 DAG 是否有流量 | `ad.targeting.tiktok.graph.recall.throughput{recall_type=...}` | 证明召回入口命中 |
| 建 XID 列表失败 | `ad.targeting.tiktok.prepare_xid_op.build_xid_list.fail{name=...,ret=*}` | 按 `ret` 查源码语义 |
| 被跳过 | `ad.targeting.tiktok.prepare_xid_op.skip_recall{name=...}` | 区分条件跳过与异常失败 |

`ret=100921` 的已确认语义：`RC_ERROR_RECALL_ID_NOT_FOUND`。在当前 Targeting 源码中，对应目标 map key 不存在或 vector 为空。它发生在 Fetch 倒排之前。

## Targeting：Fetch 与下游

| 阶段 | 指标模板 | 用途 |
|---|---|---|
| Fetch 结果 | `ad.targeting.tiktok.fetch_xid_result_op.recall_aid_cnt{name=...}` | 判断倒排是否返回 AID |
| Fetch 非法结果 | `ad.targeting.tiktok.fetch_xid_result_op.invalid_result{name=...}` | 区分空结果与结构异常 |
| Fetch vector | `ad.targeting.tiktok.fetch_xid_result_op.vector_output{name=...}` | 判断输出是否进入后续节点 |
| Bitmap | `ad.targeting.tiktok.bitmap_op.recall.num{name=...}` | 看 union/intersect/exclude 前后衰减 |
| Merge 错误 | `ad.targeting.tiktok.graph.merge_test_recall_error.throughput{recall_name=...,recall_type=...,reason=*,step=*}` | 定位 merge 失败阶段 |
| 最终 AID | `ad.targeting.tiktok.rsp.new_multi_recall_aid.count.avg{cluster=slice2,env=prod,recall_type=...}` | 最终广告主维度输出 |
| 最终 CID | `ad.targeting.tiktok.rsp.new_multi_recall_cid.count.avg{cluster=slice2,env=prod,recall_type=...}` | 最终创意维度输出 |

## 量级原则

- 报错数必须换算成每秒或占实验请求比例。`36 次/小时` 约为 `0.01 QPS`；若主链缺失量明显更大，它不能解释全量无输出。
- 比较 AID/CID 时优先比较“有无”和链路拐点；小流量阶段均值容易受流量、样本和聚合方式影响。
- 指标全局有值但缺少 experiment/recall tag 时，用它判断服务是否工作，不用它证明实验命中。

## 写入诊断

EU 写入白名单自查入口通常位于：

`https://cloud-eu.tiktok-row.net/metrics/selfService/writeAllowCheck`

若 namespace、PSM、region 三类诊断均通过但目标 metric 没有数据，更可能是代码路径未执行/未写入，而不是写入被白名单拦截。保存带查询参数的结果链接作为证据。
