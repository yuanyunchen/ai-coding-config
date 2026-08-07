# 飞书执行记忆 / 踩坑(做飞书文档/表格/图片任务前先读)

> **执行坑已 reference 化(2026-06-23;2026-07-01 完成正文指针化)**:§0–§12 执行避坑全文在 `references/exec-*.md`(7 个文件),本文原位只留一行指针,**正文不再双存**;入口 = `SKILL.md §(0) 执行避坑路由表`(按「正在做的操作」一跳定位、只读对应一个文件)。§6.4 已裁决(2026-07-01):与全局 AGENTS.md Rule 7/8/10 重复的条目已删,只留飞书域增量。§13–§16 为 reference 化之后新增,正文仍在本文。

实测环境:租户 ByteDance,API base `https://open.larkoffice.com`,app `cli_aaad33abb3f81bd7`,机器人 open_id `ou_3769ea1a03e80579968733004ab232cc`(app_name "Test")。

> **执行层已迁官方 `lark-cli`(MCP 已退役)。** references 里以旧 `mcp__feishu__*` 工具名记述的坑是**飞书后端行为/错误码事实**(同一后端,经 `lark-cli` 仍会撞),各文件头部自带边界说明;`useUAT:true` ≈ CLI 的 `--as user`,落地命令以同目录 `cli.md` 为准。

## 0. 架构:技能在工作区,执行走官方 lark-cli
→ 全文见 `references/exec-workflow-internal.md` §0。

## 1. 权限 / scope / OAuth 重授 / UAT vs tenant
→ 全文见 `references/exec-permission.md`(含「加协作者-自删」配方权威定义)。

## 2. 建块的正确姿势
→ 全文见 `references/exec-blocks.md` §A(table 裸建+回填 / callout / 1770041 族 / 列宽)。

## 3. 嵌图 / 图片复用管线
→ 全文见 `references/exec-blocks.md` §B(upload_all 关键绑定 / 跨租户拿不到 / SVG→headless-Chrome-2x 渲 PNG、嵌前必看)。

## 4. 导入 / 导出 / 读取的坑
→ 全文见 `references/exec-import-export.md` 上半。

## 5. 白名单边界(MCP 历史参照)
→ 全文见 `references/exec-workflow-internal.md` §5。

## 6. 个人规则(自 Mira 个人画像迁入;append-only,与 AGENTS.md/knowledge 不重复)

### 6.1 飞书检索 / 文件语义(飞书域)
→ 全文见 `references/exec-workflow-internal.md` §6.1(「文档/文件」默认=飞书 Drive doc;先查「🤖 个人知识库索引(AI)」;未指明文件先自查不反问)。

### 6.2 个人知识库选择性存储(飞书域)
→ 全文见 `references/exec-workflow-internal.md` §6.2(任务结构唯一权威=全局 `workspace-management` skill;Task/、temp/ 不落根目录;理解任务唯一入口;原地编辑)。

### 6.3 飞书工作准则(飞书域)
→ 全文见 `references/exec-workflow-internal.md` §6.3(skills-first 并声明 / find-skills / preflight / 搜索带引用 / 材料自取 / 产出默认飞书 docx)。

### 6.4 飞书域补充备忘(全局规则见 AGENTS.md 沟通板块 + Memory/Harness 板块,本节只放全局没有的增量)
- **长任务 / 任务文档组织**:唯一权威 = 全局 `workspace-management` skill(`~/.claude/skills/workspace-management/`);`long-task-workflow` 已于 2026-07-01 按用户指令禁用(overhead 大、文档分散;不激活,恢复见其 `SKILL.md.disabled`)。
- **响应速度**:用户问问题时**能直接回答就不要调用工具或查 context**,实在不确定再查文件。
- **记录方法论**:把需求/偏好/准则/坑沉淀为记忆或写入 skill 时,要**完整且合理抽象,保留情境/原因/行动三要素**,在完整与抽象间取平衡,避免过度简化导致误用(与全局 Harness 板块红线「最小改动、不简化到失真」同向;三要素为本域补充)。

