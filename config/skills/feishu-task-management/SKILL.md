---
name: feishu-task-management
description: "飞书/Lark 任何工作的唯一入口与索引;**任何与飞书相关的任务(写文档/多维表格/电子表格/IM/日历/任务/Wiki/Drive/Minutes/通讯录、以及给飞书作图)都必须先调用本 skill**,再路由到具体子技能(官方 lark-* 与飞书任务域 skill 均为本 skill 内部伪 skill、不注册全局,路由表在正文 §2)。执行层 = 官方 lark-cli;做飞书/广告算法任务前先查 bytedance 知识库(见正文 §1)。触发词:飞书、Lark、云文档、docx、多维表格、bitable、电子表格、sheets、飞书群、飞书日历、知识库、wiki、妙记、minutes、飞书云盘、drive、飞书任务/待办、审批、考勤打卡、OKR、飞书邮箱/邮件、通讯录/open_id、视频会议/会中、会议纪要、画板、幻灯片/slides、妙搭/Spark/Miaoda、飞书事件监听、Markdown 文件读写。"
---

# 飞书 / Lark 工作区(入口索引 + 执行规约)

## (0) 执行避坑路由表(钉死,执行类操作前必查)

做任何飞书「执行类操作」(建块/嵌图/导入导出/Drive下载/读私聊/改文档结构/调白名单外能力)之前,先在下表按「你正在做的操作 / 撞到的现象」**一跳定位 → 只 `Read` 对应 `references/exec-*.md` 那一个文件**,再动手。不要凭记忆建块/嵌图/下载——已记录的坑不重查必重犯。执行细坑全量已 reference 化,本表是入口;完整后端事实在 `references/`,完整 CLI 语法在 `cli.md`。

> **派子智能体做任何飞书任务(全文唯一通则)**:子智能体不自动 invoke skill——把本 SKILL.md 路径 + 任务所需子技能 SKILL.md / `references/exec-*.md` 的文件路径写进它的 prompt 让它 `Read`;写文档加 lark-doc-writer(+适用时 doc-trio),字节工作让它先 `<repo>/bin/bm tool search-notes --project bytedance`。见全局 AGENTS.md Harness 板块「subagent(派发)」。

