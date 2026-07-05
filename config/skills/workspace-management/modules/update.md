# update — 整理落盘(子模块;手动 = 对话指令或 /project-update 分发,auto/full 模式下 agent 按纪律自调)

家族根 = `~/.claude/skills/workspace-management/`(WM)。参数:`[--handoff <下一session要干什么>] [--deep 全面盘点:逐文件核对索引/task 节点/能力层对账,非只本会话增量]`。承接原 workspace-checkpoint(record 名已统一为 update,2026-07-03)。
**边界钉死(spec §10)**:只更新工作区内部文件,含其线上对应的飞书任务夹(交付发布、MEMORY.md 飞书台账同步);**不碰**全局枢纽记忆 / 时间线 / harness auto-memory / 全局 AI 索引 / mira-sync——全局层归 memory-management(三库双触发:里程碑时主 agent 按其纪律顺手全局 update,那是主 agent 的动作,不是本例程的)。

## 流程

1. **回看采集**:盘点本会话新增——需求 / 决策 / 进展 / 踩坑 / 新文件 / 新能力物 / 新外部 doc。
2. **按 spec §8 写盘**:`.agent/MEMORY.md`、`.agent/memory/`(goal、progress、task 节点、note、requirement 原文补录与总结)、能力层路由表、飞书台账。以「新增是否达到记录必要」取舍;信息量优先,过长拆文件不删信息。requirement 补录贴用户原语义,不改写已录条目。
3. **任务收尾时**(用户说收尾/归档):交付发布到本任务飞书 Task 夹(执行走 feishu-task-management 规约)→ 双侧归档(tasks/_archive/ + 飞书 Archive/;.agent/ 能力层零处置,仅存在根级 .claude/ 时改名 `.claude.archived/`,见 spec §9)。
4. **--handoff(可选,跨环境移交才用)**:生成移交文档——不重复工作区已有内容、一律引 path;含 suggested-skills 节;按参数「下一 session 要干什么」定制;脱敏(API key / 个人信息)。存 deliverables/process/。
5. **冲突检查(最后一步,必做)**:核对文件间矛盾与陈旧事实——goal/progress/总结 vs requirement 原文、MEMORY.md 索引 vs 实物;仲裁基准 = requirement 原文 > 实物 > 记忆;依记忆直接消解、不问人,消解动作写入 MEMORY.md 关键决策留痕,可回溯。顺手跑 `WM/scripts/lint.sh <根>`,error 当场修。
6. 向用户回简短确认:更新了哪些文件、消解了什么冲突(如有)、lint 结果。
