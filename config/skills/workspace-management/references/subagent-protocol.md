# subagent-protocol — 子智能体工作区规范(派发规约唯一 home)

> spec §5 的展开。本文件设计为可直接传给子智能体:派发时把本文件 path 写进 task.md 首行让其 Read。第一节面向子智能体(第二人称),第二节面向主 agent。

## 一、给子智能体:你的工作区规则

你被主智能体派发执行一个任务,收到的输入是一个 `task.md` 文件。规则:

1. **工作目录** = task.md 所在目录(`…/.agent/subagent/<模块>/<你>/`),由主智能体为你创建。目录内你可自由读写:plan.md、中间结果、草稿、笔记随意。
2. **对外写域**:目录之外,你**只允许**写 task.md 里显式指定的输出 path。没有指定 = 不许写。读权限不限(按任务需要读代码、文档、工作区任何文件)。
3. **输出**:最终结果写本目录 `result.md`;若多轮对话,逐条消息存本目录 `message/` 下。result.md 里可以引用你目录内的任何文件(主智能体会来读)。
4. **不做记忆维护**:不改 MEMORY.md、不写 `.agent/memory/`。需要让外部知道的踩坑/经验/结论,写在你目录内(单独文件或 result.md 一节),由主智能体判断是否提炼进 note。
5. **自包含执行**:你不继承主会话上下文、不自动加载 skill——task.md 里列出的必读文件(规则/skill/输入材料)逐个 Read 后再动手;对成功标准负责,完不成如实说明,不糊弄。

## 二、给主 agent:派发 checklist

0. **模型分流(三档,最低 sonnet;内置 agent 类型 Explore/Plan 等同规;总则 = AGENTS.md Harness 板块「subagent(派发)」)**:
   - **缺省 = Opus**:决策、质量把关、核心开发等需要自主判断的任务。
   - **high-level = 继承主模型(允许 fable)**:方案讨论、最终结果检查等。**上下文预算**:只给结论所需最小材料——引用路径不贴全文、必读清单控制在个位数、背景压成一段;不把大文件塞进 prompt。
   - **Sonnet**:操作性、低自主性任务(机械执行明确指令:批量替换、格式化、采集汇总、跑命令)。
   - 判档拿不准时按"自主判断空间"裁:要它做选择 → Opus;要它给意见/验收 → 继承;要它照单执行 → Sonnet。
1. **一次派发一目录**:`.agent/subagent/<模块>/<子智能体名>/`(模块中间层级按需;并行派发天然隔离——每实例独立目录)。用 `scripts/new-dispatch.sh` 建目录 + 生成 task.md 骨架(模板 = `templates/dispatch-task.template.md`)。
2. **task.md 必须自包含**(子智能体不继承上下文、不自动 invoke skill,见全局 AGENTS.md Harness 板块「subagent(派发)」):
   - 任务与背景;
   - 可衡量的成功标准;
   - 需读文件的 path 清单(充分利用工作区文件索引;首行引本 protocol);
   - 输出文件 path(对外写域 = 仅此);
   - 需遵守的规则/skill 文件 path(如 lark-doc-writer、浏览器走 Chrome 插件禁令等,按任务点名)。
3. **回传处理**:读 result.md(及其引用文件);有价值内容由你提炼——可复用理解 → `.agent/memory/note/`;派发中反复出现的规则文本 → 下沉为 `.claude/agents/` 类型定义(capability-layer.md 生长阶梯),brief 只写本次差异。
4. **写域约定为约定级**:靠 task.md 模板钉死 + 巡检(lint ⑤ 派发留档完整性)+ update 时抽查;hook 硬拦截暂不设、按需再议(留实现选项)。
5. **留档即日志**:task.md / result.md / message/ 为日志型,只追加不回改;全过程可审计、可复用、可跨会话续跑。
