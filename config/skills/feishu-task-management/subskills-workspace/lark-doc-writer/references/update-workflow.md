# 改写增强工作流(reconciled to MCP)

用户提供已有文档链接或 token,需要改写、润色、补充或重排版时,遵循本工作流。执行层走官方 `lark-cli`(`@larksuite/cli`;见 `feishu-task-management` 入口 + `cli.md` 的三层命令/鉴权/踩坑),旧 `mcp__feishu__*` MCP 已退役,不再是执行路径。下文 `mcp__feishu__*` 是退役 MCP 的旧记法,**仅作「动作 → 参数语义」参考**;实际执行用 `lark-cli` 对应命令,以 `lark-cli <域> +<shortcut> --help`、`lark-cli schema <service.resource>`、`lark-cli skills read lark-<域>` 为准(见 `cli.md`)。

## 先确认编辑模式(不允许跳过)

⛔ 改一篇**已存在的**文档前,先按 SKILL.md §5a 确认是**副本编辑**(`drive_v1_file_copy` 复制再改)还是**原文编辑**(不可撤销)。用户没表态先问;本次会话自己刚建的文档可直接原文编辑。

## 核心方法论 — Code-Act Loop

1. **Plan** — 根据用户目标和文档当前状态,评估下一步该做什么
2. **Execute** — 调相应 `lark-cli` 命令(下文 `mcp__feishu__*` 记法即对应动作的参数语义参考),或 spawn Agent 子任务并行推进
3. **Observe** — 检查返回,验证正确性,核查样式是否达标
4. **Iterate** — 如需调整,回到 Plan

## 核心原则:精准手术优于全量覆盖

1. **精准手术**:只改用户指定的 block,不碰其他 block。优先 `docx_v1_documentBlock_patch`(改单块文本)/ `documentBlockChildren_create`(插块)/ `documentBlockChildren_batchDelete`(删块)。
2. **避免整篇覆盖**:整篇重建会丢图片、画板、评论。确需重排大量 block 时也用"先插新块 → 再删旧块"分步走,保住无关内容。
3. **资源块保真(R1)**:改写时原文里的 `<cite type="user">`(@人)、`<cite type="doc">`(@文档)、`<img>`、`<source>`、`<whiteboard>`、`<sheet>`、`<bitable>`、`<synced_reference>` 等行内组件和资源块**一律原样保留**(含所有 token / user-id / doc-id 属性),不许替换成纯文本姓名、链接或占位符。
4. **不可直接编辑(R4)**:`<whiteboard>`/`<sheet>`/`<bitable>`/`<synced_reference>` 的**内部内容** docx 工具改不了——改画板内部图形见 SKILL.md §6(复杂画板 MCP 缺工具);改表格单元格走 `bitable_v1_*`(多维表)或 Sheets(白名单外,如实告知);同步块去源文档改。

## 工作流程

### 第一波 — 分析 + 画板意图识别(串行)

1. **选择读取范围(省上下文的关键)**:用 `docx_v1_documentBlock_list`(取 block id)局部读目标节,不要全量拉。
   - 只改某节 / 文档大 → 先读 outline/目录,再局部读该节。
   - 大输出可能超 token → 落盘到 tool-results 文件后用脚本切片解析。
   - ⚠️ 要数图 / 确认嵌入,走 block API 按 `block_type==27`(image)数,别用 `docs_v1_content_get` 的 markdown(会吞掉 image/whiteboard 块)。
2. **系统评估**:结构清晰度,并对照 [`lark-doc-style.md`](lark-doc-style.md) 五「丰富度自检」逐项核对(富 block 密度 / 元素多样性 / 连续纯文本 / 每节非纯文本 / 开头 callout / 章节 `<hr/>` / 图数量底线)—— 阈值以该表为唯一权威。
3. **画板意图识别**:逐章节扫描,按 [`lark-doc-style.md`](lark-doc-style.md) 二「画板意图识别」表判断哪些段落适合用图表达,记录章节 block ID 及推荐图型。
4. 向用户简要说明改进计划(含识别出的画板机会);**≥ 3 处编辑或要改核心区域时**,先把"block_id → 动作 → before/after 摘要"列给用户确认(SKILL.md §5b)。

### 第二波 — 定向改写(并行 Agent)

5. Spawn Agent 在**不重叠**的章节上并行改进,各 Agent 收到 `document_id` 和特定 block ID(见 style-guide):
   - 开头按 §1.4 补蓝色概述 + 橙色 Context callout、重组引言(注意 callout 颜色 fetch 后会丢,要重新补色)。
   - 纯文本转为 `<grid>`/`<table>`/`<callout>`,用 `documentBlockDescendant_create` 整棵建容器。
   - **对第一波识别出的画板候选段落**:要图就渲染成 PNG 嵌 Image(27) 块(§6b),纯文本兜底用 ASCII `<code language="text">`;⛔ `<whiteboard type="mermaid">` 经飞书 API 拍平成纯文本、原生 Diagram(21) 不可建,如实告知飞书侧缺接口。
   - 改单块文本用 `documentBlock_patch`;插块用 `documentBlockChildren_create`(带 `index`;多处插入**先大 index 后小 index**);删旧块用 `documentBlockChildren_batchDelete`。
   - block API 里文本 `<` `>` `&` **无需转义**。

### 第三波 — 验证(串行)

6. 局部 `documentBlock_list` 获取更新后内容,重新检查样式指标。
7. **失败即停**:任意一批写操作失败 → 立即停下报 code/msg,不无脑重试;累计失败 ≥ 10 → 终止任务通知用户。未达标则定向修正,向用户呈现结果 + 文档链接。

## 块 ID 漂移注意(R6)

对某块整体替换 / 删除后,该块及其子块 block ID 会重新生成。后续若还要按 ID 操作,必须重新 `documentBlock_list` 拿新 ID,不能复用旧 ID。`block_id not found` / `revision_id mismatch` 多半是这个原因——重新局部 fetch,不要传旧 revision-id。

## Agent 子任务要求

Spawn Agent 时必须提供:`document_id`、章节范围(标题 / block ID)、`style-guide.md` + SKILL.md §1/§8 路径、具体要调的 `mcp__feishu__*` 工具和目标 block id。Agent 在自己章节内重新读取时优先局部 `documentBlock_list`,只拉自己的章节,不要重复拉全文。
