---
name: doc-trio
description: "写五类飞书文档前先走本 skill 判型取骨架:学习文档、操作指南(SOP)、checklist、会议 note、AI handoff。触发:写学习文档/背景文档/算法说明/系统讲解/onboarding/学习笔记/学习体系(→learning);操作文档/SOP/步步指导/复制实验流程/部署上线(→ops);学习清单/checklist/待学清单/学习路径(→checklist);会议 note/会议纪要/会议议程/对齐会/meet note(→meeting);AI handoff/AI context/给 AI 接手的文件(→handoff);或丢一堆 mentor quote/群聊/截图说「帮我整理成文档」。素材零碎或已结构化、单篇或成套皆适用。本 skill 只管判型与内容骨架;写作通则以 lark-doc-writer §0 为唯一权威。"
---

# doc-trio — 五类文档分流写作

> 一个 skill 管五类文档的写作风格、骨架、引用规则。先**判断目标类型**,再读对应 reference,最后基于 template 起稿。
>
> **写作通则(命名 📖/🤖、格式、去 AI 化风格、Callout 节制、可读性、作图选型、开头标准结构)以 `lark-doc-writer` §0 为唯一权威**,本 skill 不重复定义、不另立冲突规则;只管"写哪类、什么骨架"。落飞书的 XML 硬规则见 lark-doc-writer §1~§3。

## 文档类型 → 分流规则

| 用户语义 | 目标类型 | 触发关键词 |
|---|---|---|
| 讲清一个系统/算法/业务模块的"来龙去脉",给新人对上号 | **学习文档**(learning) | 背景文档 / 算法说明 / onboarding / 学习笔记 / 系统说明 / 技术分享底稿 |
| 按时序的 SOP,让接手者照做能跑通 | **操作指南**(ops) | 操作文档 / 步步指导 / SOP / 复制实验流程 / 部署指南 / 上线流程 |
| 把多份资料整合成有学习路径的待学清单 | **checklist**(checklist) | 学习清单 / checklist / 待学清单 / 学习路径 / 待学知识 |
| 一场会议的目标/进度/产出/节奏/待确认/会后动作/结论 | **会议 note**(meeting) | 会议 note / 会议纪要 / 会议议程 / meet note / 对齐会 / 周会纪要 / 评审记录 |
| 把一次**周会**整理成 知识总结 / 待办 / 路线图 三段(可执行、配图) | **周会整理**(weekly_review) | 周会整理 / 周会 note 拓展 / 周会复盘 / 拓展会议 note / 知识总结+待办+路线图 |
| 给后续 AI 接手任务用的全量原始 context | **AI handoff**(handoff) | AI handoff / AI context / 给 AI 接手 / 长任务上下文 / 跨会话恢复 |

> **checklist vs 操作指南**:操作指南是"照着做能跑通"的时序 SOP;checklist 是"按学习路径把多份资料学会"的待学清单。"复制实验流程/部署/上线"走 ops;"待学知识/学习路径"走 checklist。
>
> **会议 note vs 周会整理**:会议 note 是单场会议的目标/进度/产出/节奏/待确认/会后动作/结论(固定 7 节,会前议程 + 会后存档);周会整理是把一次周会**拓展成可执行、配图的三段式**(知识总结 / 待办清单 / 路线图),重在沉淀认知 + 排期。把周会"整理 / 拓展 / 复盘成完整 note"走 weekly_review;只要一份会议纪要 / 议程走 meeting。

模糊时**主动反问一句**确认目标类型,不要写到一半发现写错。用户明确说"多类都写"时,分别按各自规则各写一份,产出多个独立文档。

---

## 工作流(强制)

### Step 1 — 判定类型
读用户原话匹配上表关键词。若混合,先 ask 一句:"是要写学习文档(讲清原理给新人)、操作指南(按步骤照做)、checklist(按学习路径学多份资料)、会议 note(目标/进度/产出/节奏/待确认/结论),还是 AI handoff(给 AI 接手用)?"

### Step 2 — Read 对应 reference(必读)
| 类型 | 必读 reference |
|---|---|
| learning | `references/learning_doc.md` |
| ops | `references/ops_doc.md` |
| checklist | `references/checklist_doc.md` |
| meeting | `references/meeting_doc.md` |
| weekly_review | `templates/weekly_review_doc.md`(骨架 + 硬规则合一) |
| handoff | `references/ai_handoff.md` |

每篇 reference 含:结构骨架、风格规则、强制 checklist。不读直接动手 = 高概率漏规则。

