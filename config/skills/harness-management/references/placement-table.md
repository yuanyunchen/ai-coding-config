# placement-table — 落点决策表(WHERE 的可执行速查)

> 2026-07-02 记忆系统 v2 沉淀(task-workspace-fs-upgrade R8~R11);2026-07-03 随 harness-management 建立改写(原属 continue-learning)。本表 = update 模块第 ②③ 步的可执行压缩;冲突时以 SKILL.md 与 modules/update.md 机制文本为准。

## 一、硬判别:先定桶(按内容性质,不看落点文件)

- **harness 桶** = 行为约束:该怎么做 / 禁忌 / 流程 / 触发条件 → 落 AGENTS.md / SKILL.md,**走 harness-management update 流程(按模式 × 层级定审批,见 SKILL.md 模式表)**。把行为约束改写成"知识条目"落记忆库 = 绕门,禁止。
- **记忆桶** = 事实 / 状态 / 偏好取值 / 环境信息 → 转 memory-management 按其模式落库(缺省 auto 无痕);**例外:skill memory(如域 skill 的 memory.md)属 harness 层文件,即便装的是环境事实也走本 skill update 流程**;与既有条目冲突时按「覆盖 OR 留旧」询问,不静默覆盖。

## 二、落点速查(自上而下,首个命中即落;单一 home + 指针,禁多层重复)

| 判定 | 落点 | 形态 |
|---|---|---|
| 只在调用某 skill 时有意义(如该 skill 的踩坑) | **该 skill 内**(唯一 home) | 高频短规则/必躲的坑 → SKILL.md 正文或路由表行;执行细节/低频配方 → references/;环境事实/实测数据(token/版本/配额) → skill memory(feishu-task-management/memory.md 模式) |
| 跨 skill 但仅本任务语境成立 | 工作区 `.agent/memory/note/` | 一事一文件厚写,工作区 MEMORY.md 索引指向(记忆桶,归 workspace/memory 侧) |
| 项目级行为约束 / 项目专属能力物 | 项目 .claude/、项目 CLAUDE.md、工作区 .agent/skills\|agents | auto 模式直改报备,none 模式走审批;工作区能力物执行规范 = workspace capability-layer |
| 跨任务跨 skill 恒真 | **全局层** | 记忆桶 → 枢纽知识检索库(转 memory-management);harness 桶 → AGENTS.md 或全局 skill(全局级审批) |
| 属某领域(飞书/字节广告/未来新域) | **域 store** | **域行为规则**(如飞书写作规范)→ 域 skill 文本;执行坑 → 域 skill memory;工作知识 → 域语义库(basic-memory project 硬隔离,记忆桶);全局只留一行指针,域细节零渗漏。**域新 skill**(整条新能力)→ 建成域入口 skill 的**内部伪 skill**(飞书域 = `feishu-task-management/subskills-local/<域>/`,摘除全局注册 + 登路由表),**禁止**注册为 `~/.claude/skills/` 直属全局 skill |

## 三、升级时机规则(防两向失衡)

内容**先落它诞生的最低层**;**第二次在别处用到才升一层**,升层时原地改为指针。
- 防过度泛化:首遇不升全局(全局层污染 = 每会话 context 税)。
- 防复用丢失:第二次用到即升,不永埋任务里。
- 域记忆模式为泛化模板:新领域语料成规模才建独立域 store,不预建空库。
