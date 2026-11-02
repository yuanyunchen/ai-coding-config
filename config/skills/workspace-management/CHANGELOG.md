# workspace-management 版本历史

## v4（2026-11-01）

用户逐条裁定的重构，起因是 v3 在真实工作区里普遍没被遵守：默认 none 模式等于不写；进度挤进 note；根目录另起 handoff 文件；VideoAgent 35 份派发结果里 28 份是主 agent 从聊天回复代存的；手写索引出现失效链接。

- 根目录只留 AGENTS.md（agent 维护的入口和地图，100–200 行）；取消 CLAUDE.md 指针、MEMORY.md、context/、deliverables/。
- `.agent/` 改名 `.agents/`，以 `.agents/ws.json` 为激活标记。
- 知识库 `memory/` 按主题分层，类型等写进 frontmatter，INDEX.md 自动生成；取消 files/（并入 memory 或任务节点）和 agents/（角色说明改写成 convention）。
- 任务节点 `task/NN-<名>/` 递归同构：task.md（上层写）、goal/plan/progress（自己写）、result.md（交上层）、`subagent/NN-<名>/`、`task/NN-<名>/`；派发与任务都编号。requirement/ 并入 task.md。
- 取消 none/auto/full 三种模式：建了工作区，规则就全部生效。
- 新增 `ws` 命令行负责所有结构性写入；新增全局 hook `workspace-guard.py`：注入现状、记录用户原文、派发把关、追收 result.md、刷新索引。
- 借鉴：superpowers（结果文件 + 四种状态）、GSD（工具管状态、计划与总结成对）、Beads（会话开始注入、分层编号）、planning-with-files（hook 注入与收尾检查）、OpenSpec（知识与变更分开、收尾时合并）、BMAD（写权限与停下条件）、OpenAI ExecPlans（意外发现与决策记录）、Anthropic（独立验收、JSON/结构化状态）。
- v3 工作区原样保留，规则见 `references/v3-legacy.md`，巡检脚本移到 `scripts/legacy/lint-v3.sh`。

## v3（2026-07-03）

原 task-workspace v2 改名重构为 workspace-management：requirement 并入 memory/，废止原文即时追加；更新纪律改为 none/auto/full 三种模式；三个命令 skill 收编为内置子模块 init/recall/update 和薄 command；update（原名 record）收尾必做冲突检查。

## v2.1（2026-07-02）

MEMORY.md 与能力层收进 `.agent/`；能力物经 MEMORY.md「能力层路由表」按需读取，不再依赖 harness 自动注册。

## v2（2026-07-02）

task-workspace 设计稿 v4 经 R1–R6 多轮裁决定稿：私有/共用轴（`.agent/` 内外）、文件三分法（日志型/状态型/静态）、按需生长、单层索引、信息量优先。

## v1（2026-07-01 及更早）

根目录 memory.md + context/ + work/ + deliverables/ 四件套。
