---
name: whiteboard-design
description: （原名 lark-whiteboard，2026-07-01 改名以区分官方同名执行技能）在飞书做结构化图示的设计方法论 —— 架构图/微服务拓扑、流程图/状态机、组织架构树、对比矩阵、漏斗、金字塔、鱼骨(因果)、飞轮、泳道、里程碑时间线、树状图、柱状/折线图、思维导图等。当用户要"画架构图/流程图/链路图/组织架构/对比图/漏斗/金字塔/鱼骨图/泳道图/时间线",或要把一套结构/关系/流程在飞书里画成图时使用。本技能给的是飞书原生结构图怎么构图才专业(场景选型 + 配色 + 排版 + 布局 + 连线),不是直接生成原生画板;数据→统计图表走 chart-gen、mermaid DAG 依赖图走 dag-flow-diagram、等宽公式策略链路走 ascii-strategy-diagram（其余作图选型见 feishu-task-management 作图节）。
---

# 飞书结构化图示设计方法论

把一套结构 / 关系 / 流程画成**一眼看懂、专业耐看**的图。本技能的核心价值是**构图方法论**：选对图表原型、分组配色、排版层级、布局骨架、连线拓扑——这些原则与最终用什么工具落地无关，是"图画得好不好"的根本。

## 落地路径(本机飞书侧必读，先看这一段)

> 执行层走官方 `lark-cli`(`@larksuite/cli`;见 `feishu-task-management` 入口 + `cli.md`),旧 `mcp__feishu__*` MCP 已退役,不再是执行路径。**本机飞书侧没有原生画板(画板/whiteboard)的 create/update 能力,且实测原生画板经飞书 API(`lark-cli`)根本做不出来**(`<whiteboard type="mermaid">` 拍平成纯文本 / Diagram(21) create 报 `1770029` 的机制与替代,权威见 `lark-doc-writer/references/mcp-recipes.md` 执行覆盖层)。所以本技能**不能**像 Mira 那样生成可拖拽的飞书原生画板节点。Mira 旧平台层的画板脚本已全部丢弃，不要调用。

按下面三条落地，**优先级从上到下**：

1. **要在文档里有一张"真实可见的图" → 渲染成 PNG 嵌 Image(27) 块(首选可视化路径)**。把图(mermaid / SVG / 自绘)本地渲染成 **PNG**，再建 **Image(27) 块**并绑字节(走 `lark-doc-writer/references/media-embed.md`(原 §6b)的 `medias/upload_all` 管线;`document_convert` 不会替你嵌图)。这是本机唯一能把一张真实图形放进飞书文档的飞书 API(lark-cli)路径。
   - SVG 数据图表走 `chart-gen` 出图 → 同上 PNG/Image 落地;mermaid/DAG 走 `dag-flow-diagram` 出图 → 渲染 PNG。

2. **纯文本兜底 / 结构简单 → ASCII 或 mermaid 源码代码块**:
   - 结构 / 链路图用 **ASCII 写进 `<code language="text">`(Code(14) 块)**,等宽对齐、始终可落地(实测 Code 块 create 稳定成功)。
   - mermaid / plantuml 代码块只作为"**给用户拷进渲染器的源码**"交付:经飞书 API(`lark-cli`)导入只成普通代码块、不渲染成图(机制见 mcp-recipes 执行覆盖层),要图就得渲 PNG(回到 ①)。复杂分支 / 复合卡片 / 高保真样式 mermaid 表达力不够,转 `dag-flow-diagram` / `ascii-strategy-diagram` 出图再渲 PNG。
   - 选型边界:`ascii-strategy-diagram`(公式驱动多阶段链路,纯文本对齐)、`dag-flow-diagram`(变量依赖 / 端到端流程,mermaid DAG)、`chart-gen`(柱 / 折 / 饼 / 漏斗 / 桑基 / 雷达数据图,SVG)。这些出"可落地产物",**本技能负责出产物前的构图判断**(选型、信息量、配色、布局),两者配合用。

3. **确实要可编辑的原生画板节点**:本机飞书侧做不到(见上实测)。如实提示用户:确认飞书开放平台是否有对应画板 API 与权限(`lark-cli` 暂无可用画板 create/update 路径),或在飞书端手动建画板。**不要假装本机能创建可拖拽画板。**

## 怎么用本技能

