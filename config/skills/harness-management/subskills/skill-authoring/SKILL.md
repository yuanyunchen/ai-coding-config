---
name: skill-authoring
description: "harness-management 内部 subskill(伪 skill,经其 update 模块第⑦步路由 Read):SKILL.md 写法规范——结构与行数上限、description 触发预算、零丢失拆分纪律、上游副本边界。增改任何 skill 文本前对照。"
---

# skill-authoring — skill 写法规范（增改 skill 时对照）

> 2026-07-01 经审查方案批准沉淀（skill-refactor 任务);2026-07-03 自 continue-learning/references/ 收编为 harness-management subskill。适用于用户自有 skill；上游副本（插件 / lark-cli 托管）不受此约束、也不许按此重排。

## 结构

- **SKILL.md 目标 ≤200 行**。invoke = 全文进上下文，成本 = 行数 × 调用频率；高频大 skill 优先整理。
- **场景可分割内容住 references/**：范例（抄用件）、执行落地层（只在动手时用）、低频编排流程。主文件顶部放**场景路由表**（我要做 X → 一跳读哪个文件）；原有「必读」强制语义写进路由行，不许弱化。
- **整读型不拆**：政策/纪律文档（每次都要全文的）拆了只多一跳，保持单文件。
- **范例进 references/examples.md**：主文件留原则、格式速查与路由；范例带「动笔前挑最像的抄骨架」指引。
- **免责/机制声明一处 canonical**：同一声明在一个 skill 内出现 ≥2 次即收敛为 canonical + 短回指。

## description（触发预算）

- description 常驻每个会话的注册表（skillListingBudgetFraction 约束），职责只有**触发**：写清触发逻辑与核心功能就行，不写复杂细节。固定三段式：**定位一句（核心功能）| 触发时机 + 触发词 | 边界一句**（2026-07-03 用户裁决，四 management skill 为范例）。机制细节（模式表/子模块/命令）、使用说明、工作流步骤、历史沿革一律住正文。
- 目标 **≤300 字符**（英文含大量触发短语可放宽到 ~450）；改 description **保留既有触发词**防触发回归（刻意收窄触发面除外，须经用户裁决）；被移出的信息若正文没有，先回填正文。

## 拆分纪律（零丢失）

- 内容**只搬不改写**；优先按行号/标题切片而非重打字。唯一允许的改写 = 指针句与相对路径随迁修正（如 `templates/` → `../templates/`），逐条记录。
- 拆完做**行级比对**：旧文件实质行 ⊆ 新主文件 + 新 references 并集；未命中的每一行都要能解释（指针化/路径修正）。
- 迁出章节**保留原 § 编号**并在新文件头声明（「外部引用 §N 均指本文件对应节」）；跨 skill 的高频外部指针改为直连新文件。
- 动手前备份到任务区（tar）；改完 grep 关键锚一跳可达。

## 边界

- 上游副本（`~/.claude/plugins/**`、lark-cli 托管的 `~/.agents/skills/**`、Anthropic 官方 skill 目录形状）：不动结构、不重排；只允许头部薄层批注（如现状注/前置声明），且接受更新时被覆盖的风险要登账。
- 飞书域 skill 改动不再登同步台账(Mira 同步已冻结 2026-07-03,台账归档于 feishu-task-management `mira-sync-archive.md`)。

## 进阶心法(2026-07-02 自 writing-great-skills 并入;全文见 [`writing-great-skills.md`](writing-great-skills.md) + [`writing-great-skills-glossary.md`](writing-great-skills-glossary.md))

- **可预测性是根本德性**:skill 的目的是让 agent 每次走同一个**过程**(不是产出相同输出),以下杠杆都服务于它。
- **invocation 二选一**:model-invoked(有 description,agent 可自动触发,付 **context load**——description 常驻每轮)vs user-invoked(`disable-model-invocation: true`,零 context load,付 **cognitive load**——人是索引)。只在 agent 必须自主触达时才选 model-invoked;user-invoked 多到记不住时用 **router skill**(一个入口 skill 登记其余,如 feishu-task-management)收敛。
- **description 每分支一个触发词**:同一分支的同义词重写 = duplication,合并;身份性内容(正文已有)从 description 剪掉。
- **拆分两刀**:按 invocation 拆(有独立 leading word 或被其它 skill 引用才拆,付 context load)/ 按 sequence 拆(后续步骤诱发 premature completion 时才拆);每一刀都花两种 load 之一,拆不出收益不拆。
- **leading word**:用模型预训练里已有的紧凑概念词(tight / red / relentless)替代多词重述——省 token 且执行/触发双锚定。
- **失败模式自查**:premature completion(完成标准不够可查验)· duplication(同义多处)· sediment(只加不删的沉积)· sprawl(每行都活但整体过长)· no-op(默认行为重述,「be thorough」类,删句不删词)。
