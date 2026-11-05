本目录是 v4 工作区（标记文件 `.agents/ws.json`）。以下规则对主 agent 和子智能体都生效，hook 与 `ws check` 会检查。`ws` 不在 PATH 时用 `python3 {ws}`。

1. 需求原文：用户每条消息和每轮的最终回答由 hook 自动记入 `.agents/conversation.md`（Q&A），用户消息另记一份 `.agents/inbox.md`。凡是需求或方向变化，当轮归档：`ws req <节点ID> --entry <id>`；开新任务用 `ws req --new <slug> --entry <id>`；不是需求的用 `ws req --not-req <id>`。没有 hook 的环境（Codex 等）把用户原话照录：`ws req <节点ID> --stdin`。
2. 任务节点：`.agents/task/NN-<名>/`，子任务在节点的 `task/` 下，结构相同。用 `ws task new <slug> [--parent ID]` 创建，不手建目录。task.md 由上层写，执行者不改：上半部「任务说明」（目标、背景、要求、约束、验收标准、输入、未定事项）是当前有效的完整任务，「要求」逐条 `- [ ]`，完成 `[x]`，取消 `[-]` 写理由并告知用户；每次归档新原文后当轮整段改写并用 `ws task spec <ID> --stdin` 写回；下半部「原文记录」只追加。任务说明写好、goal.md 和 plan.md 写好后执行 `ws task status <ID> active`；过程用 `ws log <ID> "…"` 追加进 progress.md；写完 result.md 后执行 `ws task status <ID> done`。
3. 拆分：一步能做完的直接做；需要独立验收或跨多步的建子任务；交给子智能体执行的走派发。输入给定、输出很小的单次判断（打分、两两比较）用脚本批量调模型，不逐条开子智能体。
4. 派发：先 `ws dispatch <ID> <slug> --stdin`（从 stdin 传入背景、成功标准、必读路径、可写范围），再原样使用它打印的那行 prompt。规范类内容写进 `.agents/memory/`，派发说明里只引用路径。未经 `ws dispatch` 的派发会被拦截；只读调研类子智能体（Explore、Plan 等）不受限。外部执行（codex exec、claude -p）用 `ws dispatch --external` 登记。给原执行者加新要求先 `ws followup <派发ID> --stdin` 再发续接消息；产物、可写范围或角色变了就新开派发。
5. 子智能体：只在自己的派发目录和 task.md 授权的路径内写；结果写入派发目录的 result.md（frontmatter `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`）：上层下一步要用的写进 result.md（6KB 内），只有复核才看的放附件并列进「附件」；聊天最后只回 `<STATUS> <result.md 路径>`；信息不足或受阻时返回 NEEDS_CONTEXT 或 BLOCKED，不猜。同一任务多次派发共用的说明写进节点的 `brief.md`，`ws dispatch` 会自动列进必读。
6. 主 agent 以 result.md 为准，不以聊天回复为准；没有 result.md 的派发按失败处理。「需要上层处理」逐条定修 / 豁免 / 报用户，各记一行 `ws log <ID> --tag decision "Snn …"`，推迟到汇总不算处理；同类派发先试跑一份，问题处理完再铺开。重要节点交给另一个子智能体独立验收。步骤与原因见派发协议第二节。
7. memory：只放跨任务有用的事实、做法、教训、资料摘要、长期决策，按主题分目录；文件头写 summary、type、tags、source、status、updated，代码或数据类再写 basis（依据的提交）和 covers（覆盖的目录）；开头写要点。单文件超过 8KB 改成同名目录：README.md（要点 + 下层文件表，读完就能干活）+ 下层文件。计划、建议、TODO 留在任务节点；用户裁决只写 AGENTS.md「规则」节。子智能体新写的标 `status: draft`，节点收尾时转正或合并。
8. AGENTS.md 由 agent 维护，100–200 行；`<!-- ws:… -->` 区块由 `ws index` 生成，不手改；「规则」节只记用户的裁决，自己想出的规则走 harness-management。
9. 收尾：`ws check` 无 error；改过代码或数据的，核对提示过期的 memory；冲突以 task.md 为准，其次是实际产物，最后才是自己写的记录。给人看的产物放节点的 `deliverables/`；密钥只放 `.agents/secrets.env`，不进 task.md 和 memory。一个节点派发超过 3 波（距本波第一次派发 10 分钟以上算新一波）就把后续波次建成子任务，`ws dispatch` 会拦下。可复用的事实、标准、方法、教训转进 memory，派发只引用路径：口径不必每次重讲、各子智能体一致、下个会话不用翻几十份结果。时机：试跑定下口径时、同一段说明要写第二遍时、节点收尾时。

常用：`ws status` 看现状 · `ws check` 查问题 · `ws index` 刷新索引。规范全文：{spec}