```
Step 1  选图表原型          → 见下方「场景选型表」，点进对应 scenes/*.md 读它的构图范式
Step 2  规划信息量与分组    → references/content.md（信息量匹配用户详细度，别过度展开）
Step 3  定布局骨架          → references/layout.md（先定主布局，再定子布局）
Step 4  上色 + 排版         → references/style.md（分组配色）、references/typography.md（字号层级）
Step 5  规划连线            → references/connectors.md（连线数量策略、形状、锚点）
Step 6  按落地路径出产物    → 见上方「落地路径」①②③
```

## 场景选型表(本技能的核心)

先判断**信息结构**，再选原型——不要靠关键词硬猜。每个 scene 文件讲清该原型的 Content 约束、Layout 选型、骨架范式、常见陷阱。

| 你要表达的东西 | 选哪个原型 | scene 文件 |
|---|---|---|
| 原始表→中间表→最终表→下游，或计算收益 / 日更任务合同 | 技术数据链路三图 | [`../dag-flow-diagram/references/technical-data-pipeline-diagrams.md`](../dag-flow-diagram/references/technical-data-pipeline-diagrams.md) |
| 分层架构、微服务、前后端模块划分 | 架构图 | [`scenes/architecture.md`](scenes/architecture.md) |
| 业务流转、审批流、状态机、带条件判断的链路、复杂拓扑 | 流程图 | [`scenes/flowchart.md`](scenes/flowchart.md) |
| 公司组织、模块依赖树、分类层级树 | 组织架构图 | [`scenes/organization.md`](scenes/organization.md) |
| 跨角色 / 跨系统的端到端协作流程 | 泳道图 | [`scenes/swimlane.md`](scenes/swimlane.md) |
| 方案对比、功能矩阵、技术选型 | 对比 / 矩阵图 | [`scenes/comparison.md`](scenes/comparison.md) |
| 因果分析、根因分析（多分类多原因） | 鱼骨图 | [`scenes/fishbone.md`](scenes/fishbone.md) |
| 转化漏斗、销售漏斗（自上而下递减） | 漏斗图 | [`scenes/funnel.md`](scenes/funnel.md) |
| 层级结构、需求层次（自下而上收窄） | 金字塔图 | [`scenes/pyramid.md`](scenes/pyramid.md) |
| 增长飞轮、闭环链路 | 循环 / 飞轮图 | [`scenes/flywheel.md`](scenes/flywheel.md) |
| 时间线、版本演进、路线图 | 里程碑 | [`scenes/milestone.md`](scenes/milestone.md) |
| 层级占比、矩形树图 | 树状图 | [`scenes/treemap.md`](scenes/treemap.md) |
| 柱状 / 条形数据对比 | 柱状图 | [`scenes/bar-chart.md`](scenes/bar-chart.md) |
| 折线 / 趋势 | 折线图 | [`scenes/line-chart.md`](scenes/line-chart.md) |
| 思维导图、时序图、类图、饼图、甘特图 | mermaid 直出 | [`scenes/mermaid.md`](scenes/mermaid.md) |
| 用户**显式**要配图 / 插图 / 照片 | 图片展示 | [`scenes/photo-showcase.md`](scenes/photo-showcase.md) |

> 选型边界提醒：
> - **数据图表**（柱 / 折 / 饼 / 漏斗 / 树状）落地时优先走 `chart-gen`（SVG），scenes 里的对应文件主要看其**构图与防错原则**（数据点上限、配色、坐标计算思路）。
> - **思维导图 / 时序 / 类 / 饼 / 甘特 / 极简流程**优先 mermaid 直出（落地路径 ①）。
> - **复杂分支流程 / 复合卡片**优先 `dag-flow-diagram`，构图判断看 `scenes/flowchart.md`。
> - 图片展示依赖把图片上传到画板再引用——本机无原生画板，此场景仅作构图参考，真要落地按落地路径 ③。

## 设计原则速查(展开见 references/)

这几条是所有图的通用质量基线，跨工具适用：

