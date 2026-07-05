# capability-layer — 工作区能力层管理(skill / command / 派发类型 / hook)

> spec §12 的展开。v2.1(2026-07-02):能力层收进 `.agent/`,**MEMORY.md 路由表 + 按需 Read 替代 harness 自动注册**(伪 skill 模式,与 feishu-task-management 收编 27 个 lark-* 子技能同款)。

## 定位:两条加载通道

| 通道 | 放什么 | 怎么生效 |
|---|---|---|
| **`.agent/skills/<名>/SKILL.md` · `.agent/agents/<名>.md`(默认)** | 文本能力:工作区专属 skill/命令流程、派发类型定义(system prompt 文本)、配套脚本模板 | **MEMORY.md「能力层路由表」是唯一入口**:一行 = 名 + 触发条件 + 路径 + 一句话用途;agent 命中触发就 Read 对应文件执行。不占 harness 注册表、不与全局 50+ skill 撞名、归档随目录走零残留 |
| **根级 `.claude/`(例外,按需才建)** | 只放 harness 必须执行/注册才生效的:hooks(settings.json / hookify.*.md)、权限、.mcp.json、需被 Agent tool 按类型名引用的注册型子智能体 | harness 启动扫描自动生效;**默认不存在;新增一律给用户过目**(hook 静默改行为且跨层 merge 不覆盖) |

判据一句话:**能靠「读了再做」生效的进 .agent/ 走路由表;必须 harness 执行的才进根 .claude/**。

## harness 机制事实(处理根 .claude/ 或全局层时用;2026-07 经官方文档核准 + 本机实测)

- skill:`.claude/skills/<名>/SKILL.md` 自动扫描注册,commands 已统一进 skills;优先级 项目>用户>插件,同名高层**静默覆盖**低层;子目录嵌套的 .claude/skills 也被注册(名带目录前缀),目录作用域触发按「正在改的文件在不在该目录下」判定、跨目录不可依赖——这些坑正是 v2.1 改走路由表的原因。
- subagent 类型:`.claude/agents/<名>.md`(frontmatter name/description 必填 + 正文 system prompt),Agent tool 按类型名引用;项目>用户。`.agent/agents/` 的定义文本不被 Agent tool 注册——派发时经 task.md 引用其 path 由子智能体 Read(new-dispatch 流程),需真注册才挪根 .claude/。
- hook:事件 PreToolUse/PostToolUse/SessionStart/Stop/UserPromptSubmit 等;**跨层 merge 不覆盖**(managed>local>project>user 全执行)。优先 hookify 规则形态(单文件可开关可审计)。
- 权限/MCP:settings.json permissions 跨层 merge;项目级 .mcp.json 在未信任工作区需人批准。

## 管理规范(六条)

1. **落位**:仅本工作区有意义 → `.agent/skills|agents` + 登路由表(项目级,auto 模式直改/none 模式随批);可跨项目泛化 → 升 `~/.claude/skills/`,走 harness-management update 流程(全局级审批)。拿不准先落工作区,收尾时再判升级。
2. **登记即存在**:路由表是唯一入口——**不登路由表的能力物等于不存在**(没有 harness 兜底扫描了)。新增/修改能力物与路由表同笔更新;lint ⑥ 对账(实物 ↔ 路由表双向)。
3. **命名自由**:路由表加载不占全局命名空间,无撞名问题;仅根 .claude/ 内的注册物仍须查同名(同名静默覆盖用户级)。
4. **生长阶梯(与 note 同构)**:流程反复出现 → note(方法/踩坑)→ 固化为 .agent/skills 能力物 + 登路由表 → 泛化后升用户级(过门)。派发 task.md 里反复出现的规则文本 → 下沉为 .agent/agents/ 类型定义,brief 只写本次差异。
5. **hook 审慎**:根 .claude/ 的 hook 一律告知用户过目(即便项目级);优先 hookify 形态;裸 settings.json hook 只在 hookify 表达不了时用。
6. **归档**:.agent/ 能力层随目录归档,零处置;根 .claude/ 存在时归档改名 `.claude.archived/`、hookify 停用,恢复改回(lint ⑥ 兜底)。
