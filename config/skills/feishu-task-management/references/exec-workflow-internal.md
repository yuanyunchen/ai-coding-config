# exec-workflow-internal:飞书工作总纲(架构 + 白名单 + 检索语义 + 任务结构 + 工作准则 + 内部求助阶梯/门户)

> 来源:原 `memory.md` §0(架构总览)+ §5(白名单边界)+ §6.1(飞书检索/文件语义)+ §6.2(个人知识库选择性存储)+ §6.3(飞书工作准则)+ §10(内部任务自主求助阶梯 + 关键门户)。逐字保真搬运。
> 取用场景:低频但需要时整段读的「做飞书任务的姿势与求助路径」——不是某个 API 坑。架构/白名单/检索语义/任务文件夹结构/工作准则/卡住去哪。
> **注**:原 §6.4「全局元规则」**不在本文**(疑与全局 AGENTS.md 重复/冲突,留 harness-management + 用户门裁决,见 SKILL §(0) 末注 + memory.md §6.4 原位)。已裁决(2026-07-01):与当时 Rule 7/8/10 重复条目删除,飞书域增量保留在 memory.md §6.4(现标「飞书域补充备忘」)。
> 边界:下面以旧 `mcp__feishu__*` / `LARK_TOOLS` 记述的白名单是**历史/能力地图事实**;官方 `lark-cli` 无白名单全可达,CLI 命令见同目录 `cli.md`。

## 0. 架构:技能在工作区,执行走官方 lark-cli
- 飞书技能集独立隔离在 `feishu-task-management` 技能内部(写文档/作图组在 `subskills-workspace/`、官方 lark-* 在 `subskills/`、任务域在 `subskills-local/`),由本 skill(同目录 SKILL.md)索引;**不做全局注册**,不与通用技能混。
- 真正读写云文档**默认走官方 `lark-cli`**(`@larksuite/cli`,见同目录 `cli.md`:三层命令 + 鉴权 + 自助发现 `schema`/`skills` + 踩坑表)。技能给规则/方法论,CLI 执行。**旧 `mcp__feishu__*` MCP 已退役**(正从 `.claude.json`/`.cursor`/`.codex` 移除),不再是执行路径——下面以 MCP 工具名记的坑当后端事实读,落地命令以 `cli.md` 为准。

## 5. 白名单边界(常用够,冷门需扩载)
- Sheets:仅 `spreadsheet_create`;单元格值读写/格式/区间操作工具不在白名单。
- Calendar:仅 list/primary/event_create/event_list;会议室预订/waitlist/freebusy/attendees 不在。
- Task:仅 create/patch;清单/子任务/评论/搜索不在。
- Contact:仅 batchGetId(邮箱/手机换ID)/user_get;**按姓名模糊搜人不在白名单**。
- 需要时(注:`~/.config/lark-mcp/env` 已随 MCP 退役删除,本条仅存历史口径):加 `LARK_TOOLS` 或改三处配置 `-t`(点号名)。
- (注:官方 `lark-cli` 无白名单,558 个一级接口全可达;以上白名单边界是 MCP 时代/能力地图参照,实际执行查 `cli.md`。)

## 6.1 飞书检索 / 文件语义(飞书域)
- **「文档」「文件」默认 = 飞书云盘(Drive)里的飞书 doc**,不是本地文件(除非用户明确说"本地文件/系统文件")。
- AI 查找/定位文件时,**先到「🤖 个人知识库索引(AI)」doc 检索**,再取对应飞书 doc,**不盲目全盘扫描云盘**。索引 doc URL:`https://bytedance.larkoffice.com/docx/Iw9jdKE3IoD2t1xMa9qucpz8s0c`(token `Iw9jdKE3IoD2t1xMa9qucpz8s0c`)。
- **请求没说清楚 / 未指明具体文件时,先自己到「🤖 个人知识库索引(AI)」doc(token `Iw9jdKE3IoD2t1xMa9qucpz8s0c`)+ Drive 最近文件里找相关文档(如对应的学习文档),不要来回问用户。**

