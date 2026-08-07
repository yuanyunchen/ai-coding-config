---
name: lark-doc-writer
description: 飞书文档写作总入口 + 排版/格式权威规则集 + 可读性方法。用：写任何飞书文档(学习笔记/操作指南/会议 note/方案/总结/长文档/checklist)前,先读本 skill 的 §0 General 写作规则(命名/格式/风格/可读性/作图选型),再按 §1 飞书原生组件与 XML 硬规则落地。通常与 doc-trio 配合 —— doc-trio 决定写哪类、写什么骨架,本 skill 决定写作通则与飞书 XML 怎么排。不用:纯聊天回复、不要求落到飞书的短答复、只读飞书文档不写。
---

# lark-doc-writer

飞书文档**写作总入口 + 排版/格式权威**。任何要落到飞书的文档,动手前先读 §0 General 写作规则,再读 §1 飞书 XML 硬规则。

> 分工:
> - **本 skill** = General 写作通则(命名/格式/风格/可读性/Callout/作图选型)+ 飞书 XML 排版权威 + 创建/改写 SOP + 全局护栏。写作规则的**唯一权威入口**。
> - `doc-trio` = 按类型分流(学习/操作/checklist/AI handoff)+ 各类型骨架与模版,引用本 skill §0、不另立冲突规则。
> - `feishu-doc-gotchas` = 飞书 API 工具签名不会告诉你的非显而易见陷阱速查(block ID 重生、颜色丢失、上传/导入坑)。

> **执行层走官方 `lark-cli`(`@larksuite/cli`;见 `feishu-task-management` 入口 + `cli.md` 的三层命令/鉴权/踩坑)。旧 `mcp__feishu__*` MCP 已退役,不再是执行路径。** 本 skill 给的是写作方法论 + 飞书结构规则 + 落地 SOP。**本机不存在 Mira 平台层的命令行 / scripts / `{skill_path}` wrapper**,任何带 `--api-version`、`/opt/tiger`、Mira UAT 的旧写法都是错的。
>
> 下文 `mcp__feishu__*`(`{path, params, data}` 形态)是退役 MCP 的旧记法,**仅作「动作 → 参数语义」参考**;实际执行用 `lark-cli` 对应命令,以 `lark-cli <域> +<shortcut> --help`、`lark-cli schema <service.resource>`、`lark-cli skills read lark-<域>` 为准(见 `cli.md`)。

> ⭐ **落地前必读 [`references/mcp-recipes.md`](references/mcp-recipes.md)**:写作规则是用 Mira XML 方言写的(`<whiteboard>`/`<img href>`/`[[标题]](url)`),但本机执行是 MCP block API(JSON)——超链接要写进 `text_element_style.link`、表格要逐 cell 建、mermaid 不渲染、块要按顺序就地建。**没有这些 JSON 配方,执行时必丢链接、不画表、图太少、块错位**(上一版测试稿的实际硬伤)。落完稿**必须**逐条过 §10 自检清单再交付。

---

## 场景路由(先定位再读,细节按需一跳)

| 阶段 / 场景 | 读什么 |
|---|---|
| 判型、选骨架(学习/操作/checklist/会议/handoff) | `doc-trio`(先判型再回本文件) |
| 写作与排版规则(每次必读) | 本文件 **§0 写作通则 + §1 XML 硬规则** |
| **技术数据链路正式交付**(表/任务/日更/下游/验收) | [`references/technical-data-pipeline-delivery.md`](references/technical-data-pipeline-delivery.md)(**必读金标准**；先回读线上 transcript，再看三张最终 PNG) |
| **动手落地**(建/改/删块、工具映射、R1–R19 全局护栏、编辑安全、插图路径、格式硬坑) | [`references/exec-landing.md`](references/exec-landing.md)(**必读**;原 §2–§6/§8 编号保留) |
| 落地 JSON 配方(块顺序/链接/表/图) | [`references/mcp-recipes.md`](references/mcp-recipes.md)(**最高执行权威**) |
| 插本地图 / 渲染 PNG 嵌入 | [`references/media-embed.md`](references/media-embed.md)(canonical 五步管线) |
| 多篇成体系 / 单篇多图并行 | [`references/orchestration.md`](references/orchestration.md)(原 §7.5) |
| XML 标签/颜色/转义权威 · 视觉样式权威 | [`references/lark-doc-xml.md`](references/lark-doc-xml.md) · [`references/lark-doc-style.md`](references/lark-doc-style.md) |
| 排错(错误码/格式异常) | `feishu-doc-gotchas` |
| 交付前 | 本文件 **§10 自检清单**(强制) |

---

## §0 General 写作规则(所有飞书文档通用,最高优先级)

### 0.1 命名规则(按目标读者区分,不按作者)

- **面向人阅读**的文档:前缀 `📖`(学习文档、操作指南、指标类、人看的索引/周报)。
- **面向 AI 接手**的文件:前缀 `🤖`(AI handoff、AI 索引、知识库状态文档)。
- **外部文档**:不加前缀。
- 命名体:`{前缀} {任务名}.{学习文档 / 操作指南 / checklist / AI handoff}`。
- 前缀表示**目标读者**,不是"谁写的";不要另起表格解释来源。

### 0.2 格式原则

