# 项目定位库 — 定位卡规范(原「project 子模块」升级版)

> 目标:**agent 从枢纽出发,两跳内定位到所有有价值的项目目录与云端文件**(MEMORY.md 索引行 → 定位卡 → path/token)。此为 memory-weekly-check 的对账承诺。
> 落点:`global-memory/hub/<project-slug>.md` + 同目录 `MEMORY.md` ②组一行索引(必做,全局可发现;经 runtime 软链等价)。

## 定位卡(一项目一文件,frontmatter + ≤6 行正文)

```markdown
---
name: <project-slug>
description: <一行摘要,召回判相关用>
metadata:
  type: project
  status: active | closed
  updated: YYYY-MM-DD
---

- 本地:`<工作区目录绝对路径>`(活跃 tasks/… 或归档 tasks/_archive/…)
- 云端:飞书任务夹 `<token>`;live 交付 `<token>`(URL 可附)
- 现状:<一行当前态/结论>
- 关联:[[相关项目]] [[相关子系统]]
```

- **细节唯一权威 = 工作区 MEMORY.md**;定位卡只管「在哪 + 现状一行」——全局层只维护指针不维护内容,这是低 overhead 的来源。
- 已有同项目文件 → **更新该文件**(刷 status/updated/现状行),不新建重复。
- 只记代码/git 历史记不到、且本项目专属的内容;相对日期换绝对日期。
- MEMORY.md 索引行格式:`- [<标题>](<file>.md) — <一句话钩子 + 当前状态>`;有则刷新,无则加进 ② 组。

## 归档联动
工作区归档(tasks/_archive/)时:定位卡改 `status: closed`、本地 path 更新为归档路径、现状行改完结态一句。归档不删卡——定位库对归档项目同样承诺可达。

## 存量兼容(2026-07-02 前的 ~19 张旧项目记忆)
旧卡多为厚文:**补标准字段头(本地/云端/现状/关联 4 行置顶),正文原样保留为历史态**——不重写内容(多数刚经 G 阶段治理)。两跳可达以字段头为准。

## 边界
- 落哪层不在这判(harness-management 的事);本文件只管「已定为项目层」后的落盘形态。
- 底层 md 读写交给 `lark-markdown`(write-md-file)。