| 我正在做 / 撞到 | 一跳读 | 关键坑(一句话,够判断要不要展开) |
|---|---|---|
| 建表格(docx table) | `references/exec-blocks.md` | 树里塞 cell 必 **1770041**;table **裸建+回填**,逐列 patch 设宽;要真表头走原始 REST |
| 建 callout / 设 emoji | `references/exec-blocks.md` | callout 别塞显式子块(撞 1770041);emoji 经原始 REST `children` 带 emoji_id 可设;**只用 MCP 路径退化为默认 🎁**——详见文件 |
| 建嵌套块树 / 多处插入 | `references/exec-blocks.md` | descendant 一次建树;多处插入**先大 index 再小 index** |
| 往 docx 嵌图 | `references/exec-blocks.md` | upload_all 绑 `parent_node=图片块ID`(不是文档ID),绑错 **1770013**;嵌前先 `Read` 看 PNG 防裁切 |
| 往「非 app owner / UAT 建的」文档插图,写报 **1061004** | `references/exec-blocks.md`(配方在 `references/exec-permission.md`) | UAT 建的文档 owner 是用户。**三步**:`GET /bot/v3/info` 取 bot open_id → UAT `permissionMember_create` 加 bot 为 `full_access` 协作者 → tenant 推图 → tenant `DELETE …/permissions/{token}/members/{bot}?type=docx&member_type=openid` 自删 |
| 复用他人/源文档的图 | `references/exec-blocks.md` | 跨文档不能直接复用图片 token(relation mismatch);下字节用 user token 重新 upload |
| **跨租户**原图复用拿不到(空数组) | `references/exec-blocks.md` | `.us.` token 对 CN/.sg 源图**静默返回空**;做不到 → 高质量重绘标「(重绘)」或让用户截图 |
| 建文件夹/文档报 **99991679 / 1255002** | `references/exec-permission.md` | 在用户 Drive 建须 `--as user`(UAT);新增 scope **必重新 OAuth** 才进旧 token |
| md 导入 docx(mermaid/callout 没渲染) | `references/exec-import-export.md` | import 只吃**标准 markdown**;mermaid→纯代码块、`<callout>/<lark-table>` XML 被**拍平成纯文本**;画图用 ASCII / 走 block API |
| 想数文档有没有图 | `references/exec-import-export.md` | markdown 导出**吞 image/whiteboard 块**;数图用 block API 按 `block_type==27`,别信 markdown |
| 下载云盘**图片/内嵌素材(media)** | `references/exec-import-export.md` | `media.batchGetTmpDownloadUrl`(UAT)拿临时链;media token 从 image 块取 |
| 下载云盘**独立文件(type=file)**;私有文件 403/空数组 | `references/exec-import-export.md`(授权配方在 `references/exec-permission.md`) | 走 `GET /files/{token}/download`;对 file token 调 media 接口**静默返回空数组**(假阴性)。用户私有文件须 bot `full_access`:**三步** UAT `permissionMember_create`(perm=full_access,type=file)→ tenant 下载 → tenant `DELETE …?type=file&member_type=openid` 自删(`view` 不够) |
| 读**用户私聊 / 机器人不在的群**的消息 | `references/exec-im-browser.md` | `search_v2`(UAT)只给 message_id 无正文;`message.get/list` 都 bot 身份进不去(230002);**唯一解 = Chrome 插件开飞书网页版** |
| 要看渲染后的文档/表格、核对刚建效果 | `references/exec-im-browser.md` | Chrome 插件 SOP;默认选「浏览器1(bytedance)」;`data.tiktok-row.net` 渲染空白 |
| 重排章节 / 跨节移图 / 改文档结构 | `references/exec-docstruct.md` | **`block_move` 大块移动 = OT 合并冲突、静默失败**;改用 create(目标位重建)+ delete(删原)+ 一步一 re-fetch;验真用 raw-dump 别信单 agent 总结 |
| HTML 作附件嵌进 docx | `references/exec-docstruct.md` | `docs +media-insert --type file --file-view card` |
| 调冷门子能力(sheets 单元格/calendar 会议室/contact 搜人…) | `references/exec-workflow-internal.md`(§5 白名单) | 多数冷门能力不在 MCP 白名单;官方 lark-cli 无白名单全可达,查 `cli.md` |
| 用户说「找文档/文件」 | `references/exec-workflow-internal.md`(§6.1 检索语义) | 默认=Drive 飞书 doc;先查「🤖 个人知识库索引(AI)」doc,别盲扫云盘 |
| 建任务文件夹 / 判断「这是什么任务」 | 全局 `workspace-management` skill(结构唯一权威)+ `references/exec-workflow-internal.md` §6.2 | 双侧结构与新老规范细则归 workspace-management,不在此复述;中间过程/记忆不上飞书;**理解任务唯一入口=任务输入材料+当前 prompt**,不去消息里猜 |
| 内部任务卡住 / 要权限 / 找表 / 跑 SQL | `references/exec-workflow-internal.md`(§10 求助阶梯) | 阶梯:lark-cli→Chrome→页面内 Agent→Knowledge AI(ask.feishu.cn)→oncall;门户 SYS360/Coral/Dorado/Megatron/TCC |
| 想知道飞书后端历史上有哪些 MCP 能力 | `references/exec-appendix-legacy.md` | 纯历史参照;MCP 已退役,执行走 lark-cli |

## (1) 整体介绍

飞书相关的技能与规则**独立隔离**在工作区,不与通用技能混在一起。本技能是它们的**唯一全局入口**:任何与飞书相关的任务都先到这里,再由本目录路由到对应子技能。

**三层模型(全部懒加载,按需打开):**

1. **入口索引(本 skill)** — 登记所有子技能的用途与位置,给出执行规约。先到这里,再路由。
2. **技能方法论(子技能 `SKILL.md` + `references/`)** — 每个子技能讲清"某类飞书工作怎么做"(写文档/建表/作图/各业务域/流程元)。**具体子技能不预加载**,按下面 (2) 的目录用文件路径 `Read` 按需打开。
3. **执行层(官方 `lark-cli`)** — 真正读写飞书;技能给规则,CLI 执行(三层命令/鉴权/踩坑见同目录 `cli.md`)。

**⭐ 写飞书文档 = 强制调用链(2026-06-24 钉死,违反即返工)** — 任何「写 / 改飞书文档」的任务,**包括方案 / 分析 / 总结 / 报告这类非 doc-trio 五类的文档**,动手前**必须**:① 调用并遵守 `lark-doc-writer` §0 通用写作通则(§0 在其 SKILL.md 开头)(可读性 · 文字密度 · 语言自然去 AI 味 · **多作图:DAG 表框架/结构、ASCII 展开细节、开头必有 DAG 全景、结尾必有图〔双收口〕**);② 属 doc-trio 五类(学习 / 操作 / checklist / 会议 / AI handoff)的**必须**先 `doc-trio` 判型取骨架;③ 执行落地用 `lark-cli docs`。**禁止**绕过 lark-doc-writer 直接 `docs +create` markdown 导入、或拿自定义 recipe 替代写作通则(实测绕过 → 出无开头 DAG、无结尾图、图密度不足的 AI 味文档)。

