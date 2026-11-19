# 工作区 v4 规范全文

面向 agent。SKILL.md 是摘要；本文件是完整规则。版本历史见 `../CHANGELOG.md`。

## 1. 设计原则

1. **工具管结构，agent 管内容。** 编号、目录、索引、生成区块都由 `ws` 写；agent 只写自然语言内容。手写的结构必然漂移（v3 的 VideoAgent 工作区里，手写索引指向了不存在的目录）。
2. **规则必须在场。** 规则写进工作区 AGENTS.md 的「工作协议」区块：Claude Code 在没有 CLAUDE.md 时会自动加载 AGENTS.md，子智能体同样加载（2026-11-01，Claude Code 2.1.316，用埋暗号的探针实测）。只放在按需加载的 skill 里的规则会被忽略。
3. **能交给机器的检查不交给自觉。** 用户原文由 hook 记录；派发由 hook 把关；结果文件由 hook 追收；状态门槛由 `ws` 检查。
4. **记录分两类。** 日志只追加（task.md「原文记录」、progress.md、conversation.md、inbox.md、派发留档），状态必须为真（task.md「任务说明」、goal、plan、AGENTS.md 手写节、memory）。日志用来复盘和仲裁，永不回改。
5. **失败开放。** hook 出错一律放行，不能因为守卫本身的问题卡住工作。

## 2. 结构与文件职责

```
<workspace>/
├── AGENTS.md
└── .agents/
    ├── ws.json · .gitignore（conversation.md、inbox.md、secrets.env）
    ├── conversation.md        用户 Q + 每轮最终回答 A + 归档标记，只追加
    ├── inbox.md               只有用户消息（日期时间 + 编号 + 原文），只追加
    ├── secrets.env            密钥（600，不进 git）
    ├── memory/{INDEX.md, <主题>.md, <主题>/{README.md, …}}
    ├── skills/<名>/SKILL.md
    └── task/NN-<名>/{task.md, goal.md, plan.md, progress.md, result.md, brief.md?, input/, deliverables/, subagent/NN-<名>/, task/NN-<名>/}
```

| 文件 | 谁写 | 何时 | 性质 |
|---|---|---|---|
| AGENTS.md 手写节 | 主 agent | 有变化时 | 状态 |
| AGENTS.md 生成区块、memory/INDEX.md | `ws index`（hook 在每轮结束时自动跑） | 自动 | 生成 |
| conversation.md | hook（Q：用户每条消息；A：每轮最终回答）；`ws req` 追加归档标记 | 自动 | 日志 |
| inbox.md | hook（与 Q 同时写，只有用户消息） | 自动 | 日志 |
| task.md「任务说明」 | 上层（人的需求由主 agent 整理；子任务由父节点写），`ws task spec --stdin` 写回 | 创建时 + 每次需求变化 | 状态 |
| task.md「原文记录」 | `ws req` 归档用户原文；`ws task new --stdin` 记上层说明 | 追加 | 日志 |
| goal.md、plan.md | 执行者 | active 之前；plan 改动记进「修订记录」 | 状态 |
| progress.md | 执行者用 `ws log`；`ws` 自动记 status/dispatch/req | 过程中 | 日志 |
| result.md | 执行者（派发里是子智能体自己） | 收尾 | 状态，交给上层；核心 + 附件索引，≤6KB |
| brief.md | 节点执行者 | 同一节点多次派发共用的说明 | 状态；`ws dispatch` 自动列进必读 |
| memory 文件 | 主 agent、子智能体 | 产生可复用知识时 | 状态 |

根目录（task 类型）只有 AGENTS.md 和 `.agents/`（另允许 .git、.gitignore、README.md）。产物放在产生它的任务节点里：给人看的放节点的 `deliverables/`，工作文件放节点根目录，都由 result.md 列出；AGENTS.md 任务树链接各顶层节点的 result.md。