- **多做图**:系统逻辑、链路、概念依赖优先用图(DAG / ASCII / 流程图)承载,文字只作辅助。
- **图密度硬闸(高发失败,落稿必自检)**:学习 / 长文档严禁"1 张 PNG + 大段文字"。每个 多阶段流程 / 演进 / 对比 / 决策流 / 公式推导 都应有合适的图或表承载,但**不按固定张数机械凑图**；新增视觉必须提供新信息。学习文档仍使用开篇 DAG + 正文 ASCII + 结尾双收口；技术数据链路交付使用“简化主图 + 必要分图 + 表格验收”，见专用金标准。
- **逻辑用图、文字只做解释(在图密度硬闸之上,定"谁讲逻辑")**:正文显著降低文字比重——流程 / 关系 / 公式 / 逐步逻辑一律由图承载,**文字只承担:解释图、Q&A、概念/术语解读、讲"为什么"**。一句话:图讲逻辑,文字讲解释。配套两条范式(learning 文档标配,§0.6 给口径,doc-trio learning_doc 给骨架):**① 每节两图配合**——正文每个核心逻辑用两图讲(典型 = 一张 DAG 关系/依赖/框架 + 一张 ASCII 细节/公式/逐步,或 概览图 + 展开图);**② 双收口**——开局一张框架导览 DAG(鸟瞰概览、定位),结尾一组细化总结(总结 DAG 纳入更多概念与关系 + 全链 ASCII 逐步完整逻辑)。开局=概览,结尾=展开细化的总结。
- **开头全景 / 收口图按文档类型使用**:含框架 / 多阶段 / 体系结构的文档开头应有一张全景图定框架。学习文档保留结尾双收口；技术交付若已有主图、分图和生产验收表，结尾不强制再复制一张总结图，只有能形成新综合关系时才画。短小事务文档可免。
- **可读性 + 美观**:版面平衡,装饰不喧宾夺主;同一屏不堆砌视觉元素。
- **控制文字量**:正文论述、操作步骤简洁,不堆砌。
- **结论先行**:图 / 表 / 数据出现前先一句话点明核心判断,不把归纳甩给读者从图里推。
- **避免冗余**:每个 section / 字段都要提供新信息;删掉泛泛贴士、常识、免责声明、重复总结、"相关问题"、通用提醒。不为"完整感"补字段。

### 0.3 风格规则(去 AI 化)

- **不写格式性 / 元说明介绍**:禁 "本文目标""接下来我们将""读完你能""如果你…""跟着步骤一步步做""我们来看一下""咱们"。
- **不写 AI 腔导语**:空泛排比、过度铺垫、自我说明段一律删。
- **标题不加括号补充语**:括号里的信息下沉到正文。标题用**名词短语**,不用句子。
- 语言像成熟工程师写的内部文档:自然、客观、不口语化。
- 不写口语化导读、不给读者元指令、不加"(AI 撰写)"这类括号标注。
- **禁多余元解释 / 自我说明旁注**:不写"(一图带走)""(如图所示)""(下面展开)""(详见下文)"这类指向版面自身的冗余旁注——直接自然叙述,图/表自己会说话,不替读者解说排版。
- **去 AI 化要落到 substance,不只 tone**(关键,易漏):tone 干净≠内容不空。凡一个结论会停在抽象层面,就**跟一个具体例子 / 一组真实取值 / 一个 worked case / 一个反例(X 而不是 Y)** 把它落地——空泛排比删掉,换成一个具体 case。一篇满是干净句子但全是抽象描述的文档仍是 AI slop。
- **substance 不杜撰(与 §10 链接反杜撰对称,作用于事实)**:数值 / 阈值 / 机制性因果论断必须有出处或确属通用原理;**拿不准就显式标注"(待确认)"或省略,绝不用一个"听起来对"的数字 / 因果填空**。编造一个事实比编造一个链接更难被发现、危害更大。
- **数字来源分级(把上一条的"拿不准"细分成四级,写作时心里给每个数字打标)**:**A 原文确证** = 取材原文白纸黑字,可直接作硬结论;**B 图源待复核** = 从图 / 表读出、口径或单位需复核,落稿前对图核一遍;**C 推断** = 由前提推算得来,标"(推断)"并写出推导;**D 待项目确认** = 无来源、需向项目 / owner 落实,标"(待确认)"或省略,**绝不当 A 用**。多文档协作时同一指标的级别要一致(跨篇对账见 §10)。

- **句式模板化(最难自查的一种 AI 味,2026-07-30 加)**:单看每段都通顺,连着读三段就露馅——因为**人不会用同一个句式讲十七件不同的事**。实测案例:17 条表说明全是「每天……。做法是……,再……,最后……。产出的是……」同一个骨架。**判据是连读三条**,不是单看一条。改的是节奏(长短句交替),不是信息。
- **另外四种同源毛病**:① **公式腔**——`每一天的数据 = 当天新入池商品的向量`,在文档里是精确,在正文里是生硬,正文用说的不用列的;② **机构口吻**——「本项目不知道 / 我们只是拿来用」,读者不认识「本项目」这个主语,换成「这张表谁在写,目前查不到」;③ **连接词单调**——`所以 / 要注意 / 做法是` 每句都插一个,自然的中文靠语序和语气衔接,能去掉不影响理解的就去掉;④ **把内部比喻当读者常识**——「它属于『贵而稳定的东西算一次存下来』的第一层」,引号里是我们讨论时的说法,要么讲清楚要么不说。
- **三条不许为「自然」牺牲的**:**准确**——限定词(「未发现反例」「未确认」「文档值」)一个都不许因为读着别扭而删;**具体**——自然 ≠ 笼统,「39 亿行」比「量很大」更自然,人讲事情就是给数的;**短**——改自然时容易越写越长,**改完字数不许增加**。
- **每段最好落到「这对你意味着什么」**:正面样板——「……最后同一个用户和同一个商品当天只留一条。**所以这张表只回答『看过没有』,不回答『看了几次』**」。最后一句不复述过程,而是告诉读者这件事对他的后果。

