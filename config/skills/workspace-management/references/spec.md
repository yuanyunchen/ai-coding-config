# 工作区规范全文(spec)

> 来源 = 任务 task-workspace-fs-upgrade 设计稿 v4(2026-07-02 经 R1–R6 多轮裁决定稿;v2.1 同日修订:MEMORY.md 与能力层收进 .agent/,能力加载 = MEMORY.md 路由表 + 按需 Read;**v3 修订 2026-07-03,用户指令:skill 改名 workspace-management;requirement 并入 memory/、废止原文即时追加;§8 更新纪律改为三模式 none/auto/full;三命令 skill 收编为内置子模块 modules/{init,recall,update} + 薄 command;record 收尾必做冲突检查;record 子模块同日统一更名 update**);§ 编号与设计稿一致,外部引用 §N 均指本文件对应节。§5 派发契约独立成 `subagent-protocol.md`,§11 命令层 = 薄 command + 内置子模块,§12 能力层独立成 `capability-layer.md`。

## §1 设计总则(五条,规范的宪法层)

1. **私有/共用轴**:`.agent/` 内 = agent 私有工作态,外面 = agent 与人共用区。不需要给人看的一律不放外面;需要给人看的一律不埋里面。(`.claude/` 是 harness 约定目录,归能力层,见 `capability-layer.md`。)
2. **文件三分法**:每类文件显式声明性质——**日志型**(只追加永不回改:subagent 留档)、**状态型**(须保持为真:MEMORY.md、note、task 文件、requirement——原文只补录不改写,v3 起归状态型节奏)、**生成型/静态**(索引可重建、资料写完不动)。更新节奏由三模式统辖(§8),这是设计核心而非附注。
3. **按需生长**:规范定义的是最大形态与生长规则,不是开工模板。各类文件不必都有;特定场景才要看的记忆单独成文件按需分流,不塞主文件。文件类型不限于本文列举。
4. **单层索引**:索引不设专门目录——作为文件内章节、文内引用、或就地的 index 文件存在;每层只引相关的下一层,不穷举展开。被引对象可以是普通文件、note、外部文件、index 文件。
5. **信息量优先,软约束兜底**:记忆与 note 要保证信息量、不过度简略;规模用软指引 + 巡检提醒控制,不硬卡(防止为凑预算牺牲内容)。

## §2 架构全景(最大形态;按 §9 生长规则按需实例化)

```
<workspace>/                       ← 根 = 共用区:只有人要看的东西
├── AGENTS.md / CLAUDE.md          ← 根上唯一 agent 相关文件:项目规范(人向)+ 一行指针 → .agent/MEMORY.md [静态]
├── context/                       ← 输入:人传入或指定传入,与用户共看 [静态]
├── deliverables/                  ← 根=正式交付;过程产物入子夹(如 process/)[静态]
└── .agent/                        ← agent 私有区(记忆·过程·能力)
    ├── MEMORY.md                  ← agent 记忆主入口(§3;含模式行,v3)[状态型]
    ├── memory/                    ← 认知区(§4)
    │   ├── goal.md · progress.md · index.md …  ← 主任务层,按需单文件 [状态型]
    │   ├── note/                  ← 可复用理解单元 [状态型·厚]
    │   ├── requirement/           ← 用户消息原文 + 总结(§6;v3 起在此)[状态型]
    │   └── task/
    │       ├── <子任务>/          ← 递归同构,文件按需 [状态型]
    │       └── Archive/           ← 做完的子任务移入
    ├── subagent/<模块…>/<子智能体>/ ← 派发实例留档 = 其工作目录(subagent-protocol.md)[日志型]
    ├── files/                     ← agent 私有资料(§6):refs/ 自查参考 + 私有中间结果 [静态]
    ├── skills/<名>/SKILL.md       ← 能力层:工作区 skill(路由表加载,capability-layer.md)[能力]
    └── agents/<名>.md             ← 能力层:派发类型定义文本 [能力]
```

