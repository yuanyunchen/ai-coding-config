# 工作区 v4 规范全文

面向 agent。SKILL.md 是摘要；本文件是完整规则。版本历史见 `../CHANGELOG.md`。

## 1. 设计原则

1. **工具管结构，agent 管内容。** 编号、目录、索引、生成区块都由 `ws` 写；agent 只写自然语言内容。手写的结构必然漂移（v3 的 VideoAgent 工作区里，手写索引指向了不存在的目录）。
2. **规则必须在场。** 规则写进工作区 AGENTS.md 的「工作协议」区块：Claude Code 在没有 CLAUDE.md 时会自动加载 AGENTS.md，子智能体同样加载（2026-11-01，Claude Code 2.1.316，用埋暗号的探针实测）。只放在按需加载的 skill 里的规则会被忽略。
3. **能交给机器的检查不交给自觉。** 用户原文由 hook 记录；派发由 hook 把关；结果文件由 hook 追收；状态门槛由 `ws` 检查。
4. **记录分两类。** 日志只追加（task.md、progress.md、inbox、派发留档），状态必须为真（goal、plan、AGENTS.md 手写节、memory）。日志用来复盘和仲裁，永不回改。
5. **失败开放。** hook 出错一律放行，不能因为守卫本身的问题卡住工作。

## 2. 结构与文件职责

```
<workspace>/
├── AGENTS.md
└── .agents/
    ├── ws.json · .gitignore（inbox/、.state/）
    ├── inbox/YYYY-MM-DD.md
    ├── .state/{lock, inbox-filed.log, skips.log, hooks-off?}
    ├── memory/{INDEX.md, <主题>/…}
    ├── skills/<名>/SKILL.md
    └── task/NN-<名>/{task.md, goal.md, plan.md, progress.md, result.md, input/, subagent/NN-<名>/, task/NN-<名>/}
```

| 文件 | 谁写 | 何时 | 性质 |
|---|---|---|---|
| AGENTS.md 手写节 | 主 agent | 有变化时 | 状态 |
| AGENTS.md 生成区块、memory/INDEX.md | `ws index`（hook 在每轮结束时自动跑） | 自动 | 生成 |
| inbox | hook | 用户每条消息 | 日志 |
| task.md | 上层：人的原文经 `ws req` 归档，或父节点经 `ws task new --stdin` / `ws dispatch --stdin` | 创建时 + 追加 | 日志 |
| goal.md、plan.md | 执行者 | active 之前；plan 改动记进「修订记录」 | 状态 |
| progress.md | 执行者用 `ws log`；`ws` 自动记 status/dispatch/req | 过程中 | 日志 |
| result.md | 执行者（派发里是子智能体自己） | 收尾 | 状态，交给上层 |
| memory 文件 | 主 agent、子智能体 | 产生可复用知识时 | 状态 |

根目录（task 类型）只有 AGENTS.md 和 `.agents/`（另允许 .git、.gitignore、README.md）。产物放在产生它的任务节点里，由 result.md 列出；AGENTS.md 任务树链接各顶层节点的 result.md。

## 3. 识别与两种类型

- **识别**：从 cwd 向上找，停在 `$HOME` 之前，最近的 `.agents/ws.json`（v4）或 `.agent/MEMORY.md` / `.agent/memory/`（v3）胜出。只有 `.agent/` 而没有这两者的目录（例如 OpenClaw 的 `.agent/workflows`）不算工作区。
- **命名冲突**：`~/.agents/skills/` 是 lark-cli 托管的 skill 副本，Codex 会自动注册它；它和工作区的 `.agents/` 同名不同物，工作区规则从不作用于 `$HOME`。
- **task 类型**：任务工作区，位置 `~/Desktop/AI Workspace/tasks/<kebab名>/`；AGENTS.md 全部由 agent 维护；整体归档到 `tasks/_archive/`。
- **repo 类型**：代码仓库。AGENTS.md 由人维护，`ws init --profile repo --yes` 只在末尾追加 `<!-- ws:begin -->…<!-- ws:end -->` 区块，区块外一个字不改；追加前必须征得用户同意。仓库若已有 CLAUDE.md 且没有 `@AGENTS.md`，Claude Code 读不到区块，`ws init` 会提示，由用户决定是否加引用。`.agents/` 是否提交进 git 逐个仓库问用户；不提交时写进 `.git/info/exclude`，不改被跟踪的 .gitignore。
- **harness 模式覆写**：AGENTS.md 头部（repo 类型在区块头部）的 `harness=none|auto` 在本工作区内优先于 harness-management 的全局模式。工作区本身没有模式：建了工作区，规则就全部生效；轻任务不建工作区。

## 4. 任务节点

