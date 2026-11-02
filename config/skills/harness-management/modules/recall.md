# recall — 重读核心文件防漂移(子模块;手动 = 对话指令或 /project-recall 分发)

家族根 = 当前工具 home 的 `skills/harness-management/`(HM;Claude Code=`~/.claude`,Codex=`~/.codex`,Cursor=`~/.cursor`)。参数:`[--deep]`。
**目的**:对抗长对话累积与上下文压缩导致的约束丢失与幻觉——重新灌注行为约束,与 workspace recall(任务状态)、memory recall(长期记忆)三分。**只读不写**;发现的出入不当场改,转 update 流程(按模式)。

## 流程

1. **重读常驻规则**:当前工具 home 的 `AGENTS.md` 全文(六板块);当前在项目/工作区内则加读项目 CLAUDE.md / AGENTS.md(v4 工作区 AGENTS.md 已自动加载:重点核对「工作协议」「规则」「Skills」三处)。
2. **重读本会话已用的 skill**:盘点本会话 invoke 过、且当前任务仍在其覆盖面内的 skill,重读其 SKILL.md(含正在用的 subskill / module 文件);`--deep` 时连其路由表点名的 references 一并重读。只读与当前任务相关的,防 recall 本身吃掉上下文。
3. **漂移核对**:对照重读内容检查本会话近期行为——有没有违反的纪律、忘掉的触发链、该用未用的 skill、口径漂移的输出习惯。
4. **输出**:向用户回一份简短「仍然生效的关键约束」清单(一行一条)+ 发现的漂移点(如有);漂移涉及 harness 物本身有问题的,标注「建议走 harness update 例程」。