### 0.4 Callout 节制

- 高亮 callout(带背景色的框)**只用于**:开头概述、确有溯源需要的 Context、关键结论、易错警示、自测 / FAQ。
- 正文主体(概念讲解、流程叙述、表格)用普通 `<p>` / `<ul>` / 表格承载,**保留相当比例的无高亮基础内容**。
- 一屏内不堆叠多个高亮框;删掉只为"显得重点"而无新信息的框。

### 0.5 可读性方法(让生成的文档好读,不冗长)

AI 生成的飞书文档有**两个反向失败**:常见的是**格式规范但内容冗长**(逐字读成本高),另一个是**压过头变浅**(每条指标 / 格式都达标,却没讲清 why / 机制,读者看完仍要追问"为什么、凭什么")。下面的方法既往下压冗余,也设一条**深度地基**防止压浅;两头都要顾:

- **深度地基(下限,不只压字)**:讲到**合适的程度——既不浅到看不懂逻辑、也不深到冗长**(daily-report 验证过的平衡)。判定线:**读者读完一个核心结论仍要问"为什么 / 凭什么"就是不够**;每个核心结论 / 概念都要讲清**机制 / 依据,不止 what 还要 why**。压缩 ≠ 砍掉机制层。learning / checklist / ops 的内容深度都继承这条。
- **结论先行,可止于摘要**:文档/每节开头一句话点明核心判断与结论,让读者不读全文也能掌握全貌。
- **每节按渐进披露展开(prose,镜像图的"概述→展开")**:`<code>` / 图有"概述图→展开图"两层(§0.6);**正文同理**——每节先一句结论,再按 **主张 → 机制 / 原因 → 证据 / 例子 → 边界** 顺序展开,**不跳过机制层直接堆细节**,也不只甩一句结论不展开。标题层与正文层都先概览后细节。
- **推理链完整(prose,把图的"不跳步 / 无凭空变量"用于文字)**:ASCII / DAG 要求"每个变量有 sourced 来源、每个因变量由公式引导、不跳步"(§0.6 作图通则);**叙述同理**——每个结论都要能回溯到前文给出的前提或引用,**不让读者自己补推导步骤**(因果不断裂、不凭空冒出新变量 / 新结论)。"B 由 A 得出"就要把 A→B 这一步写出来。
- **先判信息结构再定版式**:同字段横向对比 → 表格;每条是独立对象 → 列表;先后顺序本身是重点 → 时间线/流程。不要上来套模板填字段、把对比信息写成密集长段。
- **要点化提炼**:核心要点用 bullet,每条提炼而非照搬,一句话讲清一个点;一节 bullet 不超过 5 条。
- **章节骨架清晰**:一级标题顺序应能让读者一眼看清文档骨架(背景 → 方案 → 风险 → 结论这类),标题名词短语、父子标题不语义重复。
- **每段提供新信息**:删除后不影响理解或决策的内容一律删;信息密度优先于"显得完整"。**操作化去冗余测试**(daily-report 实证清单):删掉自指式废话("下面来介绍""这是唯一的 X")、重复总结句、跨节重复的背景交代——同一信息只在最合适的一处讲。但去冗余服从上面的深度地基:删的是冗余,不是机制层。
- **块级可定位**:长文档用清晰的标题层级 + `<hr/>` 分节,让读者(和后续按块链接跳转的人)能快速定位想看的那部分。
- **「能看进去」是独立于「能看懂」的一条(2026-07-30 加)**:一份每句都读得懂、但读者第三屏就划走的文档,同样不合格。前面几条管理解难度,这条管**阅读动机**。做法:**每节开头一句话说明「这一节解决你什么问题」**,而不是直接进入内容——读者不会为了「完整」而读,只会为了「有用」而读。配合「结论先行」:读到判断就可以决定要不要继续读论据,这比让他读完才知道结论更尊重人。
- **降字数有优先级,别一上来就删内容(2026-07-30 加,实测正文 −42%)**:① **删重复**——同一事实在多节各说一遍的,留最靠前那处;② **搬进图**——结构性内容(谁喂给谁、几步、什么顺序)图比文字省,正文里复述图上已有信息的一律删;③ **折叠**——SQL、参数表、字段全集收进可展开区;④ **降精度**——外部读者不需要 `5,622,829`,「约 560 万」够了,**但会影响判断的数字(覆盖率、上限、保留期)不许降精度**;⑤ **最后才是删内容**,且只删「除了实现者谁都用不上」的。**跳过前四步直接删内容,是把可读性问题解成了信息损失。**
- **字数目标要按「读者可见正文」量,不按文件字符数**:实测教训——目标定在 35,000「字」,而产物 37,151 里有 19,179 是标记(链接 4,809、表格单元格外壳 8,112、`<code>` 1,625)。**按标记算的字数目标会逼人去砍必留内容,或者去砍不可见的属性换数字好看。**