- **编号**：两位数起，每个父目录下 `task/` 与 `subagent/` 各自从 01 连续编号；`ws` 在锁内分配，并行安全。重试用新编号，失败的那次原样保留。
- **状态**：`planned → active → done`，以及 `blocked`、`dropped`；记在 progress.md frontmatter，变化由 `ws task status` 记一行日志。
- **门槛**：
  - active：goal.md 和 plan.md 去掉标题和注释后必须有内容；
  - done：result.md 的 status 为 DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED 之一且有内容；所有派发都有 result.md；所有子任务 done 或 dropped；`source` 指向本节点的 draft memory 已转正；inbox 没有未归档原文；
  - `--force "<原因>"` 可跳过，原因记进 progress，`ws check` 不会替你掩盖遗留问题。
- **拆分**：一步能做完的直接做；需要独立验收、跨多步或跨会话的建子任务；交给子智能体执行的走派发。同一波次可并行的派发，各自负责的文件不能重叠（写进 plan.md「拆分」表）。层级建议不超过 3 层。
- **不挪目录**：完成的节点原地标 done；AGENTS.md 任务树只展开含 active 节点的子树，其余折叠成一行。
- **输入文件**：用户交来的文件复制进该节点的 `input/` 并在 task.md 里引用；大数据集、代码仓库只记路径。需要跨任务复用的，提取后写进 memory（type: source）。

## 5. 需求原文与 inbox

- hook 在 UserPromptSubmit 时把用户亲手输入的消息原样追加进 `.agents/inbox/<日期>.md`，条目 ID 形如 `p1a2b3c4d`。不记：子智能体回报（`<task-notification>`）、跨会话消息、本地命令输出、`claude -p` 等非交互会话（`WS_HOOKS=force` 可强制记录）。
- 不少于 20 个字符的消息会附带一行提示，给出条目 ID；更短的（"继续""好的"）静默记录，无需归档。
- 归档：`ws req <ID> --entry <id>` 追加进已有节点 task.md 的「## 追加 <时间> · 用户原文 · <id>」；`ws req --new <slug> --entry <id> [--parent ID]` 开新任务；`ws req --not-req <id>…` 标成不是需求（提问、闲聊）。
- 含疑似密钥（`sk-`、`ghp_`、`AKIA`、`xox?-`、私钥头、`XXX_KEY=…`）的原文拒绝归档，除非加 `--allow-secret`：task.md 可能进 git，inbox 不会。
- 没有 hook 的环境（Codex、Cursor、Trae）：把用户原话照录，`ws req <ID> --stdin` 或 `ws task new <slug> --stdin`。

## 6. 派发

协议正文见 `subagent-protocol.md`。hook 在 PreToolUse(Agent) 时检查：
- 只读类型直接放行：Explore、Plan、claude-code-guide、web-fetch、statusline-setup；
- prompt 含 `[ws:skip]` 放行，但记进 `.state/skips.log`，SessionStart 时显示近 7 天次数。只用于结果不进工作区的只读调研；
- 其余派发，prompt 必须引用一个真实存在、还没有 result.md、且「任务与背景」「成功标准」已填写的 `.agents/task/…/subagent/NN-*/task.md`，否则拒绝，拒绝原因里给出 `ws dispatch` 的用法。
- SubagentStop 时，若对应派发没有合格的 result.md：第一次拦下并要求补写；第二次仍没有，hook 把它最后一条消息存为 `status: UNVERIFIED` 的 result.md，并在父节点 progress 记一笔。主 agent 核对后改成正式状态。

已知绕过途径（hook 管不到，靠规则约束）：Bash 里直接跑 `claude -p` / `codex exec`、Workflow 工具、用 SendMessage 续接已有子智能体。续接时把新要求追加进原派发的 task.md，或新建派发。

## 7. memory

- **组织**：目录表示"关于什么"（主题，由 agent 起名，可多层）；类型写在 frontmatter，不做目录。
- **frontmatter**：`summary`（一句话，INDEX 由它生成）、`type`（knowledge / convention / source / lesson / decision）、`tags`、`source`（节点或派发 ID）、`status`（draft / stable）、`updated`。模板：`templates/memory-note.md`。
- **生长**：一个主题先是一个文件；超过约 300 行变成同名目录并拆分；一个目录超过约 10 个文件时再按子主题分。
- **索引**：`memory/INDEX.md` 由 `ws index` 生成，含完整目录树、按类型视图、草稿清单；AGENTS.md 只列顶层目录和篇数。
- **草稿**：子智能体新写的一律 `status: draft`、`source: <派发ID>`；节点收尾时主 agent 审阅后改为 stable 或合并进已有文件。
- **不放**：进度、状态、只对某个节点有用的中间结果（留在节点里）。
- **规范类内容**（代码风格、报告格式、角色说明、同一批派发共用的说明）写成 `type: convention`，派发 task.md 的「必读」只引用路径。
- **升级到全局**：跨项目仍成立的内容交给 memory-management（全局记忆）或 harness-management（规则、skill）。