**`memory.md` 必读** — 飞书执行记忆与所有踩坑(权限/建块/嵌图/导入导出/白名单边界)都在本技能同目录的 `memory.md` 里。**做文档/表格/图片任务前必看**,否则会重复踩已记录的坑。另:飞书写作硬规则在 `lark-doc-writer` 技能(§0 General 写作规则 + §1 飞书 XML 硬规则,为写作规则的唯一权威入口)。

**`bytedance` 知识库先查(记忆优先)** — 字节广告算法工作知识在统一仓 `global-memory` 的 BM project **`bytedance`**（目录 `bytedance/`,原 feishu-memory）。**做飞书 / 广告算法相关任务前,先查它**——解析仓库根(hub 的 parent)后跑 `<repo>/bin/bm tool search-notes --project bytedance "<你的问题>"`(或 MCP `search_notes`,`project=bytedance`):平台用途 / 指标口径 / 实验结论 / 机制原理 / 历史决策,命中就直接用、并核对该事实 `source.quote` 的时效,**避免重复研究**;拿不准的字节背景,**先搜它、再外求**。命中率最高是带名字/实体的查询。与本技能 `memory.md` 区分:`memory.md` = 飞书**执行踩坑**; `bytedance` = **工作知识**——互补、都先查。

**执行层规约:**

- 读写飞书**一律用官方 `lark-cli`**(`@larksuite/cli`,已装 `~/.local/bin`);**旧 `mcp__feishu__*` MCP 已退役,不再是执行路径**(全文唯一声明;MCP 时代台账见 `mira-sync-archive.md`)。三层调用法/自助发现(`schema`/`skills`)/鉴权/App 与 brand 细节/踩坑表全在同目录 `cli.md`;全接口面清单在 `~/feishu-cli/deliverables/cli-interface.md`。
- **身份**:`--as bot`(租户)/ `--as user`(用户 UAT);在用户 Drive/My Space 建东西走 `--as user`(tenant 撞 1255002)。**写类先 `--dry-run`**(高层 shortcut 无确认门会真执行)。
- 起步只读体检:`lark-cli doctor` / `auth status`;两身份 `ready` 即可干活,不 ready 才按 `cli.md §4` 重登。

**Mira 同步已冻结(2026-07-03)** — 迁移完结、双向同步停用;资产映射/层级真相/同步协议与未输出活队列全文冻结在同目录 `mira-sync-archive.md`,恢复同步时从彼解冻。改飞书系统不再登同步台账。

## (2) 子技能目录

按需路由用。**具体子技能不预加载**,按本目录用文件路径 `Read` 按需打开它的 `SKILL.md`(及其 `references/`)再干活。

> 写文档 / 作图这组子技能(原飞书 workspace 子技能)已内迁本 skill 下 `subskills-workspace/`,不再远程引用工作区(旧 `feishu-mira-workspace/` 已归档)。用法同 lark-*:`Read subskills-workspace/<域>/SKILL.md`(及其 `references/`)再干活。下表「位置」列 `subskills-workspace/…` 均相对本 skill 根 `~/.codex/skills/feishu-task-management/`。通用工具(非飞书专属)单列一组,与飞书域分开。

### 写文档 / 内容
| 技能 | 一句话用途 | 位置(SKILL.md) |
|---|---|---|
| `lark-doc-writer` | 飞书文档写作总入口 + 排版/格式权威规则 + 可读性方法;写/改任何飞书文档前必须调用其 §0 写作通则(强制调用链见 §1)。 | `subskills-workspace/lark-doc-writer/SKILL.md` |
| `doc-trio` | 写飞书 5 类文档(学习/操作指南/checklist/会议 note/AI handoff)的判型 + 骨架 + 完整性查漏;写这五类前必须先调用判型取骨架(见 §1 调用链),写作通则再走 `lark-doc-writer`。 | `subskills-workspace/doc-trio/SKILL.md` |
| `feishu-doc-gotchas` | 读写飞书文档/表格/画板遇到格式/blockID/颜色/上传/导入异常时查阅。 | `subskills-workspace/feishu-doc-gotchas/SKILL.md` |
| `whiteboard-design` | 架构图/流程图/漏斗/金字塔/鱼骨/组织架构等结构化图示的设计方法论(原名 lark-whiteboard;落地=渲染 PNG 嵌 Image(27),ASCII 兜底;官方同名执行技能=伪 skill `lark-whiteboard`)。 | `subskills-workspace/whiteboard-design/SKILL.md` |
| `data-analysis-report` | 字节内网数据分析**端到端编排**(iDA 取数→多窗/控池分析→双版 HTML→飞书 docx 镜像+HTML 附件→Drive 托管);编排 ida-presto-query / analytical-report / bytedance-internal-hosting / lark-doc-writer,不重复其细节。 | `subskills-workspace/data-analysis-report/SKILL.md` |