> 写之前先**判文档类型 + 选提取视角**:见 [`references/doc-types.md`](references/doc-types.md)(17 类飞书文档识别)与 [`references/perspective-templates.md`](references/perspective-templates.md)(各类型该覆盖哪些角度)。写之前用它对照"这类文档读者最想看什么",避免漏掉关键板块、避免堆无关字段。

### 0.6 作图选型(作图能力统一收口)

写文档需要画图时按下面**作图选型矩阵**分流,产物落进飞书。**ASCII 是首选之一、不是兜底**——见下表「公式化多阶段链路」行。

| 场景 | 首选 | 落地形式(MCP 实测) |
|---|---|---|
| **公式化 / 多阶段策略·竞价·计费·排序·定价链路,或需等宽精确对齐、同名变量分身** | **`ascii-strategy-diagram`(ASCII)= 首选,不是兜底** | **ASCII 放进 `<code language="text">`(Code(14) 块)**;等宽渲染、随处可落地、可编辑、不会被压成竖条。走 XML 导入路径时 `< > &` 要转义,走 block API(JSON)无需转义。⚠️ **每行宽度 ≤ ~72 等宽列**:飞书代码块约 80 列就右切,过宽行加载时右侧被裁(visual_qa D1);长中文尾注(`>>> …`/`<-- …`)另起一行,详见 `ascii-strategy-diagram` |
| 流程 / 状态机 / 依赖 / 拓扑 | mermaid(`dag-flow-diagram`) | **渲染成 PNG → Image(27) 块(紧凑 LR 布局,见下)**;⚠️ 若是**纯线性短流**(`A→B→C`)→ 改用 **ASCII 更佳**(PNG 易被排成瘦高竖条);无渲染器时退 ASCII |
| 概念 / 变量依赖(自变量→公式→因变量) | mermaid DAG(`dag-flow-diagram`) | **渲染成 PNG → Image(27) 块**;无渲染器时退 ASCII `<code language="text">`。⛔ 不用 `<whiteboard type="mermaid">`(经飞书 API 拍平,机制见 mcp-recipes 执行覆盖层) |
| 同字段横向对比、参数表、现象-决策对照 | **真表格(不是图)** | markdown pipe 表格 或 HTML `<table>`(→ 原生 Table(31)),并按 [`references/exec-landing.md`](references/exec-landing.md) §8 逐列设可读列宽。⛔ 不用 `<lark-table>`(经飞书 API 拍平成纯文本) |
| 方案对比 / 优劣势 / Before vs After(两列) | 分栏 | `<grid>` 2 列分栏 |

> **DAG vs ASCII 分工(一句话定调,消歧"ASCII 首选")**:**DAG(mermaid→PNG)= 框架 / 概念关系 / 全景 / 总结**(高层鸟瞰、谁依赖谁、整体拓扑);**ASCII(`<code>`)= 细节 / 公式链路逐步展开**(逐阶段推导、同名变量换分身、局部细节)。两者不互斥而是**分层**:高层概念骨架交给 DAG,细节公式链路交给 ASCII。"ASCII 首选"指的是**公式化多阶段链路这一类**(它确实首选 ASCII、不是兜底),**不是**"所有图都先画 ASCII"——高层概念 / 框架 / 全景图仍首选 DAG,不要用 ASCII 当开篇全景。据此,**学习文档** = 开头一张 **DAG 全景**(概念/框架骨架)→ 正文 **ASCII 展开细节**(+ 就近 Q&A)→ 结尾 **DAG + 全链 ASCII 双收口**(变量依赖 DAG + 全链公式图);详见 `doc-trio/references/learning_doc.md`。
>
> **ASCII 是首选、必须真的被用上。** 一篇讲"公式驱动的多阶段链路"(竞价 / 计费 / 排序 / 定价 / 风控 / 出价调控)的文档,**应当至少包含一张 ASCII 策略图**(放进 `<code language="text">`)——它把逐阶段公式推导、同名变量分身讲得最清楚,且永不被压成竖条。**不要把所有图都做成 PNG**(过去的产出全做 PNG、ASCII 只当凑指标的添头,是要纠正的反模式)。
> **PNG 图必须紧凑、不能是瘦高竖条**:线性流默认 **LR(左右)不用 TD**;长链折多行;嵌图前过长宽比闸。**闸值(长宽比 / 尺寸 / 2× / 小图例外)= 唯一权威 [`dag-flow-diagram`「布局与长宽比」](../dag-flow-diagram/SKILL.md)**,落地 JSON 见 [`references/mcp-recipes.md`](references/mcp-recipes.md) 配方3。
> ⛔ 一律不用 `<whiteboard type="mermaid">`(本机经飞书 API 拍平,机制与替代见 mcp-recipes 执行覆盖层)。

> **画板意图识别(撰写/审查每段都要判断是否该用图)的 12 行信号词→图型完整映射,以 [`references/lark-doc-style.md`](references/lark-doc-style.md) 二「画板意图识别」为唯一权威**(恢复自 Mira 官方样式指南),本表只列高频五类。

> 图表语法库(可直接抄,执行无关):mermaid 见 [`references/mermaid/`](references/mermaid/)(flowchart / sequence / class / ER / state / gantt / pie / mindmap / timeline),plantuml 见 [`references/plantuml/`](references/plantuml/)(sequence / activity / class / state / usecase-component / mindmap + best-practices)。飞书 mermaid 用 `flowchart` 不用旧 `graph`;plantuml 仅支持 `componentStyle` / `ArrowHeadColor` 两个 skinparam。

