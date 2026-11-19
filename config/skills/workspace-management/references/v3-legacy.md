# v3 旧工作区（`.agent/`）

2026-11 之前建的工作区用 v3 规范，原样保留，不自动转换成 v4。截至 2026-11-01 已知 4 个：VideoAgent、unsloth-puzzles、search-query-city-signal-quality、search-pixel-ad-side-increment（另有 `_archive/task-workspace-fs-upgrade` 已归档）。

## 识别

目录里有 `.agent/MEMORY.md` 或 `.agent/memory/`。根上通常有一个只含一行指针的 CLAUDE.md。更早的 v2 工作区根上是 `memory.md`：只读，不改。

## 在 v3 工作区里怎么做

**Working language.** Write new or updated agent-authored records under `.agent/` in English, including task briefs, goals, plans, progress, decisions, memory entries and results. Use English for messages between agents (parent to child, child to parent and peer to peer), including dispatches, follow-ups, questions and handoffs. Include this language instruction in every delegation brief, including external CLI tasks. Preserve verbatim user requests, quotes and raw evidence in their original language. Address the user in their language.

- **入口**：先读 `.agent/MEMORY.md`，再按它的核心索引读 goal/progress、note、requirement。头部模式行 `模式:workspace=… · harness=…` 决定更新纪律：none 不自动更新，auto 大模块结束时更新，full 先写后做。
- **结构**：`.agent/memory/{goal,plan,progress}.md`、`note/`、`requirement/`、`task/<子任务>/`；派发留档 `.agent/subagent/<模块>/<实例>/{task.md,result.md}`；私有资料 `.agent/files/`；能力层 `.agent/skills|agents`，经 MEMORY.md「能力层路由表」加载。根上的 context/ 是人给的输入，deliverables/ 是交付。
- **派发**：按 v4 的 `subagent-protocol.md` 执行即可（结果写 result.md、四种状态、停下条件），只是目录放在 `.agent/subagent/<模块>/<实例>/`。v3 工作区里 hook 不做派发把关。
- **巡检**：`bash ~/.claude/skills/workspace-management/scripts/legacy/lint-v3.sh <工作区根>`。
- **绑定 v3 结构的 skill**：feishu-task-management 下的 libra-ad-recall-metrics、building-feishu-bots 按 v3 路径工作，对应工作区迁移时再一起改。

## 为什么不自动转换

v3 工作区里有其他 skill、定时任务和人依赖的路径（MEMORY.md 的外部源台账、`.agent/memory/note/` 下的文件）。自动转换会悄悄打断这些依赖。

## 用户要求迁移时

1. `ws init` 之前先把 `.agent/` 改名备份，确认没有进程在用。
2. 对应关系：MEMORY.md 的定位、偏好、决策、外部源 → AGENTS.md 对应各节；`memory/note/` → `.agents/memory/<主题>/`（补 frontmatter）；`memory/requirement/` → 顶层任务的 task.md（原文照录）；goal/plan/progress → `task/01-<名>/`；`subagent/<模块>/<实例>/` → 对应节点的 `subagent/NN-<名>/`；`files/refs` → memory（type: source）；context/ → 节点 `input/`；deliverables/ → 产生它的节点。
3. 更新绑定 v3 路径的 skill 和定时任务，跑 `ws check` 到 0 error，再删除备份。
