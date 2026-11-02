# recall — 接手与恢复（手动 = 对话指令或 /project-recall）

家族根 = `~/.claude/skills/workspace-management/`。参数：`[--task <节点ID>] [--deep]`。v3 工作区按 `references/v3-legacy.md` 读 `.agent/MEMORY.md`。

1. **入口已在上下文里。** AGENTS.md 每次会话自动加载；hook 在会话开始和压缩后注入了 `ws status`。看不到这段注入时自己跑 `ws status`。
2. **读进行中的节点**（默认只读这些，别让 recall 吃掉恢复后的上下文）：task.md 全文（含所有「追加」）、goal.md、plan.md、progress.md 最近十几行；有派发回来的，读它的 result.md。`--task <ID>` 读指定节点。
3. **`--deep`**：再读 `.agents/memory/INDEX.md` 和其中与当前节点相关的文件、上层节点的 task.md 与 plan.md。
4. **核对新鲜度。** progress 最后一行的时间与节点里文件的修改时间对不上、或 `ws check` 报了问题时，在摘要里标明"可能过期"，不当作事实引用。
5. **处理遗留。** `ws inbox` 有未归档原文的，当场归档或标成非需求。
6. **向用户回一段摘要**：现在在哪个节点、在做什么、下一步是什么；确认一致后再继续。
