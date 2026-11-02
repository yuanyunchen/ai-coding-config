# update — 三层统一落盘(子模块;手动 = /project-update)

参数:`[--only workspace|memory|harness 可多选,缺省全走] [--deep](原样下传三层)`。
统一流程 = **一次采集 → 判桶三路分发 → 顺序执行 → 合并清单**;顺序钉死 workspace → memory → harness(工作区为真相源;全局记忆以工作区实物为据;harness 沉淀最后、恒走其审批门)。

## 流程

1. **一次性回看采集**(共享,三层不重复扫):盘点本会话——需求/决策/进展/踩坑/新文件/新能力物/新外部 doc/可复用过程。`--deep` 时按各层 --deep 语义扩展范围。
2. **判桶分发**(每条候选归且仅归一路):
   - 工作区状态(原文归档进 task.md、goal/plan/progress/result、工作区 memory、AGENTS.md 手写节、.agents/skills)→ workspace 路;
   - 跨任务恒真事实/项目定位/时间线条目 → memory 路;
   - 行为约束/可复用 harness 物(skill/command/hook/规则候选)→ harness 路。
3. **workspace update**:执行 workspace-management `modules/update.md`(清 inbox、节点与 memory 写盘、ws check、末步冲突检查;仅有明确飞书目标时含飞书台账),输入 = 第 2 步工作区桶。
4. **memory update**:执行 memory-management `modules/update.md`(三库落位 + git 收口 + 末步冲突检查),采集免重跑——直接用第 2 步 memory 桶 + 第 3 步刚更新的工作区实物。
5. **harness update**:执行 harness-management `modules/update.md` 八步流程,输入 = 第 2 步 harness 桶;**按 harness 模式定审批**(none = 方案+提问+批准后执行;auto = 项目级直改报备/全局级建议;hook 一律过目),本层不豁免、不代批。
6. **合并清单**:一份回复——三层各更了什么 / 消解了什么冲突 / harness 待审批项(如有);任一层无事可更如实说「无」。
