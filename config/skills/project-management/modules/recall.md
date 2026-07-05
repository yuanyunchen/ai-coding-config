# recall — 三层重读(子模块;手动 = /project-recall)

参数:`[--deep]`(原样下传三层)。
统一流程 = 按「任务状态 → 长期记忆 → 行为约束」顺序读,输出**一份合并摘要**,不是三段独立输出。

## 流程

1. **workspace recall**(在哪):执行 workspace-management `modules/recall.md`——入口链一跳读、新鲜度核查、拿到当前 goal/progress/模式行(含 harness 字段)。
2. **memory recall**(知道什么):执行 memory-management `modules/recall.md`,主题 = 第 1 步得到的任务语境——只查与本任务相关的定位卡/知识/域 store,不全库扫。
3. **harness recall**(守什么规):执行 harness-management `modules/recall.md`——AGENTS.md + 本会话已用 skill + 项目 CLAUDE.md/能力层路由表,漂移核对。
4. **合并输出**:一份三段摘要——「现在在哪/在做什么/下一步」+「相关前史与关键事实(含指针)」+「仍然生效的关键约束 + 漂移点(如有,标注建议走 harness update 例程(/project-update --only harness))」;可疑陈旧处统一标注。与用户确认同频后再继续干活。