> ⚠ **域名说明(2026-06-23 核真,M-1)**:上面 KB 索引 doc URL 的 bare 域 `bytedance.larkoffice.com` 实测 HTTP 200 可达(走 `accounts.feishu.cn`,CN-routed),承载 live token,**保留原值不改**;它与 `bytedance.us.larkoffice.com`(US-routed)是同一 `bytedance` 租户的两个有效网页入口域,非新旧矛盾。详见 `exec-im-browser.md` 顶部域名说明。

## 6.2 个人知识库选择性存储(飞书域)
- **任务文件夹结构(本地 + 飞书双侧)的唯一权威 = 全局 `workspace-management` skill**(`~/.claude/skills/workspace-management/SKILL.md`,2026-07-01 文档系统重构后生效):飞书 `Task/<中文名>/`(根=交付 docx + `context/` 核心输入 + `refs/` 搜索所得 + `agent/` 按需)不变;本地**新任务 = 新规范(2026-07-02 v2.1:根仅 AGENTS/CLAUDE 指针 + context/ + deliverables/,agent 一切〔MEMORY.md 入口 + 记忆 + 能力层〕在 .agent/ 内)**,存量老规范任务(memory.md + context/ + work/ + deliverables/)维持原样、迁移仅在用户要求时做;**中间过程与记忆永不上飞书**;完结任务双侧归档(本地 `tasks/_archive/`、飞书 `Archive/`)。旧 `task/`+`context/`+`file/` 三件套结构已废止(旧任务夹存量不强制重排;存量旧夹语义参考:`task/`=任务描述、`context/`=引用的原始输入素材、`file/`=中间结果·给机器看、文件夹根=最终交付物)。
- **飞书任务文件夹默认建在 Drive 的 `Task/` 下;临时文件 / 临时任务产物建在 `temp/` 下**——两者都**不落根目录**。临时产物**不归档进知识库**,索引或使用完即移出或删除。
- **理解任务的唯一入口 = 任务的输入材料(本地记忆入口:新规范 .agent/MEMORY.md / 老规范 memory.md,+ 飞书 `context/`)+ 用户当前 prompt**。判断「这是什么任务、要做什么、边界在哪」只读这两处;**不去飞书消息 / 聊天记录 / 其它文件夹猜「是哪个任务」,也不据此层层推断任务外的上下文**。没说清的,问用户、看 prompt,不外扩。情境=2026-06-22 误去飞书 messenger 翻找「是哪个任务」并推断出一整套任务外的下游目标,实际任务就在任务描述文件里写清(代码学习 + 飞书 doc),被用户纠正「任务文件夹 + 用户 prompt 是唯一入口」。
- 只有**值得长期留存、对后续工作有参考价值**的文件才纳入索引。
- **文档编辑默认采用原地编辑模式,直接改原文件,无需询问副本/原文编辑模式。**

