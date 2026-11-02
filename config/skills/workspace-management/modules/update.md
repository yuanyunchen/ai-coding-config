# update — 阶段收口、收尾、移交（手动 = 对话指令或 /project-update）

家族根 = `~/.claude/skills/workspace-management/`。参数：`[--handoff <下一个会话要做什么>] [--deep]`（`--deep`：逐个核对所有节点和 memory，而不只看本会话）。

**边界**：只更新工作区内部；仅在已有明确飞书目标时，包括它的飞书任务夹。不碰全局枢纽、时间线、全局 AI 索引、mira-sync——全局层归 memory-management。

1. **回看本会话**：新需求、决策、进展、意外发现、踩坑、新文件、新外部资源。
2. **清 inbox**：`ws inbox`，逐条 `ws req … --entry` 归档或 `ws req --not-req`。
3. **更新节点**：决策和意外用 `ws log <ID> --tag decision|surprise "…"` 记下；做完的节点写 result.md（结论、产物、验证、偏差、写入 memory），再 `ws task status <ID> done`；被门槛拦下就按提示补齐，不要随手 `--force`。
4. **整理 memory**：跨任务有用的知识写进 `.agents/memory/<主题>/`；审阅草稿，转正、合并或删除。
5. **更新 AGENTS.md 手写节**：偏好、规则（用户裁决）、关键决策、风险、外部资源。超过 200 行时把细节移进 memory 留指针。
6. **检查**：`ws index`，再 `ws check`，error 当场修。
7. **冲突检查（最后一步，必做）**：goal / plan / result / AGENTS.md / memory 与 task.md 原话是否矛盾，索引与实物是否一致。仲裁顺序：task.md > 实际产物 > 自己写的记录。直接消解，不问人，消解结果记进 AGENTS.md「关键决策」。
8. **任务收尾**（用户说收尾或归档时）：
   - 顶层节点写好 result.md 并标 done；
   - 仅用户要求飞书交付或已有明确飞书目标时，按 feishu-task-management 发布到飞书 `Task/` 并归档飞书 `Archive/`；
   - task 类型的工作区整体移到 `~/Desktop/AI Workspace/tasks/_archive/`；根上若有 `.claude/`，改名 `.claude.archived/`。
9. **`--handoff`**（跨环境移交才用）：在当前顶层节点写 `handoff.md`。不重复工作区已有内容，一律引用路径；写明下一个会话要做什么、建议用哪些 skill；去掉 API key 和个人信息。
10. **回报**：更新了哪些文件、消解了哪些冲突、`ws check` 的结果。
