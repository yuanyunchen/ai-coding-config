# Agent Harness 系统

## 定位

本目录是 Yunchen 的 Agent Harness 配置源仓与升级工作区，按 workspace-management v4 管理。
当前入口为 README.md；原有仓库操作说明保留在 CLAUDE.md；新机器配置看 SETUP.md。
全局规则正文是 config/AGENTS.md，中文镜像是 config/AGENTS-cn.md；本文件是项目入口。

## 文件地图

| 内容 | 位置 |
|---|---|
| 人读入口与历史导航 | [README.md](README.md) |
| 全局英文规则及中文镜像 | [config/AGENTS.md](config/AGENTS.md)、[config/AGENTS-cn.md](config/AGENTS-cn.md) |
| 自有 skills / agents / commands / hooks 快照 | config/skills/、config/agents/、config/commands/、config/hooks/ |
| 插件快照与清单 | [config/plugins/README.md](config/plugins/README.md) |
| 管理入口与实现 | agent-config、scripts/ |
| 仓库操作细节 | [CLAUDE.md](CLAUDE.md) |
| 当前基线及运行目录定位 | [.agents/memory/harness-baseline.md](.agents/memory/harness-baseline.md) |
| 对话原文与最终答复 | [.agents/conversation.md](.agents/conversation.md) |
| 迁移过程及结果 | [.agents/task/01-workspace-migration/progress.md](.agents/task/01-workspace-migration/progress.md)、[result.md](.agents/task/01-workspace-migration/result.md) |
| 系统升级待办 | [.agents/task/02-harness-upgrade/task.md](.agents/task/02-harness-upgrade/task.md) |

## 环境与命令

```sh
ws status
ws check
ws inbox
ws index
./agent-config help
./agent-config memory status
./agent-config deploy --dry-run
git log --all --date=short --format='%h %ad %s'
```

实际运行配置在 ~/.claude、~/.cursor、~/.codex、~/.trae；config/ 是配置快照。
Canonical live 源沿用既有约定 ~/.claude；本轮只迁移工作区，没有拉回或部署运行配置。
脚本与运行目录映射以 CLAUDE.md 为准，不从本文件推断新的同步策略。

## 无 hook 环境的对话记录兜底

在 Codex 等没有 workspace-guard 事件的环境，每轮先检查本会话消息是否已记录；未记录时，
用 ws 同套 wslib.Workspace.record_question(session_id, None, 用户原文) 追加 Q 和 inbox，
再用 ws req --entry 归档至相应任务，更新 task spec；结束前用 record_answer 追加最终回复。
导入 wslib 的目录由 ~/.local/bin/ws.resolve().parent 定位；不存在时用当前工具的 workspace-management/scripts。
不要创建或注册新 hook，也不要覆盖或截改旧对话；短问答可用 ws req --not-req 标记。
本规则补齐生成协议的无 hook 分支，不改变已有平台的 hook 注册。

## 本轮授权边界

本轮完成迁移、记录与升级入口。后续升级范围在 T02 审计；全局规则、skills 与 hook 的实质修改走 harness-management。
项目记录及任务说明可纳入仓库版本控制；conversation.md、inbox.md 和 secrets.env 按 ws 默认留在本机。
本轮不提交迁移前既有改动，不自动推送 GitHub。

<!-- ws:begin -->
## Agent 工作区（v4）

> 本区块由 agent 维护（`ws init` 写入）；区块外的内容由人维护，agent 不改。harness=auto

### 规则
- 2026-11-16：把当前 Agent Harness 系统搬到这里，以 workspace-management 管理，能查看具体文件与历史，之后系统性升级。来源：T01 用户原文 p20261116。

### 任务树
<!-- ws:tree -->
- T01 迁移 Harness 并建立可追溯工作区 — done · [result](.agents/task/01-workspace-migration/result.md)
- T02 Harness 基线审计与系统升级方案 — planned
- T03 安装 Answer me with HTML 并对比现有能力 — done · [result](.agents/task/03-answer-me-with-html/result.md)
- T04 按 Slack 官方流程接入可被 @ 的 Agent — blocked，派发 11 · [result](.agents/task/04-slack-agent-setup/result.md)
  - （2 个子任务，已折叠）
<!-- /ws:tree -->

### 外部资源
- 原仓兼容入口：/Users/yuanyunchen/Desktop/AI Programing/Agent Development/ai-coding-config（软链到当前目录）。
- 全局记忆：../global-memory/（软链到原全局记忆仓，不复制数据）。
- 历史归档定位：[history-sources.md](.agents/memory/history-sources.md)。

### memory
<!-- ws:memory -->
索引和按类型视图：[.agents/memory/INDEX.md](.agents/memory/INDEX.md)；目录先读它的 README.md

- [harness-baseline.md](.agents/memory/harness-baseline.md) — 迁移时源仓、运行目录、既有改动和兼容路径的事实基线 `knowledge`
- [history-sources.md](.agents/memory/history-sources.md) — Harness Git 历史、既有整改归档与本轮起始 Q&A 的查看入口 `source`
<!-- /ws:memory -->

### 关键决策
- 2026-11-16：搬移实体仓库并保留原路径软链；相邻记忆仓使用软链，兼容现有管理脚本。
- 2026-11-16：先保全未提交改动；Git 历史与本轮原文分别保留，不把旧会话伪装成本工作区历史。
- 2026-11-16：T01 完成本轮建区，T02 保持 planned，后续从基线审计进入系统升级。

