# init — 初始化工作区(子模块;手动 = 对话指令或 /project-init 分发,auto/full 模式开工时 agent 自调)

家族根 = `~/.claude/skills/workspace-management/`(下称 WM;规范细则 = WM/references/spec.md)。参数:`[任务名/目录] [--profile task|repo] [--mode none|auto|full] [--deep]`。

## 流程

1. **定 profile 与位置**:任务 → `~/Desktop/AI Workspace/tasks/<kebab名>/`(profile=task);代码 repo → repo 根(profile=repo)。参数没给就从用户消息推断,推不出再问。
2. **脚手架**:跑 `WM/scripts/scaffold.sh --profile <p> <目录>`(幂等;遇老规范根 memory.md 会拒绝——那就停下向用户说明,不强迁)。task profile 会自动建 CLAUDE.md 指针行;**repo profile 改 AGENTS.md/CLAUDE.md 加指针须先征得用户确认**(文案 = WM/templates/pointer-line.md)。
3. **定模式**:`--mode` 给了就用,没给缺省 none;写进 `.agent/MEMORY.md` 头部模式行(spec §8)。
4. **飞书任务夹**(仅 task profile):按 spec §9 沿用双侧机制——lark-cli `--as user` 在 Drive `Task/` 根(token `AUA9fjYxVlO1s8dIDA9cha59nvT`)建 `<中文名>/` + `context/`,URL 写进 .agent/MEMORY.md 外部源台账。
5. **理解项目与摄取 context(初期记忆系统的主料)**:
   - **context/ 逐文件摄取**(任务 profile 的重点——context 是定义这个任务的输入):每份输入读完(PDF/DOCX/网页走 file-content-extraction / webpage-content-extraction)产出两样——① MEMORY.md(.agent/ 内)核心索引「共用区」节登一行(文件名 + 一句话这是什么/何时该看);② 重要/复杂输入写 summary 成 `.agent/memory/note/context-<名>.md`(可复用理解单元,内容要厚:核心结论、关键数字、口径、与任务的关系),MEMORY.md 索引指向 note。轻小文件只登索引不强写 note(按需生长)。
   - **repo/代码理解**(repo profile 的重点):默认轻量(分钟级:目录结构、README/构建配置、近期提交),盘点既有能力物(.agent/skills|agents 与根 .claude/)登 MEMORY.md 能力层路由表;关键代码模块的理解同样落 note(模块 summary)。
   - **规模分档**:context 少量(≤3 份)主 agent 自己摄取;大量或 `--deep` 时按 WM/references/subagent-protocol.md 派子智能体分工摄取/逐模块深读,note 由主 agent 验收后归位。
   - 产出一律写 **MEMORY.md + note**(agent 记忆),不写 CLAUDE.md(那是人维护的项目规范)。
6. **初期记忆**:用户开工消息原文落 `.agent/memory/requirement/`(贴原语义);草拟 `.agent/memory/goal.md`(目标 + 验收标准,依据 = requirement + context 摄取所得);MEMORY.md 补齐定位 / 现状 / 核心索引(含 context 索引与 note 指针)。
7. **全局记忆自判**(不强制):任务疑似有前史、涉及既有项目或某领域(飞书/字节广告等)时,自行判断查全局枢纽定位卡(`global-memory/hub/MEMORY.md` 或 runtime 软链;`memory-management` §路径解析)与域 store;命中则把相关条目指针写进工作区 MEMORY.md §3,此后工作区内不再重复查。判断不需要就跳过。
8. 向用户回一段简短开工确认:工作区在哪、双侧链接、模式、goal 一句话。