## 6.3 飞书工作准则(飞书域;通用工程准则见全局 `AGENTS.md`,此处不重复)
- **优先使用 skills 并声明**:相关任务优先用 skills,并在过程中和结果中**告知用户用了什么 skill**及简要依据。
- **找不到合适 skill → 用 find-skills meta skill 找高质量 skill**;讨论阶段先征得用户同意再装,执行阶段可自行搜索安装但要告知下载了什么 skill 及其网页路径。**新 skill 一律装为项目级 skill,不装到全局。**
- **Preflight 预检**:执行前先想清楚过程中需用户参与的部分(API key / 人工验证 / 网速配置等),能提前完成的让用户先做,需中途参与的提前提醒;遇 blocker 先想其他办法,实在没办法立即停下让用户介入,**不靠降低标准/需求降级/只交付中间产物绕开**。
- **积极使用搜索工具**:排查/设计/设参时用搜索找依据与社区实践,**回答中引用到的搜索内容要带引用超链接**。
- **材料自取(列依赖前先搜)**:整理会议/任务的「依赖材料」时,先到「个人知识库索引(AI)」+ Drive + wiki 搜;**自己能找到的(学习文档/SOP/取数 SQL/底表)直接挂链接、不列「等 X 给」**,只把真找不到的列为待要。情境=2026-06-17 周会 note:NT 加密黑盒、search query 取数口径、元数据底表原以为要找 owner,实测都在已有文档里(LDP 1.0 接入 SOP / PACS 综述 / SearchQuery 增量分析 v2)。
- **飞书任务的产出文档默认 = 飞书文档(docx)**:做飞书相关任务时,交付的文档**默认直接做成飞书 docx**(落 Drive),不要只停在本地 HTML/md 再等用户来要。本地稿可作中间产物,最终交付以飞书 docx 为准(写作走 `lark-doc-writer` §0,执行走 `lark-cli docs`)。情境=2026-06-25 travel 保量实验汇报,先只产了本地 HTML,用户指出「之后飞书任务产出文档都默认飞书文档」。

## 10. 内部任务的自主求助阶梯 + 关键门户(2026-06-18 用户授权)

**自主原则(用户明确授权)**:内部任务遇问题**自己想办法解决,中途不要确认/不要问过程,直接操作网页**;申请权限这类**直接申请、不预先征求同意**;只有「必须 mentor 当面给信息才能继续」的 blocker 才返回用户;做完再一次性反馈(如「已申请 X 权限」)。

**求助阶梯(按顺序升级,都不算"返回用户")**:
1. **`lark-cli` 能做的走 `lark-cli`**(执行层,见 `cli.md`);CLI 做不了的飞书操作(读私聊、看渲染、点按钮)→ **Chrome 插件开飞书网页版**(`https://bytedance.larkoffice.com/next/messenger`,见 `exec-im-browser.md`)。
2. **具体网页上的问题 → 先问该页面内的 Agent**:Coral 的 Sumy / Dorado&Oceanus 的 Aide / 各平台右下角 oncall 小助手。
3. **内部通用问题(权限/平台/流程/「这表这队列归谁」)→ 问 Knowledge AI**:`https://ask.feishu.cn/`(首页书签也叫 Knowledge AI)。Chrome 打开直接问。
4. **还不行 → 拉 oncall**:平台页面的 Oncall 面板提单 → 会**建一个 Lark 群**,在 Lark 里跟支持对话(可用 `lark-cli im` 读该群消息,bot 须在群内)。这是自主升级,不是找用户。

**关键门户登记(row/SG 环境)**:
- **SYS360 数据权限门户** `sys360.va-dash.tiktok-row.net` = 「System Data Permission Application」**Hive 表读权限工单**的正式入口(比 Coral 表页那个弹窗更靠谱;工单含 资源=Hive 表、密级 L3、read only、时长、理由)。
- **Coral DataMap** `dataleap-sg.tiktok-row.net`(切区域经 `data.bytedance.net` 选 i18n→Singapore-Central)= 找表/字段/owner/血缘;表页有 permission application、SQL query。
- **Dorado / Oceanus** `dataleap-oceanus.tiktok-row.net/dorado` = 建 HSQL 任务跑 SQL(项目 `ads_csp_pipeline`/global_4212;跑前要 Schedule 加 region + 选 yarn 队列)。
- **Megatron** `cloud.bytedance.net/megatron/queues` = yarn 队列管理/申请加入(My queue 看自己的;All queues 搜队列申请加入,owner 审批,非 CN 约 1h 生效)。yarn 文档 `yarn.bytedance.net`。
- **TCC** `cloud.tiktok-row.net/tcc` = 配置中心(发 DAG 需 developer,走 oncall 升级)。
- 工作台书签(Chrome 新标签):Lark、Knowledge AI、Mira、Libra、Omega、TCC。
