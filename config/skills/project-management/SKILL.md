---
name: project-management
description: "三系统编排层:一条命令把 workspace + memory + harness 走齐。触发:/project-init(开工一条龙,--mode none/auto)、/project-recall(三层重读定向)、/project-update(三层统一落盘);触发词:项目开工、项目初始化、全面 recall、全面收尾、三层更新。边界:单层操作用对话指令走对应系统,不经本层。"
---

# project-management — 项目编排层(三系统一次走齐)

站在三件套之上:workspace-management(任务状态)· memory-management(长期记忆)· harness-management(行为约束)。本层不定义新机制——**统一流程 + 模式映射**,执行落到三系统的 modules;单层操作用对话指令直接走对应系统例程,手动命令只有 /project-* 三个。

## 模式映射(/project-init --mode 设定;缺省 auto)

工作区 v4 没有模式(建了工作区,规则即全部生效),--mode 只映射 harness:

| project 模式 | harness | memory(全局,不随项目) |
|---|---|---|
| **--none** | none | 保持全局模式(缺省 auto) |
| **--auto(缺省)** | auto | 同上 |

落点:工作区 AGENTS.md 头部的 `harness=<m>`(repo 类型在 ws 区块头部),在该工作区内覆写 harness-management 的全局缺省。

## 子模块(`modules/`;统一流程见各文件,不是三次简单转发)

| 场景 | 走 |
|---|---|
| 项目开工:recall 全局记忆 → 建工作区 → 首个任务与输入 → 定 harness 模式 | `modules/init.md`(手动 = `/project-init`) |
| 全面定向:三层重读,一份合并摘要(在哪 / 知道什么 / 守什么规) | `modules/recall.md`(手动 = `/project-recall`) |
| 全面落盘:一次采集 → 判桶三路分发 → 顺序执行 → 合并清单 | `modules/update.md`(手动 = `/project-update`) |

`--deep` 三命令均支持,原样下传各层子模块(各层的 --deep 语义见其 modules)。

## 硬纪律

1. **顺序钉死**:update 恒为 workspace → memory → harness(工作区是真相源,全局记忆以工作区实物为据,harness 沉淀最后走审批);init 恒为 memory recall 先行 → workspace init(带着前史开工)。
2. **harness 恒走其审批门**:本层不豁免——project-update 里的 harness 段仍按 harness 模式执行(none = 方案+提问+审批;auto = 项目级直改/全局级建议),hook 一律过目。
3. **采集一次,不重复扫**:三层共享同一份会话回看结果,各层只取自己桶内的。
