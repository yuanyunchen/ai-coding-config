# 链接发现与快捷查看

## 快捷优先级

按以下顺序找入口，命中即停止，不重复开页：

1. **任务工作区链接索引**：先定位本次报告所属的日报子工作区；没有子工作区时使用当前任务工作区。读取该工作区已登记的 `experiment-link-registry.md`（日报子工作区通常为 `memory/note/experiment-link-registry.md`，普通任务工作区通常为 `.agent/memory/note/experiment-link-registry.md`），存在已验证 URL 就直接打开。
2. **实验记录文档**：工作区未收录时，复用已保存的实验详情、实验报告和中间指标链接。
3. **当前浏览器标签页**：按 flight ID 查找已打开的 edit/report/depth-analysis 页面，接管现有标签页。
4. **报告页的“深度分析”**：让页面生成带正确 datasource、group、config 和 query 参数的权威链接。
5. **侧栏导航**：只有没有现成链接时才逐级进入 PCM业务大盘或 Cascade Ranking。

不要手工猜 `config_group_id`、`group_id`、`query_id` 或 datasource。复制别的实验链接后只改 flight ID 会产生“页面能开但数据口径错误”的假成功。

## 链接清单

每个实验建立临时链接清单：

| 名称 | 识别方式 |
|---|---|
| 实验详情 | `/libra/flight/<flight_id>/edit` |
| 主 ADVV 报告 | `/libra/flight/<flight_id>/report/ad/...`，含业务过滤条件 |
| 广告召回深度分析 | datasource 通常为 `app_recall_consistency_daily`，模板 `Travel Recall` |
| 商品召回深度分析 | PED datasource，模板 `pid商品召回` |
| 转化事件深度分析 | PED datasource，模板 `Travel Catalog Event` |

保存完整 URL，不只保存 host；同时记录页面标题和 flight ID 防止串实验。

## 长期任务链接索引

链接索引是任务工作区的当前真值，不把某个 flight 或 query_id 写进本 skill。每个 flight 至少记录：

- 类型、信号、region、状态和最后验证日期；
- 实验详情、主报告、已启用的中间指标、转化事件完整 URL；
- 主报告的固定过滤条件和特殊口径；
- 页面生成的最新 query_id；没有权威链接时写 `—`，不得猜测。

新数据日执行时先打开索引中的上一版完整 URL，再在页面日期控件更新结束日。页面生成的新 URL 由子智能体写入 `result.md` 的 `link_updates`；主智能体验收 flight、datasource、group、config、模板和日期后，才更新工作区索引。旧派发日志不回改。

历史回顾同样执行强制写回：任何此前或本次已经打开并核验过的实验页面，都要把完整 URL 写入命中的日报/任务工作区实验链接索引，不能只留在浏览器、聊天或临时 manifest。长期日报仍由子智能体回传 `link_updates`、主智能体验收后写索引。未来任务从该索引开始；若 URL 已失效，再由页面重新生成并以验收后的新值更新当前条目。

## 历史候选发现

链接索引没有覆盖候选全集时，先在目标实验的匹配流量层内查看历史记录。仍缺候选才用实验列表的 owner/user 条件补查：owner 从本次请求、权威页面或命中工作区动态取得，并替换查询参数中的 `user=<owner>`。固定人员只属于当次上下文，不得写成通用入口或默认筛选值。

## 日期捷径

1. 先打开已有最新链接，不从实验开始日重新点日历。
2. 若目标区显示“数据产出中”，只把结束日向前退一天并重新确认。
3. “数据产出助手”是组件名，不触发回退。
4. 历史链接若只差日期，优先在页面控件更新日期；不要在地址栏同时改日期和 config/query 参数。

## 浏览器效率

- 优先复用已登录 Chrome；用户未指定浏览器且权限不足时，再试允许的其他浏览器后端。
- 一次只保留一个详情页、一个主报告页和任务实际需要的深度分析页。
- 用 DOM 文本读取表格；只有趋势图、裁切或页面结构必须视觉确认时才截图。
- 表格很多时先按锚点定位目标 `queue_id`/`dpa_direct_id`，不要逐表滚动读取。
- 所有浏览器操作只读；不要误点 Stop、Pause、复制实验、模板更新或确定写入类按钮。

## 现有 Metrics 快捷入口

若当前浏览器已有“Recall 指标快捷入口”，它适合快速打开 Targeting/Engine 的吞吐、失败、AID/CID 或 direct id 监控。它用于链路健康检查，不替代 Libra 的 ADVV、P-Value、支路消耗和事件拆解。日常效果查看优先走 Libra；出现无点或链路异常时再转 `ad-recall-experiment-debugging` 并使用该入口。

## 权限与降级

1. 页面 403/空白时先记录原链接并尝试另一个允许的浏览器后端。
2. 两个后端都失败时，不自行申请权限；报告受阻页面和所缺数据。
3. 用户提供截图时可以完成截图口径的教学或静态分析，但明确写“截至截图日期”，不能声称已读取实时页面。