## 7. IM 读消息:能定位、读不了正文
→ 全文见 `references/exec-im-browser.md` §7(唯一可行解 = Chrome 插件,接 §8)。

## 8. 浏览器打开飞书网页版(执行层够不到时的首选兜底;域约束,非全局「只能 Chrome」)
→ 全文见 `references/exec-im-browser.md` §8。全局行为 = AGENTS「Browser: Try What Works」;飞书 IM/渲染场景下 Chrome 插件通常是唯一能进网页版的路径——有则用,没有则按 AGENTS 试其他后端,全 block 再反馈。

## 9. (历史·MCP 已退役)lark-mcp 启用白名单 + 扩载流程 + 完整目录
→ 全文见 `references/exec-appendix-legacy.md`(纯历史参照,日常不读)。

## 10. 内部任务的自主求助阶梯 + 关键门户
→ 全文见 `references/exec-workflow-internal.md` §10(自主原则 / 四级求助阶梯 / SYS360·Coral·Dorado·Megatron·TCC 门户登记)。

## 11. Drive 下载:media 素材 vs file 独立文件分两条路
→ 全文见 `references/exec-import-export.md` 下半(静默假阴性空数组 / 权限阶梯 / 读 meta ≠ 能下载)。

## 12. lark-cli 文档结构同步坑(docx 重排 / 移块 / 嵌附件)
→ 全文见 `references/exec-docstruct.md`(含 2026-06-24 追补 3 条:blockquote `block_replace` 静默 no-op / CLI 进度行致 `json.load` 假失败勿盲重试 / `<cite>` title 过时缓存须显式写死)。

## 13. 无权限文档(3380004):主动申请访问 + 记录(2026-06-23 用户指示)

情境:`docs +fetch` 等读用户飞书文档报 `3380004 No permission`(用户对该 docx/wiki 无 view 权限),常见于跨团队引用来的、只「登记 token 未实际读过」的文档。

规则:**不要把无权限文档当死路、记一句「读不了」就算**——主动替用户申请访问权限,并把已申请清单记进当前任务记录(owner 批准后再 fetch 复读)。
- **优先 `lark-cli drive +apply-permission --token <token或URL> --type <docx|wiki|sheet|file|…> --perm view --as user --remark "<理由>"`**:以用户身份给文档 owner 发一张「申请查看权限」卡片,一条命令搞定(实测 2026-06-23 `ok:true`;输出前缀行 `Requesting view access on …` 会让裸 `json.load` 解析失败,无碍,命令已执行)。比开浏览器快,符合 §10 求助阶梯「lark-cli 能做的走 lark-cli」。
- CLI 做不到(报错 / 需交互)→ **优先 Chrome 插件**开该文档页点「申请权限」按钮(飞书网页域约束;全局仍遵守 AGENTS Try What Works)。
- **与 §12 末条「不替用户改 access control」不冲突**:本条是替用户向 owner 发**标准申请**、owner 审批(不绕过权限);§12 指不擅自改文档分享范围/给别人放权。前者做、后者不做。
- 申请后把「标题 + token + 申请时间 + 权限类型」记到任务文件(如 `.content/access_requests.md`)。

例:2026-06-23 travel LLM emb 项目,g2 候选 shortcut 里 EntityID 源头 `JvJn…`、TTP pooling `M3D9…`、ROW 生成式 `Ckb9…` 三篇 3380004 → `+apply-permission --perm view` 申请(均 ok:true);owner 批后复读、有价值再补 shortcut 进 Context。

- **申请后隔段时间主动回查(2026-06-24 用户补充)**:审批**有时很快就过**——申请后过一段时间(隔几小时 / 隔日)用 `docs +fetch --doc <token> --as user` 复查,不再报 3380004 即已批准 → 立即 fetch 复读、补进相关文档 / 方案、有价值再补 shortcut。把「待回查清单」记进任务记录的待办,**别申请完就忘**。

