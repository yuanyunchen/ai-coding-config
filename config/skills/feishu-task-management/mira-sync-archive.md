# mira-sync 归档(已整体冻结 2026-07-03,Mira 同步流程停用)

> **本文件 = mira-sync 的全部存量**:上半 = 2026-07-01 归档的 §3.3 历史批次(约 06-16 → 06-25 已完成批次,逐字原序);下半 = 2026-07-03 冻结并入的原 `mira-sync.md` 全文(§1 资产映射 / §2 层级真相 / §3 协议 + 未输出活队列 / §4 衔接)。日后如需恢复 Mira 同步,从下半解冻;所有批次均**未经「迁移 Mira」输出流程清空**,原文在此。

> N4 已治理:被覆盖的旧条已折叠为最终态(callout-emoji / 表格列宽-表头 / 长宽比阈值 / DAG-ASCII 分工 各折叠为一条);5 条 C1–C5 保留。

- 删 9 个个人各域 skill(lark-base/sheets/im/calendar/task/wiki/drive/minutes/contact):与官方 `lark-*` skill 撞名且更旧(MCP 时代记法、reference 少 5–15 倍),各域操作改走官方 skill(`lark-cli skills read lark-<域>`)。字节租户/行为 gotcha(IM 232043 建群 / 发消息前二次确认 / Calendar 禁心算 + 主日历)抽入 feishu-task-management `memory.md` §15(1255002/`--as user`、gmail/1063001 已在 §13/exec-permission/lark-contact 官方 skill)。同步去行:入口 SKILL.md §2「飞书各业务域」表 → 改为指针、workspace CLAUDE.md(AGENTS.md 软链跟随)。§1 资产映射(line 90)保留为迁移历史。

