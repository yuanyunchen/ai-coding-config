# 维护 ongoing 与历史实验记录

## 目标与边界

本文件有两个互斥入口：默认只整理用户指定 region、流量层和实验类型下仍在运行的 Libra 实验；只有用户明确要求回顾历史实验时，才进入历史回顾分支。历史回顾不能扩张 ongoing 清单或日报 watchlist。飞书文档是人读索引，不是实验配置源；只在用户明确授权后修改指定文档，Libra 全程只读。

开始前先调用 `feishu-task-management`，并按其路由读取文档写入子技能。原文档更新使用 `lark-cli` 的文档能力，不用浏览器编辑飞书正文。

## 先建立实验清单

### ongoing 分支

1. 读取文档 outline，再局部读取一个现有实验段落，确认标题层级、参数密度、链接命名和插入位置。
2. 优先按 flight ID 复用当前浏览器中已打开的实验详情页；没有现成标签页时，再到 Libra 实验列表筛选 Search、region、流量层和状态。现有飞书实验文档可能滞后，只能作为索引，不能据此排除仍在运行的实验。
3. 在详情页逐个确认实验名称、flight ID、状态、流量层、流量、起止时间和 v1 参数。标题含 Search 不等于实验仍在运行；只有详情页状态为“进行中”才进入 ongoing 清单。
4. 按 flight ID 去重，并与用户给出的预期数量核对。数量不符时回到 Libra 实验列表按精确流量层补查，不能以旧文档中的“历史”归类代替详情页状态。已结束、暂停、流量层不符或只因命名相似的实验都排除。

当前 Travel Search 常见流量层如下，仅用于定位候选，实际写入前仍以详情页为准：

- ROW 广告召回：`Travel_cid_city_row_share_base_layer`
- EU 广告召回：`travel_recall_cluster_shared_layer`
- TTP PID：`ent_travel_catalog_ttp_share_base1`

### 历史回顾分支（仅在用户明确要求时）

1. 先读取命中的日报/任务工作区实验链接索引，直接复用已经核验的页面；索引用于减少重复导航，不代表候选全集。
2. 发现缺失候选时，先进入与目标实验相同的流量层，在该流量层的历史记录中检索；逐个核对信号、实验类型、region、flight ID 和实际状态，不能只凭名称相似归组。
3. 流量层历史不足时，才回到实验列表按 owner/user 搜索。owner 必须从本次请求、权威实验页面或命中工作区上下文动态取得，查询中的 `user=<owner>` 每次替换；不得把教学样例中的具体人员固化为默认值。
4. 按 flight ID 去重，并从详情页记录实际起止时间、流量变化和实验状态。已结束实验的主指标窗口从实际实验开始时间起，覆盖实验真实产出日，再延长到 7 个已确认产出的回流数据日；按页面实际产出核验，不用自然日差推算。
5. 只排除同时满足以下证据条件的长期小流量测试：详情/流量记录证明实验从未 ramp，日期证明其已长期运行，同信号可比实验在同口径窗口的页面数据证明其消耗持续相对极小。证据清单同时保存“未 ramp”与“组内相对极小消耗”的页面链接或截图；没有用户给定或页面可复核的比较阈值时，不做主观排除。
6. 所有打开并核验过的详情、报告和深度分析完整 URL 都进入临时 manifest；任务结束前按 `link-shortcuts.md` 写回命中的日报/任务工作区实验链接索引。

## 核心参数怎么摘

只写能说明实验改动和后续定位的差异，不把整段 JSON 倾倒进文档。优先保留：

- 状态、流量层、实验流量、开始日期；
- `recall_type` / `recall_flag`、`recall_config_key`；
- `merge_weight`、`group_snake_merge_path`、scatter `adv` / `topk`；
- L1/L2 `field_name`、关键 Link intent key；
- 影响容量时的 dedup `top_k`；
- 商品召回的 `dpa_direct_id`、weight、`recall_strategies`；
- 只在实验实际改动时记录的开关。

同一参数在 base 和 v1 都相同且不帮助识别实验时省略。参数值必须来自该 flight 的详情页，不从同名旧实验复制。

## 四类权威链接

每个实验保存完整 URL，链接显示文本可统一为 `link`。

### 实验详情

详情页即 `/libra/flight/<flight_id>/edit`。记录时同时核对页面标题和 flight ID，防止标签页串实验。

### 实验报告

页面路径：`实验报告 → 广告报告 → Travel & Entertainment → PCM决策看板 → Travel & Entertainment Catalog`。

按当前 Travel 口径设置：

- `is_search = (0)No`
- `l2_vertical_tag = (Travel)Travel`
- 结束日 = 最后完整数据日

点击“确定”后复制页面生成的完整 URL。不要手填 `config_group_id`。

### 中间指标

- 广告召回：`广告报告 → Ads Core → Cascade Ranking → 召回粗排 → 召回 → 深度分析 → Travel Recall`
- PID / 商品召回：`广告报告 → Travel & Entertainment → PCM业务大盘 → 深度分析 → pid商品召回`