## 8. AGENTS.md

- 十节：定位、用户偏好与约定、规则、环境与命令、地图（外部资源 + memory 区块）、任务树（区块）、关键决策、风险与已知坑、工作协议（区块）、Skills（区块）。模板：`templates/AGENTS.task.md`、`templates/AGENTS.repo-block.md`。
- 篇幅 100–200 行（`ws check` 超过 200 行告警）：每次会话都会加载，长度就是每轮的成本；细节写进 memory，这里留一行指针。
- 区块 `<!-- ws:NAME -->…<!-- /ws:NAME -->` 由 `ws index` 生成，不带时间戳，重复生成结果不变；标记不成对时 `ws index` 报错退出，不猜。
- 「规则」节属于项目级行为约束：用户的裁决照录并注明出处；agent 自己总结的规则按 harness-management 的流程和模式处理。其余各节是工作区状态，agent 直接维护。
- 「外部资源」记录本工作区相关的飞书 token、外部代码路径、数据表，供 doc-curation 等定时任务读取。

## 9. hook 行为（`~/.claude/hooks/workspace-guard.py`）

| 事件 | 行为 |
|---|---|
| SessionStart | v4：注入 `ws status`（active 节点、目标首句、最近进度、未归档原文、检查摘要、绕过次数）；v3：注入一句"按 v3 办，不要转换" |
| UserPromptSubmit | 记录用户亲手输入的消息（见 §5） |
| PreToolUse(Agent) | 派发把关（见 §6） |
| SubagentStop | 追收 result.md（见 §6） |
| Stop | 静默运行 `ws index` |

开关：`WS_HOOKS=off` 全局关闭；`.agents/.state/hooks-off` 关闭单个工作区；`WS_HOOKS=force` 在非交互会话里也记录原文。单次调用约 50 毫秒（实测）。测试：`~/.claude/hooks/tests/`，用 Claude Code 2.1.316 的真实输入样例。

## 10. 检查与收尾

`ws check` 的检查项（error 会让退出码为 1）：

| code | 级别 | 内容 |
|---|---|---|
| ws-json / structure | error | 标记文件、memory/、task/、AGENTS.md 缺失 |
| number | error | `task/`、`subagent/` 下有不符合 `NN-<名>` 的条目或重复编号 |
| node-file / task-status | error | 节点缺文件、status 非法 |
| result-status | error | result.md 状态非法或只有骨架；done 节点缺 result.md |
| dispatch / dispatch-open | error / info | 派发缺 task.md；还没回结果（父节点已 done 时为 error） |
| markers | error | 生成区块标记不成对 |
| skeleton | warn | active 节点的 goal/plan 仍是骨架 |
| unverified | warn | hook 代存的 result.md 待核对 |
| memory-fm / memory-draft | warn | memory 缺 summary/type；来源已收尾的草稿 |
| agents-length / dead-link / root-file / legacy | warn | AGENTS.md 超 200 行；失效链接；根目录有多余文件；同时存在 `.agent/` |
| inbox | warn | 未归档原文 |
| stale | info | 生成内容过期（`ws index` 修复） |

收尾时的冲突仲裁：task.md（上层的原话）优先，其次是实际产物，最后是自己写的记录；消解结果记进 AGENTS.md「关键决策」。

## 11. 边界

- **全局记忆**（memory-management）：枢纽只留项目定位卡，细节以工作区 AGENTS.md 和 `.agents/` 为准；工作区 update 例程不碰全局枢纽。
- **harness**（harness-management）：AGENTS.md「规则」节和 `.agents/skills` 属于项目级 harness；全局 skill、规则、hook 的改动走 harness-management。
- **飞书**：只有用户要求飞书交付或任务已有明确飞书目标时，才建并维护飞书侧 `Task/<中文名>/`（结构沿用：根 = 交付 + context/ + refs/ + agent/）；token 记进 AGENTS.md「外部资源」。
- **`/agent` 命令**：有自己的 `.workspace/` + `deliverables/` 结构，与 v4 不兼容；不要在 v4 工作区里运行它。
- **v3 工作区**：见 `v3-legacy.md`。

## 12. 已知限制

- Codex、Cursor、Trae 没有这套 hook：规则仍在 AGENTS.md 里生效，`ws` 照常可用，但原文记录、派发把关、结果追收都要靠 agent 自觉（协议里写了兜底做法）。Codex 是否自动注册项目内 `.agents/skills/` 未验证。
- `claude -p` 测不到会话恢复、上下文压缩、后台子智能体回报这些交互场景；hook 在这些场景下的表现以真实会话的冒烟测试为准。
- Claude Code 不会自动发现 `.agents/skills/`（2026-11-01，2.1.316，探针实测），工作区 skill 靠 AGENTS.md 的 Skills 表按路径读取。