锁加在 `.agents/ws.json` 上；hook 开关是 ws.json 里的 `"hooks": "off"`。旧版 v4 工作区（v4.0 的 `inbox/`、`.state/`；v4.1 的对话格式和只追加的 task.md）由 `ws migrate` 升级到 v4.2。

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
  - active：task.md「任务说明」的目标和验收标准有内容；goal.md 和 plan.md 去掉标题和注释后必须有内容；
  - done：result.md 的 status 为 DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED 之一且有内容；所有派发都有 result.md；所有子任务 done 或 dropped；`source` 指向本节点的 draft memory 已转正；
  - `--force "<原因>"` 可跳过，原因记进 progress，`ws check` 不会替你掩盖遗留问题。
- **拆分**：一步能做完的直接做；需要独立验收、跨多步或跨会话的建子任务；交给子智能体执行的走派发。同一波次可并行的派发，各自负责的文件不能重叠（写进 plan.md「拆分」表）。一个节点最多派发 3 波（距本波第一次派发 10 分钟以上的派发算新一波，所以陆续发出的派发不会连成一波；同一波并行多少路不限），之后的波次建成子任务：`ws dispatch` 在第 4 波拦下，`--force "<原因>"` 放行并记进 progress。层级建议不超过 3 层。计划只保留一份 plan.md。
- **不挪目录**：完成的节点原地标 done；AGENTS.md 任务树只展开含 active 节点的子树，其余折叠成一行。
- **task.md 结构**（模板 `templates/node/task.md` 与 `templates/node/task-spec.md`）：
  - 上半部「任务说明」：目标、背景、要求（编号，注明来源的原文 id 或上层节点）、约束、验收标准、输入、未定事项。它是当前有效的完整任务，读完就知道要做什么，不必翻原文。需求一变就整段改写成最新版本（不是追加修订），用 `ws task spec <ID> --stdin` 写回，frontmatter `updated` 随之更新。顶层任务由主 agent 根据用户原文整理；子任务由父节点写。
  - 下半部「原文记录」：只追加。`ws req` 追加用户原文（`### <时间> · 用户原文 · <id>`），`ws task new --stdin` 记上层说明。它是任务说明的依据，冲突时以原文为准。
  - `ws task new` 的 stdin 带「目标 / 验收标准」等小标题时直接作为任务说明，否则记进原文记录。
  - 检查：最新一条原文晚于 `updated` → `task-spec-stale`；active 节点的任务说明缺目标或验收标准 → `task-spec`；设为 active 时同样拦下。
  - 和 goal.md 的分工：task.md 是上层要什么，goal.md 是执行者承诺交付什么、怎么验收。
- **输入文件**：用户交来的文件复制进该节点的 `input/` 并在 task.md 里引用；大数据集、代码仓库只记路径。需要跨任务复用的，提取后写进 memory（type: source）。

## 5. 对话记录与需求原文

- 格式（给人直接看原文，所以不靠 `#` 标题区分）：结构行顶格，内容每行缩进两格，回答里的标题、横线、表格都不会被当成结构。
  ```
  ════════════════════════════════════════════════════════════════
  🙋 Q p1a2b3c4 · 2026-11-03 17:03:05 · s:4475b68a
  ════════════════════════════════════════════════════════════════

    用户原文

  ▸ 归档 p1a2b3c4 → T01            （ws req 追加；还有「▸ 非需求 <id>」「▸ 绕过派发 <时间> …」）

  ──── 🤖 A → p1a2b3c4 · 17:06:06 ────────────────────────

    本轮最终回答

  ┈┈┈┈ 🤖 A（续） → p1a2b3c4 · 17:08:10 ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈

    后台任务回来后的回复
  ```
  只追加，不改写。