- 重构 feishu-task-management 入口 SKILL.md 为两段:(1) 整体介绍(workspace 是什么 + 三层模型 + memory.md 必读 + mira-sync 协议)(2) 子技能目录(分组 + 一句话用途,按需路由,不预加载)。
- feishu-task-management frontmatter description 改强触发:任何飞书相关任务都必须先调用本 skill 再路由。
- memory.md 新增「个人规则」段:文档/文件默认=飞书 Drive doc、动手前先查「🤖 个人知识库索引(AI)」doc;temp 文档放 Drive `temp/`、用后清、只有长期价值才进索引、文档编辑默认原地改原文件;飞书工作准则(skills-first 并声明用了什么 skill / 找不到用 find-skills 装 / preflight 预检 / 检索带引用超链接);全局元规则引用(长任务用 long-task + 记 memory / 能直答不调工具 / 回复可读不暴露技术细节 / 记录保留情境·原因·行动)。
- (最终态·N4 折叠)callout `emoji_id`:**create 时经原始 REST 可设并正确渲染**(推翻旧「不可靠/正文前导 emoji」);value→glyph 反直觉映射 book→📖、open_book→💡、bulb→💡、pushpin→📌、paperclip→📎、memo→📝;纯 MCP `children_create` 落默认 🎁 且事后 patch 改不掉(须整块替换);正文不放前导 emoji。
- (最终态·N4 折叠)表格 `column_width`/`header_row` 持久性按 create 路径区分:原始 REST(或 descendant_create)一把带宽 + `header_row:true` → 整行浅灰底真表头持久渲染;MCP `children_create` 静默剥离两属性 → 退回裸建 + 逐列 `documentBlock_patch update_table_property{column_index,column_width}`(多列同批→1770001,须分次)+ 首行 `background_color:7` 近似(platform-limit 仅对 MCP 路径成立)。已 Chrome 实测列宽生效。
- gotchas 错误码与坑:`children_create` index 越界(>children 数)报 1770001;`insert_table_row{row_index:-1}` 给已建表加行、新 cell 须回读;`update_table_property` 未知字段 HTTP 200 静默丢弃→永远读回;保留纯 MCP 配置坑(`-t` 点号名 / token 不持久 / 1770032 / bot full_access 前置)与错误码速查表。
- gotchas de-bloat:callout/table/列宽/whiteboard/转义 五热点压成「现象+根因+→配方N」指针,单一权威恢复。
- 恢复 continue-learning「强制入口(最高优先级)」block +「作用域分层与升降级」section(适配 Claude Code/MCP,去 lark-cli/mira-platform 残留)。
- lark-doc-writer §0 内容/逻辑加固:§0.3 去 AI 化落到 substance + 不杜撰事实(并新增 ban-list:禁多余元解释/自我说明旁注,如「(一图带走)」「(如图所示)」「(详见下文)」);§0.5 加深度地基下限 + 渐进披露 prose + 推理链完整 prose + 操作化去冗余;§0.7 新增搜集与取材(覆盖性/可信度/综合非拼贴);§10 加去 AI 化 + 深度够/推理不跳步 + 合并两条重叠 inline 引用(10→9 项)。
- lark-doc-writer §1.3/§3/§8 de-bloat:列宽/表头/whiteboard/转义/嵌套各压成一句+指针。
- (最终态·N4 折叠)作图长宽比阈值单一权威定 dag-flow-diagram「布局与长宽比」(1.3–1.8 / 700×500 / F4 小图例外;700px 加限定语区分「表格列宽之和」vs「图片渲染宽度」,数值不变);mcp-recipes 配方3、SKILL §0.6、gotchas、ascii 宽度规则改指针。
- (最终态·N4 折叠)DAG/ASCII 作图分工消歧:DAG(mermaid→PNG,**默认渲染器 graphviz `dot`**,因 mermaid 嵌套 subgraph direction 失效、几乎过不了纵横比闸)= 框架/概念关系/全景/总结;ASCII(code)= 细节/公式逐步推导;学习文档据此=开篇 DAG 全景(≠结尾)→ 正文 ASCII 展开 → 结尾双收口(变量依赖 DAG + 全链 ASCII);与 ascii-strategy-diagram「公式链路 ASCII 首选」不矛盾;learning_doc.md/.xml 落地此结构,渲染尺寸提示(长宽比~1.3–2.2、2×)。
- doc-trio 新增 Step 4.5 逻辑完整性查漏(doc-type→perspective-templates 视角映射表);5 份 reference checklist 各引本类型视角码。
- doc-trio checklist_doc 升格 GOLD 骨架(依赖有序+依赖图+每块导读/学习路径/todo 真复选框/整合内容+分组表+覆盖 gaps+术语速查;零题材泄漏);learning_doc 加概念讲解型(from-knowledge)变体。
- doc-trio checklist_doc 节级 callout 由 `page_facing_up`(📄)/bg15 改为已验证 **`memo`(📝)/bg7/浅黄**(page_facing_up 未验证可能落 🎁);只用已验证 emoji map(book/memo/bookmark_tabs/paperclip/bulb/pushpin)。
- doc-trio 模板概述 callout emoji 由 📘 统一为 📖(checklist_doc.xml + learning_doc.md),与 block-API `book→📖` 契约一致。
- daily-report compile.md:小结末尾加「下一步/明日动作」槽;字数口径=流动散文 ~600–900 字(不含 callout/表格/bullet);归档优先级=用户显式路径 > 默认 Daily Report/WeekN。
- feishu-task-management/memory.md §6.2:temp 临时产物与「Drive 建文件夹默认位置」合并为一条(默认建/放 Drive `temp/`、不落根目录、用后清);lark-drive `file_createFolder` 处加指针。
- lark-doc-style C3 修正:删 [VERIFY-IN-M4] 标记,whiteboard 行改为已确认拍平→PNG/ASCII。
- (C1)删除陈旧权威 `knowledge/feishu-writing-rules.md`(内容已被 lark-doc-writer §0/§1 全覆盖);两处权威指针(feishu-task-management/SKILL.md、workspace CLAUDE.md)改指 lark-doc-writer。
- (C2)lark-doc-writer §1.4 开场 callout emoji:概述框 📘/📚→📖(book)、Context 框→📎/📌(paperclip/pushpin),对齐 mcp-recipes 配方1。
- (C3)daily-report 模板 daily_report.xml + compile.md 概述 callout 字形 📘→📖。
- (C4)daily-report compile.md 补 create-time-REST emoji_id 说明 + 一行指针指 mcp-recipes 配方1(纯 MCP 落默认 🎁、须 create 时 REST 设 book/bulb)。
- (C5)lark-doc-style.md 四处(:23/:34/:57/:65-66)`<whiteboard type=mermaid>` 首选处加内联「(本机落地: PNG/ASCII, 见 mcp-recipes)」标注,不改原文结构。
- 把 mira-sync 单文件活队列重构为 4 节单一权威(§1 资产映射吸收 MIGRATION-MAP/SPEC + §2 层级真相 + §3 同步流程·活队列 + §4 衔接);N4 折叠被覆盖旧条;旧 MIGRATION-MAP/SPEC 加 ARCHIVED 顶标、export_bundle 标旧快照、CLAUDE.md 权威指针改指本文件 §1。
- continue-learning 打 2 增量 + 1 默认修正(plan_v2 §3):新增「default-OFF 的 ASK-to-record 门」(缺省不写,仅祈使持久化意图 / 同类纠正≥2 次两信号触发固定问法);新增「分层落点速查表」(项目/能力域/跨项目/飞书 4 个 store,飞书专属落 feishu-task-management/memory.md);WHERE 决策塌缩为 2 桶(规则 behavioral→文本 / 记忆 facts→memory),4 板块仅作描述性标签;冲突处理改「覆盖 OR 留旧」二选一、删「并存」、并存须改写为条件分支规则;**核心修正**:核心原则 6「踩坑即记=自动写」改为同走 ASK 门(不再自动写,消解与「不自动」硬要求的冲突);同步修掉「日常轻量自动沉淀」与工作流的自动写措辞。保留「单一写入者 / 强制入口」不变。
- (plan_v2 §1.1)规则上浮指针:全局 `~/.claude/AGENTS.md` Rule 7 后新增「思维方式 / 通用写作」节,≤6 行摘要 6 条写作/推理通则(去 AI 化落 substance / 结论先行 / 渐进披露+推理链不跳步 / 深度地基下限 / 具体例·真实数字 / 取材综合非拼贴),末行回指 `lark-doc-writer §0`;只放摘要指针,不复制 §0 正文(§0 仍单一权威)。
- (plan_v2 §1.2 / N1)feishu-task-management 索引重标 generic:SKILL.md「流程/元」组改名「通用工具(非飞书专属)」(long-task-workflow / continue-learning / daily-report / choice-card);N1 计数改正为「20 个目录 = 16 Feishu + 4 generic」(frontend 创作退役并入全局 frontend-pipeline);workspace CLAUDE.md/AGENTS.md 同步(21→20、流程/元→通用工具)。
- (plan_v2 §4.1 N2)feishu-task-management/SKILL.md「注意」段 lark-cli/Mira 漂移防御注软化为「已全部迁移完毕(0 残留)」。
- (plan_v2 §1.3 / frontend_merge.md)frontend-design-pro 退役并入全局 frontend-pipeline:用工作区较新版 SKILL.md(8820B,含 §0 demo/§3 文本极简/§4 元素平衡/§5 默认项/§6 PERFECT IMAGES)覆盖 pipeline 内 `skills/frontend-design-pro/SKILL.md` 旧 5796B 版 + 拷入 `demo-recall-metrics.html` 模板;校验 SHA 一致后删除独立工作区 `WS/frontend-design-pro/`;三处悬挂指针(feishu-task-management/SKILL.md、workspace CLAUDE.md、AGENTS.md)改指全局 frontend-pipeline。§1.1/§2 映射表已注「→ frontend-pipeline (global)」,无需再改。
- (plan_v2 §4.1 R1–R4)冗余收口到单一权威 + 指针,正文不丢:R1 whiteboard 拍平事实权威定 mcp-recipes 执行覆盖层,lark-doc-writer §0.6/§1.3/§2-R8/§3/§6a、dag:23、lark-whiteboard:12/21、gotchas:92、4 个 doc-trio 模板(checklist/learning/meeting/ops)各全文重述改一行指针;R2 ASCII 行宽 72 列权威定 ascii-strategy-diagram,dag:13 改指针;R3 bot-协作者 / 1061004 / 1770032 前置权威定 lark-doc-writer §6b 步骤0,gotchas:61(保留 0→85→121 块实测佐证)+ mcp-recipes 配方2 改指针;R4 长宽比阈值(1.3–1.8/≤700×500/2×)权威定 dag「布局与长宽比」,§0.6/mcp-recipes 配方3/gotchas 三处删内联数字只留指针。
- (plan_v2 §4.1 R5)lark-doc-writer §5 消与 §2 R-表重叠:§5a 四情形规则改指 §2-R3(保留确认模板原文)、§5b 先 fetch/失败即停改指 §2-R6/R14(保留改动预演 + 分批 ≤5 独有)、§5e patch 不跨块改指 §2-R7/R10(保留 `<ul>` 无独立 block id 独有);§5c/§5d(拒绝清单表)/§8(已是纯指针节)为独有或更细权威,不动;§2 R-表权威正文未改,无信息丢失。export_bundle/README 已由前序模块标「旧快照」,确认无需再改。
- 全局 `~/.claude/AGENTS.md` 新增 Rule 8「Memory and Rule Updates — Tiered Approval」(置于 Rule 7 后、「思维方式 / 通用写作」节前):项目层记忆自动更新;skill 记忆 + 全局规则不自动,主动 ASK 批准(说明拟落层级)后才记;冲突询问覆盖 OR 留旧、禁并存;末行回指 `continue-learning §3`。同步把 continue-learning §3.1 ASK 门由「all writes default-OFF」细化为分层:项目层=自动(例外,跳门),skill+全局层=沿用 default-OFF 两信号 ASK 门;§3.2 落点表/§3.3 桶/§3.4 冲突→ask/§3.5 踩坑→ASK 全保留并对齐;扫 自动/缺省 无自相矛盾。
- 补 Rule 8 + continue-learning §3.1/工作流 Step 0 的「层级边界默认」澄清:判定层级有疑时默认按 skill/全局走 ASK 门,自动落项目层只限「明确仅本项目专属、不可能泛化」的内容;闭合「泛化规则首次于某项目出现被自标项目专属→auto 静默吞进自动层」的越界口子。
- (phase7)daily-report 修「记录日报」被误产飞书日报:入口 feishu-task-management/SKILL.md 日报行重写为双阶段钉死(记录→本地沉淀不发飞书 / 整理→compile 发飞书,触发必先 Read 子 SKILL 跑分流表);record.md 沉淀落点从 `~/files/daily-report-fragments/{date}/{HHMM}-*.md`(每任务一片段 + 强制 list-then-reread)改为 skill 目录每日单文件 `daily-report/records/{date}.md`(每天一个、append),顶部加红线护栏「阶段一绝不创建/发布飞书文档」并注明 records/ 为本地运行数据·非同步对象;record_fragment.md 模板改为每日文件里一条轻量条目。
- (phase7)daily-report compile.md 仅改阶段一记录的读取来源(`~/files/daily-report-fragments/{date}/` → `daily-report/records/{date}.md`),提炼/篇幅/给人看的逻辑不变。
- (phase7)daily-report SKILL.md「两阶段的关系」节阶段二 bullet 后补一行并行分发提示:整理阶段多任务的检索+归纳并行分发给子智能体(已有记录直读、缺失才派搜 context;指针 `references/compile.md` §1.1),让 dispatch 时即可见此效率规则,不必读完 compile.md 才知。
- (phase7)feishu-task-management/memory.md §6.1 新增飞书层规则:请求没说清楚 / 未指明具体文件时,先自己到「🤖 个人知识库索引(AI)」doc(token `Iw9jdKE3IoD2t1xMa9qucpz8s0c`)+ Drive 最近文件里找相关文档,不要来回问用户(与原 §6.1「先查索引 doc」同段、扩展为「underspecified 时先自查不反问」,非新建段)。
- (phase7)daily-report 整理阶段新增工作流规则,主要落 compile.md §1.1:多任务检索归纳分给多个子智能体**并行**;每个任务先查 record 有无该记录(有则直读),没有才派子智能体搜 context+memory;没指定 context 时默认自查不反问;子智能体回传必带依据的 context 文件(标题+链接)。record.md Step 2 + checklist 强化「Context 文件必讲清」(原 Rule 4 阶段一侧)。§二回读处 + §七 checklist 各补一条对应项。
- (phase7)daily-report 新增 `references/retrieval-guide.md`(检索单一权威):定位某任务飞书文档的标准路径——KB 索引「🤖 个人知识库索引(AI)」(token `Iw9jdKE3IoD2t1xMa9qucpz8s0c`,useUAT)「新增项」段第一入口 → `docx_builtin_search`(中文关键词,useUAT,docs_types=["doc"])交叉核对+补未收录 → 逐篇 `docx_v1_document_rawContent`(useUAT)读全文;两步检索必 useUAT=true,drive_v1_file_list 通常不必。compile.md §1.1/§二、record.md Step 2 一行指针指向它(指南正文只此一处)。
- (phase8)doc-trio 触发/路由修复:本次「构建 embedding 全链路学习体系」(结构化飞书素材 + 多篇)该用 doc-trio 而没触发——根因两处描述都以「零碎素材整理」开篇定调,对「结构化素材 / 多篇 / 学习体系」的写作任务不触发,且 feishu-task-management 索引那句太窄、人工路由时被当成「素材清洗工具」略过。改:① doc-trio/SKILL.md `description` 由「把零碎素材整理成五类」改为「写五类飞书文档的判型 + 骨架 + 完整性查漏入口」,显式声明「写这五类任何一类前都先走、不论素材零碎还是已结构化、单篇还是多篇/整套学习体系」+ 补触发词(系统讲解/学习体系/给新人讲清某套系统)+ 点出 Step4.5 视角查漏;② feishu-task-management/SKILL.md「写文档/内容」表 doc-trio 行同口径重写(写学习文档/onboarding/算法·系统讲解/学习体系前先走它取骨架,写作通则再走 lark-doc-writer)。两处只改 description/索引口径,正文骨架/流程未动。
- (phase8)lark-doc-writer §0.2 加「图密度硬闸」bullet(强化既有「多做图」,非重写):学习/长文档禁「1 张 PNG + 大段文字」,每个 多阶段流程/演进/对比/决策流/公式推导 配一张图、首选 ASCII 代码块,长 bullet 转表/图;给可执行自检线(某节连续正文 >~10 行无图无表 / 整篇内联图 < 主要流程数 → 判图少字多回去加图瘦身)+ 回指 §0.6 learning 图结构 + ASCII ≤72 列。诱因:本次 embedding 学习体系所有文档「图太少字太多」,§0.2/§0.6 原已有「多做图/ASCII 首选」但被欠应用,故补一条强制自检闸。
- (phase8)全局 `~/.claude/AGENTS.md` 新增 **Rule 9「Subagent Dispatch — Full Context + Mandated Skills」**(置 Rule 8 后、思维方式节前):派子智能体须给完整上下文(任务/目标/验收标准/输入路径)+ **硬性点名必须 invoke 的 skill**(非「可参考」);点明子智能体不自动继承 AGENTS.md、不自动 invoke skill。诱因:本任务子智能体大多没真正 invoke 被点到的 skill(软提示 + 不继承全局规则所致),方法论靠内联 brief 才生效。
- (phase8)continue-learning 核心原则 1 强化:由「原样参照 / 不扩写」补全为「**不简化也不过分拓展,表达用户意思就行**」——加「不要过度简化到失真」并与原则 3「简单优先」调和(简单 = 删冗余背景,不 = 砍用户意思)。诱因:用户要求补「记录规则」的元原则里缺的「不简化」半边。
- (phase8 规则系统重组,用 write-agent-file skill 改 AGENTS)用户要求"规则分层 + 拆元规则"。**AGENTS.md 重构为四层**(L1 执行准则[R1-4] / L2 工具与委派[R5 浏览器·R6 子智能体] / L3 输出与沟通[R7 无emoji·R8 信号非细节·思维方式] / L4 元规则[R9 规则改法·R10 持续学习]),相关规则归同层、各条正文 verbatim 未改。**Rule 6 子智能体调用扩写**(用户原话:复杂且独立才用·省主上下文·分解并行·核心规则文件默认传入·上下文以引用文件非重复·复用先写 md 再分发·定义任务/目标/标准/可衡量成功·**需用 skills 清单**·飞书技能按文件路径 Read 非 Skill(X))。**L4 拆两套**:R9 规则改法(最小改动/简洁不简化/冲突=覆盖OR留旧/主动征同意/分层归属)、R10 持续学习(原 Rule 8 分层审批并入;**主动询问移入此处**:发现冲突或可泛化模式→下一条消息顺带问、不单独回复)。上轮薄 Rule 9 + 原则1 不简化已并入。**continue-learning** 加「两套元规则总纲」(A 改法↔R9 / B 持续学习↔R10,标明先 B 后 A)+ 主动询问段 + 修过期引用(Rule 8→R10、R7→R8)。**feishu-task-management** §2 加注:飞书子技能不在 Skill() 注册表、只能按文件路径 Read,派子智能体须给 SKILL.md 路径、勿写 Skill(X)。诱因:实测子智能体不继承 AGENTS、不自动 invoke skill,且飞书 skill 不在其 Skill 加载列表 → 这次写作子智能体改用"给文件路径 Read"派发。**已对抗式审查(verifier):意图 1-8 全落实、L1-L3 verbatim;FAIL→修 HIGH(主动询问补硬边界=不构成额外询问入口)+ MED(Rule 9 与总纲改「引用带全称/锚名」根治重编号悬挂)→ PASS**。唯一 BLOCKER = daily-report/records/2026-06-16.md 历史快照里「Rule 8 分层审批」悬挂(非同步本地数据、对其日期正确,按快照豁免不改,靠「引用带全称」根治未来)。
- (phase8 执行复盘沉淀,经 continue-learning + write-agent-file;已对抗复核 PASS-with-fixes,必修全修)把 embedding 学习体系这轮的方法/标准/模版/踩坑沉淀进 skill:**doc-trio** `references/learning_doc.md` 强化(双收口 / 开局概览·结尾细化 / 每节双图 / 降文字-逻辑用图 / 文字只做解释·Q&A·概念解读 结构标准 + 数字来源分级 + Step4.5 必做)+ 新建 `templates/learning_doc_board.xml`(7 篇范本骨架,标开篇导览·每节双图·结尾双收口 图位)+ Step3 登记;**lark-doc-writer** §0.2(逻辑用图/双收口/每节双图,接驳图密度硬闸)+ §0.3(数字来源分级 A/B/C/D)+ §7.5(复杂/多文档写作编排:rebrief→并行 per-doc/per-图 子智能体→视觉+内容双审查→落地→核验)+ §10(跨篇数字对账)+ 新建 `references/media-embed.md`(媒体嵌图 canonical 管线)+ §6b 瘦为指针;**dag-flow-diagram**(hero 风格规范 + 开篇导览/结尾总收口 DAG 范式 + SVG→PNG headless-Chrome+Hiragino 渲染配方)+ **ascii-strategy-diagram**(DAG/ASCII 分工 + ASCII 角色);**feishu-doc-gotchas** 入 4 坑(import 字面替换 / 弯引号 patch 序列化 / childrenCreate 拒批量·有序块→1770001 / 图片块无移动 API→1770013);**continue-learning** §规则改法补「改完对抗复核」。单一权威经 grep 核:长宽比闸只在 dag-flow、ASCII≤72 只在 ascii、图密度硬闸只在 §0.2、嵌图序列只在 media-embed。诱因:复盘发现子智能体没真用 skill / doc-trio 被绕过 / 图分多轮补 / 数字晚错 / 飞书坑反复踩 —— 沉淀以求下次一次做对。

