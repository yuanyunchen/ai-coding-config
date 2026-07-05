---
name: grill-me
description: "Relentless interview to sharpen a plan or design before building. Trigger phrases: grill, stress-test, 拷问, 压测方案. Optional --docs also maintains CONTEXT.md glossary and ADRs as terms crystallise."
argument-hint: "[--docs]"
disable-model-invocation: true
---

# grill-me — 方案拷问(手动调)

对计划或设计做逐条拷问,直到达成共识。`disable-model-invocation`:仅用户手动 `Skill(grill-me)` 或等效触发时启动,agent 不自动 invoke。

## 参数

| 参数 | 行为 |
|------|------|
| *(无)* | 只跑拷问流程 |
| `--docs` | 拷问 + 边聊边写领域文档(glossary / ADR) |

## 子模块(必 Read 再执行)

| 步骤 | 模块 | 路径 |
|------|------|------|
| 始终 | grilling | `subskills/grilling/SKILL.md` |
| `--docs` 时追加 | domain-modeling | `subskills/domain-modeling/SKILL.md` |

执行:先 `Read` 上表对应 SKILL.md,再按其中纪律开始会话。`--docs` 时在拷问过程中 inline 更新 `CONTEXT.md`、按需写 ADR,格式见 subskill 内 `CONTEXT-FORMAT.md` / `ADR-FORMAT.md`。