作图通则:
- **无凭空变量**:每个自变量必须由有身份的外部对象(广告主定义 / 系统预测 / 调控模块 / 用户)供给;外部对象要画出来并注明身份。因变量必须由 自变量 + 公式 / 算法模块 引导,不跳步。
- **分层**:整体概述图藏细节(大 entity 讲阶段);其后必须跟一张**含全部核心概念、按公式引导**的详细展开图。模块图再展开局部。
- **对齐**:尽量垂直 / 水平布局、用直线;实线 / 虚线区分不同关系(如计费比虚线回灌 coef)。
- **完整闭环**:一张图体现完整系统逻辑,含支路、中间变量、评估指标,不让读者自己拼;回路用一句文字 / 虚线回指。
- **转义(高发坑)**:把图**以文本形式**写进 XML 导入路径时(尤其 `<code language="text">` ASCII 块),节点 / 边文字含 `<` `>` `&` 必须转义为 `&lt;` `&gt;` `&amp;`(高发:`p<20%`、`< 30%`、`eCPC <= rank_bid`)。`<br/>` 标签本身保留。漏转义飞书会从 `<` 处吞掉后续内容。渲染成 PNG 的路径、走 block API(JSON)的路径无需转义。

### 0.7 搜集与取材(search→organize→write 类任务)

需要先**搜知识库索引 / Drive / wiki / web**找资料、再组织成文档时(checklist 整合、调研、把散落资料汇总),写之前先把"取材"这步做扎实——找得全、找得准、融得拢:

- **覆盖性(找全)**:按 [`references/perspective-templates.md`](references/perspective-templates.md) 该文档类型的视角清单核对"**该讲的角度有没有都搜到**",缺角回去补搜,别用先搜到的一两份资料定全文边界。
- **取材可信度(找准)**:优先**权威 / 主源**(官方文档、原始平台文档、owner 口述),**注明时效**(旧版本 / 已废弃口径要标),**多源交叉**;**单一来源**支撑的关键结论要标注"(单一来源)",不当作定论。
- **综合而非拼贴(融得拢)**:同主题的多份资料要**融成一个连贯叙述**,不是逐份摘抄堆叠;矛盾口径按 §0 / doc-trio 的 source-conflict 规则取正确口径并标注分歧。
- **citation 反杜撰**:引用纪律见 §10(有 source 才 inline 引、纯知识不硬塞、绝不编造链接、宁缺毋伪);substance 反杜撰见 §0.3(数字 / 阈值 / 因果拿不准标"(待确认)"或省略)。

---

## §1 飞书排版硬规则(写飞书 XML 必守)

### 1.1 视觉

- 避免过多 emoji,整体克制。
- 平衡内容与视觉元素,装饰不喧宾夺主。
- 多用流程图、框架图展示结构 / 流程 / 关系。
- 正文论述、操作步骤保持简洁,不堆砌视觉元素。

### 1.2 操作指南类

- 包含一步一步的操作流程。
- 每个平台带相关链接。
- 排除现阶段无法完成的任务及有歧义的部分。

### 1.3 飞书原生组件

- 勾选项用 `<checkbox done="false">`,不用表格 + ☐。
- 颜色用语义化命名色 `light-green/light-yellow/light-red/light-blue/light-gray`(及 `light-orange`),不用数字背景色。**经 `lark-cli docs +create/+update --doc-format xml` 落地时只用命名色**(callout 填充 = `gray`/`light-{色}`/`medium-{色}`,border/text = 基础七色):§1.4 模板里的精确 `rgb(...)` 是 Mira 方言,CLI XML 路径不保证生效;2026-07-29 实测 `light-blue`+`blue`+📘 / `light-orange`+`orange`+💡 / `light-gray`+`gray`+📌 三套渲染正确。
- **草稿 / 未分享的文档不写 `<cite type="user">` @人,用纯文本姓名**(2026-07-29):@ 一落地就给真人发通知,写会议 note / 个人 note 时等于替用户提前打扰同事。要 @ 由用户明确确认后再补。改写他人已有文档时相反 —— 原文的 `<cite type="user">` 一律原样保留(`references/update-workflow.md` R1)。
- 表格用 markdown pipe 或 HTML `<table>`(→ 原生 Table(31)),⛔ 不用 `<lark-table>`(拍平)。**经 block API 落地必须裸建+回填、逐列设可读列宽** → 配方见 [`references/mcp-recipes.md`](references/mcp-recipes.md) 配方2(省掉则退回 100px 窄列、长中文竖排不可读)。
- 流程图 ⛔ 不用 `<whiteboard type="mermaid">`(经飞书 API 拍平,机制权威见 mcp-recipes 执行覆盖层):要图渲染成 PNG 嵌 Image(27),纯文本兜底 `<code language="text">` ASCII,**公式化多阶段链路首选 ASCII** → 选型见 §0.6、PNG 紧凑/长宽比闸见 `dag-flow-diagram`、落地 JSON 见 mcp-recipes 配方3。
- 文档开头用 callout front-load 结论。
- 章节间用 `<hr/>` 分隔。

