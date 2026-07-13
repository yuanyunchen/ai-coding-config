---
name: memory-management
description: "全局记忆统一体系(hub 三库 + bytedance 域库),basic-memory 工具链唯一入口;模式 none/auto/full(缺省 auto),recall·update 两例程。触发:写入/维护全局记忆、语义检索工作知识、定位项目、TIMELINE、偏好、补记、解冲突。边界:判层归 harness-management,工作区文件归 workspace-management;轻量读枢纽不需加载。"
---

# memory-management — 全局记忆 Meta skill（unified BM；2026-07-12）

全局记忆 = **单仓 `global-memory` + basic-memory 双 project**：

| BM project | 目录 | 装什么 | 检索 |
|---|---|---|---|
| **hub** | `hub/` | 项目定位 / 时间索引 / 偏好与跨任务主题 | `bin/bm tool search-notes --project hub`；入口索引 `hub/MEMORY.md` |
| **bytedance** | `bytedance/` | 字节广告工作知识（原子事实） | `bin/bm tool search-notes --project bytedance` |

概念上仍称「三库」，物理都在 `hub/`；域工作知识在 `bytedance/`（硬隔离）。规范细节：`references/*.md`。

## 路径解析（禁止写死本机绝对路径）

1. 枢纽 runtime 常见软链 → `…/global-memory/hub`（具体链路由各机 `bin/setup` 写入）
2. **仓库根** = hub 目录的 parent（或读同仓 `manifest.json`）
3. **CLI** = `<repo>/bin/bm`（包装 basic-memory；迁移后只要 clone + `./bin/setup`）
4. MCP 调用一律带 `project=hub` 或 `project=bytedance`

新机器：`clone global-memory` → `./bin/setup` → `./agent-config memory status`。契约见仓内 `manifest.json` / `README.md`。

## 记忆模式（v3）

记在 `hub/MEMORY.md` 头部。缺省 **auto**。

| 模式 | 纪律 |
|---|---|
| **--none** | 不自动写。手动（对话或 /project-update）才更 |
| **--auto(缺省)** | 里程碑后三小件（定位卡现状 + TIMELINE 一行 + 恒真知识）；出入大时跑 update |
| **--full** | 定型即写；新 session/换项目自动 recall |

## 写入纪律

- **工具链**：读/写/改记忆优先 `bin/bm tool {search-notes,read-note,write-note,edit-note} --project …`；hub 索引行与 TIMELINE 亦可直接编辑 md（随后 BM sync/reindex）
- **无痕**：auto/full 下三库内容直接落盘，不审批不汇报；可审计 = `updated` + git
- **仲裁序**：requirement > 工作区实物 > 全局记忆；不静默删文件；update 末步冲突检查
- **域执行坑**仍在域 skill memory（如 `feishu-task-management/memory.md`），**不**进 bytedance 事实库

## 路由表

| 场景 | 走 |
|---|---|
| 项目在哪/什么状态 | `--project hub` + 定位卡规范 `references/project-index.md` |
| 何时做了什么 | hub `TIMELINE.md` / `references/time-index.md` |
| 偏好/跨任务知识 | `--project hub` |
| 字节广告工作知识 | `--project bytedance`（必带实体名；命中后核 `source.quote`） |
| 更新 / 定向检索 | `modules/update.md` / `modules/recall.md` |
| 记不记/落哪层 | `harness-management` placement-table |

## 边界

- WHERE → harness-management；工作区文件 → workspace-management
- 不依赖 `~/feishu-memory` 目录名；旧路径若存在应为指向 `bytedance/` 的软链
- 纠错：hub → memory-weekly-check；bytedance 日维护 → 既有 cron/maintenance（改调本仓 `bin/bm`）
