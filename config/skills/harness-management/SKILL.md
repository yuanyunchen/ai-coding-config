---
name: harness-management
description: "Harness 层(skill/command/agent/hook/全局规则/settings)一切新增与修改的唯一入口;二模式(none 缺省/auto),recall·update 两例程,内部 subskills 承载写作与三源同步。触发:记下来、以后都这样、下次直接用、别再、保存为规则/模版/skill、改 skill、加规则、调 AGENTS.md、建 command/hook/subagent、沉淀、迭代 skill;同步三源、sync skills、deploy harness、agent-config;或长对话/压缩后重读核心规则防漂移。边界:记忆桶转 memory-management。"
---

# harness-management — Harness 层管理(规范权威 + 模式 + 子模块)

Harness 层 = 约束 agent 行为的持久配置:skill(含 subskill/伪 skill)、command、agent(派发类型)、hook、全局规则(AGENTS.md)、settings。**对这一层的任何新增/修改都走本 skill**——判桶 → 判层 → 冲突检查 → 按模式审批 → 路由执行。与 workspace-management(工作区)、memory-management(全局记忆)同构三件套:模式 + recall/update 子模块 + 薄 command;三层 recall 各管一件事——workspace 恢复任务状态、memory 恢复长期记忆、harness 恢复行为约束。

2026-07-03 起替代 continue-learning(已归档在当前工具 home 的 `skills-archive/continue-learning/`);原「过 continue-learning 门」语义 = 走本 skill update 流程、按当前模式定审批。上层编排 = `project-management`(/project-init·recall·update,三系统一次走齐)。

## 模式(二模式,缺省 none;模式行就在本节,改模式 = 用户说一声、改此行)

**模式:none**

| 模式 | 纪律 |
|---|---|
| **none(缺省)** | 对话中零主动沉淀、零修改。只在人调 update 例程(对话指令或 /project-update)时反思本会话:找需求与现有 skill 的出入、可抽象复用的过程 → 给方案(哪层/改什么/为什么)→ 提问 → 审批后执行 |
| **auto** | 实时关注两类信号:① 需求与现有 skill/规则有出入;② 对话中出现可留存的可复用过程。**项目级**(项目 agent 配置目录、项目 AGENTS/CLAUDE 指导文件、工作区 .agent/skills\|agents)直接改,回复中一行报备;**全局级**(当前工具 home 下 skill/规则/command/agent,如 `~/.claude`/`~/.codex`/`~/.cursor`)向用户提简短建议——什么问题、如何改——批准后才改 |

项目内可覆写:工作区 `.agent/MEMORY.md` 模式行的 `harness=` 字段(project-init 设定)在该工作区内优先于本节全局模式行。模式无关恒成立:**hook 任何层级一律给用户过目**;记忆桶内容(事实/状态/偏好取值)不归本 skill,转 memory-management(其模式独立,缺省 auto 无痕写三库不受本 skill 模式影响)。

## 总体原则(对 continue-learning 机制内核的承接)

1. **双桶硬判别(防绕门)**:按内容性质定桶,不看落点文件——行为约束(该怎么做/禁忌/流程/触发条件)= harness 桶,走本 skill;事实/状态/偏好取值/环境信息 = 记忆桶,转 memory-management。行为约束改写成「知识条目」落记忆库 = 绕门,禁止。
2. **单一 home + 升级时机**:内容先落它诞生的最低层,第二次在别处用到才升一层,升层时原地改指针;同一条规则不在多层重复。落点速查 = `references/placement-table.md`。
3. **冲突禁并存**:新内容与现有条目冲突 → 问用户「覆盖 OR 留旧」二选一;两种行为都要保留 = 改写成一条条件分支规则,不写两条平行条目。
4. **最小改动,贴用户原述**:只动非动不可的;记录贴近用户原话,不扩写也不简化到失真。
5. **透明点名**:面向用户的消息里显式声明本轮用到的 skill(`使用 skill:X、Y`);连续同一 skill 首轮点名后可简写,禁整段不提。

## 子模块与路由(要干什么 → 一跳)

recall / update 是内置子模块(`modules/`):手动 = 对话指令或 /project-* 分发;auto 模式下 update 例程由 agent 按上表纪律自调。

| 场景 | 走 |
|---|---|
| 长对话累积 / 上下文压缩后 / 怀疑行为漂移、约束丢失(重读核心文件) | `modules/recall.md`(手动 = 对话指令或 /project-recall) |
| 沉淀/修改任何 harness 物:判桶判层、冲突检查、审批、执行、验证登记 | `modules/update.md`(手动 = 对话指令或 /project-update;auto 模式自调) |
| 落点速查(哪层/什么形态/何时升级) | `references/placement-table.md` |
| 怎么写 SKILL.md(结构/description 触发预算/拆分纪律) | `subskills/skill-authoring/SKILL.md`(+ 同目录 writing-great-skills 两篇进阶) |
| 建新 skill 的脚手架、跑 eval、description 调优 | `subskills/skill-creator/SKILL.md`(原全局 skill-creator,整目录收编) |
| 写/审 AGENTS.md、CLAUDE.md 等 agent 指导文件 | `subskills/agent-file/SKILL.md`(原全局 write-agent-file) |
| 三源同步 / deploy / pull / links / 从 GitHub 更新推三工具(任意 cwd) | `subskills/multi-source-sync/SKILL.md` |
| hook / 权限 / settings.json / env | 内置 update-config skill(session 内置,外部执行层;hook 过目后才落) |
| 工作区 .agent/ 能力物的结构与登记规范 | workspace-management `references/capability-layer.md`(执行规范在彼;沉淀决策在本 skill) |

插件侧同类物(superpowers:writing-skills、anthropic-skills:skill-creator)已有内部替代,不外用;插件与 lark-cli 托管副本(当前工具 home 的 `plugins/**`、`~/.agents/skills/**`)不动结构(skill-authoring 边界节)。

## 硬纪律(绝不可违)

1. 改任何 harness 物之前先走 `modules/update.md` 流程;不允许跳过直接 Edit(即便用户已表态许可,流程本身要走——判桶/判层/冲突检查是为落点正确,不是为审批而审批)。
2. hook 一律过目;不静默改 AGENTS.md(全局级永远先给方案)。
3. 冲突禁并存(原则 3);删除/归档 skill 只出建议,不静默删。
4. subskills 已摘全局注册,只经本 skill 路由 Read 加载;新增 subskill 与路由表同笔更新(登表即存在)。