> 完整 XML 标签速查(块级 / 容器 / **行内组件含 `<latex>`/`<time>`/`<figure>`/`<task>`/`<chat_card>`/`<bookmark>`** / 资源块 / **每属性颜色支持矩阵** / 转义 / 嵌套顺序)的 STYLE / intent 权威是 [`references/lark-doc-xml.md`](references/lark-doc-xml.md)(恢复自 Mira 官方 XML 规范)。视觉样式(元素选型 / 画板意图识别 / 颜色语义 / 排版 / 丰富度)的语义权威是 [`references/lark-doc-style.md`](references/lark-doc-style.md)。
>
> ⚠️ **执行权威 ≠ 样式权威。** 上两份恢复自 Mira gold,描述的是 Mira 渲染器的 XML 方言与视觉意图,**含本机飞书侧实现不了的构造**(`<whiteboard>`/`<lark-table>`/原生 Diagram)。**真正"能不能、怎么落地"以 [`references/mcp-recipes.md`](references/mcp-recipes.md) 开头的「执行覆盖层」为最高权威**——动手前先读它,**绝不盲目 emit 不被支持的 XML 期待渲染**(whiteboard→PNG/Image 或 ASCII code、lark-table→markdown-pipe/`<table>`、Diagram(21) 不可建)。[`references/style-guide.md`](references/style-guide.md) 做指引 + 本机 MCP 落地差异补充。

### 1.4 文档开头标准结构(强制)

先按文档类型选择开头合同，禁止把两种结构叠加：

- **技术数据链路正式交付**：只放蓝色概述框；范围、日期、口径、事件和纵向“相关文档”合并其中，不另建“项目范围与交付口径”，默认不放 Context。完整模板见 [`references/technical-data-pipeline-delivery.md`](references/technical-data-pipeline-delivery.md)。
- **学习 / 方案 / 分析等来源驱动文档**：蓝色概述框后放橙色 Context，前提是确有直接取材的原始材料需要审计。

两类文档的 callout 内容规则如下：
1. **蓝色概述框**(精确属性 `background-color="rgb(240,244,255)" border-color="rgb(130,167,252)" emoji="📘"`):
   - **先一小段自然语言概述**——`<p>` 用自然、清楚的话把「本文是什么、整体怎么落地」描述清楚(一小段、约 2-3 句,结论先行、去 AI 腔;**不是只甩一句粗体标语**)。
   - 再 `<ul><li>` **分板块要点**:每条一句话点明一个板块/环节,**板块关键词加粗**(如 `<b>上游</b>`/`<b>下游</b>`/`<b>召回</b>`/`<b>精排</b>`);**要点简洁、不用太多**——只列主干板块,不堆砌。
   - **末尾点「相关文档」(放概述里,不放 Context)**——指向同主题 / 配套的其他文档,如**核心版指向完整版、学习文档指向配套操作文档**、兄弟篇 / 跨团队同方向产出;link + 一句话,挑最相关的几条、简洁。
2. **橙色 Context 框（按上面的来源驱动条件使用）**(精确属性 `background-color="rgb(255,245,235)" border-color="rgb(255,186,107)" emoji="💡"`):
   - 标题 `<p><b>Context</b></p>`,再 `<ul><li>` 列**写本文直接用到的原始材料 / 依据**(本文基于、引用、取材的源文件),每条 = 可跳转 link(`<a href>` 或 `<cite type="doc">`)+ 破折号 + 一句话简介;只放溯源、不放结论。
   - **Context 只放「直接用到的原始材料」**;**「相关文档」(同主题其他文档)放概述里、不进 Context**(见上 1);正文也不单开「相关文档」节。
   - **内容多时只概括、不堆砌**(每条一句话),但**格式必须统一**。

> **`<title>` 之后不再重复一个同名 `<h1>`**(2026-07-29 实测):飞书页面顶部已把文档标题渲染成大标题,再来一个 h1 = 同一句话读两遍、还把开头概述压到折叠线以下。模板里的 `<h1>` 只在**标题与正文大标题确实不同**(如 title 带 📖 前缀+文件名、h1 是另一句主张)时才留;通常删掉、直接进蓝色概述框。
>
> ⛔ **不要自创开头结构变体**(如「N 字段执行坐标表」)替代对应 profile。执行细节(owner / 平台 / job / 状态 / 上下游表名)**放正文对应章节**,不塞进开头；技术交付只回答“讲什么 + 核心合同 + 相关文档”，来源驱动文档再补 Context。

**来源驱动文档可直接套用模版**(换内容不换骨架;颜色属性照抄——fetch 会丢色,见末尾 callout 颜色 gotcha;cite 锚文本留空让飞书回填真实标题)。技术数据链路交付只使用其中的蓝色概述框，并按金标准 reference 组织正文；cite 锚文本留空让飞书回填真实标题。线上范例 = 入口文档 `HYsidfVKPobRumxr5HVuzbRJsy4`(及范例 `ErwadUO2yogZBHxC9pGuT0hXs5c`):