- (周会note)新增 doc-trio 第 6 类文档 **周会整理(weekly_review)**:把一次周会拓展成三段式(知识总结=只记我不会·别人讲的 / 待办清单=总览图+分主题 checklist+图+相关 context / 路线图=全量任务分 P0–P2+图)。新建 `doc-trio/templates/weekly_review_doc.md`(骨架 + 6 条专属硬规则:知识只记不会的·标题名词短语无自述后缀·材料自取·每段配图·SVG→Chrome2x 渲染且嵌前必看·可读性平衡);`doc-trio/SKILL.md` 分流表 + meeting-vs-weekly 注 + Step2/3/5 登记。**feishu-task-management/memory.md** 补两条:§3「有设计感图走 SVG→headless-Chrome-2x、嵌前必 Read 看再嵌(盲嵌必裁切)」、§6.3「材料自取:列依赖前先搜知识库/Drive,自己能找到的挂链接不列『等 X 给』」。诱因:2026-06-17 周会 note 拓展实战(知识总结该只记我不会的、标题别带「—— 李奕带着推」、原以为要找李奕的材料其实都能自己搜到)。

- (浏览器默认)feishu-task-management/memory.md §8 第 1 步补:Chrome 插件 `select_browser` 默认选「浏览器1(bytedance)」(用户已配置),不必每次问,只有它没连上才停下。同步撤掉全局 memory `browser-chrome-plugin-pref.md` 里同条,避免一事两处(浏览器实例选择归飞书域单一存放)。