> 能力加载:`.agent/skills|agents` **不被 harness 自动注册**——MEMORY.md 的「能力层路由表」是唯一入口,按需 `Read`(伪 skill 模式)。需要 harness 才能生效的执行物(hooks / 权限 / .mcp.json / 供 Agent tool 引用的注册型子智能体类型)仍须根级 `.claude/`——**按需才建、默认不存在、hook 一律过目**(capability-layer.md)。

**作用范围两个 profile**:① 任务工作区(`~/Desktop/AI Workspace/tasks/<kebab名>/`)= 全量形态;② 代码 repo = 只铺 `.agent/`(含 MEMORY.md 与能力层),repo 本身即共用区(通常无 context/deliverables),repo 已有的 AGENTS.md/CLAUDE.md 一概不动、只加指针(改动先征得用户确认)。AI Workspace 根目录不铺(全局层已有记忆枢纽)。

## §3 入口:MEMORY.md 与 AGENTS.md 的分界

| | AGENTS.md / CLAUDE.md | MEMORY.md |
|---|---|---|
| 是什么 | 项目规范:给所有 agent 的行为规则 | agent 过程记忆的主入口 |
| 谁维护 | 人写或人审;agent 不自行改动 | agent 自维护 |
| 装什么 | 项目约定、构建/规范、行为规则;不暴露内部 agent 文件细节 | 项目认知摘要、用户偏好、任务与进度、关键决策、核心索引(.agent 内部 + 能力层 + 共用区 + 任务相关外部源) |
| 性质 | 静态(改动走人) | 状态型(按 §8 纪律更新) |
| 接线 | AGENTS.md/CLAUDE.md 内一行指针连接:「agent 记忆入口 = ./.agent/MEMORY.md」(文案见 templates/pointer-line.md);MEMORY.md 住 .agent/ 内,根上不露 | |

MEMORY.md 节结构(按需增删,骨架见 templates/MEMORY.template.md):定位 · 现状与进度(摘要,细节引 memory/)· 用户偏好与规则指针 · 核心索引(下一跳:memory/ 各文件、活跃 task 节点、deliverables、**能力层路由表**、任务相关外部 doc 台账)· 关键决策(一行一条含日期)。与全局记忆枢纽的 MEMORY.md 同名同惯例、不同作用域——分形一致。

## §4 memory/ 认知区

- **顶层单文件 = 主任务层**:goal.md(agent 依据 requirement 自写的目标与验收标准)、plan.md(具体计划、方法、方法论)、progress.md、index.md 等,按需存在、类型不限。特定场景才需要看的记忆单独成文件,主文件只留一行引用。
- **note/ = 可复用理解单元**:经验、踩坑、核心结论、代码模块 summary、可复用的模块理解。一事一文件,内容要厚。诞生规则:结论先写在其诞生的 task 节点,第二处要用时抽到 note/,原地改引用。note/ 同时是向全局层(skill/全局规则,走 harness-management update 流程)输送候选的中转池。
- **task/ = 子任务节点,递归同构**:每个子任务/子模块一个目录,goal/plan/progress/memory 等按需(小节点单文件即可);内部可继续嵌子模块目录。做完的节点移入 `task/Archive/`。
- **requirement/ = 需求记录**(v3 起并入 memory/):细则见 §6,更新与其他状态型同节奏(§8 模式)。

## §5 subagent 派发契约

→ 独立文件 `subagent-protocol.md`(派发规约唯一 home;派发时把该文件 path 写进 task.md 让子智能体 Read)。

## §6 memory/requirement/ 与 files/