### Step 3 — 复制 template 作起稿骨架
| 类型 | template 文件 | 复制目标 |
|---|---|---|
| learning(单篇算法实验) | `templates/learning_doc.xml` | 任务的 `_learning_body.xml`(或 `_background_body.xml`) |
| learning(成体系 / 多篇) | `templates/learning_doc_board.xml` | 每篇的 `_{篇名}_body.xml` |
| ops | `templates/ops_doc.xml` | 任务的 `_ops_body.xml` |
| checklist | `templates/checklist_doc.xml` | 任务的 `_checklist_body.xml` |
| meeting | `templates/meeting_doc.xml` | 任务的 `_meeting_body.xml` |
| weekly_review(周会三段式) | `templates/weekly_review_doc.md` | 任务的 `_weekly_review_body.md` |
| handoff | `templates/ai_handoff.md` | 任务根目录 `ai_context.md`(不放子目录) |

> learning / ops / meeting / checklist 各份 XML template 来自经验收的真实实例 —— 直接复制 → 替换业务专属内容(任务名、参数 key、模块名、会议产出),骨架 / 固定章节顺序 / mermaid 节点格式 / callout / table 样式**保留**。meeting 模板的章节顺序与全角空格 key-value 写法是硬约束,不调整。
> learning 有两份:`learning_doc.xml` 是**单篇算法实验**骨架(整体流程 → 定位 → 详解 → 调参 → 术语);`learning_doc_board.xml` 是**成体系 / 多篇**骨架(结论先行:定位 → 全链路位置+IO → 正文每节双图+就近 Q&A → 概念锚点 → 全文总收口),来自经内容+视觉双审的 7 篇 live 体系,图位标注了 开篇导览 DAG / 每节双图 / 结尾双收口 三处 + 读图要点位。讲透一整套系统选后者,单篇算法实验选前者(规则见 `references/learning_doc.md` §一)。
> checklist template 已升级为**经内容 QA 验收的 GOLD 骨架**(依赖关系图 + 每块 导读 / 学习路径 / todo / 整合内容 + 分组表 + 覆盖 gaps + 术语速查):知识块按依赖排序(地基 → 公共尺 → 并行分支 → 闭环),开篇先放依赖关系图;todo 用 `<checkbox>` 真复选框;术语口径分歧处取正确口径并注明,不留并存定义。

### Step 4 — 按规则填充内容
- 严格按对应 reference 的 checklist 自检。
- mermaid 流程图按节点三层视觉分层格式渲染,遵守 `learning_doc.md` §二 自顶向下分层(顶层无模块名 / 中层锚点 / 底层括注),不要简化掉。
- 所有事实 / 数值 / 步骤句末 `[[标题]](url)` inline 引用。

### Step 4.5 — 逻辑完整性查漏(对照视角清单,强制)

骨架管"章节齐不齐",视角清单管"**该讲的角度有没有讲、有没有逻辑缺口**"。落稿后按本类型对照 [`lark-doc-writer/references/perspective-templates.md`](../lark-doc-writer/references/perspective-templates.md) 的相关视角逐条问"我这篇讲清楚了没",缺角就补:

| doc-trio 类型 | 对照 perspective-templates 的视角(最接近类型) |
|---|---|
| **learning** | 培训/知识沉淀 **K1**(知识分层)**K2**(可复用模板/checklist);系统说明类补 系统架构 **A-T1~A-T3**(关键流程图文 / 模块职责边界 / 方案选型依据);单点实现类补 单点技术实现 **B-T1~B-T4**(执行顺序 / 数据结构状态 / 边界异常 / 前提假设) |
| **ops** | 单点技术实现 **B-T1**(执行顺序)**B-T3**(边界与异常场景);培训 **K2**(可直接复用的操作指引/checklist) |
| **checklist** | 培训/知识沉淀 **K1**(知识结构化分层)**K2**(可复用资源);通用兜底 **U2**(背景/问题定义)**U3**(关键术语定义) |
| **meeting** | 会议纪要 **M1**(决策事项有明确结论)**M2**(待办有人、有时间) |
| **handoff** | 通用兜底 **U1~U5** 全过(结论 / 背景 / 术语 / 下一步 / 关键附件)+ 按内容补技术类视角;handoff 以原料保真为先,视角只用来**查"原始 context 漏没漏"**,不为补视角而二次概括 |

> 用法:把上表对应行的视角当 checklist —— **每个视角问"这篇有没有讲清这个角度",有缺角回去补**(learning 漏了"方案选型依据"、meeting 漏了"待办没写责任人"这类逻辑缺口就在这一步抓出来)。这是骨架检查之外的第二道"内容齐、无逻辑缺口"闸。

### Step 5 — 命名与发布
**命名约定**(命名通则以 `lark-doc-writer` §0.1 为准,按目标读者区分前缀):
- **面向人阅读**(learning / ops / checklist / meeting / weekly_review):前缀 `📖`,标题 `📖 {任务名}.学习文档` / `📖 {任务名}.操作指南` / `📖 {任务名}.checklist` / `📖 {会议主题}.会议 note` / `📖 {我} × {对方} 周会 Note · {日期}`(weekly_review)。
- **面向 AI 接手**(handoff):前缀 `🤖`,标题 `🤖 {任务名}.AI handoff`。
- 本地文件:learning → `_learning_body.xml` / ops → `_ops_body.xml` / checklist → `_checklist_body.xml` / meeting → `_meeting_body.xml` / handoff → `ai_context.md`。