- `inbox.md`：hook 记 Q 时同步追加，只有用户消息：`## <id> · <日期时间> · session <会话>` 加原文，不含回答和标记。这里只有用户原文，用 `##` 标题不会和内容混淆。
- hook 在 UserPromptSubmit 时把用户亲手输入的消息记成 Q，条目 ID 形如 `p1a2b3c4d`；在 Stop 时把该轮最终回答记成 A，挂到本会话所有未答的 Q 上；没有未答的 Q（例如后台任务回来后才给答复）时记成「A（续）→ 上一条 Q」。单条 A 超过 6000 字截断并注明（`ANSWER_MAX_CHARS`）。不记：子智能体回报（`<task-notification>`）、跨会话消息、本地命令输出、`claude -p` 等非交互会话（`WS_HOOKS=force` 可强制记录）。
- 不少于 20 个字符的消息会附带一行提示，给出条目 ID；更短的（"继续""好的"）静默记录，无需归档。
- 归档（v4.4 起自动）：`ws focus <ID>` 把当前节点写进 ws.json 的 `focus`；之后 hook 每记一条用户消息，就同时追加进该节点 task.md「原文记录」的 `### <时间> · 用户原文 · <id>` 并打上归档标记。不足 20 字的、疑似含密钥的不追加（只留在 conversation.md）。提问和需求不再区分，原文记录是完整的逐字记录；需求有变化时把变化合进「任务说明」（`ws task spec`）。没设 focus 时消息只进 conversation.md。手动补录：`ws req <ID> --entry <id>`、`ws req --new <slug> --entry <id> [--parent ID]`。
- 含疑似密钥（`sk-`、`ghp_`、`AKIA`、`xox?-`、私钥头、`XXX_KEY=…`）的原文拒绝归档，除非加 `--allow-secret`：task.md 可能进 git，conversation.md 不会。密钥统一放 `.agents/secrets.env`（600，不进 git），不得写进 task.md、memory 或派发说明。
- 没有 hook 的环境（Codex、Cursor、Trae）：把用户原话照录，`ws req <ID> --stdin` 或 `ws task new <slug> --stdin`。

## 6. 派发

协议正文见 `subagent-protocol.md`。hook 在 PreToolUse(Agent) 时检查：
- 只读类型直接放行：Explore、Plan、claude-code-guide、web-fetch、statusline-setup；
- prompt 含 `[ws:skip]` 放行，但在 conversation.md 记一条 skip 标记，SessionStart 时显示近 7 天次数。只用于结果不进工作区的只读调研；
- 其余派发，prompt 必须引用一个真实存在、还没有 result.md、且「任务与背景」「成功标准」已填写的 `.agents/task/…/subagent/NN-*/task.md`，否则拒绝，拒绝原因里给出 `ws dispatch` 的用法。
- SubagentStop 时，若对应派发没有合格的 result.md：第一次拦下并要求补写；第二次仍没有，hook 把它最后一条消息存为 `status: UNVERIFIED` 的 result.md，并在父节点 progress 记一笔。主 agent 核对后改成正式状态。

hook 还在两个时刻给主 agent 提示（只提示，不拦截）：
- 子智能体回报（`<task-notification>`）时注入一行：派发 ID、status、「需要上层处理」条数、本波还有几路没回、节点已进行多久、任务说明里还有几条要求未完成。派发由回报里的 output-file（子智能体会话记录的第一条消息）或 result.md 路径识别；不是 ws 派发的回报不提示。
- SendMessage 前：消息不少于 40 字、又没引用任何派发 task.md 时，提醒"带新要求先 `ws followup`"。

续派：`ws followup <派发ID> --stdin` 把新要求追加进原派发 task.md 的「## 追加 <时间> · 上层续派」，旧 result.md 改名为 `result-rN.md`，打印续接消息（引用 task.md 路径，SubagentStop 的追收照常生效）。续派、外部执行（`ws dispatch --external`）和 hook 的代存记录都不计波次。

