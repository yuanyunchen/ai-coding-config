---
name: daily-report
description: "【已退役·2026-06-22,仅作指针】日报双阶段已拆分:记录日报(当日本地 record)→ 全局 `memory-management` 的 time 子模块;整理日报(出飞书日报)→ `feishu-daily-report` skill。触发「日报」相关时按意图路由到这两者之一,不在本文件执行。"
---

# daily-report(已退役 → 指针)

> **2026-06-22 拆分**(record/memory-management 系统 P1),本 skill 不再承载逻辑,仅路由:
>
> - **记录日报 / 记一下 / 记进日报 / 这段记到日报里**(当日本地 record append)→ 全局 **`memory-management`** 的 **时间索引库**:`~/.codex/skills/memory-management/references/time-index.md`(记录 + 时间线整理)。
> - **整理日报 / 写今天日报 / 汇总日报 / 出日报**(compile 成飞书日报)→ **`feishu-daily-report`** skill:`~/.codex/skills/feishu-task-management/subskills-workspace/feishu-daily-report/SKILL.md`。
>
> 按用户意图路由到对应 skill 执行。本目录已无 references/templates/records(记录逻辑迁全局 time 子模块、整理迁 feishu-daily-report、历史 records 迁 `…/memory/timeline-records/`)。
