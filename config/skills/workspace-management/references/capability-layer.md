# 工作区能力层：`.agents/skills` 与根 `.claude/`

## 两条通道

| 通道 | 放什么 | 怎么生效 |
|---|---|---|
| `.agents/skills/<名>/SKILL.md`（缺省） | 只对本工作区有意义的流程、方法、配套脚本 | frontmatter 写 `name` 和 `description`；`ws index` 自动把它列进 AGENTS.md 的 Skills 表（名称、何时用、路径）；agent 命中触发条件时按路径读取 |
| 根级 `.claude/`（例外，按需才建） | 只放必须由 harness 执行才生效的东西：hooks、权限、`.mcp.json`、需要被 Agent 工具按类型名引用的注册型子智能体 | Claude Code 启动时扫描；默认不存在；新增 hook 一律先给用户看 |

判断标准：读了照做就能生效的放 `.agents/skills`（或写成 `.agents/memory` 里的 convention）；必须由 harness 执行的才放根 `.claude/`。

## 机制事实

- Claude Code 不会自动发现 `.agents/skills/`（2026-11-01，Claude Code 2.1.316：在 `.agents/skills/` 放探针 skill，`claude -p` 的可用 skill 列表里没有它）。所以 Skills 表就是加载入口。
- Codex 会自动注册用户级的 `~/.agents/skills`（本机 `~/.codex/config.toml` 里有逐个禁用 lark-* 的配置可证）；项目内 `.agents/skills/` 是否也被自动注册未验证（2026-11-01 Codex CLI 0.133.0 因模型配置报错无法实测）。如果会，工作区 skill 在 Codex 里可能与全局 skill 重名，起名时避开全局已有的名字。
- Claude Code 的 skill：`.claude/skills/<名>/SKILL.md` 自动注册，优先级 项目 > 用户 > 插件，同名的高层静默覆盖低层；嵌套目录里的 `.claude/skills` 也会注册。这些坑是工作区 skill 不放 `.claude/skills` 的原因。
- 子智能体类型：`.claude/agents/<名>.md` 才能被 Agent 工具按类型名引用。v4 不再有 `.agents/agents/`：派发时需要的角色说明写成 memory 里的 convention，在 task.md「必读」里引用。
- hook：事件包括 PreToolUse、PostToolUse、SessionStart、Stop、SubagentStop、UserPromptSubmit 等，各层配置合并执行、不覆盖。全局的工作区守卫见 `spec.md` §9；工作区自己的 hook 才放根 `.claude/settings.json`。

## 管理规则

1. **落位**：只对本工作区有意义 → `.agents/skills`；跨项目通用 → 升级到全局 skill，走 harness-management（全局级要审批）。拿不准先放工作区，收尾时再判断要不要升级。
2. **生长阶梯**：反复出现的做法 → memory 里的 lesson 或 convention → 固化成 `.agents/skills` → 通用后升级到全局。
3. **改动报备**：`.agents/skills` 属于项目级 harness，按 AGENTS.md 头部 `harness=` 的模式处理（auto 直接改并报备，none 先给方案）。
4. **归档**：工作区整体归档时 `.agents/` 随目录移走，无需处理；若建过根 `.claude/`，改名为 `.claude.archived/`，恢复时改回。