- (日报呈现目标)daily-report `references/compile.md` §〇「结构 ↔ 自然文字的平衡」加一行呈现目标(默认照此)= **要点化 · 结构化 · 平衡语言 · 可读**:每节默认「一句点题(自然语言)+ 短要点 bullet」,要点用完整自然短句、不写电报式碎词也不糊成密集长段,扫读友好;原有三条 bullet 作为落地。最小改动、不另立新节(§四要点3 已回指 §〇),不与既有「结构化但不琐碎」并存。诱因:2026-06-17 日报实战——首版过 prose-密、压一版又过电报式,定位到「平衡语言 + 要点化」需在 compile 里显式钉成默认呈现目标。

- (2026-06-24 写文档强制力再强化)承接 phase8(本会话又复发:建 D2/D3 时绕过 lark-doc-writer/doc-trio、走 `docs +create` markdown 导入 → 无开头 DAG、无结尾图、图太少 AI 味)。① **feishu-task-management/SKILL.md (1)** 新增置顶硬规约「⭐ 写飞书文档=强制调用链」:任何写/改飞书文档(含方案/分析/总结/报告等**非 doc-trio 五类**)**必须**先调 lark-doc-writer §0 通则(可读性/密度/去AI味/多作图:开头必有 DAG、结尾必有图)+ 属五类的先 doc-trio + 执行走 lark-cli;**明令禁止 `docs +create` markdown 导入或自定义 recipe 替代写作通则**;派子智能体须把 lark-doc-writer(+doc-trio)SKILL.md 路径写进 prompt 让其 Read 遵守。② **(2) 写文档表** lark-doc-writer/doc-trio 两行「先读/先走」→「【必须】调用」。③ **lark-doc-writer §0.2** 把「开头 DAG + 结尾收口图」从 learning 标配**泛化**为所有含框架/多阶段/演进/对比/体系结构的文档(方案/分析/报告/长文)通则、短小事务性可免。诊断=前者(skill 内容本就完整:可读性/密度/去AI/作图原则齐全),只强化强制力 + 泛化 bookend 规则,skill 正文未重写。用户 2026-06-24 显式要求。

- (2026-06-24 文档开头格式统一)用户给范例 docx `ErwadUO2yogZBHxC9pGuT0hXs5c`,要求所有飞书文档开头按它统一。**lark-doc-writer §1.4** 由「light-blue/light-orange + 📖 / 📎📌」改为**精确范例格式**:蓝概述框 `rgb(240,244,255)/rgb(130,167,252) 📘`(第一行粗体一句话总览 + `<ul>` 分板块要点·关键词加粗)+ 橙 Context 框 `rgb(255,245,235)/rgb(255,186,107) 💡`(`<b>Context</b>` + 来源 link + 一句话简介,多则概括);加红线「⛔ 不要自创 N 字段执行坐标表替代标准 callout」(诱因:本会话 D1 增强自创「8 字段 context 表」偏离统一规范、且文档缺标准蓝概述框)+「执行细节放正文不塞开头」。**待办**:把现有 8 学习文档 + D2/D3 开头回标准格式(移除 8 字段表 → 加 📘 概述 + 💡 Context)。
- (2026-06-24 开头格式细化 + 套用模版 + 完成上条待办)承接上条「文档开头格式统一」。**lark-doc-writer §1.4** 三轮细化:蓝概述框由「一句粗体总览 + 要点」改为「**一小段自然语言概述 → 精简要点(关键词加粗、别太多)→ 相关文档**」;**相关文档**(同主题/配套:核心版→完整版、学习→操作、兄弟篇)归**概述框**、不进 Context,且**只列体系内自己写的篇**(带 📖);**橙 Context 框收窄为「只放写本文直接用到的原始材料/依据」**;§1.4 末加**可直接套用模版 XML**(带回 fetch 丢失的颜色 rgb 值 + 线上范例指针 入口 `HYsidfVKPobRumxr5HVuzbRJsy4`)。**完成上条待办**:8 学习文档恢复 **📖 标题前缀**(phase8 误删——飞书标题 📖 是 §0.1 标准前缀、非违反去 emoji,已纠正);入口 + 全部 9 篇开头回标准(移除自创 8 字段表 → 蓝概述 + 橙 Context)。诱因:用户给范例 docx `ErwadUO…` + 三轮细化要求(概述自然段 + 相关文档归概述 + Context 只放依据 + 相关文档限体系内带 📖)。
- (2026-06-24 三类 DAG 落 dag 模版 · 每次必读)**dag-flow-diagram** 新增 **3 个落地模版** + SKILL.md 顶部「⭐ 开篇 / 定位 / 收口图 · 每次必读」指针(覆盖三类)+ 三段结构拆解:**范例三 开篇全景总控图**(`templates/panorama_overview.svg` + PNG,entry 体系总控图:6 阶段主链 + 程序 A/B 路线对照 + SID 远期侧栏 + hero 配色 + 当前位置高亮 + footer)、**范例五 板块定位图**(`templates/locator_b2.png`,B2 全链路定位 + 高亮本段 + 本段 I/O,= §「开篇导览 DAG」落地例)、**范例四 全文结尾总收口 DAG**(`templates/closing_summary_b1.png`,B1 全文逻辑总图、比正文更全,= §「结尾总收口 DAG」落地例)。补上 §「学习文档两个 DAG 范式」原只有文字描述、缺落地范例的空缺。诱因:用户分三次要求把入口全景图 / B1 总收口图 / B2 定位图沉淀进 dag skill 模版、每次必读。
- (2026-06-24 删除 choice-card)全局 `~/.claude/skills/choice-card/` 物理删除(用户要求)。清理活动路由引用:feishu-task-management/SKILL.md(子技能根目录行 + §通用工具迁移说明 + 删技能表 choice-card 行)+ §2 层级真相表 choice-card 行(标已删除)+ workspace CLAUDE.md/AGENTS.md 通用工具行(标「已删除 2026-06-24」);历史快照(timeline 日记 / 项目 memory / 本 §3.3 旧 P0-relocate 条)不改。
- (2026-06-24 数据/代码平台权限 + Drive/cite/浏览器踩坑)**feishu-task-management/memory.md** 新增 **§14**(travel emb 项目实测):Hive 表读权限 = Coral 数据地图(TikTok-ROW 切 SG 区 `dataleap-sg`)→ Triton 数据安全门户(一单批量多表 / **Table 级**默认 Column 要手切 / 审批流 本人→上级→表 owner;PACS 同流);代码仓 = 自助「click to apply」→ Kani(L3-秘密 / 上级+资源管理员);FC 特征 / 模型 PSM 非自助 → owner 跨业务授权编目。**Drive/doc 坑**:shortcut 不能 `files move`(用「目标建 shortcut + 删原」)、`<whiteboard type=svg>` 不渲染复杂 SVG(改 PNG+media-insert)、`--doc-format text` 1.0.56 不支持(用 markdown)、妙记 minute 不可建 Drive shortcut、**`<cite>` 卡片 title 过时缓存(re-resolve 也中旧)须显式写死 title**。**浏览器**:deviceId 随重连漂移(按 id 选非 name)、SG 登录态按浏览器 profile、绝不代输账密。诱因:用户「记录」。
- (2026-06-25 data-analysis-report 改 docx-only · 不产 HTML)用户要求:产出文档(含数据分析报告)用**飞书 docx**,**不维护 HTML**(HTML 在飞书 Preview 不跑 JS 图 + 维护重)。**data-analysis-report/SKILL.md** 改:description 删「可选 HTML 双版」、编排引用去掉 analytical-report/bytedance-internal-hosting + 加 chart-gen;§4 = 飞书 docx-only(图表 `chart-gen` 渲 SVG→PNG→`lark-doc-writer` media-insert),⛔ 明令不产 HTML + **模版不引用 analytical-report 的 core.html/full.html 双版**(方法论可借鉴、产物只出 docx);§5 删 HTML 托管/Goofy/Preview(docx 原生即分享链接);§0 两份必读模版本就是飞书 docx,保留。`lark-doc-writer/references/doc-types.md`+`perspective-templates.md` 经查只把「数据分析报告」当文档类型/给视角、未引用 HTML,不改。
- (日报跨天去重)feishu-daily-report `references/compile.md` §一 收集来源加第 4 条「前几天的日报(跨天去重基准)」:整理前先扫最近几天已发日报(`Daily Report/WeekN/` 拉 outline + 必要 section 局部读),当日去重——今天条目与前几天重复的不再列,同一主线延续只点今天新进展、不复述旧的;§七 checklist 加「跨天去重」一项。既有 §四「去冗余」只管单篇内去重,本条补的是跨天维度,不冲突。诱因:用户要求「之后每次整理时看一下前几天日报、当日去重」。
- (日报先查日期)feishu-daily-report `references/compile.md` §一 加「第 0 步 · 先确定今天是哪天(必做)」:整理前先跑 `date +%F` 拿真实当天,**绝不从 record 文件名 / 对话提到的日期 / 产出文件假设**;标题与归档周都用真实日期;record 日期与真实今天不符(补写/记录滞后)时停下与用户确认目标日期。§七 checklist 加「先查日期」项。诱因:2026-06-23 实战——agent 从 06-17 的 record 文件名假设「今天=06-17」,把日报错标成 06-17,用户纠正「今天是 23 号」。
- (日报凌晨算前一天)feishu-daily-report `references/compile.md` 第 0 步 + §七 checklist 加「凌晨算前一天」:跑 `date +"%F %H:%M"`,若现在是凌晨(约 00:00–05:59)则日报日期取前一天(`date -v-1d +%F`),凌晨产出的 record 落在次日日历日期的文件里、整理前一天日报时也扫一眼次日文件的凌晨条目。诱因:用户「凌晨算前一天」;实战中 06-23 00:39 的 record 实属 06-22 工作日,且已有 06-22 日报 → 该条凌晨工作并入 06-22 报告(非另起 06-23)。
- (日报节↔任务一一对应)feishu-daily-report `references/compile.md` §四 分节铁律加首条 + §七 checklist 加一项:**一节 = record 的一个 `## 任务条目`,一一对应**;别把一件任务的子步骤拆成多节(报告重组/修维恩/产物归组同属一件分析收尾→一节),record 每个条目都必须出现、不漏整件任务,子细节下沉 cite 不立节铺表。诱因:06-22 报告把一条 record 任务(Search vs Pixel 收尾)拆成 一二三 三节、又整块漏掉「元系统/harness 重构」任务、还把维恩口径表铺成一节——根因在 compile(record 三条任务条目本身清晰),compile 缺「节↔任务条目」映射规则。

