# 飞书文档样式指南 + XML 标签速查(权威指引)

飞书文档质量高的核心方法论(从 market lark-doc 迁移,执行无关)。

> **单一权威(G2):** 视觉样式与 XML 规则的**唯一权威是同目录两份恢复自 Mira 官方的原件**,本文不再重复其内容,只做"指引 + 本机飞书侧落地的差异补充"(执行层走官方 `lark-cli`,旧 `mcp__feishu__*` MCP 已退役,见 `feishu-task-management` 入口 + `cli.md`):
> - **视觉样式** —— [`lark-doc-style.md`](lark-doc-style.md):核心原则、元素选择指南、**画板意图识别(12 行信号词表)**、颜色语义、排版规范、**丰富度自检(唯一权威表)**。
> - **XML 标签 / 颜色 / 转义 / 嵌套** —— [`lark-doc-xml.md`](lark-doc-xml.md):标准/扩展标签、块级/容器/**行内组件(含 `<latex>`/`<time>`/`<figure>`/`<task>`/`<chat_card>`/`<bookmark>`)**、资源块、表格扩展、**每属性颜色支持矩阵**、转义规则、行内样式嵌套顺序。
>
> 写文档前先读这两份;本文只补"Mira XML 方言 → 本机飞书侧 block API(官方 `lark-cli`,旧 `mcp__feishu__*` MCP 已退役)"会变的地方。

---

## 一、对照速记(详规以两份原件为准)

- **结构优于文字 / 结论先行 / 视觉节奏(连续纯文本 ≤3 段、章节间 `<hr/>`) / 最少惊讶** —— 见 `lark-doc-style.md` 一。
- **元素选型**(核心结论→callout;**方案对比 / Before vs After → `<grid>` 2 列分栏**;3+ 属性结构化数据→markdown-pipe/`<table>`(→ Table(31))+表头背景色,**不用 `<lark-table>`**;清单→`<checkbox>`;**图→渲染成 PNG 嵌 Image(27) 或 ASCII `<code language="text">`**,⛔ 不靠 `<whiteboard>`)—— 选型语义见 `lark-doc-style.md` 二,**本机落地实测以下方「画板落地」+ `mcp-recipes.md` 执行覆盖层为准**。
- **画板意图识别**:撰写/审查每段都判断是否该用图,12 行信号词→图型映射 —— 见 `lark-doc-style.md` 二。
- **颜色语义**(信息=蓝 / 成功=绿 / 警告=红 / 注意=黄 / 中性=灰;表头统一 `light-gray`)—— 见 `lark-doc-style.md` 三。
- **丰富度自检**(富 block 密度 / 元素多样性 / 连续纯文本 / 每章节非纯文本 / 开头双 callout / 章节 `<hr/>` / 图数量底线)—— 各项达标阈值的**唯一权威是 `lark-doc-style.md` 五**;SKILL §10 与 `mcp-recipes` 只引用它,不另立标准。
- **XML 标签 / 颜色矩阵 / 转义 / 嵌套顺序** —— 见 `lark-doc-xml.md` 全文。

---

## 二、本机飞书侧落地差异补充(原件用 Mira XML 方言,本机执行是官方 `lark-cli` 的 block API;旧 `mcp__feishu__*` MCP 已退役)

这些是**两份原件之外**、因执行层不同而必须额外注意的点(详细 JSON 配方见 [`mcp-recipes.md`](mcp-recipes.md)):

> 下方出现的裸工具名(`documentBlockDescendant_create`、`docx_v1_documentBlockDescendant_create` 等,`{path, params, data}` 形态)是退役 `mcp__feishu__*` MCP 的旧记法,**仅作「动作 → 参数语义」参考**;实际执行用 `lark-cli` 对应命令,以 `lark-cli <域> +<shortcut> --help`、`lark-cli schema <service.resource>`、`lark-cli skills read lark-<域>` 为准(见 `cli.md`)。

- **关键指标方向标注**:关键数值用 `<span text-color="green/red">` 突出时,**必须同时带 ↑↓ 或 +/- 方向**(色觉无障碍)。这是本机在原件颜色语义之上补强的硬规则,务必保留。
- **转义只在 XML 导入路径**:`lark-doc-xml.md` 七 的 `<` `>` `&` 转义**仅用于飞书 XML 导入路径**;走 block API(JSON,如 `docx_v1_documentBlockDescendant_create`)文本**无需转义**(详见 SKILL.md §8)。
- **callout 颜色 fetch 时会丢**:把已发布文档拉回再改时,callout 的 `background-color`/`border-color` 可能丢失;改写时按 SKILL.md §1.4 重新补色,做模版从保留完整属性的源文件重建。
- **callout 数字色范围**(block API 路径):`callout.background_color` 1–15、`border_color` 1–7、`text_color` 1–7(传 0 报错);概述框≈浅蓝(bg 5/border 5),Context 框≈浅橙(bg 2/border 2)。命名色与数字码的对应见 `mcp-recipes` 配方1。
- **画板落地(实测结论,覆盖原件的 Mira `<whiteboard>` 写法)**:本机经飞书 API(`lark-cli`)**做不出可拖拽飞书原生画板** —— `<whiteboard type="mermaid">` 被 `document_convert` 拍平成纯文本、` ```mermaid ` 只成代码块、原生 Diagram(21) create 报 `1770029`。要图就**渲染成 PNG 嵌 Image(27) 块**(配方3 / §6b),纯文本兜底用 `<code language="text">` ASCII。⛔ 不用与内容无关的生图/截图冒充结构图。详细执行权威见 [`mcp-recipes.md`](mcp-recipes.md) 的「执行覆盖层」。
- **表格 / 图片就地建**:表格用 `documentBlockDescendant_create` 整棵一次建(block_type 31→32→2,row-major);图片块先空建在正确位置再走 §6 curl 绑字节,避免掉到文末(配方 0/2/3)。