- **分组配色**：先数清图里有几个分组（层 / 分支 / 类别 / 阶段），每组一种颜色（2-4 种）；分组容器浅色填充，组内节点白底 + 该组深色边框。同组节点视觉完全一致。连线统一用灰色（如 `#BBBFC4`），不抢节点。详见 [`references/style.md`](references/style.md)（含经典/商务/科技/清新/极简 5 套色板）。
- **排版层级**：同图不超过 3 个字号层级；同级节点字号完全相同；相邻层级差 ≥ 4px。标题用独立文本节点，不要塞进形状的标题栏。短标签居中、长文本左对齐、侧标签右对齐。详见 [`references/typography.md`](references/typography.md)。
- **布局骨架**：先定主布局再定子布局——结构化分层用 Flex（横/纵堆叠），关系网密 / 流程链主导用 Dagre 有向图自动布局，位置本身有语义（地图 / 时间轴）才用绝对定位。先画网格再填内容。详见 [`references/layout.md`](references/layout.md)。
- **连线拓扑**：连线 ≤8 逐条画，9-15 取代表性连线，>15 走层到层或精简分组。优先让引擎自动绕线；流程图用圆角折线 / 直角折线，坐标轴用直线，跨层用曲线。有连线的节点间距 ≥40。详见 [`references/connectors.md`](references/connectors.md)。
- **信息量**：匹配用户的详细程度。"简单架构图"就画 3 层每层 2-3 个节点；"完整微服务架构"才展开到 4-5 层。节点文字用"标题 + 简短说明"，说明 ≤12 字，不要写长段落。详见 [`references/content.md`](references/content.md)。

## 关于 references/dsl-schema.md

[`references/dsl-schema.md`](references/dsl-schema.md) 是 Mira 画板 DSL（WBDocument JSON）的节点类型与字段定义。

> **它在本机不可执行** —— 飞书侧(官方 `lark-cli`,旧 `mcp__feishu__*` MCP 已退役)没有工具消费这个 JSON。保留它仅作两个用途：
> 1. scenes/*.md 里的「骨架示例」是用这套 DSL 写的，读骨架时可对照字段语义理解**布局意图**（哪里分组、哪里等分、哪里靠连线表达关系）——把它当伪代码看，迁移成 mermaid / SVG / 未来的画板工具调用。
> 2. 将来若把原生画板工具挂进白名单（落地路径 ③），这份 schema 可作为 DSL 参考。
>
> 现阶段**不要**尝试把这套 JSON 直接发给飞书侧(`lark-cli` / 退役的 `mcp__feishu__*`)。

> 同理，scenes 里出现的 `.cjs` 脚本模板（鱼骨 / 飞轮 / 漏斗 / 金字塔 / 柱状 / 折线 / 树状）原本是喂给 Mira `whiteboard-cli` 的。本机用不了那个渲染器，但**脚本里的几何算法**（三角函数布角度、等斜率公式、面积比例切分、坐标轴映射）是真价值——要画这些图时，把算法思路迁移到 `chart-gen` 的 SVG 生成或你自己的坐标计算里。

## SVG 进飞书画板的兼容约束（构图无关于工具，落地路径 ③ 必看）

`chart-gen` / `frontend-design-pro` 产出的 SVG，若**最终要落进飞书原生画板**（落地路径 ③），飞书的 svg-parser 会把可识别元素转成可编辑节点，其余降级为内嵌图片（能显示但不可编辑）。**有几类装饰特性画板完全不支持，会导致渲染问题，必须避免**。这份约束与用什么工具生成 SVG 无关，是飞书画板自身的解析能力边界：

- **可识别 → 转可编辑节点**：形状 `<rect>` / `<circle>` / `<ellipse>` / `<polygon>`；连线 `<line>` / `<polyline>` / `<path>`（自动识别为直线 / 折线 / 曲线）；文本 `<text>` / `<tspan>`（**文字必须用 `<text>`，不要用 `<path>` 描字**，画板按 CJK ≈ 1em / Latin ≈ 0.6em 重排，容器宽度要留够）；分组 `<g>` / `<a>` / `<use>` 引用 `<symbol>`；变换 `translate` / `rotate` / `scale`。
- **⛔ 不支持（会坏渲染，禁用）**：`<radialGradient>` / `<filter>` / `<pattern>` / `<clipPath>` / `<mask>`；以及 `skewX` / `skewY` / `matrix(...)` 这类空间级扭曲（会降级）。
- 连线优先用正交折线（`<polyline>` 带水平 / 垂直折点）而非斜直线，画板里更干净。
- 注意：以上仅针对"SVG 要进飞书画板"。如果 SVG 只是独立交付 / 进文档当图片，按 `chart-gen` / `frontend-design-pro` 自身规则即可，不受这些约束限制。
