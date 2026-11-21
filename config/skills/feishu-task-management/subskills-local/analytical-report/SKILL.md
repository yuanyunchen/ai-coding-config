---
name: analytical-report
description: "构建严肃数据分析报告——自包含离线 HTML(core/full 双版、原生 SVG 图表、可折叠 SQL 钻取、读图三拍、诚实口径),含 starter-kit 与 build→Playwright→对抗审查(≥4 agent)闭环。触发词:分析报告、数据报告、core/full 双报告、读图三拍、诚实口径、可折叠 SQL、自包含 HTML 报告、对抗审查报告、teal orange 报告。本 skill = 通用 HTML 报告引擎;飞书域端到端数据分析编排(iDA 取数→飞书 docx 交付)走 data-analysis-report(它编排本 skill)。"
---

# 数据分析报告(自包含离线 HTML)

**一句话**:把分析做成**一套引擎产 core+full 两份**自包含离线 HTML —— 单一来源设计系统、原生 SVG 图、**每图读图三拍**、**诚实口径**(采样/反例/断线都标),build → Playwright 复验 → **≥4 agent 对抗审查** → 修复闭环。

## 何时用本 skill
要把已算好的指标/CSV 做成一份**严肃的数据分析报告**(决策汇报 + 同行复核),要求图表干净、口径诚实、可离线分享。**不是**做营销落地页/海报/通用网页(那走 `frontend-pipeline`);本 skill 专攻「数据 → 可信报告」这一类。

> 与 `frontend-pipeline` 的分工:fp 是通用前端创作入口(美学/主题/多类型);本 skill 是「分析报告」这一垂直场景的**方法论 + 现成设计系统**。需要更高阶视觉打磨时可叠用 fp 的子能力。

---

## 1. 架构:单一来源,一套引擎产两份

把内容、样式、图表引擎、数据**全部拆成单一来源**,`build.py` 组装成两份自包含 HTML(core / full),互不漂移:

```
_shared.css        设计系统(双色/排版/卡片/表/折叠区/响应式/打印)— 两份共用
_charts.js         原生 SVG 图表引擎(纯函数:数据→<svg>字符串,零外部库)
_drill.py          SQL 钻取折叠区的单一数据源 + 渲染器({{DRILL:id}} 占位)
_core_body.html    核心版正文(决策向:结论先行 + hero 图 + 少量图)
_full_body.html    完整版正文(同行复核:全章 + 方法学 + 全图 + 附录/局限)
build.py           组装:内联 css/js/数据/base64 图,注入 drill,产 core/full/index.html
build_site_zip.sh  打 Goofy 部署包(见 bytedance-internal-hosting skill)
```

**自包含 = 零外部引用**:CSS/JS 内联 `<style>`/`<script>`;数据 `<script>const DATA={...}</script>`;位图 base64 `data:image/png;base64,...`。`build.py` 收尾 assert「外部 http/cdn 引用 = 0」「占位符全消费」「内联 png 数量符合预期」—— 防静默缺块。

**core vs full**:core 只放决策需要的(hero 结论图 + KPI + 一句话 verdict);full 放全 A–H 章 + 方法学 + 全部图 + 可折叠 SQL + 局限清单。同一套 css/js/data,只换 body。

starter-kit 在 `references/starter-kit/`,直接拷来改即可。

## 2. 图表:原生 SVG 为主,base64 PNG 为辅

- **原生 SVG**(`_charts.js`):柱/折线/分组/散点/维恩/迷你 sparkline 等,纯函数输出 `<svg>` 字符串,`renderAll(DATA)` 注入。可缩放、可打印、文字可选中、零依赖。
- **base64 PNG**(matplotlib 渲染后内联):热力图、地理图等 SVG 难画的,用 Python 渲 PNG → base64 内联。渲染器见 `references/starter-kit/heatmap_top.py`、`continental_chart.py`。
- **双色调色板**:`search/正 = teal #1f6f8b`,`pixel/负 = orange #c8742a`(暖纸底 + serif 标题)。全文一致。

## 3. 读图三拍(每张图的叙事铁律)

每张图配一段「读图」,**三拍走完**,不许只给图不给话:

