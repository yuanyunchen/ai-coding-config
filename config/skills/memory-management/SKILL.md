---
name: memory-management
description: "全局记忆三库(项目定位/时间索引/知识检索)写入、维护、检索的唯一权威;模式 none/auto/full(缺省 auto),recall·update 两例程。触发:要写入或维护全局记忆、主动深 recall 时——里程碑记录、定位项目/云端文件、维护 TIMELINE/MEMORY 索引、查工作知识、记日报、补记、解记忆冲突。边界:判层归 harness-management,工作区文件归 workspace-management;轻量读枢纽不需加载。"
---

# memory-management — 全局记忆 Meta skill(三库一图;2026-07-03 v3 同步三模式机制,单层 command 已撤销、手动经对话指令或 /project-*)

全局记忆 = agent 长期化系统,枢纽 `~/.claude/projects/-Users-yuanyunchen/memory/`(git 版本化,远程 `global-memory`)承载三库:

| 库 | 装什么 | 检索语义 | 规范 |
|---|---|---|---|
| **项目定位库** | 每项目一张定位卡(本地 path + 云 token + 现状行) | 「X 项目在哪/什么状态」,两跳可达一切有价值目录与云 doc | `references/project-index.md` |
| **时间索引库** | TIMELINE 层级化(当月周块任务级详细 + 历史月压缩,近期高优) | 「X 月做了什么/何时定的」 | `references/time-index.md` |
| **知识检索库** | 主题文件(偏好/事实/参考)+ 域语义库(飞书=feishu-memory) | 「关于 X 我知道什么」,索引+grep / bm 语义检索 | `references/knowledge.md` |

入口 = 枢纽 `MEMORY.md`(三库索引,一屏读完);与工作区 MEMORY.md 同名同惯例、不同 scope(分形一致,纪律同源 = workspace-management spec 五总则)。上层编排 = `project-management`(/project-init·recall·update,三系统一次走齐)。

## 记忆模式(v3;与 workspace-management 同机制、不同缺省)

模式管三库的**自动更新节奏**;记在枢纽 `MEMORY.md` 头部模式行,用户随时可改。**缺省 = auto**(维持「里程碑无痕自动写」既有裁决,2026-07-02;工作区侧缺省 none,两侧模式独立)。

| 模式 | 纪律 |
|---|---|
| **--none** | 不自动写全局记忆。手动触发照常可用(对话指令或 /project-update),人调才更 |
| **--auto(缺省)** | 事后更新:里程碑(任务收尾/归档、阶段完成、方向决策、用户定型)→ 顺手三小件(定位卡现状行 + TIMELINE 一行 + 恒真知识条目);三库与实际出现较大出入时自动跑 update 例程。不逐会话、不逐工作项(工作项粒度归工作区 spec §8) |
| **--full** | 即时更新:决策/事实一定型即写对应库;新 session 接入或换项目时自动跑 recall 例程定向 |

## 写入纪律(核心;全文 = `references/update-rules.md`)

- **无痕**:三库内容直接操作(auto/full 模式下),不提示、不审批、不汇报;可审计 = updated 字段 + 枢纽 git 历史。**harness 桶**(规则/skill 增改)另走 harness-management update 流程(按其模式定审批);硬判别按内容性质——行为约束即门,不看落点文件。
- **双入口**:自动 = auto/full 模式下 agent 直接执行 `modules/update.md` 例程(不经 command);手动 = 对话指令(补记/解冲突、recall)或 /project-* 分发。
- **仲裁序**:requirement 原文 > 工作区实物 > 全局记忆;不静默删任何记忆文件;update 例程末步必做冲突检查。
- **纠错**:memory-weekly-check(每周,浅查:对账/死链/两跳可达/drift 检测/git commit);飞书侧归 feishu-weekly-curation(只写飞书,不碰枢纽)。

## 路由表(要干什么 → 一跳)

| 场景 | 走 |
|---|---|
| 写/刷项目定位卡、MEMORY 索引行、归档联动 | `references/project-index.md` |
| 补 TIMELINE 条目、月压缩、日报(历史层) | `references/time-index.md` |
| 记偏好/事实/参考;域知识(执行坑→域 skill memory,工作知识→域语义库) | `references/knowledge.md` |
| 何时写、无痕边界、冲突仲裁、维护主体一览 | `references/update-rules.md` |
| 更新全局记忆(补记/解冲突;auto/full 自调,手动 = 对话指令或 /project-update) | `modules/update.md` |
| 定向检索全局记忆(查项目/时间线/知识;full 自调,手动 = 对话指令或 /project-recall) | `modules/recall.md` |
| 判「记不记/落哪层/能否泛化/升降级/冲突」 | `harness-management`(WHERE 权威;落点决策表 = 其 `references/placement-table.md`;2026-07-03 替代 continue-learning) |

## 边界(防越权)

- **WHERE 归 harness-management**:本 skill 只管「层已定」后的机制。
- **工作区内部文件**(工作区 MEMORY.md / note / task / 日志)归 workspace-management spec §8 与其 update 例程;本 skill 只管全局枢纽。checkpoint 不碰全局,本 skill 不碰工作区。
- **底层 md 创建/编辑/patch = `lark-markdown`**(write-md-file);**仓库 `CLAUDE.md` = harness-management `subskills/agent-file`**(原 write-agent-file,2026-07-03 收编;audit 模式并自 claude-md-improver)。
- 历史资产:record 原文与 stub 已归档 `~/.claude/skills-archive/record/`;原 memory-update 命令 skill 已于 2026-07-03 归档 `~/.claude/skills-archive/memory-update/`(收编为 modules/update.md + 薄 command);`templates/record_fragment.md` 为 record 时代 legacy 留档不删;旧子模块 time.md / project.md 已升级为 time-index.md / project-index.md(指针文件已清)。
