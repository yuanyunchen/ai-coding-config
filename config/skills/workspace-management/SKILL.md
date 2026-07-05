---
name: workspace-management
description: "Agent 工作区文件系统唯一权威:结构规范、记忆模式(none/auto/full)、init·recall·update 三例程。触发:长任务开工或用户明确要求时——建任务文件夹/工作区、任务收尾、归档、发布交付、恢复工作区上下文、工作区内派发 subagent、管理项目级能力物、设置记忆模式;触发词:工作区、workspace、长期任务、收尾、归档、record、MEMORY.md。边界:轻任务不加载,常驻核心在 AGENTS.md Workspace 板块。"
---

# workspace-management — Agent 工作区文件系统(规范权威 + 模式 + 子模块)

一个工作区 = 根级**共用区**(人可见:AGENTS.md/CLAUDE.md + context/ + deliverables/,不放人不需要看的)+ **`.agent/` 私有区**(agent 的一切:记忆·过程·能力层)。
入口 = **`.agent/MEMORY.md`**(agent 自维护;根上 AGENTS.md/CLAUDE.md 归项目规范 + 一行指针,agent 不自行改)。飞书侧 `Task/<中文名>/`(根=交付 + context/refs/agent)不变。
2026-07-03 起为唯一权威(v3:原 task-workspace v2 改名重构——requirement 并入 memory/、更新纪律改三模式、三命令 skill 收编为内置子模块 + 薄 command;record 子模块 2026-07-03 统一更名 update)。上层编排 = `project-management`(/project-init·recall·update,三系统一次走齐)。

## 结构一图

```
<workspace>/
├── AGENTS.md|CLAUDE.md(根上唯一 agent 相关文件:项目规范 + 指针行 → .agent/MEMORY.md)
├── context/(人给的输入)   ├── deliverables/(根=正式交付;过程产物入子夹)
└── .agent/
    ├── MEMORY.md(记忆主入口,含模式行 + 能力层路由表)
    ├── memory/(goal·plan·progress 按需单文件 + note/ + requirement/ + task/<子任务>/… + task/Archive/)
    ├── subagent/<模块>/<实例>/(task.md 输入 · result.md 输出 · message/ 多轮)
    ├── files/(refs/ 自查参考 + 私有中间结果)
    └── skills/ · agents/(能力层:路由表加载,非 harness 注册;根 .claude/ 仅 hooks 等执行物按需建)
```

两 profile:任务工作区(`~/Desktop/AI Workspace/tasks/<kebab名>/`)= 全量;代码 repo = 只铺 .agent/(repo 的 AGENTS.md 不动,加指针须人确认)。

## 记忆模式(v3 核心;细则见 spec §8)

模式管的是**状态型文件的自动更新纪律**(MEMORY.md、memory/ 各文件、note、requirement、task 节点);日志型派发留档(subagent/ task.md·result.md)不受模式影响,派发/回传即写。模式记在 `.agent/MEMORY.md` 头部模式行;init 例程 --mode(经 /project-init)设定,用户会话中随时可改。

| 模式 | 纪律 |
|---|---|
| **--none(缺省)** | 不自动更新记忆。只写完成任务所必需的文件:派发 task.md、必须传递的 note、交付物。手动触发照常可用(对话指令或 /project-*) |
| **--auto** | 事后更新:大模块结束、或状态与记忆系统出现较大出入时,agent 自动跑 update 例程 post-更新(以「新增是否达到记录必要」取舍) |
| **--full** | 即时更新,先写后行动:goal/plan 先落盘再执行,progress 随做随更;新 session 接入自动跑 recall 例程 |

## 子模块与命令(要干什么 → 一跳)

init / recall / update 是本 skill 的三个内置子模块(`modules/`):**手动** = 对话指令或 /project-* 命令分发;**自动** = auto/full 模式下 agent 按上表纪律自调(none 模式不自调)。

| 场景 | 走 |
|---|---|
| 新任务开工 / 初始化工作区(理解输入、构建初期记忆) | `modules/init.md`(手动 = 对话指令或 /project-init;脚手架 = `scripts/scaffold.sh`) |
| 会话压缩恢复 / 新 session 接入 / 上下文漂移(recall 记忆) | `modules/recall.md`(手动 = 对话指令或 /project-recall) |
| 阶段收口 / 收尾落盘 / 移交(更新记忆,最后查冲突) | `modules/update.md`(手动 = 对话指令或 /project-update) |
| 派发子智能体 | **必读** `references/subagent-protocol.md` + `scripts/new-dispatch.sh` |
| 建/改工作区能力物(skill·命令·派发类型·hook)/ 查路由表机制 | `references/capability-layer.md`(路由表加载;hook 一律给用户过目) |
| 查规范细则(结构/模式/索引/归档/接缝) | `references/spec.md`(§ 编号与设计稿一致) |
| MEMORY.md / 派发 task.md / 指针行 模板 | `templates/` |
| 巡检(结构/新鲜度/死链/索引/留档/能力层) | `scripts/lint.sh <根>`(memory-weekly-check 周度执行,R11 裁决) |
| 结构摘要 / 状态文件新鲜度速看 | `scripts/tree-summary.sh <根>` |

## 硬纪律(全文见 references/spec.md,此处只列绝不可违)

1. **私有/共用轴**:人不需要看的不出 `.agent/`(含 MEMORY.md 与能力层);人要看的不埋里面(过程产物 → deliverables/ 子夹)。根上除 AGENTS.md/CLAUDE.md、context/、deliverables/ 外不放东西。
2. **模式纪律(spec §8)**:状态型文件按当前模式更新,缺省 --none 不自动更;requirement 已并入 memory/,与其他状态型同步更新(update 例程补录),不再即时追加;日志型派发留档不受模式影响,派发/回传即写,永不回改。
3. **update 边界**:只更新工作区内部(含其飞书任务夹);全局枢纽/时间线/AI 索引/mira-sync 不碰。update 收尾必做冲突检查(仲裁基准 = requirement 原文 > 实物 > 记忆)。
4. **老规范兼容**:根为 memory.md 的存量任务 = 旧规范(07-01 版四件:memory.md+context/work/deliverables),维持原样不"纠正",巡检只查死链;迁移仅在用户要求时做。
5. **归档**:双侧归档沿用(tasks/_archive/ + 飞书 Archive/);.agent/ 能力层零处置,仅存在根级 .claude/(hooks 等)时改名 `.claude.archived/`。
6. **能力层登记即存在**:.agent/skills|agents 只经 MEMORY.md 路由表加载——不登表 = 不存在;新增能力物与路由表同笔更新。

新会话进工作区:先读 `.agent/MEMORY.md` 再干活(根 AGENTS.md/CLAUDE.md 指针行已接线;auto/full 模式按模式行执行对应纪律)。
