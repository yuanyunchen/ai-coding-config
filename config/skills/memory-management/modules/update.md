# update — 更新全局记忆(子模块;手动 = 对话指令或 /project-update 分发,auto/full 模式下 agent 按纪律自调。承接原 memory-update 命令 skill;record 名已统一为 update,2026-07-03)

规范权威 = `~/.claude/skills/memory-management/`(MM;写入纪律 = MM/references/update-rules.md)。参数:`[工作区路径|默认当前] [--scope 全部|本任务] [--deep 扫全部活跃工作区 + 三库全面对账,非只增量]`。
**写域**:全局枢纽三库(可写);**工作区只读**(采集 note/决策但不改工作区文件——改工作区是 workspace-management update 例程的事)。

## 流程

1. **采集**:读目标工作区(默认当前;`--scope 全部` 则扫 tasks/ 各活跃区)的 MEMORY.md 关键决策节 + `.agent/memory/note/`,对照枢纽三库找「该记未记」:定位卡缺失/现状过期、TIMELINE 缺任务级条目、恒真知识未入库。
2. **落位(无痕)**:按 MM 路由表逐库写——定位卡(project-index.md 规范)、TIMELINE 条目(time-index.md 结构)、知识条目(knowledge.md;域知识给到域 store)。判层拿不准的查 harness-management placement-table;**行为约束类(harness 桶)只列清单给用户,不代落**(转 harness-management update 流程)。
3. **收口**:枢纽 `git add -A && git commit -m "memory-update: <一句>"`(留痕可回滚)。
4. **冲突检查(最后一步,必做)**:三库内部及三库 ↔ 工作区实物的矛盾——仲裁序 = requirement 原文 > 工作区实物 > 全局记忆;事实性直接修(刷 updated 字段,随手补 commit),语义性矛盾列给用户;不静默删任何记忆文件。向用户回简短清单:落了什么 / 修了什么冲突 / 待用户裁决项(如有)。
