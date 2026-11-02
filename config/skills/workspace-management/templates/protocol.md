本目录是 v4 工作区（标记文件 `.agents/ws.json`）。以下规则对主 agent 和子智能体都生效，hook 与 `ws check` 会检查。`ws` 不在 PATH 时用 `python3 {ws}`。

1. 需求原文：用户每条消息由 hook 自动记入 `.agents/inbox/`。凡是需求或方向变化，当轮归档：`ws req <节点ID> --entry <id>`；开新任务用 `ws req --new <slug> --entry <id>`；不是需求的用 `ws req --not-req <id>`。没有 hook 的环境（Codex 等）把用户原话照录：`ws req <节点ID> --stdin`。
2. 任务节点：`.agents/task/NN-<名>/`，子任务在节点的 `task/` 下，结构相同。用 `ws task new <slug> [--parent ID]` 创建，不手建目录。task.md 由上层写，只追加；goal.md 和 plan.md 写好后执行 `ws task status <ID> active`；过程用 `ws log <ID> "…"` 追加进 progress.md；写完 result.md 后执行 `ws task status <ID> done`。
3. 拆分：一步能做完的直接做；需要独立验收或跨多步的建子任务；交给子智能体执行的走派发。
4. 派发：先 `ws dispatch <ID> <slug> --stdin`（从 stdin 传入背景、成功标准、必读路径、可写范围），再原样使用它打印的那行 prompt。规范类内容写进 `.agents/memory/`，派发说明里只引用路径。未经 `ws dispatch` 的派发会被拦截；只读调研类子智能体（Explore、Plan 等）不受限。
5. 子智能体：只在自己的派发目录和 task.md 授权的路径内写；结果写入派发目录的 result.md（frontmatter `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`），聊天最后只回 `<STATUS> <result.md 路径>`；信息不足或受阻时返回 NEEDS_CONTEXT 或 BLOCKED，不猜。
6. 主 agent 以 result.md 为准，不以聊天回复为准；没有 result.md 的派发按失败处理。重要节点交给另一个子智能体独立验收。
7. memory：跨任务仍有用的知识写进 `.agents/memory/<主题>/…`，文件头写 summary、type（knowledge/convention/source/lesson/decision）、tags、source、status、updated；子智能体新写的标 `status: draft`，节点收尾时转正或合并。进度和中间结果留在任务节点，不进 memory。
8. AGENTS.md 由 agent 维护，100–200 行；`<!-- ws:… -->` 区块由 `ws index` 生成，不手改；「规则」节只记用户的裁决，自己想出的规则走 harness-management。
9. 收尾：`ws check` 无 error；冲突以 task.md 为准，其次是实际产物，最后才是自己写的记录。

常用：`ws status` 看现状 · `ws check` 查问题 · `ws index` 刷新索引。规范全文：{spec}
