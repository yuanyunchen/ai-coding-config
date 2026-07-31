# 计算队列目录(Megatron / Embedding 链路)

**适用范围与时效(先读这三行,决定这份文件还能不能信):**

- 账号口径:个人账号 `yunchen.yuan` 的 Megatron「My queue」中显示 `Joined` 的队列。**换账号(尤其生产账号)不成立**,必须在自己的控制面重新核对。
- 采集日期:2026-07-31(America/Los_Angeles 00:04–00:30)。队列名单 / 资源属性 / 配额变化慢,可作候选清单;**CPU/MEM 使用率与「当前建议」是瞬时快照,过期即废**。
- 使用前刷新:`bytedcli --json aeolus query-editor queues -r sg`(SKILL.md §2.2)。本文件给的是**候选集与选择规则**,实时负载以命令返回为准——两者冲突时以命令为准。

背景文档:[Embedding 链路迁移背景](https://bytedance.larkoffice.com/wiki/C6MHwRdk5iakuhkAKvvckpHXnab)

## 1. 选队列规则(不随快照变化)

1. **先定机房**:EU-NO 还是 ROW,由数据所在 region 决定,不跨机房挑队列。
2. **只在 Batch 队列里选**:Hive 查表、Dorado HSQL、Spark 日更与回填全部走 Batch。**Streaming 队列不作为批处理资源**——它们在名单里只是为了避免误选。
3. **Guarantee 优先于 BestEffort**:BestEffort 的名义配额可以极大(ROW 侧近百万 Core),但可被回收/抢占,只作可重跑、可中断的回填备用,不作日更主队列。
4. **再看队列级优先级**(High > Medium > Low),最后看实时余量。
5. **CPU 或 MEM 达到/接近 100% 的队列不选**,即便它是 High。
6. **0 配额的队列即便 `Joined` 也不是资源**(EU `root.app_ads_gaming`、ROW `copytest2`)。

```text
先选机房
  ├─ EU-NO
  │   └─ Batch → Guarantee → 看 CPU/MEM 余量 → Dorado 任务再设 D3
  └─ ROW
      ├─ 日更/生产:Batch → Guarantee → High → 看 CPU/MEM 余量
      ├─ 回填/临时:Batch → Guarantee;BestEffort 只作可中断备用
      └─ Streaming:仅 Flink/流式任务
```

**D3 不是队列优先级**:D3 是 Dorado 任务侧的 SLA/基线等级,与 Megatron 物理队列的 High/Medium/Low 是两套东西。物理队列已 `Joined` **不等于**某个 Dorado 任务已按 D3 创建;队列 membership 在 Hive Query Editor 与个人 Dorado debug 之间可共用,但产品侧是否显示该队列、任务是否已配 D3,要在对应入口单独确认。

## 2. 入口对照

| 使用入口 | 应选资源 | 优先级怎么理解 | D3 怎么理解 |
|---|---|---|---|
| Hive Query Editor 查表 | Batch;先确认该队列在下拉中可选 | Megatron 的 High/Medium/Low 决定调度顺序 | 不适用 |
| Dorado HSQL | Batch / Guarantee 优先 | 先看队列级优先级,再看实时余量 | 在 Dorado 任务侧设置/验收 |
| Dorado Spark | Batch / Guarantee 优先 | 同上 | 在 Dorado 任务侧设置/验收 |
| 历史回填 | Guarantee 优先;允许重跑时可用 BestEffort | 可接受 Medium/Low,但避开满载队列 | 是否要求 D3 由任务口径决定 |
| Flink / Streaming | Streaming 队列 | 已生效的 Streaming 多为 High | 与批处理链路无关 |

## 3. 队列快照(2026-07-31;配额可信,使用率仅供参考)

采集时共 31 个已生效队列:EU-NO 8、ROW 23。EU-NO = 7 Guarantee Batch(含 1 个 0 配额)+ 1 BestEffort Batch,队列级优先级全为 Medium,**EU 侧没有已生效的 High 队列**;ROW = 10 Guarantee Batch + 5 BestEffort Batch + 8 Streaming。

| 机房 | 资源类型 | 队列数 | CPU 配额 | MEM 配额 | 说明 |
|---|---:|---:|---:|---:|---|
| EU-NO | Guarantee Batch | 7 | 28,000 Core | 199.217 TB | 1 个为 0 配额,非零可用 6 个 |
| EU-NO | BestEffort Batch | 1 | 40,000 Core | 312.500 TB | 弹性,不作 D3 稳定性承诺 |
| ROW | Guarantee Batch | 10 | 54,848 Core | 404.163 TB | 批处理首选池 |
| ROW | BestEffort Batch | 5 | 961,364 Core | 6,656.007 TB | 名义配额大,可被回收/抢占 |
| ROW | Streaming | 8 | 50,078 Core | 328.199 TB | 不用于 Hive/HSQL/Spark |

### 3.1 EU-NO(全部 Medium)

| 队列 | 资源属性 | CPU 配额 / 使用率 | MEM 配额 / 使用率 | 快照时建议 |
|---|---|---|---|---|
| [root.ad_lookalike_prod](https://cloud-eu.tiktok-row.net/megatron/queues/root.ad_lookalike_prod?region=eu_ttp_no) | Guarantee | 7,000 / 5% | 48.828 TB / 5% | EU 首选,余量最大 |
| [root.ad_targeting_basis](https://cloud-eu.tiktok-row.net/megatron/queues/root.ad_targeting_basis?region=eu_ttp_no) | Guarantee | 5,000 / 19% | 39.062 TB / 20% | EU 次选 |
| [root.ad_tech_se](https://cloud-eu.tiktok-row.net/megatron/queues/root.ad_tech_se?region=eu_ttp_no) | Guarantee | 3,000 / 34% | 15.625 TB / 28% | 中等规模任务 |
| [root.ad_identity](https://cloud-eu.tiktok-row.net/megatron/queues/root.ad_identity?region=eu_ttp_no) | Guarantee | 3,000 / 33% | 23.437 TB / 17% | 内存余量较好 |
| [root.ad_measurement](https://cloud-eu.tiktok-row.net/megatron/queues/root.ad_measurement?region=eu_ttp_no) | Guarantee | 9,000 / 30% | 64.453 TB / 41% | 配额大,大任务候选 |
| [root.search_ads_compass](https://cloud-eu.tiktok-row.net/megatron/queues/root.search_ads_compass?region=eu_ttp_no) | Guarantee | 1,000 / 21% | 7.812 TB / 46% | 仅小任务,总配额小 |
| [root.ad_general_be](https://cloud-eu.tiktok-row.net/megatron/queues/root.ad_general_be?region=eu_ttp_no) | BestEffort | 40,000 / 28% | 312.500 TB / 21% | 仅可重跑回填 |
| [root.app_ads_gaming](https://cloud-eu.tiktok-row.net/megatron/queues/root.app_ads_gaming?region=eu_ttp_no) | Guarantee | 0 / 0% | 0 GB / 0% | 0 配额,不选 |

### 3.2 ROW — Guarantee Batch

| 队列 | 优先级 | 物理集群 | CPU 配额 / 使用率 | MEM 配额 / 使用率 | 快照时建议 |
|---|---|---|---|---|---|
| [root.snake_ad_catalog_dw_batch](https://cloud.tiktok-row.net/megatron/queues/root.snake_ad_catalog_dw_batch?region=sg) | High | snake / SG1 | 2,500 / 4% | 13.671 TB / 2% | ROW 首选 |
| [root.snake_data_ad](https://cloud.tiktok-row.net/megatron/queues/root.snake_data_ad?region=sg) | High | snake / SG1 | 6,500 / 13% | 28.515 TB / 69% | CPU 型任务;内存需确认 |
| [root.snake_ad_measurement_targeting](https://cloud.tiktok-row.net/megatron/queues/root.snake_ad_measurement_targeting?region=sg) | High | snake / SG1 | 2,800 / 54% | 14.648 TB / 82% | 负载偏高 |
| [root.virtual_ad_ads_infra](https://cloud.tiktok-row.net/megatron/queues/root.virtual_ad_ads_infra?region=sg) | High | virtual-sg | 21,970 / 59% | 162.402 TB / 73% | 大任务候选,先看实时余量 |
| [root.snake_search_ads_sg](https://cloud.tiktok-row.net/megatron/queues/root.snake_search_ads_sg?region=sg) | High | snake / SG1 | 500 / 100% | 3.320 TB / 93% | 快照时拥挤 |
| [root.snake_ads_measurement](https://cloud.tiktok-row.net/megatron/queues/root.snake_ads_measurement?region=sg) | High | snake / SG1 | 2,500 / 100% | 19.531 TB / 35% | CPU 满 |
| [root.snake_ad_stats_qa_batch](https://cloud.tiktok-row.net/megatron/queues/root.snake_ad_stats_qa_batch?region=sg) | High | snake / SG1 | 250 / 101% | 1,000 GB / 69% | 超额运行 |
| [root.migrate_tns_dw](https://cloud.tiktok-row.net/megatron/queues/root.migrate_tns_dw?region=sg) | Medium | virtual-sg | 1,828 / 50% | 10.710 TB / 100% | 内存满 |
| [root.capcut_rec_my_batch](https://cloud.tiktok-row.net/megatron/queues/root.capcut_rec_my_batch?region=sg) | Medium | byodel01 / MY2 | 1,000 / 72% | 4.882 TB / 73% | 负载偏高,备用 |
| [root.badge_ads_measurement_signal](https://cloud.tiktok-row.net/megatron/queues/root.badge_ads_measurement_signal?region=sg) | Medium | badge / MY | 15,000 / 94% | 145.507 TB / 100% | 快照时拥挤 |

### 3.3 ROW — BestEffort Batch(仅可中断回填)

| 队列 | 优先级 | 物理集群 | CPU 配额 / 使用率 | MEM 配额 / 使用率 | 快照时建议 |
|---|---|---|---|---|---|
| [root.capcut_rec_my_batch_associated_mixed](https://cloud.tiktok-row.net/megatron/queues/root.capcut_rec_my_batch_associated_mixed?region=sg) | High | byodel21 / MY | 1,400 / 100% | 8.203 TB / 51% | CPU 满 |
| [root.byodel26_ad_general_mix](https://cloud.tiktok-row.net/megatron/queues/root.byodel26_ad_general_mix?region=sg) | Medium | byodel26 / MY | 243,480 / 100% | 1.826 PB / 100% | 已满 |
| [root.be_ad_measurement](https://cloud.tiktok-row.net/megatron/queues/root.be_ad_measurement?region=sg) | Medium | byodel26 / MY | 77,120 / 77% | 418.642 TB / 100% | 内存满 |
| [root.byodel21_bee_ad_data_retention](https://cloud.tiktok-row.net/megatron/queues/root.byodel21_bee_ad_data_retention?region=sg) | Low | byodel21 / MY | 143,884 / 55% | 756.906 TB / 27% | 低优先级回填备用 |
| [root.virtual_ad_general_mix](https://cloud.tiktok-row.net/megatron/queues/root.virtual_ad_general_mix?region=sg) | Low | virtual-sg | 495,480 / 88% | 3.518 PB / 74% | 仅超大回填,不用于时效任务 |

### 3.4 ROW — Streaming(列出以防误选,批处理一律不用)

`root.sloth_tiktok`(8,206 Core / 50.202 TB)、`root.sloth_flink_ps_kv`(400 / 1.953 TB)、`root.sloth_flink_ad_i18n_default`(6,190 / 38.236 TB)、`root.barcee04_flink_ad_i18n`(2,347 / 13.127 TB)、`root.basil_i18n_vertical_lead_infra`(7,530 / 85.679 TB)、`root.sarcee01_flink_ps_kv`(217 / 988 GB)、`root.barcee04_migration_queue_sloth`(25,188 / 138.037 TB)、`copytest2`(0 配额)。全部 High,均在 `region=sg`。

## 4. 维护规则

- 只在队列仍显示 `Joined` 时保留;Pending / Rejected / 仅提交申请的不提前写入。
- 优先级、配额、Guarantee↔BestEffort 属性变化时改对应行并更新顶部采集日期。
- 使用率不逐次回改——它本来就是快照;选队列前刷新命令即可。
- Dorado D3 状态记在任务台账,不写进本文件的队列优先级字段。