广告召回链接应指向 recall consistency 数据源；纯商品召回链接应指向 PED 数据源。combined recall 单列为 `Combined 召回（CID + PID）`，分类以实验标题与详情配置为准；中间指标仍按实际数据源和模板选择，不得仅因模板相同而归入纯商品召回。

### 转化事件

页面路径：`广告报告 → Travel & Entertainment → PCM业务大盘 → 深度分析 → Travel Catalog Event`。

转化事件和 PID 中间指标可以共用 PED 深度分析入口，但必须保存对应模板的查询身份，不能让两个链接打开后落到同一默认模板。

模板 query ID 会变化。优先使用页面或现有权威链接生成的完整 URL；只有模板名、datasource、group、config 和实验口径都已核对时，才可复用用户已提供的模板 query ID。当前教学样例为 Travel Recall `2535140`、pid商品召回 `2535144`、Travel Catalog Event `2535145`，它们不是永久常量。

## 快捷与批量优化

1. 先做一张临时 manifest：`flight_id / 标题 / 状态 / 流量层 / 开始日 / 核心参数 / 四类 URL`，全部核对后再写文档。
2. 当前标签页命中 flight ID 时直接接管，不重新搜索；同一页面先生成主报告，再从侧栏进入需要的深度分析。
3. 同一批实验若页面确认使用相同 datasource、group、config 和模板，可用一个 UI 生成的链接作结构基准，只替换已核对的 `flight_id` 与日期；任何身份参数不一致就回到页面重新生成。
4. 多个实验一次性局部插入或 append，随后一次回读验证；不要逐条写入造成多次版本竞争。
5. 视觉截图只用于确认趋势图或页面结构；参数和链接尽量从 DOM 文本与当前 URL 读取。

## 飞书记录格式

固定按四层组织，不用原始实验名占标题：

1. 信号：Search、Pixel；
2. 实验类型：广告召回、Combined 召回（CID + PID）、商品召回；
3. region：ROW、EU、TTP；
4. 日期：`YYYY-MM-DD`，作为单条实验记录的标题。

同一 region 内把进行中实验放前面并保持展开；历史实验保留原参数、链接、观测和截图，但把日期标题设为折叠。日期下统一先写 Flight ID 与状态，再写核心参数和四类链接；缺失链接写 `—`，不补猜。

```xml
<h1>Search</h1>
<h2>广告召回</h2>
<h3>ROW</h3>
<h4>2026-07-31</h4>
<p><b>Flight ID：</b>...　<b>状态：</b>进行中</p>
<p><b>核心参数：</b>流量层 ...；实验流量 ...；核心参数 ...</p>
<ul>
  <li>实验详情：<a href="...">link</a></li>
  <li>实验报告：<a href="...">link</a></li>
  <li>中间指标：<a href="...">link</a></li>
  <li>转化事件：<a href="...">link</a></li>
</ul>
```

同一 flight 已存在时更新原日期条目，不重复追加。普通增量维护使用 block 级插入或单次 append，不覆盖整篇文档。

用户明确要求整篇统一重排时，使用以下安全路径：

1. 完整回读 outline 和正文，建立 `signal / type / region / date / flight_id / status / params / 四类 URL / 历史观测 / image token` manifest；
2. 先生成并校验完整 XML，历史图片用原 `img src` token 回放，不能只保留临时下载 URL；
3. 带当前 revision 单次 overwrite；若 revision 变化先重新回读，不强行覆盖；
4. 回读新 outline，取得历史日期 h4 的 block ID，再把这些标题的 `folded` 设为 `true`；进行中日期保持 `false`；
5. 回读 raw blocks 验证日期标题数量、展开/折叠数、flight ID、图片数和链接口径。

折叠能力实测记录：2026-08-02，`lark-cli 1.0.65`，通过 Docx `PATCH /documents/{document_id}/blocks/{block_id}` 的 `update_text_style` 写入 `style.folded=true`，`fields=[3]`；批量时使用 `blocks/batch_update`。验证依据是回读 Heading4 的 `style.folded`。XML 写入格式本身未声明 `folded` 属性，不要凭空添加该属性。

## 写后验收

1. 文档 revision 已前进且写入命令无 warning。
2. 回读新增范围，实验数与预期相同；每个详情页状态都是“进行中”。
3. 每个 flight 恰有实验详情、实验报告、中间指标、转化事件四个链接。
4. 四个链接中的 flight ID、日期、region 和 datasource 不串实验；报告含 Travel 与 Search 过滤口径。
5. 商品召回与广告召回没有选错模板；转化事件链接能恢复 Travel Catalog Event，而不是默认 PED 页面。
6. 核心参数是 v1 的真实差异，不是从旧实验复制的整段配置。
7. 层级顺序是信号 → 实验类型 → region → 日期；combined 单列为 `Combined 召回（CID + PID）`；进行中日期展开、历史日期折叠。