- (记忆优先)feishu-task-management/SKILL.md 接入 `feishu-memory` 知识库:§1 新增「`feishu-memory` 知识库先查(记忆优先)」段——做飞书/广告算法任务前先 `~/feishu-memory/bin/bm tool search-notes`(或 MCP `mcp__basic-memory__search_notes`,project=feishu-memory)查 `~/feishu-memory`(453 事实/8 域,bge 中文语义)的平台/指标/实验/机制/历史决策,命中直接用+核 `source.quote` 时效、免重复研究,拿不准的字节背景先搜它再外求;与本技能 `memory.md`(=飞书执行踩坑)区分清楚(`feishu-memory`=工作知识),互补、都先查;派子智能体做字节工作时 prompt 里点名让它先查。description 同步加一句「做飞书/广告算法任务前先查 feishu-memory(记忆优先)」。**范围限飞书 skill**(用户选定,不动全局 AGENTS.md)。诱因:用户要把"每次任务默认先取相关记忆、有问题先内部记忆系统搜索"同步进飞书 skill。

- (P0 relocate,2026-06-22)`long-task-workflow` / `continue-learning` / `choice-card` 三个通用工具从 workspace `.claude/skills/` **物理搬到全局 `~/.claude/skills/`**(record/memory-management 收尾系统前置:全局 `Skill()` 可调,修 `continue-learning`「强制入口」在非飞书目录的悬挂引用)。已更新 feishu-task-management/SKILL.md §2 通用工具表 + workspace CLAUDE.md/AGENTS.md 技能行(标「已搬全局」);`daily-report` 暂留 workspace(P1 拆 `memory-management`/time + `feishu-daily-report`)。

- (P1 split,2026-06-22)`daily-report` 拆分:**记录(阶段一)并入全局 `memory-management`/time 子模块**(record_fragment 模板已复制到 `memory-management/templates/`、历史 records 06-16/17 迁 `…/memory/timeline-records/`);**整理(阶段二)→ 新建 `feishu-daily-report` skill**(本工作区,含 compile.md + retrieval-guide.md + daily_report.xml;compile.md 读 record 路径已改指 `…/memory/timeline-records/{date}.md`);`daily-report` SKILL.md 改为退役指针。feishu-task-management §2 通用工具表已更(daily-report 标退役 + 增 feishu-daily-report 行)。
- 2026-06-22 新增飞书 skill `data-analysis-report`(数据分析端到端编排;已登 feishu-task-management §2 写文档/内容;references: skey.css + area-venn.js)。


---

# ============ 以下为 mira-sync.md 全文冻结归档(2026-07-03,用户指令) ============

> **冻结说明**:Mira 迁移已完结,双向同步流程停用;本节 = 原 `mira-sync.md` 全文逐字并入(§1 资产映射 / §2 层级真相 / §3 同步流程 + 未输出活队列 / §4 衔接)。日后如需恢复 Mira 同步,从本节解冻:§3.3 活队列原文在此,未经「迁移 Mira」输出。

# mira-sync — Mira↔CC 同步单一权威

> **执行层已迁官方 `lark-cli`、旧 `mcp__feishu__*` MCP 已退役(不再是执行路径)。** 本文件是 **Mira→CC 迁移台账**,记的是「Mira 资产去向哪个 live skill」——台账事实不变,**仍有效**。但凡资产行的「适配/理由」列写 `执行走 mcp__feishu__*` / `→ mcp__feishu__*` 的,均是**当年迁到 MCP 时的记录**:那一步把「Mira lark-cli」翻成了「MCP」,**现在 MCP 又退役、执行层落到官方 `lark-cli`**——读这些列时把执行端理解为「今官方 `lark-cli`(见同目录 `cli.md`)」即可,台账的「哪个 skill 承接哪个 Mira 资产」结论不受影响。
> **本文件 = 唯一 live 台账权威**(吸收式单一台账)。四节:§1 资产映射(静态权威)· §2 层级真相 · §3 同步流程 + 活队列 · §4 静态↔活队列衔接。
> 旧散落副本已降级:`MIGRATION-MAP.md` / `_source/MIGRATION-SPEC.md` 顶部已标 `[ARCHIVED → live 权威见本文件 §1]`;`export_bundle/` 是迁移前旧快照,勿当现状。§3.3 历史批次(≤2026-06-25)已移同目录 `mira-sync-archive.md`(2026-07-01 归档)。
> **改飞书系统(改规则/改 skill)就在 §3.3 活队列追加一句** → 用户说「迁移 Mira」→ 助手原样输出 §3.3 → 然后**只清空 §3.3**(§1/§2 及 §3.1/§3.2 协议正文一律保留)。

---

## §1 Mira↔CC 资产映射表(权威)

吸收自 `MIGRATION-MAP.md`(资产去向)+ `_source/MIGRATION-SPEC.md`(执行层翻译 + 取舍)。**这是去向/live 路径的唯一现状台账**;旧两件已降级为存档。
工作区技能根:`/Users/yuanyunchen/Desktop/AI Workspace/feishu-mira-workspace/.claude/skills/`(下记 `WS/`;2026-06-23 工作区由 `~/Desktop/feishu-mira-workspace/` 迁此)。

### §1.1 9 个个人技能 → 全部迁入(去 Mira 化 + 精简)

