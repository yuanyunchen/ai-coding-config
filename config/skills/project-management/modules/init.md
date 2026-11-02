# init — 项目开工(子模块;手动 = /project-init)

参数:`[任务名/目录] [--mode none|auto](缺省 none) [--profile task|repo] [--deep]`。
统一流程 = memory recall 先行 → workspace init → harness 接线,一遍走完;不是三次独立转发。

## 流程

1. **定模式**:--mode 只决定 harness(none|auto,缺省 none);工作区没有模式。
2. **memory recall 先行**(带任务主题):执行 memory-management `modules/recall.md`——查枢纽定位卡有无本任务前史、相关域 store、用户偏好;命中的条目留作第 4 步写进工作区。`--deep` 下传。
3. **workspace init**:执行 workspace-management `modules/init.md` 全流程(ws init、首个任务原文进 task.md、输入文件摄取、goal/plan;仅有明确飞书目标时建飞书任务夹;`--profile`/`--deep` 下传);AGENTS.md 头部写 `harness=<m>`(第 1 步结果),其中「查前史」步骤跳过(第 2 步已做,把命中指针直接写进 AGENTS.md「外部资源」或工作区 memory)。
4. **harness 接线**:盘点本项目既有 harness 物(项目 .claude/、工作区 .agents/skills;后者由 ws index 自动列进 AGENTS.md 的 Skills 表);harness=auto 时向用户一句声明「本项目 harness auto:项目级直改报备、全局级建议审批」。
5. **开工确认**:一段简短回复——工作区在哪、harness 模式、前史命中(如有)、T01 目标一句话;仅已启用飞书交付时附飞书链接。