### 工作协议
<!-- ws:protocol -->
本目录是 v4 工作区（标记文件 `.agents/ws.json`）。以下规则对主 agent 和子智能体都生效，hook 与 `ws check` 会检查。`ws` 不在 PATH 时用 `python3 /Users/yuanyunchen/.claude/skills/workspace-management/scripts/ws`。

1. 需求原文：用户每条消息和每轮的最终回答由 hook 自动记入 `.agents/conversation.md`（Q&A），用户消息另记一份 `.agents/inbox.md`。开工时 `ws focus <节点ID>` 设一次当前节点，之后每条用户消息自动追加进它 task.md 的「原文记录」，不用逐条归档或分类；换任务时重设。需求或方向有变化，把变化合进「任务说明」（`ws task spec`）。没有 hook 的环境（Codex 等）把用户原话照录：`ws req <节点ID> --stdin`。
2. 任务节点：`.agents/task/NN-<名>/`，子任务在节点的 `task/` 下，结构相同。用 `ws task new <slug> [--parent ID]` 创建，不手建目录。task.md 由上层写，执行者不改：上半部「任务说明」（目标、背景、要求、约束、验收标准、输入、未定事项）是当前有效的完整任务，「要求」逐条 `- [ ]`，完成 `[x]`，取消 `[-]` 写理由并告知用户；每次归档新原文后当轮整段改写并用 `ws task spec <ID> --stdin` 写回；下半部「原文记录」只追加。任务说明写好、goal.md 和 plan.md 写好后执行 `ws task status <ID> active`；过程用 `ws log <ID> "…"` 追加进 progress.md；写完 result.md 后执行 `ws task status <ID> done`。
3. 拆分：一步能做完的直接做；需要独立验收或跨多步的建子任务；交给子智能体执行的走派发。输入给定、输出很小的单次判断（打分、两两比较）用脚本批量调模型，不逐条开子智能体。
4. 派发：先 `ws dispatch <ID> <slug> --stdin`（从 stdin 传入背景、成功标准、必读路径、可写范围），再原样使用它打印的那行 prompt。规范类内容写进 `.agents/memory/`，派发说明里只引用路径。未经 `ws dispatch` 的派发会被拦截；只读调研类子智能体（Explore、Plan 等）不受限。外部执行（codex exec、claude -p）用 `ws dispatch --external` 登记。给原执行者加新要求先 `ws followup <派发ID> --stdin` 再发续接消息；产物、可写范围或角色变了就新开派发。
5. 子智能体：只在自己的派发目录和 task.md 授权的路径内写；结果写入派发目录的 result.md（frontmatter `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`）：上层下一步要用的写进 result.md（6KB 内），只有复核才看的放附件并列进「附件」；聊天最后只回 `<STATUS> <result.md 路径>`；信息不足或受阻时返回 NEEDS_CONTEXT 或 BLOCKED，不猜。同一任务多次派发共用的说明写进节点的 `brief.md`，`ws dispatch` 会自动列进必读。
6. 主 agent 以 result.md 为准，不以聊天回复为准；没有 result.md 的派发按失败处理。「需要上层处理」逐条定修 / 豁免 / 报用户，各记一行 `ws log <ID> --tag decision "Snn …"`，推迟到汇总不算处理；同类派发先试跑一份，问题处理完再铺开。重要节点交给另一个子智能体独立验收。步骤与原因见派发协议第二节。
7. memory：只放跨任务有用的事实、做法、教训、资料摘要、长期决策，按主题分目录；文件头写 summary、type、tags、source、status、updated，代码或数据类再写 basis（依据的提交）和 covers（覆盖的目录）；开头写要点。单文件超过 8KB 改成同名目录：README.md（要点 + 下层文件表，读完就能干活）+ 下层文件。计划、建议、TODO 留在任务节点；用户裁决只写 AGENTS.md「规则」节。子智能体新写的标 `status: draft`，节点收尾时转正或合并。
8. AGENTS.md 由 agent 维护，100–200 行；`<!-- ws:… -->` 区块由 `ws index` 生成，不手改；「规则」节只记用户的裁决，自己想出的规则走 harness-management。
9. 收尾：`ws check` 无 error；改过代码或数据的，核对提示过期的 memory；冲突以 task.md 为准，其次是实际产物，最后才是自己写的记录。给人看的产物放节点的 `deliverables/`；密钥只放 `.agents/secrets.env`，不进 task.md 和 memory。一个节点派发超过 3 波（距本波第一次派发 10 分钟以上算新一波）就把后续波次建成子任务，`ws dispatch` 会拦下。可复用的事实、标准、方法、教训转进 memory，派发只引用路径：口径不必每次重讲、各子智能体一致、下个会话不用翻几十份结果。时机：试跑定下口径时、同一段说明要写第二遍时、节点收尾时。

常用：`ws status` 看现状 · `ws check` 查问题 · `ws index` 刷新索引。规范全文：/Users/yuanyunchen/.claude/skills/workspace-management/references/spec.md
<!-- /ws:protocol -->

### Skills
<!-- ws:skills -->
（暂无。工作区专属 skill 放 `.agents/skills/<名>/SKILL.md`，用时按本表路径读取）
<!-- /ws:skills -->
<!-- ws:end -->