| Mira 资产 | CC 处置 | live 路径 | 理由 / 适配 |
|---|---|---|---|
| ascii-strategy-diagram | 全迁 | `WS/ascii-strategy-diagram/` | 落飞书首选 `<code language="text">`(Code(14) 文本兜底);执行走 mcp__feishu__* |
| dag-flow-diagram | 全迁 | `WS/dag-flow-diagram/` | 首选渲 PNG 嵌 Image(27),无渲染器退 ASCII;`<whiteboard type=mermaid>` 经 MCP 被拍平、无可拖拽画板 |
| lark-doc-writer | 全迁(+并 easy-read 可读性 + 17 类识别) | `WS/lark-doc-writer/` | 平台层命令 → mcp__feishu__* `docx_*`;§0 写作规则唯一权威 |
| doc-trio | 全迁 | `WS/doc-trio/` | 发布步骤 → mcp__feishu__* |
| daily-report | 全迁 | `WS/daily-report/` | `chat_meta`/`lark-doc` → `date`/`docx_*` |
| long-task-workflow | 全迁 → 已搬全局(2026-06-22)→ 禁用(07-01)→ **✗ 已删除 2026-07-02**(最终备份在 tasks/task-workspace-fs-upgrade/.agent/files/_backups/;替代=全局 `task-workspace` v2) | —(已删除) | 远端 URL 回写 → mcp__feishu__*/本地 |
| continue-learning | 全迁 → 已搬全局(2026-06-22)→ **已归档 2026-07-03,替代 = harness-management** | `~/.claude/skills-archive/continue-learning/`(原 `WS/continue-learning/`) | `mira-memory-edit` → `~/.claude/.../memory/` 文件 |
| choice-card | 全迁 → 已搬全局(2026-06-22)→ **✗ 已删除(2026-06-24)** | —(原 `WS/choice-card/`,已删除) | OpenUI → 文本/AskUserQuestion 降级 |
| frontend-design-pro | 全迁(含 demo html)→ 已退役并入全局 | `~/.claude/skills/frontend-pipeline/skills/frontend-design-pro/`(原 `WS/frontend-design-pro/` 已删) | 基本无 Mira 依赖;**已退役并入 → frontend-pipeline (global)**,含 demo-recall-metrics.html |

### §1.2 31 个 Market 技能 → 分流(复刻/蒸馏 5 源 → 3 live 输出 / 11 lark-mcp 取代存档 / 12 归档 / 3 删)
> 计数口径:原文「31 market」= 复刻/蒸馏的 **5 个源技能**(svg-chart-gen + chart-builder + lark-doc + lark-whiteboard + easy-read-doc)+ 11 取代 + 12 归档 + 3 删 = 31。下表「复刻」行按 **3 个 live 输出**计(svg-chart-gen+chart-builder 合 1、lark-doc/lark-whiteboard/easy-read-doc 蒸馏并入),故 live-输出口径为 3+11+12+3=29;31 与 29 的差额仅是「源技能 vs 合并后输出」的计数基不同,无技能丢失。

**复刻 / 蒸馏(3 项进 live)**
| Mira 资产 | CC 处置 | live 路径 |
|---|---|---|
| svg-chart-gen + chart-builder | 合并为 chart-gen(去 2200 行飞书脚本,留纯 stdlib 渲染 + 图表类型/配色) | `WS/chart-gen/` |
| lark-doc(references) | 蒸馏进 feishu-doc-gotchas + lark-doc-writer 规则 | `WS/feishu-doc-gotchas/` + `WS/lark-doc-writer/` |
| lark-whiteboard(references) + easy-read-doc | whiteboard 蒸馏进 feishu-doc-gotchas;easy-read 可读性+17类并入 lark-doc-writer(`references/doc-types.md`+§0.5,**有意只并写作侧**,读/提取交互未迁) | `WS/whiteboard-design/`(原 lark-whiteboard,2026-07-01 改名)、`WS/lark-doc-writer/` |

**由 lark-mcp 取代(11 项,存档不激活)** — 飞书 API 命令行封装,能力已由 `mcp__feishu__*` 白名单覆盖:
lark-base · lark-sheets · lark-wiki · lark-im · im-chat-manager · lark-calendar · lark-contact · lark-drive · lark-task · lark-minutes · lark-shared
> 注:其中 9 域(base/sheets/im/calendar/task/wiki/drive/minutes/contact)在 live 有 mcp 薄封装 skill(`WS/lark-*/`),作方法论入口;封装的 cli 本体不迁。

**归档(12 项,依赖内部服务 / 与 Claude 内置或个人技能重复)**:aeolus-query · nl2data · people-leave(字节内部:风神/Hive/HR,无后端)· docx · pdf · slides(与 Claude 内置重复)· skill-creator(同)· frontend-design(与 frontend-design-pro 重复)· mira-openui(Mira GenUI 层)· mira-remote-browser(与 Claude-in-Chrome 重复)· mira-chat-organizer · mira-share-viewer(仅 Mira 内可用)

**删除(用户指定,未保留)**:grill-me · autopilot · ui-ux-design

### §1.3 执行层翻译(Mira lark-cli → MCP,一次性迁移记录)— 吸收自 MIGRATION-SPEC

> **执行层已再次迁移:MCP → 官方 `lark-cli`,旧 `mcp__feishu__*` MCP 已退役。** 下表是当年「Mira 平台 lark-cli → MCP」的一次性翻译记录,**现仅作迁移台账保留**;**今天的 live 执行层是官方 `lark-cli`**(`@larksuite/cli`,与 Mira 旧 lark-cli 无关),三层命令/鉴权/踩坑以同目录 `cli.md` 为唯一权威。读本表时:右列 `mcp__feishu__*` 工具名是死工具,对应的飞书后端能力/坑仍真实(同一后端),落地命令换成 `lark-cli`(`docx +shortcut` / `api ...`,`useUAT:true` ≈ `--as user`)。

平台层命令当年统一改写为 MCP 工具(已退役)。逐条对应(历史):

| Mira lark-cli | CC 执行层 `mcp__feishu__*`(已退役→今 `lark-cli`) | 关键坑(后端事实仍真;CLI 落地见 cli.md) |
|---|---|---|
| `docs +fetch` 读 | `docx_v1_document_get` / `documentBlock_list` / `docs_v1_content_get` | content_get 的 markdown **吞 image/whiteboard 块**,数图要走 block API(block_type==27) |
| `docs +create` 建 | `docx_v1_document_create`(可带 folder_token) | 用户 Drive 根/文件夹须 `useUAT:true`;title/folder_token 须嵌在 `data` 里 |
| `str_replace`/`block_replace` | `docx_v1_documentBlock_patch`(多块 `_batchUpdate`) | — |
| `block_insert_after`/`append` | `docx_v1_documentBlockChildren_create`(带 index) | **多处插入先大 index 后小 index** |
| 建嵌套树(callout/table/quote) | `documentBlockDescendant_create`(一次建整棵) | table 走 descendant 一棵树会 1770041 → 改裸 children_create 自动生 cell |
| `block_delete` | `documentBlockChildren_batchDelete` | — |
| md→块 | `docx_v1_document_convert` 或 `docx_builtin_import` | import 仅标准 md;mermaid 只成代码块、callout/lark-table XML 被拍平 |
| 搜文档 | `docx_builtin_search` | 仅 `useUAT:true` |
| 插图管线 | image 块(27)→ curl `medias/upload_all`(tenant)→ `documentBlock_patch` replace_image | `useUAT` 建的文档须先把 bot 加 full_access 协作者(否则 1061004/1770032) |
| Bitable | `bitable_v1_app_create`/`appTable_*`/`appTableRecord_*` | — |
| Sheets | **仅** `sheets_v3_spreadsheet_create` 在白名单 | 单元格读写/格式值操作不在白名单,需要时加 `-t`/`LARK_TOOLS` |
| IM | `im_v1_chat_*`/`chatMembers_*`/`message_*` | 读群消息需 `im:message.group_msg` |
| Wiki / Contact / Calendar / Minutes / Task / Drive | `wiki_v2_*` / `contact_v3_user_*` / `calendar_v4_*` / `minutes_v1_*`(只读) / `task_v2_task_create|patch` / `drive_v1_*` | 会议室预订 / 子任务 / 单元格等高级能力多在白名单外,如实标注 |
| 凭据 | `~/.config/lark-mcp/env` 的 APP_ID/APP_SECRET → tenant token;user 身份用 `useUAT:true` | — |

**必丢弃的 Mira 专有物**(出现即删):`scripts/lark-cli.sh`/`*.py`(CLI 实现,不迁脚本只迁方法论)· `{skill_path}` wrapper · `/opt/tiger/mira_nas/...{session_id}` · `--as bot` · Mira UAT 注入 · `/mira_mcp_server/...` · `--api-version v2` · `--doc-format xml` 的 lark-cli XML dialect(**方法论保留** → 改 MCP block API 表达)· OpenUI/remote-browser/share-viewer/chat-organizer 交互。
**必保留的方法论**(Mira 文档质量来源,务必完整):lark-doc 24 条 GLOBAL RULES · INTENT ROUTING 决策树 · create/update 工作流 · style 风格指南 · mermaid/plantuml 图库 · 硬规则(资源保真 / 精准手术优于全量覆盖 / 副本优先 / 失败即停 / 错误透明 / 画板用代码块不用截图)· 可读性方法(easy-read 文档分型 + 视角模板)。