已知绕过途径（hook 管不到，靠规则约束）：Bash 里直接跑 `claude -p` / `codex exec` 而不先 `ws dispatch --external`、Workflow 工具。

## 7. memory

- **放什么**：只放跨任务有用的五类——事实（代码、数据、领域的现状，注明依据版本）、做法、教训、资料摘要、长期决策及理由。
- **不放什么**：计划、建议、改进点、TODO → 任务节点的 plan.md 或 result.md；进度 → progress.md；只服务一个任务的派发说明 → 该节点的 `brief.md`；用户裁决 → AGENTS.md「规则」节（唯一位置）。`ws check` 发现 memory 里有「改进 / 建议 / 计划 / TODO / 切入点 / 下一步」类标题会提醒。
- **组织**：目录表示"关于什么"（主题，可多层），不按类型分目录；类型写在 frontmatter。
- **frontmatter**：`summary`（一句话，INDEX 和上层 README 由它生成）、`type`（knowledge / convention / source / lesson / decision）、`tags`、`source`（节点或派发 ID）、`status`（draft / stable）、`updated`；代码或数据类笔记再写 `basis`（依据的 git 提交）和 `covers`（覆盖的目录列表）。模板：`templates/memory-note.md`。
- **要点先行**：每个文件开头写 5–10 行要点。
- **分层**：单文件超过 8KB 就改成同名目录，含 `README.md` 和下层文件。README（≤3KB，模板 `templates/memory-readme.md`）写多数场合够用的要点，加一张下层文件表（文件、讲什么、什么时候读），读完 README 就能干活，需要细节时只往下读一个文件。下层文件 ≤8KB，再大就继续分层。`ws check`：目录缺 README 或表里漏列文件为 error，超限为 warn。
- **索引**：`memory/INDEX.md` 由 `ws index` 生成：顶层文件一行、顶层目录取其 README 的 summary 一行，另附按类型视图和草稿清单；AGENTS.md 只列顶层。
- **过期**：有 `basis` 和 `covers` 的笔记，`ws check` 用 git 比对覆盖目录在 basis 之后是否有改动，有就提醒；节点设为 done 时同样列出。核对后更新内容和 basis。
- **草稿**：子智能体新写的一律 `status: draft`、`source: <派发ID>`；节点收尾时主 agent 审阅后改为 stable 或合并进已有文件。
- **升级到全局**：跨项目仍成立的内容交给 memory-management（全局记忆）或 harness-management（规则、skill）。

## 8. AGENTS.md

- 十节：定位、用户偏好与约定、规则、环境与命令、地图（外部资源 + memory 区块）、任务树（区块）、关键决策、风险与已知坑、工作协议（区块）、Skills（区块）。模板：`templates/AGENTS.task.md`、`templates/AGENTS.repo-block.md`。
- 篇幅 100–200 行（`ws check` 超过 200 行告警；有了一定历史仍不足 100 行也告警）：每次会话都会加载，长度就是每轮的成本；细节写进 memory，这里留一行指针。
- 区块 `<!-- ws:NAME -->…<!-- /ws:NAME -->` 由 `ws index` 生成，不带时间戳，重复生成结果不变；标记不成对时 `ws index` 报错退出，不猜。
- 「规则」节属于项目级行为约束：用户的裁决照录并注明出处；agent 自己总结的规则按 harness-management 的流程和模式处理。其余各节是工作区状态，agent 直接维护。
- 「外部资源」记录本工作区相关的飞书 token、外部代码路径、数据表，供 doc-curation 等定时任务读取。

## 9. hook 行为（`~/.claude/hooks/workspace-guard.py`）