### 作图 / 图表
| 技能 | 一句话用途 | 位置 |
|---|---|---|
| `ascii-strategy-diagram` | 算法/竞价/计费/排序/链路 的 ASCII 纯文本全景框架图(公式化、多阶段链路首选)。 | `subskills-workspace/ascii-strategy-diagram/SKILL.md` |
| `dag-flow-diagram` | mermaid DAG:变量依赖图 / 端到端流程 / 概念关系图。 | `subskills-workspace/dag-flow-diagram/SKILL.md` |
| `chart-gen` | 把数据/指标画成干净自包含的静态 SVG 图表(柱/折线/饼/桑基…),需要时再上传飞书。 | `subskills-workspace/chart-gen/SKILL.md` |

### 飞书各业务域 = 官方 `lark-*` 伪 skill(经 `subskills/` 软链,不注册全局)
> 源文件在 lark-cli 托管的 `~/.agents/skills/`,经软链 `subskills/` 可达,只经本表路由。用法:按下表定位 → `Read subskills/lark-<域>/SKILL.md`(等价 `lark-cli skills read lark-<域>`);完整触发词与边界在各自 frontmatter。字节租户/行为坑(IM 232043 建群、发消息前二次确认、Calendar 禁心算+主日历、1255002/`--as user`、gmail/1063001)见 `memory.md` §13/§15 与 `references/exec-permission.md`。

| 伪 skill | 管什么(边界) |
|---|---|
| `lark-doc` | 云文档 Docx/Wiki 读取编辑、插图、下载附件;文档 URL/token(含 doubao.com 的 /docx 与 /wiki 路径);内嵌表格/Base/画板先取 token 转对应 skill |
| `lark-base` | 多维表格 Base:建表/字段/记录/视图/统计/公式 lookup/表单/仪表盘/workflow/角色权限;/base/ 链接;文件导入→lark-drive |
| `lark-sheets` | 电子表格:创建/工作表结构/单元格读写(值公式样式批注)/查找替换/原子批量/图表透视表条件格式/金融建模;按名搜文件→lark-drive |
| `lark-drive` | 云空间:上传下载/文件夹/复制移动删除/元数据/评论权限/版本;Word/MD/Excel/CSV/PPTX/.base 导入为在线文档;内容编辑→lark-doc 等 |
| `lark-im` | 即时通讯:收发回复/搜聊天记录/群管理/文件图片上传下载(大文件分片)/表情/加急/交互卡片与 card.action.trigger 回调/Feed 置顶 |
| `lark-calendar` | 日历:查建改日程/参会人/忙闲推荐/会议室预定;已结束会议→lark-vc;待办→lark-task |
| `lark-task` | 任务:待办/清单/子任务/分配/附件/任务智能体注册与记录 |
| `lark-mail` | 邮箱:起草/发送/回复/转发/查阅/搜索/文件夹标签/邮件联系人/收信规则;仅 mail 意图 |
| `lark-wiki` | 知识库:知识空间/成员/节点层级/文档与快捷方式组织;上传文件→lark-drive;内容编辑→lark-doc 等 |
| `lark-minutes` | 妙记:搜索/基础信息/音视频上传下载/产物内容编辑/换说话人;本地音视频转纪要优先走它(不用 ffmpeg/whisper) |
| `lark-vc` | 已结束视频会议:搜历史/纪要(总结待办章节逐字稿)/参会人快照;未来日程→lark-calendar;会中→lark-vc-agent |
| `lark-vc-agent` | 会中能力:bot 真实入会离会/会中事件/发会中消息表情/发现进行中会议 ID |
| `lark-contact` | 通讯录:姓名邮箱↔open_id 互查、部门邮箱状态签名;部门树遍历/组织架构→原生 OpenAPI |
| `lark-okr` | OKR:周期/目标/KR/对齐/量化指标/进展记录 |
| `lark-approval` | 审批:待办已办/实例/搜可发起定义/发起原生审批;非审批待办→lark-task;不建审批定义 |
| `lark-attendance` | 考勤:查自己打卡记录 |
| `lark-apps` | 妙搭 Spark/Miaoda:应用开发托管/HTML 静态站点发布/本地全栈/云端迭代/日志 Trace 监控 PV UV/环境变量(*.aiforce.cloud) |
| `lark-event` | 实时事件监听:`lark-cli event consume` NDJSON 流(IM/任务/VC/妙记/画板事件),bot 长驻订阅 |
| `lark-markdown` | Markdown 文件:查看/创建/上传/编辑/局部 patch/diff;导入为在线文档→lark-drive |
| `lark-note` | 会议纪要 Note 直查:已知 note_id 查详情/关联 doc token/unified 原始逐字稿 |
| `lark-whiteboard` | 画板(执行):导出预览图/原始节点/更新内容;设计方法论→工作区 whiteboard-design |
| `lark-slides` | 幻灯片:创建/读取/页面管理/局部替换(含 doubao /slides/) |
| `lark-shared` | lark-cli 装机鉴权:auth login/status/logout、user vs bot、--domain 权限、缺 scope、_notice |
| `lark-openapi-explorer` | 现有 skill/CLI 覆盖不了时,从官方文档库挖原生 OpenAPI |
| `lark-skill-maker` | 把飞书 API 封装成自定义 lark-cli Skill(执行层;持久变更走 harness-management update 流程) |
| `lark-workflow-meeting-summary` | 时间范围内会议纪要汇总→结构化报告 |
| `lark-workflow-standup-report` | 指定日期日程 + 未完成任务摘要 |