### §1.4 记忆去向
- Mira global-memory 7 节:§1→continue-learning、§4→daily-report(技能);§2/§3/§5 原入 `knowledge/feishu-writing-rules.md`(**已 retire**,见 §3 活队列 C1)→ 现归 `lark-doc-writer §0/§1`;§6/§7 删(通用/一次性)。
- 飞书执行记忆现 live:`~/.claude/skills/feishu-task-management/memory.md`(第 4 个 store,独立于通用 auto-memory)。

---

## §2 层级真相(哪些 skill 在 全局 / skill / 飞书域)

依 plan_v2 Part 1 作用域三层判定结果(判定当时口径;表内已随后续变更加注现状)。generic 通用工具已全部搬全局/删除/禁用;**飞书域现存** = whiteboard + doc-trio + feishu-doc-gotchas + lark-doc-writer(9 lark-* 已于 2026-06-24 删除,改走官方 lark-* skill)。frontend-design-pro 已退役并入全局 `frontend-pipeline`,不再计入 workspace generic。

| skill | 层 / 域 | 备注 |
|---|---|---|
| choice-card | 通用工具(generic) | 0 行飞书耦合;已物理迁全局(2026-06-22)→ **已删除(2026-06-24,见 §3.3)** |
| continue-learning | 通用工具(generic) | 0 行;记忆机制锚 |
| ~~frontend-design-pro~~ | 已退役 → 全局 `frontend-pipeline` | 不再是 workspace 目录;子 skill `frontend-pipeline/skills/frontend-design-pro/` |
| long-task-workflow | 通用工具(generic)→ **✗ 已删除 2026-07-02** | 已搬全局(06-22)→禁用(07-01)→删除;备份在任务区;替代 = 全局 `task-workspace` v2 |
| daily-report | 通用工具(generic) | 30 行飞书耦合;阶段一通用 / 阶段二飞书 |
| lark-base / sheets / im / calendar / task / wiki / drive / minutes / contact(9) | 飞书域 → **已删除(2026-06-24)** | 原 `mcp__feishu__*` 薄封装;各域操作改走官方 lark-* skill(见 `mira-sync-archive.md` 首条) |
| whiteboard-design(原 lark-whiteboard,2026-07-01 改名) | 飞书域 | 图示设计方法论 |
| doc-trio | 飞书域 | 素材分型骨架 |
| feishu-doc-gotchas | 飞书域 | 踩坑 |
| lark-doc-writer(§0 + §1) | 飞书域 | §0 写作规则唯一权威 / §1 飞书 XML 硬规则 |
| ascii-strategy-diagram / dag-flow-diagram / chart-gen | skill 级(作图,飞书落地段在子节) | 本就 skill 级共享 |

> 数法(以 `ls -1d …/skills/*/ | wc -l` 实测为准):**10 dirs**(2026-07-01 实测)= 7 飞书域(whiteboard-design(原 lark-whiteboard) / doc-trio / feishu-doc-gotchas / lark-doc-writer / ascii-strategy-diagram / dag-flow-diagram / chart-gen)+ `data-analysis-report` + `feishu-daily-report` + `daily-report`(已拆分·指针)。旧记的「21」「20」「19」均已过时:三个 generic 搬全局(其中 choice-card 已删除、long-task-workflow 已禁用)、`frontend-design-pro` 退役并入全局 frontend-pipeline、9 个 lark-* 域 skill 2026-06-24 删除,故 19→10。强入口路由不变:涉飞书先触发 feishu-task-management。

---

## §3 同步流程 + 活队列(change-log)

### §3.1 CC→Mira(沿用现协议)
活队列(§3.3)逐条追加 →用户说「迁移 Mira」(或同义:同步 Mira / 把更改同步给 Mira)→ 助手把 **§3.3 队列原样输出**(供用户粘贴给 Mira)→ 然后**只清空 §3.3**,§1/§2 保留。

### §3.2 Mira→CC = 诚实手动流(Mira 无程序化导出)
**真实能力边界**:取出 Mira 内容本身 = **必须手动**(用户手抄 / 粘贴);拿到文本后 = **可自动**(diff / 翻译 / 登账)。流程标注 **manual-paste-in / auto-process**:
1. **触发(manual-paste-in)**:用户把 Mira 侧变更**粘贴进来**。
2. **diff(auto)**:助手对照 §1 的 live 路径,diff 粘贴内容 vs 当前 live skill。
3. **翻译(auto)**:差异项走「去 Mira 平台物(Mira lark-cli / `{skill_path}` / OpenUI / XML 平台概念)→ 官方 `lark-cli` 执行层翻译(见 `cli.md`;MCP 已退役,不再翻向 `mcp__feishu__*`)→ 保方法论」,应用到 live 路径。
4. **登账(auto)**:回写 §1 对应资产行 + 在 §3.3 活队列记一笔(双向留痕,见 §4)。

> 绝不存在「Mira 导出 zip / auto-export / server-side 调用导出」——那次迁移 zip 是一次性手动打包,非可重复接口。任何反向流措辞都以「粘贴进来」为唯一入口。

### §3.3 活队列(change-log,「迁移 Mira」时清空此小节)

> **历史批次已归档(2026-07-01,harness 修复 P1-5)**:2026-06-16 → 2026-06-25 的已完成批次(含 N4 折叠说明)整体逐字移入同目录 `mira-sync-archive.md`;这些批次未经「迁移 Mira」输出流程,需同步 Mira 时可从归档取。本节只留 含未完成事项的条目 + 最新批次。

