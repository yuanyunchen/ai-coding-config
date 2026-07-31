# Worked example：EU Search Travel 713 无 AID/CID

> 这是 2026-07-30 本次排查的证据快照，用于示范方法。线上状态变化后必须重新验证。

## 实验与时间

- Flight：[72208415](https://libra-sg.tiktok-row.net/libra/flight/72208415/edit)
- `recall_type=713`
- 流量：0.1%，shared base
- 实际开始：2026-07-30 22:00:27 UTC / 15:00:27 PT

## 当时观察到的链路

| 阶段 | 观察 | 当时判读 |
|---|---|---|
| Libra | 小流量实验已实际启动 | 可以使用启动后时间窗排查 |
| Link | Search config 已发布到 EU 相关 region | Link 发布本身不是断点 |
| Intent Center | L1 nonempty 约 12.04 QPS；L2 约 11.69 QPS | Search 城市意图已非空产出 |
| PrepareXidOp | L1/L2 `ret=100921` 各约 0.271 QPS | 目标 strategy key 缺失或为空，断点在 Fetch 前 |
| Final | 713 AID/CID 无打点 | 与 Prepare 失败方向一致 |
| 对照 709 | 同时段 AID avg 约 25.46，CID avg 约 124.17 | 排除 Targeting 或公共倒排整体不可用 |

## 配置证据

- 本地 EU DAG：`deliverables/05-eu-dag.json`
- 本地 EU 713 参数：`deliverables/06-eu-experiment-params.json`
- 同机房 709 参数：`deliverables/07-eu-pixel-experiment-params.json`
- Link 发布详情：[release 2549610940781536](https://cloud-eu.tiktok-row.net/tcc/namespace/ad.link.tiktok/publish-details/2549610940781536)
- 发布记录当时显示 EU-TTP2、EU-TTP、US-EastRed 成功。
- Engine 配置历史：[Pixel profile list 历史页面](https://cloud-eu.tiktok-row.net/tcc/namespace/ad.enginecpp.tiktok/config/2541168268017090/history/version?by_key=false&condition=name&configId=&dir_path=all_dir&env=prod&filter_empty_dir=false&filter_no_tag=false&keyword=ole_ads_user_ids_intent_pixel_profile_list&ns_name=ad.enginecpp.tiktok&order=&pn=1&region=all_region&release_operator=&release_status=&rn=100&scope=all&source=&tab=)
- EU 当时 `V37` 为 Online，`V38` 为 Latest 但非 Online。

V38 相对 V37 的精确新增项只有以下 5 个，未观察到删除项：

- `cs_all_scenario_search_travel_normalized_city`
- `cs_all_scenario_search_travel_l0_geoname_id`
- `cs_all_scenario_search_travel_l1_geoname_id`
- `cs_all_scenario_search_travel_l2_geoname_id`
- `cs_all_scenario_search_travel_l3_geoname_id`

V37 不是“完全没有 Search”；它已有其他 `cs_all_scenario_search_*` 项，只缺这 5 个 Travel Search city keys。

本地 DAG 也显示 reranker 是机房专属配置：

- ROW：`maliva_recall_aid_realtime_reranker_r5492409_0`
- TTP：`ttp_ad_realtime_reranker_r1140668_0`
- EU：`eu_recall_realtime_reranker_r1082660_0`

这证明模型配置不能跨机房等同；但本案 `100921` 发生在 reranker 之前，所以模型差异不是当时主断点的解释。

## 源码证据与结论强度

- `100921` = `RC_ERROR_RECALL_ID_NOT_FOUND`。
- `PrepareXidOp` 在 strategy map 中找不到目标 key，或 vector 为空时返回该错误。
- Engine 的 Search 与 Pixel 走不同 parser；当时 HEAD 代码中 Pixel 路径有 strategy-recall 写入调用，Search parser 没看到等价调用。

因此，当时证据支持：链路最早断在“Engine Search intent → Targeting strategy key”之间，倒排 Fetch 尚未开始。它强于“reranker 报错”假设，因为少量 reranker 错误不能解释主链无输出。

## TTP 对照

- [TTP 713 历史成功指标](https://metrics-fe-ttp-us.tiktok-row.org/web/plot/metrics#1784962800,1784966400,,,,,avg,5m,US-TTP2,false,,;sum:store:ad.targeting.tiktok.graph.recall.throughput%7Brecall_type=literal_or(713)%7D%7B%7D;sum:store:top-40-max:ad.enginecpp.tiktok.shopping_ads.intent.throughput%7Bsource=literal_or(intent_center_strategy_recall_ole_ad),type=literal_or(cs_all_scenario_search_travel_l1_geoname_id)%7D%7B%7D;avg:store:top-40-max:ad.enginecpp.tiktok.shopping_ads.intent.size%7Bsource=literal_or(intent_center_strategy_recall_ole_ad),type=literal_or(cs_all_scenario_search_travel_l1_geoname_id)%7D%7B%7D;sum:store:top-40-max:ad.enginecpp.tiktok.shopping_ads.intent.throughput%7Bsource=literal_or(intent_center_strategy_recall_ole_ad),type=literal_or(cs_all_scenario_search_travel_l2_geoname_id)%7D%7B%7D;avg:store:top-40-max:ad.enginecpp.tiktok.shopping_ads.intent.size%7Bsource=literal_or(intent_center_strategy_recall_ole_ad),type=literal_or(cs_all_scenario_search_travel_l2_geoname_id)%7D%7B%7D;avg:store:ad.targeting.tiktok.rsp.new_multi_recall_aid.count.avg%7Bcluster=literal_or(slice2),env=literal_or(prod),recall_type=literal_or(713)%7D%7B%7D;avg:store:ad.targeting.tiktok.rsp.new_multi_recall_cid.count.avg%7Bcluster=literal_or(slice2),env=literal_or(prod),recall_type=literal_or(713)%7D%7B%7D;0,0,0,0,0,0,0)
- 当时历史窗：L1 strategy throughput avg 约 1611.97 QPS，L2 约 1572.63；AID avg 约 29.29，CID avg 约 168.74。
- 这证明 713 的 DAG/字段设计曾在 TTP 跑通，但不证明 EU 的 Online Engine 配置一致。
- TTP namespace 只读权限申请记录：[BPM 5722858](https://cloud-ttp-us.bytedance.net/bpm/record/5722858)

## 可复用教训

1. 先对齐实验实际开始时间；未启动时的空图没有诊断价值。
2. Intent Center nonempty 只证明意图产出，不证明 `strategy_recall_ids` 已写入。
3. `100921` 把问题定位在 Fetch 之前，不能继续把主因归给倒排或 reranker。
4. `Latest` 和 `Online` 的配置差异足以造成单机房异常。
5. 同机房健康对照比跨机房“发布内容一样”更能排除公共故障。