### 飞书任务域本地伪 skill(`subskills-local/`)
> **构建规则(钉死)**:凡飞书任务域的 skill,一律建成本 skill 内部伪 skill——物理放 `subskills-local/<skill>/` + 在本表登一行路由;**禁止**注册为 `~/.codex/skills/` 直属全局 skill(新建走 harness-management update 流程)。用法同 lark-*:`Read subskills-local/<域>/SKILL.md`,触发词/边界在各自 frontmatter。

| 伪 skill | 管什么(边界) |
|---|---|
| `ida-presto-query` | 字节内网 SQL 取数:Chrome 插件驱动 iDA(Presto 引擎)跑查询/下 CSV;粘贴法、朴素 SQL、超时 1/N 采样校验、Presto 方言、多 tab 并行、窗口嵌套模板 |
| `analytical-report` | 严肃数据分析报告引擎:自包含离线 HTML(core/full 双版、SVG 图表、可折叠 SQL、读图三拍、诚实口径)+ starter-kit + build→Playwright→对抗审查闭环。通用 HTML 报告引擎;端到端飞书数据分析编排走 `data-analysis-report` |
| `bytedance-internal-hosting` | 把 HTML 报告/网页/交互产物托管到字节内网分享:Goofy 快速网页预览(gf-preview URL)/ 飞书云盘 Preview 决策树 + file_upload 路径限制绕过技法 |

### 通用工具(非飞书专属)
> 已删/已迁物(long-task-workflow、choice-card、daily-report 拆分、frontend-design-pro 并入 frontend-pipeline)见 `mira-sync-archive.md` §1 沿革台账,不再占本表。
| 技能 | 一句话用途 | 位置 |
|---|---|---|
| `workspace-management` | Agent 工作区文件系统唯一权威(双侧结构:本地 tasks/<kebab名> + 飞书 Task/<中文名>);建任务夹、收尾、归档、判断「这是什么任务」走它。 | `~/.codex/skills/workspace-management/SKILL.md`(全局) |
| `harness-management` | harness 层(skill/command/hook/规则)一切变更的唯一入口;沉淀偏好/流程走其 update 流程。 | `~/.codex/skills/harness-management/SKILL.md`(全局) |
| `feishu-daily-report` | **整理日报**(飞书域):口述清单 + 回读产出 → compile 成飞书日报落 Drive `Daily Report/WeekN`;「记录日报」走全局 `memory-management` 时间索引库。 | `subskills-workspace/feishu-daily-report/SKILL.md` |

### 其他全局技能
非飞书任务回全局技能体系(`~/.codex/skills/` 注册表,按各自 description 触发),不经本入口、本表不复刻。

## 注意
- 这些飞书子技能源文件只在工作区一份(非全局软链)。Codex/Cursor 在工作区目录下工作时,读工作区的 `AGENTS.md` 获得同样索引。
- 拿不准的命令/参数先 `lark-cli <域> +<shortcut> --help` 或 `lark-cli schema ...` 查准,别杜撰(`cli.md §3` 自助发现)。