1. **数字** — 这图最关键的一个数 / 对比是什么(具体值)。
2. **为什么** — 机制/原因:为什么是这个数(落到原因,不停在复述)。
3. **怎么用** — 这个发现对决策/下一步意味着什么(actionable)。

强结论图额外给「右上角 takeaway 角标」(一句话拎走)。这是 core 版图少但每张都说透的关键。

## 4. 诚实口径纪律(报告可信度的命根)

分析报告最容易翻车的是**夸大与掩盖**。逐条守:

- **采样标注**:任何采样估计(如 `1/10 取模采样`)在**首次出现处**就带口径小标 + 校验说明;只报比率/占比,绝对数标「上界」。措辞别把取模说成「哈希均匀」。
- **诚实反例**:有反例就摆(如「250 国里 27 国 pixel 反占优」),不挑顺的说。
- **断线不插值(no-interpolation)**:趋势图缺的点就断开 + 标 ✕,**绝不连线假装有数据**。超时未取的标「超时未取」。
- **geoname id → name**:对外展示一律把 id 映射成可读名(城市/国家),别甩裸 id。映射缺失时回退原值并注明。
- **口径等价透明**:推导值(非直测)给出算式与等价性说明(放折叠区),让同行能复核。
- **近似函数标注**:`approx_count_distinct` 等标「误差 <2%,不改方向」。

## 5. 交互细节(全在 _shared.css / build.py)

- **mini-TOC + scrollspy**:顶部 sticky 章节导航,滚动高亮当前章(零依赖 `TOC_JS`)。
- **可折叠 SQL 钻取**(`<details>`):青色调(与橙色 caveat 警示区分);默认收起;打印时强制折叠(不撑爆页数)。每块 = 回答什么 + 窗口/引擎/状态 chip(实测/优化版/推导/超时未取)+ SQL + 关键结果。
- **响应式 + 打印**:窄屏表格/趋势图横滑;`@media print` 出 A4(SQL 折叠、TOC 隐藏、避免 break-inside)。

## 6. 构建与验证闭环(质量靠这步兜底)

1. **build**:`python3 build.py` → core/full 两份;过 assert(零外链 / 占位符全消费 / png 计数)。
2. **Playwright 复验**:用 `webapp-testing` 截全页图,**肉眼复检**数字、坐标轴、口径标注、版式不叠、断线 ✕ 正确。
3. **对抗审查 ≥4 agent 并行**:派多个子智能体各盯一面 —— **内容/视觉/结构/口径/质疑**。本项目靠它抓到真 BLOCKER(控池口径其实是 co-presence、「取模≠哈希」误称、pixel 垂类构成)。派单要求见 `references/methodology.md`。
4. **修复闭环**:把 blocker/major 修进单一来源(css/body/drill),重 build 重验,直到无主要问题。

详细方法论(读图三拍范例、诚实口径检查表、对抗审查派单模板、调色板)见 `references/methodology.md`。

## references
- 报告组织规则(统一对比口径、一卡一问一图、图型随强调点、章节顺序、选择偏差)与一份成品示例:`~/.claude/skills/design-principles/references/data-report.md`、`~/.claude/skills/design-principles/assets/example-data-report/`。动手前先读。
- `references/methodology.md` — 读图三拍范例 · 诚实口径检查表 · 对抗审查 ≥4 角度派单模板 · 调色板与设计基线 · 构建验证清单。
- `references/starter-kit/` — 现成设计系统(拷来改):
  - `_shared.css` — 全套设计系统(双色/卡片/KPI/表/趋势表/折叠区/ladder/mini-TOC/响应式/打印)。
  - `_charts.js` — 原生 SVG 图表引擎(纯函数,零依赖,中文数字格式化 human()/去尾零)。
  - `_drill.py` — SQL 钻取折叠区单一数据源 + 渲染器(状态 chip / SQL 高亮 / 结果表)。
  - `build.py` — 组装器(内联 css/js/data/base64,注入 drill,自包含 assert)。
  - `heatmap_top.py` · `continental_chart.py` — matplotlib PNG 图渲染器范例(CJK 字体 / ASCII-fold 刻度 / 双色)。
