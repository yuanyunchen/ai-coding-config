# 从零创作工作流(reconciled to MCP)

用户提供主题、需求或简要说明,需要生成一份新的飞书文档时,遵循本工作流。执行层走官方 `lark-cli`(`@larksuite/cli`;见 `feishu-task-management` 入口 + `cli.md` 的三层命令/鉴权/踩坑),旧 `mcp__feishu__*` MCP 已退役,不再是执行路径。下文 `mcp__feishu__*` 是退役 MCP 的旧记法,**仅作「动作 → 参数语义」参考**;实际执行用 `lark-cli` 对应命令,以 `lark-cli <域> +<shortcut> --help`、`lark-cli schema <service.resource>`、`lark-cli skills read lark-<域>` 为准(见 `cli.md`)。

## 核心方法论 — Code-Act Loop

通过自适应的 **Code-Act Loop** 驱动文档创作,而非固定模板式的工作流。每次任务都循环执行:

1. **Plan(规划)** — 根据用户目标和文档当前状态,评估下一步该做什么
2. **Execute(执行)** — 调相应的 `lark-cli` 命令(下文 `mcp__feishu__*` 记法即对应动作的参数语义参考),或 spawn Agent 子任务并行推进
3. **Observe(观察)** — 检查工具返回,验证正确性,核查样式是否达标
4. **Iterate(迭代)** — 如需调整,回到 Plan 继续循环

循环在文档达到质量标准且满足用户需求时结束。不要试图一次性产出完美内容——迭代打磨效果更好。根据用户实际需求灵活决定文档结构和版块,而不是套用固定模板。

## 写之前

- **判文档类型**:对照 [`doc-types.md`](doc-types.md) 识别这是哪类文档(技术方案 / PRD / 复盘 / 会议纪要 …)。
- **选覆盖视角**:对照 [`perspective-templates.md`](perspective-templates.md) 看这类文档读者最想看哪些角度,据此定大纲、避免漏关键板块、避免堆无关字段。
- **读排版标准**:唯一权威 [`lark-doc-style.md`](lark-doc-style.md)(元素选型、颜色语义、丰富度自检、画板意图识别);[`style-guide.md`](style-guide.md) 为指引 + MCP 落地差异。
- **读 XML 标签 / 转义规则**:唯一权威 [`lark-doc-xml.md`](lark-doc-xml.md)(标签速查、颜色矩阵、转义、嵌套);叠加 SKILL.md §1 + §8 的本机注意点。

## 典型 Code-Act Loop 流程

### 第一波 — 规划与骨架(串行)

1. 分析用户需求:受众、目的、范围。
2. 设计大纲——每个 h1/h2 章节至少规划 1 个非纯文本 block(表 / callout / 图 / checklist)。
3. **只建骨架**:
   - `docx_v1_document_create` 建空文档(在用户 Drive 下建须 `useUAT:true`,可带 `folder_token`)。
   - 用 `docx_v1_documentBlockChildren_create` / `docx_v1_documentBlockDescendant_create` 写入:标题 + 开头两个 callout(蓝色概述 + 橙色 Context,见 SKILL.md §1.4)+ 各级标题 + 每节一句占位摘要。
   - ⚠️ **不要**一次性把完整章节内容塞进去。超长内容容易触发限制、难调试;完整内容留到第二波分段写入。
   - **整篇标准 markdown 一次成文**时可用 `docx_builtin_import`,但它会把 `<callout>`/`<lark-table>`/`<whiteboard>` **拍平成纯文本**、` ```mermaid ` 只成代码块 —— 表格用 markdown-pipe/`<table>`(→ Table(31)),彩色 callout 走 block API,图用 PNG→Image 或 ASCII code 块(经飞书 API 做不出可拖拽画板)。

### 第二波 — 内容撰写(并行 Agent)

4. Spawn Agent 并行撰写各章节。每个 Agent 需收到:
   - 文档 `document_id`、负责的章节范围(标题 block ID)、期望的 block 类型。
   - 本 skill 的 `style-guide.md` 路径 + SKILL.md §1/§8 路径(Agent 须先读)。
   - 写入方式:`docx_v1_documentBlockChildren_create`(带 `index`;多处插入**先大 index 后小 index**)或 `docx_v1_documentBlockDescendant_create`(callout/table 等容器整棵一次建)。
   - block API 里文本的 `<` `>` `&` **无需转义**(只有飞书 XML 导入路径才转义)。

### 第三波 — 整合审查 + 画板意图识别(串行)

5. `docx_v1_documentBlock_list`(取 block id)获取文档,审查整体效果。
6. 评估样式达标:对照 [`lark-doc-style.md`](lark-doc-style.md) 五「丰富度自检」逐项核对(富 block 密度 / 元素多样性 / 连续纯文本 / 每节非纯文本 / 开头双 callout / 章节 `<hr/>` / 图数量底线)—— **该表为唯一权威**,本工作流不重述阈值。
7. **画板意图识别**:逐章节扫描,按 style-guide「画板意图识别」表判断哪些段落适合用图表达,记录章节及推荐图型。

### 第四波 — 润色与图表(并行 Agent)

8. Spawn Agent 定向改进(结合 style-guide 润色):
   - **优先处理第三波识别出的画板需求**:要图就渲染成 PNG 嵌 Image(27) 块(§6b),纯文本兜底用 ASCII `<code language="text">`;⛔ `<whiteboard type="mermaid">` 经飞书 API 拍平成纯文本、原生 Diagram(21) 不可建,做不出可拖拽画板,如实告知。
   - 文字密集章节转为 `<table>`/`<grid>`/`<callout>`。
   - 主要章节间补 `<hr/>`。
   - 本地图片走 SKILL.md §6b 的 curl 上传管线;网络图直接 `<img href="https://...">`。

### 第五波 — 权限与交付(串行)

9. 除非用户明确指定其他分享范围，对 Agent 新建的飞书文档运行 feishu-task-management 根目录下的：
   `python3 scripts/set_document_l2.py <文档 URL>`。
   默认目标是“ByteDance 内获得链接的人可查看”，并关闭外部访问与邀请外部协作者。该脚本幂等，只改这三个字段，并在修改后重新读取公共权限；只有输出 `verified=true` 才能交付链接。
10. 再完成正文 block 回读与最终链接交付。若权限设置失败，保留文档并如实说明当前范围，不把未回读的权限描述为已生效。

## 长文 / 大内容

- 长文创作:`document_create` 只建骨架 → 分段 `documentBlockChildren_create` 追加,不要一次塞完。
- 本地大附件 / 图片走 §6b 管线,不要把 base64 塞进文本。
- Word / Excel / CSV → 飞书在线版:用 `drive_v1_importTask_create` 导入(更稳),不要靠复制粘贴重建。

## Agent 子任务要求

Spawn Agent 时必须提供:文档 `document_id`、章节范围(标题 / block ID)、`style-guide.md` + SKILL.md §1/§8 路径、具体要调的 `mcp__feishu__*` 工具和目标 block id。Agent 在自己章节内重新读取时用 `documentBlock_list` 局部范围,不要重复拉全文。