| 事件 | 行为 |
|---|---|
| SessionStart | v4：注入 `ws status`（active 节点、目标首句、最近进度、当前节点、检查摘要、绕过次数）；v3：注入一句"按 v3 办，不要转换" |
| UserPromptSubmit | 把用户亲手输入的消息记成 Q（见 §5）；子智能体回报时注入一行回传提示（见 §6） |
| PreToolUse(Agent) | 派发把关（见 §6） |
| PreToolUse(SendMessage) | 续接带新要求时提醒先 `ws followup`（见 §6），不拦截 |
| SubagentStop | 追收 result.md（见 §6） |
| Stop | 把本轮最终回答记成 A（见 §5），再静默运行 `ws index` |

开关：`WS_HOOKS=off` 全局关闭；ws.json 里 `"hooks": "off"` 关闭单个工作区；`WS_HOOKS=force` 在非交互会话里也记录 Q/A。单次调用约 50 毫秒（实测）。测试：`~/.claude/hooks/tests/`，用 Claude Code 2.1.316 的真实输入样例。

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
| memory-readme | error | memory 目录缺 README.md，或 README 的文件表漏列 |
| memory-fm / memory-draft / memory-size / memory-plan / memory-stale | warn | 缺 summary/type；来源已收尾的草稿；文件超 8KB 或 README 超 3KB；计划类标题；basis 之后覆盖目录有改动 |
| result-size / split | warn | result.md 超 6KB；节点派发超过 3 波且没有子任务 |
| task-spec / task-spec-stale | warn | active 节点的任务说明缺目标或验收标准；原文记录有比 `updated` 更新的条目 |
| req-open | warn | 节点已 done，任务说明「要求」里还有 `- [ ]` |
| concern-open | info | 派发结果的「需要上层处理」不为空，节点 progress 里还没有提到该派发的 decision 行 |
| close-ready | warn | active 节点的派发都已交结果、子任务都已收尾、2 小时没有新进展 |
| memory-empty / dispatch-size | warn | 已有 10 份以上派发结果而 memory 为空；派发目录超过 20MB（大数据放项目数据目录） |
| agents-length / dead-link / root-file / legacy | warn | AGENTS.md 超 200 行，或已有 10 份以上派发结果而不足 100 行；失效链接；根目录有多余文件；同时存在 `.agent/` |
| stale | info | 生成内容过期（`ws index` 修复） |

收尾时的冲突仲裁：task.md「原文记录」（上层的原话）优先，其次是实际产物，最后是自己写的记录；消解结果记进 AGENTS.md「关键决策」。

## 11. 边界

- **全局记忆**（memory-management）：枢纽只留项目定位卡，细节以工作区 AGENTS.md 和 `.agents/` 为准；工作区 update 例程不碰全局枢纽。
- **harness**（harness-management）：AGENTS.md「规则」节和 `.agents/skills` 属于项目级 harness；全局 skill、规则、hook 的改动走 harness-management。
- **飞书**：只有用户要求飞书交付或任务已有明确飞书目标时，才建并维护飞书侧 `Task/<中文名>/`（结构沿用：根 = 交付 + context/ + refs/ + agent/）；token 记进 AGENTS.md「外部资源」。
- **`/qa-loop` 命令**（原 `/agent`）：工作区外用自己的 `.workspace/` + `deliverables/` 结构；在 v4 工作区里按其 `<workspace>` 节的 v4 分支走 `ws dispatch`，不建 `.workspace/`。
- **v3 工作区**：见 `v3-legacy.md`。

## 12. 已知限制

- Codex、Cursor、Trae 没有这套 hook：规则仍在 AGENTS.md 里生效，`ws` 照常可用，但原文记录、派发把关、结果追收都要靠 agent 自觉（协议里写了兜底做法）。Codex 是否自动注册项目内 `.agents/skills/` 未验证。
- `claude -p` 测不到会话恢复、上下文压缩、后台子智能体回报这些交互场景；hook 在这些场景下的表现以真实会话的冒烟测试为准。
- Claude Code 不会自动发现 `.agents/skills/`（2026-11-01，2.1.316，探针实测），工作区 skill 靠 AGENTS.md 的 Skills 表按路径读取。