```xml
<title>📖 {文档标题}</title>                          <!-- 学习/操作/索引类带 📖 前缀(§0.1) -->
<h1>{文档大标题}</h1>

<!-- ① 蓝概述框:一小段自然语言概述 → 精简要点 → 相关文档 -->
<callout background-color="rgb(240,244,255)" border-color="rgb(130,167,252)" emoji="📘">
  <p>{一小段 2-3 句自然语言概述:本文是什么、整体怎么落地;结论先行、去 AI 腔,不只甩粗体标语}</p>
  <ul>
    <li><b>{板块A}</b>：{一句话}。</li>
    <li><b>{板块B}</b>：{一句话}。</li>
    <li>……（只列主干板块,简洁不堆砌）</li>
  </ul>
  <p><b>相关文档</b></p>
  <ul>
    <li><cite doc-id="{token}" file-type="docx" type="doc"></cite> — {一句话:这篇是什么、为何相关}。</li>
    <li>……（同主题/配套的其他文档:核心版→完整版、学习→操作、兄弟篇;挑最相关的几条）</li>
  </ul>
</callout>

<!-- ② 橙 Context 框:只放写本文直接用到的原始材料/依据 -->
<callout background-color="rgb(255,245,235)" border-color="rgb(255,186,107)" emoji="💡">
  <p><b>Context</b></p>
  <ul>
    <li><cite doc-id="{token}" file-type="docx" type="doc"></cite> — {一句话:这份原始材料给了什么}。</li>
    <li>……（只放溯源/依据;相关文档不放这里,放概述）</li>
  </ul>
</callout>
```

### 1.5 会议 note 固定结构(写会议纪要 / 议程 / meet note 时强制)

会议 note 有一套经验收的**固定章节顺序**,不要 ad-hoc 编排。骨架与模板见 `doc-trio` 的 **meeting** 类型([`doc-trio/references/meeting_doc.md`](../doc-trio/references/meeting_doc.md) + `templates/meeting_doc.xml`);此处固化两条最易丢的硬规则:

- **固定 7 节顺序**:会议目标 callout(`🏁` 绿色)→ 当前进度 → 会议要拿到的 N 件事 → 会议节奏 → Checklist → 会后动作(`⚠️` 红色 callout)→ 结论存档表。
- **callout 内 key-value 用全角空格分隔**:`<p><b>会议目标</b>　{{…}}</p>`(全角空格 `　`,**不用冒号** "目标:xxx");勾选项用 `<checkbox done="false">`,不用表格 + ☐;标题名词短语、不加中文括号注释。

---

## §7 创建 / 改写 SOP(质量方法论)

写之前读对应工作流,它是 Mira 文档质量高的原因:

- **新建文档默认内网 L2 可读**：除非用户明确要求其他范围，Agent 创建的新飞书文档在正文与图片落地后、交付链接前，运行 feishu-task-management 根目录下的 `subskills/lark-doc/scripts/set_document_l2.py <文档 URL>`，把链接权限设为“ByteDance 内获得链接的人可查看”，同时保持外部访问和邀请外部协作者关闭；必须以脚本的 fresh readback `verified=true` 为完成依据。脚本只改这三个公开权限字段，不改评论、编辑、下载或已有协作者。

- **从零创作** → [`references/create-workflow.md`](references/create-workflow.md):Code-Act Loop(Plan→Execute→Observe→Iterate)、骨架先行、分段补正文、画板意图识别、丰富度自检。
- **改写 / 润色 / 重排版已有文档** → [`references/update-workflow.md`](references/update-workflow.md):精准手术优于全量覆盖、资源块保真、局部 fetch 省上下文、分波改写。
- **排版质量标准**(元素选型、颜色语义、丰富度自检指标、画板意图识别表)→ 样式语义权威 [`references/lark-doc-style.md`](references/lark-doc-style.md)(视觉)+ [`references/lark-doc-xml.md`](references/lark-doc-xml.md)(XML/颜色/转义);[`references/style-guide.md`](references/style-guide.md) 为指引 + MCP 落地差异。
- ⚠️ **执行权威**(能不能、怎么落地)→ [`references/mcp-recipes.md`](references/mcp-recipes.md) 开头的「执行覆盖层」**最高优先级**:上两份 gold 含本机实现不了的 Mira 构造(`<whiteboard>`/`<lark-table>`/Diagram(21)),落地一律以执行覆盖层为准,**绝不盲目 emit 不被支持的 XML**。

---

## §9 回报本次用到的 skill(强制,飞书域落地——根锚见 AGENTS.md Harness「Transparent attribution」/ harness-management)

用户看不到 skill 调用过程。落完文档后,在给用户的消息里**显式说明本轮用了哪些 skill**(如:lark-doc-writer + doc-trio),并附可验证信息(改动的文件名 / 飞书文档链接 / 版本号)。本节是跨 skill 通用元规则在飞书域的具体落地。

---

## §10 交付前自检清单(强制,逐条核对再交付)

落完飞书文档后,**`docx_v1_documentBlock_list` 回读一遍**,对照下面每一条;不达标就补。这是上一版测试稿失分的地方,务必挡住。

> **丰富度按文档类型判断，不机械凑图。** 学习文档继续参考 [`references/lark-doc-style.md`](references/lark-doc-style.md)；技术数据链路交付以“简化主图 + 必要分图 + 原生表格 + 折叠 SQL”是否覆盖核心信息结构为准。