## 14. 数据/代码平台权限申请 + Drive/cite/浏览器坑(2026-06-24 实测,travel emb 项目)

**Hive 表读权限 = Coral 数据地图 → Triton 数据安全门户**(实测路径,补 §10):
- 数据地图 = **Coral**(`data.bytedance.net/coral/datamap`);**TikTok-ROW 广告表需切区域 i18n → Singapore-Central(SG)**,切后域名变 `dataleap-sg.tiktok-row.net`(CN 区开不了 row 表,合规隔离)。
- 表详情页右上「permission application」→ 跳 **Triton**(`dataleap-sg.tiktok-row.net/triton/auth_manage/application/create`);Triton Apply **支持一单批量多表**,read-only / **Table level(默认 Column-level,要手切)** / 365day / 真实理由 → 提交得工单号;审批流 = 本人 → 直属上级 → 表 owner。PACS 表走同一 Data Access 流(L3 + owner 审批),无独立合规弹窗。
- **坑:「permission application」点开的 Triton 表单弹在 Chrome 插件 MCP tab 组之外**(看似没反应)→ 直接 navigate 到 Triton create URL、表单里按表名加表(智能选中自动解析 db+表)。

**代码仓(code.byted.org)读权限 = 自助「click to apply」→ Kani 正式审批**:
- **访问按仓 ACL、非纯按组**(同 `lab/` 下 sparrow 可读、vsearch 不可)。无权仓页面「You don't have permission… **click to apply**」→ 跳 **Kani**(`kani.bytedance.net/approval/apply`),数据级常 **L3-秘密**,审批流 = 直属上级 → 资源管理员,reporter=读,填真实理由 → 得审批单号(飞书工作台-审批可查/撤回)。
- **FC 特征 / 模型 PSM 不是自助「按名 apply」**:Merlin 特征按代码仓列、无「申请引用外部 FC」按钮(需 FC owner 跨业务授权 + 自侧建模注册);模型 deploy PSM 走服务 owner 的 RPC ACL → 这两类**只能编目 owner+渠道给用户自推**。

**Drive / doc 操作坑**:
- **shortcut 不能用 `drive +files move`**(`--type` 无 shortcut 枚举,报 99992402/1061003)→ 等效:目标文件夹**新建 shortcut + 删原**。
- **`<whiteboard type="svg">` 不忠实渲染复杂 SVG**(只留顶层 `<text>`、丢 rect/g/polygon,产近空白板 + 泄 SVG 碎片进正文)→ **弃用,改 PNG 渲染 + `+media-insert` 嵌 Image 块**(下载 live 图复核非空白)。
- **`--doc-format text` 在 lark-cli 1.0.56 不支持**(失败易误判无权限)→ 用 `markdown` / `xml`。
- **妙记 minute 非 Drive 文件**(create-shortcut `--type` 只支持 file/docx/bitable/doc/sheet/mindnote/slides)→ 不可建 Drive shortcut,用其关联的 AI 纪要/逐字稿 docx 代替。
- **文件夹也不能建 shortcut**(2026-07-01 实测,99992402:create_shortcut 的 refer_type 无 folder 枚举)→ 跨任务共享一个文件夹做不到「挂载」,要么物理 move 归一侧、要么对夹内单个 doc 逐个建 shortcut。
- **目录树外游离 docx(1061002)**:API 创建的 docx 可能不挂载在 My Space 任何文件夹(全树扫不到但 URL 可开、owner 是自己);对它 `drive +move` 报 1061002 params error → **不能 move,只能在目标夹 `+create-shortcut` 引用**(2026-07-01 实测:AgSr/SxrM/N6qX/Scbid 均属此类)。新建 docx 时记得带 folder_token 避免产生游离 doc。
- **lark-cli 任务中途自动升级会改命令面**(2026-07-01 实测:某 agent 跑 `lark-cli update` 后 1.0.56→1.0.63,`drive +list` 被移除 → 改用 layer-2 `drive files list --folder-token`)→ 长任务/多 agent 并行期间**不要执行 `lark-cli update`**(版本提示忽略);命令报 unknown subcommand 先 `--help` 重查而不是当权限错。
- **官方 lark-cli 的 `<whiteboard type="mermaid">` 能真实渲染成白板块**(2026-07-01 实测,docs +update 插入后 fetch 确认非拍平文本,白板 token 可取)——修正 MCP 时代「`<whiteboard type=mermaid>` 被拍平」旧结论(那是 mcp__feishu__* 路径的行为,已退役);经官方 CLI 写 mermaid 图可直接用 whiteboard 块,复杂 SVG 仍走 PNG 渲染 + media-insert(§14 上文 SVG 坑仍有效)。
- **`<cite>` 卡片回填 title 是过时快照**:改了目标 doc 标题后,新建/重置 cite(空锚)**仍从旧缓存回填旧标题、re-resolve 也中旧缓存** → 修法 = cite 上**显式写死正确 `title`**(`<cite doc-id title="<当前真实标题>" type="doc"></cite>`),re-fetch 确认。

