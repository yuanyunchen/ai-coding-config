# update — 沉淀与变更流程(子模块;手动 = 对话指令或 /project-update 分发,auto 模式下 agent 自调)

家族根 = 当前工具 home 的 `skills/harness-management/`(HM;Claude Code=`~/.claude`,Codex=`~/.codex`,Cursor=`~/.cursor`)。参数:`[候选描述|默认反思本会话] [--layer 项目|全局] [--dry-run 只出方案不执行] [--deep 反思范围扩展到工作区 memory 与各节点 task.md 历史 + 全面触发词查重,非只本会话]`。
本模块只做**路由与流程规范**;具体怎么写文件,第 ⑦ 步路由到对应 subskill / 外部执行层。

## 流程(八步,顺序执行)

1. **采集候选**:人调且无参数 = 反思本会话全程——需求与现有 skill/规则的出入(哪条失效/缺失/误触发)、可抽象复用的过程(流程/模版/配方);auto 模式自调 = 带着触发它的那个具体信号进来。每个候选一句话:现象 + 拟沉淀物。
2. **判桶(硬判别,防绕门)**:按内容性质——行为约束(该怎么做/禁忌/流程/触发条件)= harness 桶,继续;事实/状态/偏好取值/环境信息 = 记忆桶,**转 memory-management 后从本清单剔除**。行为约束改写成「知识条目」落记忆库 = 绕门,禁止。
3. **判层**:查 `../references/placement-table.md`——某 skill 域内 / 工作区任务语境 / 项目级 / 全局级 / 领域 store。先落诞生的最低层;第二次用到才升层(升层原地改指针)。项目级 = 项目 agent 配置目录、项目 AGENTS/CLAUDE 指导文件、工作区 .agents/skills 与工作区 AGENTS.md「规则」节;全局级 = 当前工具 home 下的一切(`~/.claude`/`~/.codex`/`~/.cursor`)。
4. **定形态**:规则条文(AGENTS/CLAUDE/SKILL 内一条)/ 新 skill / 既有 skill 的 update / subskill(域入口 skill 内部伪 skill)/ command / agent(派发类型)/ hook / 模版。能用一条规则就不建 skill,能改现有就不新建(最轻形态优先)。
5. **冲突检查**:grep 目标层现有条目——语义冲突 → 问用户「覆盖 OR 留旧」二选一,禁并存;两种行为都要保留 = 改写成一条条件分支;触发词与现有 skill 的 description 撞车也算冲突。
6. **审批门(按模式 × 层级)**:none 模式 = 全部候选打包成方案(哪层/改什么/为什么)向用户提问,审批后执行;auto 模式 = 项目级直接执行(回复一行报备),全局级简短建议、批准后执行。**hook 任何模式任何层级一律过目**;--dry-run 到此为止,只出方案。
7. **执行(路由)**:
   | 改什么 | 走 |
   |---|---|
   | SKILL.md / references / subskill 文本 | `../subskills/skill-authoring/SKILL.md`(结构/description/拆分纪律);建新 skill 要脚手架或 eval → `../subskills/skill-creator/SKILL.md` |
   | AGENTS.md / CLAUDE.md 等 agent 指导文件 | `../subskills/agent-file/SKILL.md` |
   | hook / 权限 / settings.json / env | 内置 update-config skill(过目后落) |
   | command(当前工具 home 的 `commands/` 或项目 agent 配置目录下的 `commands/`) | 薄 command 惯例:只引用 skill、Read 模块执行(参照 /project-* 系列) |
   | 工作区 .agents/skills | workspace-management `references/capability-layer.md` 的结构与登记规范 |
   | 飞书域 skill | 建成 feishu-task-management 内部伪 skill(其 §2 构建规则),禁注册全局 |
   | 四源同步 / deploy / pull / GitHub→各工具 live | `../subskills/multi-source-sync/SKILL.md`(任意 cwd 调 `$REPO/agent-config`;仓内唯一树 = `config/`) |
8. **验证登记**:引用面 sweep(旧名/旧路径 grep 清残留,历史日志不回改);触发词查重(新 description vs 既有注册表);改动一行留痕(全局级 → 枢纽定位卡/TIMELINE 由 memory-management 按其模式处理;工作区级 → 跑 ws index 刷新 AGENTS.md 的 Skills 表);全局级改动若需三工具可见 → 同笔走 `../subskills/multi-source-sync/SKILL.md`;向用户回简短清单:落了什么/哪层/冲突如何消解。

全局 harness 改完要推 Claude/Cursor/Codex/Trae、或用户只要「同步三源/四源 / deploy / links」时:直接 Read 并执行 `../subskills/multi-source-sync/SKILL.md`(协议与 CLI 摘要在彼,此处不重复)。
