# recall — 重读定向(子模块;手动 = 对话指令或 /project-recall 分发,full 模式新 session 接入时 agent 自调)

家族根 = `~/.claude/skills/workspace-management/`(WM)。参数:`[--task <子任务节点>] [--deep]`。老规范工作区(根=memory.md)= 直接读 memory.md 全文即可,以下针对新规范。

## 流程

1. **入口链一跳读**(默认只读索引点名的,防 recall 吃掉恢复后的宝贵 context):
   AGENTS.md/CLAUDE.md(项目规范 + 指针行)→ **`.agent/MEMORY.md`**(含模式行——后续按该模式执行更新纪律)→ 沿其核心索引读:goal / progress、活跃 task 节点、索引点名的核心代码文件与 note、requirement 总结、**能力层路由表**(本工作区可用能力物;用某能力 = 按表 Read 其 SKILL 文件,非 harness 自动加载)。
   `--task <节点>` 加读该节点全目录;`--deep` 再沿二跳展开。辅助:`WM/scripts/tree-summary.sh <根>` 看结构与状态文件 mtime。
2. **新鲜度核查**:状态型文件最后更新 vs 工作区最近活动(tree-summary 的 mtime 段);可疑陈旧处显式标注「此信息可能过期」,不当真相引用(none 模式下状态文件常态性偏旧,属预期,不算异常)。
3. **定向输出**:向用户回简短摘要——现在在哪 / 在做什么 / 当前模式 / 下一步;与用户确认同频后再继续干活。