**浏览器(Chrome 插件优先,详见 §8;全局 AGENTS = Try What Works)**:
- **deviceId 随重连漂移、display name 也变**(同一物理浏览器这次 Browser 1、下次 Browser 2)→ **按 deviceId select、别按 name**。
- **SG(TikTok-ROW)登录态按浏览器 profile**:某浏览器登了 SG(能开 dataleap-sg/Triton),另一个落 TikTok SSO 账密页 → 用登过 SG 的那个;**绝不代输账号密码**(安全红线),没登让用户登。

## 15. IM/Calendar 行为坑(2026-06-24,删 9 个个人各域 skill 时抽出保留)

> 各域操作改走官方 lark-* skill;下面 4 条是官方 skill 不一定带、值得留的行为级坑(1255002/`--as user`、gmail/1063001 已在 §13 / exec-permission.md / lark-contact 官方 skill,不重复)。

- **IM 建群 232043(bot 与目标用户互不可见)**:用应用身份(bot)建群可能因 bot 与某些用户互不可见而漏拉人(`232043`)。解:优先 `--as user` 一步建群+拉人;或两步——先建群(只放当前用户)→ 再用用户身份拉其余人,`succeed_type:1`,不可达者进 `invalid_id_list` 而非整体失败。
- **IM 发消息前二次确认(强制)**:除 `SKILL.md` 已定义的“权限审批催办”特例外，所有发送(私聊/群)默认在执行前向用户确认收件人 + 内容 + 身份。宁可不发,不可发错。
- **Calendar 禁止心算日期/weekday**:相对日期(明天/下周三)与 weekday 一律用 Bash `date -d` 锚定 + 校验,不心算;错的 weekday 比不给更差。
- **Calendar 主日历**:建/列日程前先取主日历 ID(`calendar +primary`),用户本人场景配 `--as user`。

## 16. 工具调用 XML 格式:必带 antml 前缀,绝不写裸 invoke / count(2026-06-29 用户要求,防再犯)

> **此为跨工具的通用工具调用格式坑、非飞书专属**(用户指定先落此飞书 store)。

- **情境**:主 agent 本会话反复(≥8 次)把工具调用写成 `count` 换行 + 裸 `<invoke name="X">` / `<parameter name="Y">`(漏 `antml:` 命名空间前缀),尤其 Agent 派发和 ScheduleWakeup。**后果**:报「Your tool call was malformed and could not be parsed」、或当纯文本漏给用户、**根本没执行** → 子任务没启动、定时器没排上,被用户多次发现。
- **规则**:每次工具调用必须用带 antml 命名空间的 `<invoke name="X">` + `<parameter name="Y">...`;绝不写 `count` 或漏前缀的裸 invoke/parameter;多工具并发时**每个**都带前缀。写完扫一眼开头不是 `count`。
- **例**:❌ `count` 换行 `<invoke name="Agent">` → ✅ `<invoke name="Agent">`(带 antml 前缀)。