- [ ] **块顺序正确**:末尾不是孤儿图/公式/段落;章节顺序与大纲一致;每个"图N(...)"caption 下方就是对应的图,不是空 caption(配方 0)。
- [ ] **引用都是可点链接,且来源型事实/数值就地 inline**:使用 Context 的来源驱动文档在开头列直接材料；技术交付把相关文档纵向放进蓝色概述，把表名链接 DataLeap、任务名链接 Dorado，不另建入口章节。凡有 source 的量化判断在使用处挂真实链接；无 source 不编造。
- [ ] **图够用且分层**:每张图承担明确问题；主图讲全景，分图讲计算收益或日更机制，不重复相同细节。学习文档按其图数量标准；技术交付按专用金标准，不为达到固定张数增加无信息图。
- [ ] **对比性内容上了表**:窗口 vs 方案、参数对照、现象-决策这类**用原生表格**(block_type 31),不是 bullet 堆(配方 2)。
- [ ] **丰富度 / 层级达标**:H1/H2/H3 大纲清晰，图后有自然解释，参数/对象/验收优先用短表；callout 节制。技术交付同时检查所有 SQL 为单层折叠、caption 含“SQL”、无附件和双重展开。
- [ ] **原图**:同租户可下载就复用原图;跨租户/禁下载则高质量重绘并标「(重绘)」,且**说明为何没用原图**(配方 5)。不假装复用、也不因此少配图。
- [ ] **去 AI 化(tone + substance)+ 不杜撰**:无"本文/接下来/我们来看"等 AI 腔;**关键概念有具体例子 / 真实数值 / worked case / 反例佐证,不是纯抽象排比**(§0.3);事实忠于源,数字/阈值/因果拿不准就标"(待确认)"或省略、不编(§0.3 / §10 链接规则)。
- [ ] **深度够 + 推理不跳步**:每个核心结论都讲清了 why / 机制(不止 what),读者不会读完仍追问"为什么/凭什么"(§0.5 深度地基);叙述每个结论能回溯到前文前提或引用,没有凭空冒出的变量/结论(§0.5 推理链)。
- [ ] **跨篇数字对账(多文档体系强制)**:同一指标在多篇文档里出现时,**口径 / 单位 / 数值 / 来源级别(§0.3 数字来源分级)一致**;不出现 A 篇标"原文确证"、B 篇当"推断"的级别打架,或同一阈值两篇取值不同。单篇可跳过。
- [ ] **文档名与开头 profile 正确**:需要读者前缀的文档带 📖/🤖；技术交付只有蓝概述，来源驱动文档才使用蓝概述 + 橙 Context。
- [ ] **按文档类型补做检查**:learning / ops / checklist / meeting / handoff 文档落稿前必过对应类型的 [`doc-trio/references/<type>_doc.md`](../doc-trio/references/) 末段 checklist——尤其 learning 必须确认**开篇主图为 DAG(§1.2,非 ASCII)+ 结尾双收口(总结 DAG + 全链 ASCII)**。

---

## References

- ⭐ [`references/exec-landing.md`](references/exec-landing.md) — **执行落地层(原 §2–§6/§8,编号保留)**:R1–R19 全局护栏、工具映射、决策树、编辑安全、插图路径、格式硬坑。动手改飞书前必读。
- [`references/orchestration.md`](references/orchestration.md) — 多文档/多图写作编排(原 §7.5)。

- ⭐ [`references/mcp-recipes.md`](references/mcp-recipes.md) — **把写作规则翻成 MCP block API 的 JSON 配方**(块顺序/带 link 的 callout/对比表/ASCII+PNG 图/层级/原图边界)。落地前必读。
- [`references/media-embed.md`](references/media-embed.md) — **媒体嵌图管线 canonical**(本地图 / 渲染 PNG → 飞书 Image 块):换 TAT → 加 bot full_access 协作者 → 建空 image 块 → curl `medias/upload_all`(parent_node=图块ID、extra.drive_route_token=文档ID)→ `replace_image` → 删 bot;附 CJK 弯引号 / childrenCreate 限制 / 图块无移动 API 等坑。与 exec-landing §6b 同源(§6b 给路径、本篇给完整序列)。
- [`references/lark-doc-style.md`](references/lark-doc-style.md) — **视觉样式唯一权威**(恢复自 Mira 官方):核心原则、元素选型、画板意图识别 12 行表、颜色语义、排版、丰富度自检
- [`references/lark-doc-xml.md`](references/lark-doc-xml.md) — **XML/颜色/转义/嵌套唯一权威**(恢复自 Mira 官方):标签速查、行内组件全表、每属性颜色矩阵、转义规则
- [`references/style-guide.md`](references/style-guide.md) — 上两份的指引 + 本机 MCP block API 落地差异补充
- [`references/create-workflow.md`](references/create-workflow.md) — 从零创作 SOP(Code-Act Loop,reconciled to MCP)
- [`references/update-workflow.md`](references/update-workflow.md) — 改写增强 SOP(精准手术,reconciled to MCP)
- [`references/doc-types.md`](references/doc-types.md) — 17 类飞书文档识别(写前判型)
- [`references/perspective-templates.md`](references/perspective-templates.md) — 各文档类型该覆盖的视角(写前对照)
- [`references/technical-data-pipeline-delivery.md`](references/technical-data-pipeline-delivery.md) — **技术数据链路正式交付金标准**：当前飞书 transcript、三张最终图、信息架构、引用、SQL 与三层验收
- [`references/mermaid/`](references/mermaid/) — mermaid 语法库(执行无关,可直接抄)
- [`references/plantuml/`](references/plantuml/) — plantuml 语法库(执行无关,可直接抄)
- 配套 skill:`feishu-doc-gotchas`(踩坑速查)、`doc-trio`(文档分型骨架)
