---
name: feishu-daily-report
description: "把当天工作整理成一篇飞书日报。触发:「整理日报 / 写今天日报 / 汇总日报 / 出日报 / 把今天的日报整理出来」。读当天 record(全局 memory-management 的 time 子模块维护的 `…/memory/timeline-records/{date}.md`)+ 用户口述清单 + 回读产出文件,compile 成飞书日报落 Drive 的 Daily Report/WeekN 归档。只产飞书日报。不做「记录日报」(当日本地 record)——那是 memory-management/time,别混。"
---

# feishu-daily-report — 整理成飞书日报

> 2026-06-22 从 `daily-report` 拆分而来:**记录**(原阶段一,当日本地 record)已并入全局 `memory-management` 的 **time 子模块**;本 skill 专做**整理**(原阶段二)= 把当天工作 compile 成一篇飞书日报。
> 具体规则在 `references/compile.md`(整理流程 + 多来源整合 + 排版)+ `references/retrieval-guide.md`(定位某任务飞书文档的检索单一权威);成文 template `templates/daily_report.xml`。

## 触发 / 边界
- 「整理日报 / 写今天日报 / 汇总日报 / 出日报」→ 读 `references/compile.md` 执行。
- 「记录日报 / 记一下 / 把这个记进日报」= 记当日 record → **走全局 `memory-management` 时间索引库**(`~/.codex/skills/memory-management/references/time-index.md`),**不在本 skill**。

## 来源(三方整合,冲突以原始文件为准)
1. 用户口述当天清单(主线)+ 产出文件链接(**必读回读**)。
2. 当天 record:`/Users/bytedance/Desktop/AI Workspace/Agentic Engineering/global-memory/memory/timeline-records/{date}.md`(memory-management/time 维护)+ 其他 agent 记录文件。
3. 缺 context 文件时按 `references/retrieval-guide.md` 自查(KB 索引 + `drive +search` 文档搜索),不反问。
详见 `references/compile.md` §1。

## 写作通则
面向人阅读的飞书文档,写作通则(命名 📖/🤖、格式、去 AI 化、Callout 节制、可读性、作图选型、开头结构)以 `lark-doc-writer` §0 为唯一权威;`compile.md` 已提炼本场景关键规则,照它执行,必要时回查 `lark-doc-writer`。执行飞书读写走官方 `lark-cli`(见 `feishu-task-management`)。
