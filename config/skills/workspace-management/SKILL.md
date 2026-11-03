---
name: workspace-management
description: "Agent 工作区 v4 的唯一规范：结构、ws 命令行、派发协议、memory 组织，以及 init / recall / update 三个例程。触发：长任务开工或用户要求时——建工作区、任务收尾、恢复工作区上下文、在工作区里拆任务或派发子智能体、整理工作区 memory、管理工作区 skill；当前目录向上能找到 .agents/ws.json（v4）或 .agent/（v3 旧版）时。触发词：工作区、workspace、长期任务、收尾、归档、ws、.agents。边界：轻任务不建工作区；全局记忆归 memory-management，harness 变更归 harness-management。"
---

# workspace-management — Agent 工作区 v4

一个工作区 = 根目录的 `AGENTS.md`（agent 维护的入口和地图）+ `.agents/`（agent 的一切）。结构性写入全部走 `ws` 命令行；hook `~/.claude/hooks/workspace-guard.py` 负责注入现状、记录用户原文、拦截不合规的派发、收回子智能体的结果。规则正文写进每个工作区 AGENTS.md 的「工作协议」区块，主 agent 和子智能体每次会话都会读到。

## 结构

```
<workspace>/
├── AGENTS.md                 入口和地图，agent 维护，100–200 行；<!-- ws:… --> 区块由 ws index 生成
└── .agents/
    ├── ws.json               激活标记：有它才是 v4 工作区（也是锁；"hooks": "off" 关 hook）
    ├── conversation.md       hook 记下的 Q&A：用户原文 + 每轮最终回答 + 归档标记（只追加，不进 git）
    ├── secrets.env           密钥（600，不进 git）
    ├── memory/               知识库：按主题分目录；大文件拆成目录 + README.md；INDEX.md 自动生成
    ├── skills/<名>/SKILL.md  工作区专属 skill，AGENTS.md 的 Skills 表自动列出
    └── task/NN-<名>/         任务节点，结构到哪一层都一样：
        ├── task.md           上层写，只追加（人的原文或父节点的说明）
        ├── goal.md · plan.md 自己写，开工前
        ├── progress.md       frontmatter status + 只追加的日志
        ├── result.md         自己写，收尾时交给上层：核心 ≤6KB + 附件索引
        ├── brief.md          可选：本节点多次派发共用的说明，派发时自动列进必读
        ├── input/ · deliverables/  用户交来的文件 · 给人看的产物
        ├── subagent/NN-<名>/ 派发：task.md 进，result.md 出（子智能体自己写）
        └── task/NN-<名>/     子任务，同样结构
```

ID 由路径推出：`T01.02` 是任务 01 的子任务 02，`T01.02/S03` 是它的第 3 次派发。

## 八条硬规则

1. **是不是工作区只看 `.agents/ws.json`。** 家目录下的 `~/.agents/skills` 是 lark-cli 托管的 skill 副本，与工作区无关；`ws` 和 hook 都不会越过 `$HOME` 往上找。
2. **结构只由 `ws` 创建。** 任务、派发、编号、索引都用命令生成；不手建 `NN-` 目录，不手改 `<!-- ws:… -->` 区块。
3. **需求原文不丢。** 用户消息和每轮回答由 hook 自动记进 conversation.md；凡是需求或方向变化，当轮用 `ws req` 归档进对应节点的 task.md。task.md 只追加，执行者不改写。
4. **节点有门槛。** goal 和 plan 写好才能 active；result.md 合格、派发都有结果、子任务收尾、本节点的 draft 转正、inbox 清空，才能 done。
5. **派发走文件。** 先 `ws dispatch` 生成 task.md，再原样使用它打印的 prompt；子智能体自己写 result.md，聊天回复不算结果。协议见 `references/subagent-protocol.md`。
6. **memory 只放跨任务有用的事实、做法、教训、资料、长期决策。** 按主题分目录；超过 8KB 拆成目录 + README.md（读完 README 就能干活）；代码类笔记写 basis/covers 以便查过期；计划和建议留在任务节点，用户裁决只写 AGENTS.md「规则」节；子智能体写的标 draft。
7. **AGENTS.md 是地图。** 控制在 100–200 行，细节放进 memory 留指针；「规则」一节只记用户的裁决，自己想出的规则走 harness-management。
8. **v3 工作区原样保留。** 有 `.agent/MEMORY.md` 或 `.agent/memory/` 的目录按 `references/v3-legacy.md` 办，不自动转换。

## 命令

`ws` 在 `~/.local/bin`（软链到本 skill 的 `scripts/ws`）；不在 PATH 时用 `python3 <本 skill>/scripts/ws`。

| 命令 | 作用 |
|---|---|
| `ws init [DIR] [--profile task\|repo] [--title] [--yes]` | 新建工作区；repo 类型只在 AGENTS.md 末尾追加一个区块，需用户同意后加 `--yes` |
| `ws req --new <slug> --entry <id>` · `ws req <ID> --entry <id>` · `ws req --not-req <id>` | 把 inbox 原文开成新任务、追加进已有节点，或标成"不是需求"；`--stdin` 用于没有 hook 的环境 |
| `ws task new <slug> [--parent ID] [--title] [--stdin]` | 新建任务节点（上层的说明从 stdin 进 task.md） |
| `ws task status <ID> <planned\|active\|blocked\|done\|dropped>` | 改状态，带门槛检查；`--force "<原因>"` 跳过检查，原因记进 progress |
| `ws dispatch <ID> <slug> --stdin` | 新建派发目录和 task.md，打印派发用的那行 prompt |
| `ws log <ID> "…" [--tag decision\|surprise\|note]` | 在 progress.md 追加一行 |
| `ws inbox` · `ws status` · `ws check` · `ws index` | 未归档原文 · 现状摘要 · 全面检查 · 刷新生成区块 |
| `ws migrate` | v4.0 工作区（inbox/、.state/）迁到 v4.1 |

## 例程与参考

| 场景 | 读 |
|---|---|
| 开工、建工作区 | `modules/init.md` |
| 新会话接手、压缩后恢复 | `modules/recall.md` |
| 阶段收口、收尾、移交 | `modules/update.md` |
| 派发子智能体（主 agent 必读第二节，并把路径交给子智能体读第一节） | `references/subagent-protocol.md` |
| 完整规则：识别、repo 类型、节点生命周期、inbox、memory、AGENTS.md、hook、检查项、边界、已知限制 | `references/spec.md` |
| 工作区 skill 与根 `.claude/` | `references/capability-layer.md` |
| v3 旧工作区 | `references/v3-legacy.md`；巡检 `scripts/legacy/lint-v3.sh` |
| 模板 | `templates/`（AGENTS 两种、协议、节点五件、派发、memory 笔记与目录 README） |
| 版本历史 | `CHANGELOG.md` |

测试：`python3 -m unittest discover -s scripts/tests`（ws）与 `python3 -m unittest discover -s ~/.claude/hooks/tests`（hook）。
