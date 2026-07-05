# init — 项目开工(子模块;手动 = /project-init)

参数:`[任务名/目录] [--mode none|auto|full](缺省 none) [--profile task|repo] [--deep]`。
统一流程 = memory recall 先行 → workspace init → harness 接线,一遍走完;不是三次独立转发。

## 流程

1. **定模式**:按 SKILL.md 模式映射表把 --mode 展开为 workspace/harness 两字段(none→none/none,auto→auto/auto,full→full/auto)。
2. **memory recall 先行**(带任务主题):执行 memory-management `modules/recall.md`——查枢纽定位卡有无本任务前史、相关域 store、用户偏好;命中的条目留作第 4 步写进工作区。`--deep` 下传。
3. **workspace init**:执行 workspace-management `modules/init.md` 全流程(scaffold、飞书任务夹、context 逐文件摄取、goal 草拟、requirement 落盘;`--profile`/`--deep` 下传);其中模式行写成 `模式:workspace=<m> · harness=<m>`(第 1 步的映射结果),全局记忆自判步骤跳过(第 2 步已做,把命中指针直接写进 MEMORY.md §3)。
4. **harness 接线**:盘点本项目既有 harness 物(项目 .claude/、工作区 .agent/skills|agents)登 MEMORY.md 能力层路由表;harness=auto 时向用户一句声明「本项目 harness auto:项目级直改报备、全局级建议审批」。
5. **开工确认**:一段简短回复——工作区在哪、双侧链接、模式(workspace/harness)、前史命中(如有)、goal 一句话。
