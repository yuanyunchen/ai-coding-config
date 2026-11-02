# init — 建工作区并开工（手动 = 对话指令或 /project-init）

家族根 = `~/.claude/skills/workspace-management/`（下称 WM）。参数：`[任务名/目录] [--profile task|repo] [--deep]`。

1. **定类型和位置。** 任务 → `~/Desktop/AI Workspace/tasks/<kebab名>/`（task）；代码仓库 → 仓库根（repo）。参数没给就从用户消息推断，推不出再问。repo 类型还要问用户两件事：能否在 AGENTS.md 末尾追加 ws 区块；`.agents/` 要不要提交进 git（不提交就写进 `.git/info/exclude`）。
2. **建骨架。** `ws init <目录> --profile <类型> --title "<标题>"`（repo 类型得到同意后加 `--yes`）。目录里已有 v3 的 `.agent/` 时 `ws` 会拒绝：停下说明，按 `references/v3-legacy.md` 办。`ws init` 提示 CLAUDE.md 没有引用 `@AGENTS.md` 时，转告用户由其决定。
3. **建第一个任务。** 用户的开工消息就是 task.md：
   - hook 已记下（上下文里有条目 ID）→ `ws req --new <slug> --entry <id> --title "<标题>"`；
   - 没有 hook（Codex 等）或消息在建工作区之前 → 原话照录：`ws task new <slug> --title "<标题>" --stdin`。
4. **收输入。** 用户交来的文件复制进该节点的 `input/` 并在 task.md 追加引用；大数据集、代码仓库只记路径。逐份读完（PDF/DOCX/网页走 file-content-extraction / webpage-content-extraction）；重要或复杂的写成 memory（type: source，summary 写清这是什么、何时该看）。数量多或 `--deep` 时，按 `references/subagent-protocol.md` 派子智能体分头提取，结果由主 agent 验收后转正。
5. **理解代码**（repo 类型）：默认轻量（目录结构、README、构建配置、近期提交）；关键模块的理解写成 memory（type: knowledge）；已有的工作区 skill 放 `.agents/skills/` 并 `ws index`。
6. **写目标和计划。** goal.md（目标、可检验的验收标准、不做什么）和 plan.md（方法、拆分）写好后 `ws task status T01 active`。
7. **填 AGENTS.md 手写节**：定位、用户偏好（注明出处 T01）、规则（只记用户裁决）、环境与命令、外部资源。保持 100–200 行。
8. **查前史**（自行判断，不强制）：任务疑似有前史或涉及既有项目时，读全局枢纽的定位卡（memory-management「路径解析」），把相关指针写进 AGENTS.md「外部资源」或 memory，此后工作区内不再重复查。
9. **飞书**：仅用户要求飞书交付或任务已有明确飞书目标时，按 feishu-task-management 建飞书侧 `Task/<中文名>/`，token 记进 AGENTS.md「外部资源」；否则跳过，不加载飞书技能。
10. **回报**：工作区在哪、T01 的目标一句话、接下来做什么。