**发布**(执行层走官方 `lark-cli`,见 `feishu-task-management` 入口 + `cli.md`;旧 `mcp__feishu__*` MCP 已退役。下文 `docx_*` 旧 MCP 记法仅作参数语义参考,执行以 `lark-cli <域> +<shortcut> --help` / `schema` / `skills read` 为准,见 lark-doc-writer references/exec-landing.md §3):
- learning / ops / checklist / meeting:XML body → `docx_builtin_import` 整篇导入,或 `docx_v1_document_create` + `docx_v1_documentBlock_*` 落块。
- handoff:本地 `.md` + 飞书 doc 双轨,markdown body 导入(详见 `references/ai_handoff.md`)。

### Step 6 — 登记输出
所有类型文档的飞书 URL 登记到任务的输出文档清单,方便长任务恢复。

---

## 跨类型共用规则(四类都遵守)

> 命名、格式、去 AI 化、Callout、可读性、作图选型、开头标准结构以 `lark-doc-writer` §0 + §1.4 为唯一权威。本节只保留 doc-trio 专属的结构性约束。

### 开头标准结构(对齐 lark-doc-writer §1.4)
每篇文档最开始依次放蓝色概述框 + 橙色 Context 框(顺序固定)。doc-trio 补充:
- 概述框分要点说明各板块写了什么,**另补一句整体介绍**。
- Context 框列原始文件可跳转 link,**每个原始文件加一句简要介绍**(meet note / mentor 逐字稿 / 原始平台文档分别是什么)。
- **正文不再单开「相关文档」节**:源出处只在 Context callout + 正文 inline 引用里出现。

### 信息结构与密度(对人阅读的文档:learning / ops / checklist)
1. **先判信息结构,再定版式**:同字段横向对比 → 表格;每条是独立对象/候选 → 列表;先后顺序本身是理解重点 → 时间线/流程。不要上来套模板填字段。
2. **信息密度检查**:每个 section / 字段都要提供新信息,删除后不影响理解或决策的一律删。
3. **结论先行**:图表 / 表格 / 数据出现前先一句文字点明核心判断。
4. **去重标题**:父子章节标题不语义重复;无新增信息的标题精简掉。

### 引用规则
- 事实 / 数值 / 操作步骤 / 原文 quote 句末 inline 引用 `[[标题]](URL)`(放句号前)。
- 区分出处类型:mentor 逐字稿 / AI notes / 原始平台文档 / 配套自产文档。
- **source 矛盾处理**:信息缺失 → 先反馈让用户给 context。若 source 之间口径矛盾,结合自身知识取**正确口径**呈现,把矛盾点写出来并标注不同 source 引用,保证无歧义、不漏写、不瞎写。

### 措辞约束补充
- AI handoff 文件**不属于**"给人类看的文档",措辞约束放宽 —— verbatim 原始 quote 即使口语化也保留不动,见 `references/ai_handoff.md`。

### 互链规则
- 同任务多类文档并存,开头 callout 中互链(学习 → 操作 + checklist + handoff;handoff 在交付物表里列其余 URL)。

### 文件放置规则
- 新生成的文档**直接放任务文件夹根目录**,不创额外子文件夹。

---

## 反模式(常踩的坑)

- ❌ 用户说"写文档"就闷头写、没判断类型 → 写出来可能完全错位(SOP 套了学习文档骨架,或把 checklist 写成 ops)。
- ❌ 跳过 reference 直接照 template 改 → 漏掉 mermaid 三层分层 / inline 引用 / blocker callout 等强制规则。
- ❌ 在 doc-trio 里重复定义命名 / 格式 / 风格规则 → 这些以 lark-doc-writer §0 为唯一权威,doc-trio 只管骨架。
- ❌ 把 AI handoff 写得"像给人类看的文档" → 二次概括成业务白话,漏掉 mentor verbatim。
- ❌ 把 learning 文档的代码模块名 / DAG 节点名写在主叙述里 → 应降级到 §5.2"代码模块名(选读)"。
- ❌ ops 文档字段写"按需填写" / "看情况" → 必须给具体取值或决策表。
- ❌ checklist 把原始材料(原始文字记录 / 细节代码)直接堆进去 → checklist 只放整合后的学习路径,原始材料归 handoff / 原始素材目录。
- ❌ 文档之间不互链 → 同任务多类文档应在开头互相 link。

---

## 与其他 skill 的关系

- 本 skill **只管文档分类与内容骨架**,写作通则与飞书排版以 `lark-doc-writer` 为权威。发布飞书 doc 走官方 `lark-cli`(见 `feishu-task-management` 入口 + `cli.md`;旧 `mcp__feishu__*` MCP 已退役),用法见 lark-doc-writer references/exec-landing.md §3。
- 作图按 `lark-doc-writer` §0.6 作图选型分流(mermaid DAG / ASCII / 原生表格)。
