# 会议 note — 结构骨架 / 风格规则 / checklist

> 写作通则(命名 📖/🤖、去 AI 化、Callout 节制、可读性、作图选型、开头标准结构)以 `lark-doc-writer` §0 + §1.4 为唯一权威。本文只管会议 note 专属的**固定章节顺序、key-value 写法、强制 checklist**。模板:[`../templates/meeting_doc.xml`](../templates/meeting_doc.xml)(取自经用户验收的 Mira 真实模板)。

## 用途

把一场会议的目标、进度、要拿到的产出、节奏、待确认清单、会后动作、结论沉淀成一篇结构固定的飞书会议 note。既能**会前**当议程 + checklist 用,也能**会后**当结论存档。

## 固定章节顺序(强制,不调整)

> 目标 → 进度 → 五件事(核心产出) → 节奏 → Checklist → 会后动作 → 结论存档表

1. **会议目标 callout**(`emoji="🏁" background-color="light-green" border-color="green"`):`<b>会议目标</b>` + `<b>不在范围</b>` 两行。
2. **一、当前进度**:用 `<table>`(事项 / 状态),状态用 `<span text-color="green/yellow/red">` 区分已完成 / 进行中 / 受阻。
3. **二、会议要拿到的 N 件事**:画一张 `flowchart LR` 把会议简称指向 N 个核心产出(每个产出一句话补充)。落地形式:要图就渲染成 PNG 嵌 Image(27) 块,纯文本兜底把 mermaid 源写进 `<code language="text">` 块。⛔ 不用 `<whiteboard type="mermaid">`(本机拍平,见 mcp-recipes 执行覆盖层)。
4. **三、会议节奏**:先一句话点明总时长,再用 `<table>`(时段 / 动作)排时间块。
5. **四、Checklist**:按话题分 `<h2>` 小节,每条用 `<checkbox done="false">`;开放性问题用 `❓` 黄色 callout 列 Q1/Q2/Q3,需要现场记录答案时附一张空表。
6. **五、会议后 {时间窗} 内必做**:用 `⚠️` 红色 callout 说清为何这个时间窗关键,再用有序列表列自驱动作。
7. **六、结论存档**:`<table>`(项 / 最终结果),会后填,作为本次会议最终交付物;末行固定"下次同步时间与议题"。

## 风格硬规则(会议 note 专属)

- **callout 内 key-value 用全角空格分隔**:`<p><b>会议目标</b>　{{…}}</p>`(全角空格 `　`,**不用冒号** "目标:xxx")。
- **checkbox 用 `<checkbox done="false">`**,不要用表格 + ☐ 字符模拟。
- **标题不加中文括号注释**(不写"(会后填)""(建议 1 小时)"这类),括号内容融进正文或省略。
- 颜色用语义化命名色 `light-green / light-yellow / light-red / light-blue / light-gray`;表头一律 `<th background-color="light-gray">`;列宽用 `<colgroup><col width>`。
- 流程图落地:渲染成 PNG 嵌 Image(27) 块(首选),纯文本兜底把 mermaid 源写进 `<code language="text">` 块;⛔ 不用 `<whiteboard type="mermaid">`(本机拍平,见 mcp-recipes 执行覆盖层)(落地形式见 `dag-flow-diagram` / `lark-doc-writer §1.3`)。
- emoji 克制,只在 callout 和关键标记处;章节间用 `<hr/>` 分隔。
- 整体语言自然,避免公文体也避免过度口语化。

## 强制 checklist(自检)

- [ ] 七个固定章节齐全且顺序未变(目标 → 进度 → 五件事 → 节奏 → Checklist → 会后动作 → 存档)。
- [ ] 开头 callout 是绿色 `🏁`,含「会议目标」+「不在范围」两行,key-value 用**全角空格**。
- [ ] 所有勾选项是原生 `<checkbox done="false">`,无表格 + ☐。
- [ ] 进度表 / 节奏表 / 存档表用原生 `<table>` + `light-gray` 表头 + `<colgroup>` 列宽。
- [ ] 标题均为名词短语、无中文括号注释。
- [ ] 若引用了 meet 逐字稿 / mentor quote / 平台文档,句末 `[[标题]](URL)` inline 引用,出处类型分清。
- [ ] 开头另放橙色 Context 框列原始来源(对齐 `lark-doc-writer §1.4`);会前 note 若暂无来源可省 Context 框,但有引用就必须列。
- [ ] **逻辑完整性查漏**:对照 `lark-doc-writer/references/perspective-templates.md` 的 M1(决策事项都有明确结论)/ M2(待办都有责任人 + Deadline)查漏(见 doc-trio Step 4.5)。