- **memory/requirement/**(v3 起并入 memory/,废止即时追加):两形态——原文记录(构成需求或改变方向的用户消息,update 例程时从对话补录,贴原语义;已录条目不改写)+ 总结文件(保留原语义不简化)。两者均按 §8 模式与其他状态型同节奏更新。goal.md 与总结口径冲突时,以 requirement 原文为准回溯。
- **files/**:`refs/` 装 agent 自己查的参考(context 是人给的,refs 是自己找的);其余装私有中间结果。判断口径一条:人需要看的放 deliverables/ 子夹,只有 agent 自己用的留 files/。

## §7 共用区与索引规范

根级共用区三样:AGENTS.md/CLAUDE.md(含指针行)、context/、deliverables/(根=正式交付,过程产物入子夹)。不新增根级散文件;MEMORY.md 与能力层都在 .agent/ 内。

索引:① 形态 = 文件内章节 / 文内引用 / 就地 index.md,不设 index 目录;② 单层引用,每层只引相关的下一层;③ 任务涉及外部文档(飞书/Drive/外部代码)时,任务相关条目登进本工作区索引(token/path + 一句话),只限本项目任务相关,全量目录权威在飞书 AI 索引;④ 本工作区能力物(.agent/skills|agents,及根 .claude/ 若有)逐条登 MEMORY.md 能力层路由表——路由表即加载机制(capability-layer.md);⑤ 能由目录结构推导的清单交巡检重建,手写索引只写机器推不出的语义。

## §8 记忆模式与更新纪律(设计核心;v3 起模式统辖状态型)

**三模式**(管状态型文件的自动更新节奏;记在 .agent/MEMORY.md 头部模式行,init 例程 --mode(经 /project-init)设定,用户会话中随时可改,改后更新模式行):

| 模式 | 纪律 |
|---|---|
| **--none(缺省)** | 不自动更新记忆。只写完成任务所必需的文件:派发 task.md、必须传递给下游的 note、交付物。手动触发(对话指令或 /project-*)照常可用,人调才更 |
| **--auto** | 事后更新:大模块结束、或状态与记忆系统出现较大出入时,agent 自动跑 update 例程 post-更新(以「新增是否达到记录必要」取舍,非每次对话必更;不逐步更新,防 overhead 与反复修改) |
| **--full** | 即时更新,先写后行动:goal/plan 先落盘再执行,progress 随做随更,requirement 随需求变化即时补录;新 session 接入自动跑 recall 例程 |

**按文件性质分流**(模式只作用于状态型):

| 文件 | 性质 | 写入触发 |
|---|---|---|
| MEMORY.md · memory/ 单文件 · note/ · task 节点 · requirement 原文与总结 | 状态 | 按当前模式(上表);另两个模式无关触发点恒成立:**内容要被复用前、派发子智能体要传它前**,须先更到为真 |
| subagent/(task.md·result.md·message/) | 日志 | 派发/回传即写(通信本身就是写文件),永不回改;不受模式影响 |
| 各处索引 | 生成/状态 | 手写部分随宿主文件同触发;可推导部分由巡检重建 |
| 能力层(.agent/skills|agents + MEMORY.md 路由表;根 .claude/ 仅 harness 执行物) | 能力 | 新增/修改能力物时同步登路由表(不登=不存在);hook 类(根 .claude/)一律给用户过目;不受模式影响 |
| context/ · deliverables/ · files/ | 静态 | 产生时写,基本不回改 |

auto/full 模式下的自动更新 = agent 直接执行 `modules/update.md` 例程(自调,不经 command);人手动触发同一例程 = 对话指令或 /project-update 分发。规模软指引(巡检提醒不硬卡):MEMORY.md 保持一屏读完的量级;过长优先拆文件而不是删信息——信息量优先。

## §9 生命周期与巡检

- **开工**:init 例程(手动 = 对话指令或 /project-init,含 --mode 定模式)。建 `.agent/MEMORY.md`(含模式行)+ context/ + deliverables/(任务 profile 另建飞书任务夹,沿用双侧机制)+ AGENTS.md/CLAUDE.md 指针行;`.agent/` 其余子目录按需出现(首次派发才建 subagent/,首条 note 才建 note/,首个能力物才建 skills/)。
- **生长**:单文件超规模→拆;子任务完结→task/Archive/;结论被第二处引用→抽 note/;可复用流程/派发模板成熟→固化进 .claude/ 能力层;废稿→就地清理或随节点归档。会话恢复/新 session 接入→recall 例程(手动 = 对话指令或 /project-recall;full 模式自动);阶段收口/移交→update 例程(手动 = 对话指令或 /project-update;auto/full 模式按 §8 自动)。
- **收尾**:update 例程(工作区内状态型终更 + 交付发布到本任务飞书夹 + 台账同步 + 末步冲突检查)→ 工作区级归档沿用双侧机制(tasks/_archive/ + 飞书 Archive/)。全局 AI 索引登记由周一飞书文档整理任务(原 doc-curation-daily,2026-07-02 降频合并)周度增量兜底,不是 update 例程职责;全局记忆更新也不在本例程(归 project-update 编排或 memory-management 自身纪律,2026-07-03 用户裁决)。**归档时能力层处置**:`.agent/skills|agents` 走路由表、无 harness 注册,随目录归档零残留;仅当工作区建过根级 `.claude/`(hooks 等)时才需归档改名 `.claude.archived/`、hookify 规则停用,恢复时改回。
- **巡检六项**(scripts/lint.sh;由 memory-weekly-check 每周对各工作区执行,R11 裁决):① 结构合规(含双根 MEMORY.md+memory.md 并存 = error);② 状态型新鲜度(none 模式常态偏旧属预期,只对 auto/full 报);③ 死链(索引引用 path 存在性);④ 可推导索引核对;⑤ 派发留档完整性(task.md/result.md 成对;越界写由 update 时 agent 判断);⑥ 能力层对账(.agent/skills|agents 实物 ↔ MEMORY.md 路由表;归档区无活跃根级 .claude/)。

## §10 接缝与切换

- **update 边界(钉死)**:只更新工作区内部文件,含其线上对应的飞书任务夹(交付发布、台账同步);**不碰**全局枢纽记忆、时间线、harness auto-memory、全局 AI 索引、mira-sync——全局层维护不属本系统(定时任务兜底存量 + 用户显式指令)。
- **全局项目记忆(定位卡)**:细节唯一权威 = 工作区 MEMORY.md,枢纽只留定位卡(≤6 行:path/token/现状行);维护 = memory-management 按其模式(缺省 auto 里程碑无痕 + 对话指令/项目命令手动)+ memory-weekly-check 周度对账,2026-07-02 起生效。
- **飞书双侧不动**:Task/<中文名> 结构(根=交付 + context/ + refs/ + agent/)、「中间过程与记忆不上飞书」原则、双侧归档全部沿用。
- **老规范兼容(软切换)**:根为 memory.md 的存量任务 = 旧规范,维持原样、不按新规范"纠正";巡检对其只查死链;迁移仅在用户要求时做(scaffold 遇 memory.md 拒绝执行并提示走迁移)。
- **三层元系统**:harness-management(harness 桶变更唯一入口 + 落点决策表;2026-07-03 替代 continue-learning)与 memory-management(全局记忆 Meta skill,三库)分工见各自 SKILL.md;原独立 record skill 已归档(2026-07-02),工作区收尾由本 skill update 子模块承接(v3)、全局侧按 memory-management 双触发。

## §11 命令层(v3:薄 command + 内置子模块)

三个内置子模块 = `modules/init.md`(开工)、`modules/recall.md`(定向)、`modules/update.md`(落盘,末步冲突检查)。**手动入口** = 对话指令或上层 /project-* 命令分发(单层薄 command 已于 2026-07-03 撤销;原三个命令 skill 已归档 `~/.claude/skills-archive/`);**自动入口** = auto/full 模式下 agent 按 §8 纪律直接执行模块例程(none 模式不自调)。工具脚本在本 skill `scripts/`,模板在 `templates/`。

## §12 能力层管理

→ 独立文件 `capability-layer.md`。