- 执行层声明全域对齐 lark-cli(消除「skills 仍写执行走 mcp__feishu__* / 经 MCP」与入口「MCP 已退役、执行=官方 lark-cli」的冲突):workspace CLAUDE.md/AGENTS.md「飞书执行」节由「只走 lark-mcp」改为「走官方 lark-cli」;~30 个子技能(lark-doc-writer 全家 + lark-im/base/contact/calendar/task/minutes/wiki/drive/sheets/whiteboard + feishu-doc-gotchas/chart-gen/doc-trio/feishu-daily-report/dag-flow/ascii-strategy)头部执行声明 + frontmatter 执行声明 → 官方 lark-cli,每技能加一次性 legacy 说明(下文 mcp__feishu__* 形态仅作参数语义参考,执行以 lark-cli +shortcut --help/schema/skills read 为准);「经 MCP/本机 MCP」机制句归因改「经飞书 API(lark-cli)」并保留拍平/1770029/PNG 兜底结论;全局 long-task-workflow 协作项 lark-mcp→lark-cli。**未做(deeper 迁移,留活队列)**:recipe 表逐条 mcp__feishu__xxx({path,params,data}) 调用未改写、`~/.config/lark-mcp/env` 凭据与「白名单外→扩载 LARK_TOOLS/-t」注记(lark-cli 已全接口、扩载模型作废,现属误导)、feishu-doc-gotchas §「lark-mcp 配置/工具注册」节、mcp-recipes.md 的 MCP 工具 quirk 实测 —— 均由一次性 legacy 说明覆盖,待整体迁 lark-cli 命令时一并改。
- (2026-07-01 禁用 long-task-workflow)全局 `~/.claude/skills/long-task-workflow/` 按用户指令禁用(overhead 大、把任务文档拆散);SKILL.md 重命名为 `SKILL.md.disabled` 留存可恢复。引用同步:feishu-task-management/SKILL.md §2 通用工具表行标已禁用、memory.md §6.4 长任务行标已禁用、workspace CLAUDE.md(AGENTS.md 软链跟随)通用工具行标已禁用。任务文档组织已由「文档系统重构」落地的全局 `task-workspace` skill 替代(2026-07-01,见下条)。
- (2026-07-01 文档系统重构·执行落地)P0/P1 已执行:飞书根目录 21 件归位+4 完结任务夹入 Archive/(MVO1f2aB);Files/ 分层(学习资料 5 主题夹+会议纪要按月+个人信息=排除区);排查夹版本收敛;LLM Emb 夹重整(refs/agent 子夹);AI/Human 双索引全量重编+控制台 v2 日志重启;「平台」重命名为「📖 广告数据平台入口速查」。record/references/feishu-extras.md 加第 3 件收尾「新发布 doc 登 AI 索引」;memory.md §14 补 2 坑(文件夹不能 shortcut 99992402、游离 docx 1061002 只能 shortcut 引用);定时任务 doc-curation-daily 升 v2(写授权:只写 3 系统文档+move/shortcut/folder,永不删,个人信息排除)+ 新建 weekly-drive-curation(周一)。执行台账=~/Desktop/AI Workspace/doc-system-refactor/design/execution-ledger.md。
- (2026-07-01 文档系统重构·任务结构新权威)新建全局 skill `task-workspace`(`~/.claude/skills/task-workspace/`):任务文档双侧统一规范——飞书 `Task/<中文名>/`(根=交付 docx + context/ 核心输入 + refs/ 搜索所得 + agent/ 按需)、本地 `~/Desktop/AI Workspace/tasks/<kebab名>/`(memory.md 5 节 + context/ + work/ + deliverables/);中间过程/记忆永不上飞书;完结任务双侧归档(tasks/_archive/ 与飞书 Archive/)。**覆盖**(非并存)feishu-task-management `exec-workflow-internal.md` §6.2 旧 task/context/file 三件套(§6.2 已改为指向 task-workspace,「理解任务唯一入口」规则保留改述);SKILL.md §(0) 路由表「建任务文件夹」行 + §2 通用工具表已改指。经用户批准的重构方案(~/Desktop/AI Workspace/doc-system-refactor/proposal.html)。
- (2026-07-01 harness 审计修复·飞书域批量)经用户批准的全量修复落地(审计报告 ~/Desktop/AI Workspace/feishu-harness-audit-2026-07/,任务区 tasks/harness-remediation/):① feishu-task-management/SKILL.md 索引修正(10 目录实数/目录作用域注册声明/「已拆分」措辞统一/lark-doc-writer §0 位置提示/§6.4 已裁决注);② memory.md §0–§12 指针化(220→112 行,零丢失经对抗审查逐字核证)+§6.4 裁决(删「回复可读性」重复项,留 3 增量,改题「飞书域补充备忘」);③ references 补齐:exec-docstruct +3 条、exec-workflow-internal +1、exec-blocks 1061004 三步压指针(权威=exec-permission);④ cli.md §5 +2 坑(+fetch 用 --doc、错误 JSON 走 stderr);⑤ workspace 子技能 lark-whiteboard→**whiteboard-design** 改名+9 处交叉引用更新+lark-doc-style :63 官方/方法论消歧与 +whiteboard-update 能力更正;⑥ workspace CLAUDE.md 31→10 行指针化,根目录 10 项历史交付物入 _archive/2026-06-migration/;⑦ 本文件 §3.3 历史批次归档至 mira-sync-archive.md、§1/§2 现状加注;⑧ 定时任务:doc-curation-daily +索引对账/断供与积压提醒步,feishu-memory-daily +token/CLI 版本运维检查步;⑨ lark-cli 1.0.56→1.0.63、27 官方副本对账一致;⑩ lark-skill-maker 加 continue-learning 前置声明(注意:该文件为 lark-cli 托管官方副本,未来 `lark-cli update` 可能覆盖,届时需重补)。时间线 06-26→07-01 已补记(标「补记」)。

- (2026-07-02 task-workspace v2·工作区文件系统升级)经用户 R1–R6 多轮裁决 + plan 审查 + 三路终审落地(任务区 tasks/task-workspace-fs-upgrade/,设计稿 deliverables/agent-fs-spec-v4.html):① `task-workspace` 重写为家族根(薄路由 SKILL.md + references{spec/subagent-protocol/capability-layer} + templates×3 + scripts{scaffold/new-dispatch/tree-summary/lint});本地新任务结构 = **MEMORY.md 入口 + .agent/ 私有区(memory/note/task·subagent 派发留档·requirement 原文日志·files)+ context/ + deliverables/ + .claude/ 能力层**,存量老规范四件软切换维持;飞书 Task/<中文名> 双侧结构不变。② 新增三命令 skill(仅人调):workspace-init / workspace-recall / workspace-checkpoint(checkpoint 只管工作区内部含其飞书任务夹,不碰全局层)。③ **record skill 禁用**(SKILL.md.disabled 留档 + 路由 stub;时间/项目记忆不再随会话自动写);memory-management/feishu-task-management/data-analysis-report 等引用面已加注改指。④ doc-curation-daily 升 v2.1:+步骤 1.5 工作区 lint 巡检、record 断供告警改「工作区新鲜度」语义、AI 索引候选源补 Task/ 夹新增与工作区 MEMORY.md 台账。⑤ feishu-task-management SKILL.md :34/:95 与 exec-workflow-internal §6.2 改述为双规范。⑥ long-task-workflow 于 07-02 彻底删除(用户指令;01 先禁用,最终备份在任务区),SKILL.md §2 通用工具表行已改「已删除」。⑦ 同日 v2.1 修订:MEMORY.md 与能力层收进 .agent/(根仅 AGENTS/CLAUDE 指针),能力加载 = MEMORY.md 路由表 + 按需 Read 替代 harness 注册;feishu-task-management :34/:95 与 exec-workflow-internal §6.2 已随改。AGENTS.md 零改动(用户裁决)。
- (2026-07-01 skill 写法重构·飞书域)经用户批准方案(tasks/skill-refactor/deliverables/proposal.html)落地,内容只搬不改写、逐项行级零丢失比对:① lark-doc-writer 拆三层——SKILL.md 462→268 行(§0/§1/§9/§10 + 置顶场景路由表),新 references/exec-landing.md(原 §2–§6/§8 逐字迁出、§ 编号保留)+ references/orchestration.md(原 §7.5);② ascii-strategy-diagram 296→96 行,范例一/二迁 references/examples.md(214 行);③ dag-flow-diagram 222→137 行,范例一~五迁 references/examples.md(templates/ 相对路径随迁修正,范例三/四/五「必读」语义保留在路由表);④ feishu-doc-gotchas 110→106 行——退役 lark-mcp 配置节迁 references/legacy-mcp.md(存档),画板 DSL 8 条与 whiteboard-design/references 逐条核证后指针化(独有事实 2891001 补进 dsl-schema.md、gap≥40 补进 layout.md),顶部加按现象路由表;⑤ 跨 skill 指针直连修正 12 处(原 §6b→media-embed、§2-R18/§3→exec-landing,涉 gotchas/doc-trio/whiteboard-design/ascii/dag);⑥ description 触发预算瘦身:doc-trio 694→380、ascii 413→298 字符(触发词全保留)。全局侧(不登本账,记于全局记忆):7 条全局 skill description 瘦身、writing-rules 现状注、continue-learning 新增 references/skill-authoring.md 写法规范。

- (2026-07-02 skill 注册表整合·lark-* 收编)经 continue-learning 门 + 用户明确指示落地:27 个官方 `lark-*` skill 的全局注册 symlink(`~/.claude/skills/lark-*` → `~/.agents/skills/`)全部摘除,改为 feishu-task-management 的伪 skill——本目录新增软链 `subskills/` → `~/.agents/skills/`,SKILL.md §2「飞书各业务域」重写为 27 行路由表(伪 skill 名 + 管什么/边界),description 收编被摘 skill 的触发词(任务/待办、审批、考勤、OKR、邮件、通讯录、视频会议、画板、幻灯片、妙搭、事件监听等)并声明收编。上游 `~/.agents/skills/` 源文件零改动(lark-cli update 不受影响)。同批全局侧(不属本账,概要):writing-great-skills 并入 continue-learning/references、claude-md-improver 并入 write-agent-file(audit 模式)、record/writing-rules/hookify 命令归档 `~/.claude/skills-archive/`、skill-creator 插件禁用;SKILL.md 全局技能表两行随之更新。备份 tasks/skill-registry-cleanup/backup/。

§3.3 每条变更落到 §1 对应资产行,双向留痕:
- **CC→Mira**:改了哪个 live skill(§1 某行)→ §3.3 记一句;清空 §3.3 时 §1 行保留为现状台账。
- **Mira→CC**(§3.2 手动流第 4 步):翻译应用后,回写 §1 对应资产行的 live 路径/适配列,**并**在 §3.3 记一笔。
- 任一方向改动,§1(现状)与 §3.3(增量流水)必须同时更新,避免「映射表说一套、队列说另一套」的漂移。
