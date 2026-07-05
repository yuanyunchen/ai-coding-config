# 知识检索库 — 主题文件 + 域记忆模式(吸收原 long-term / semantic 纪律)

> 目标:像检索库一样按主题取内容,也可针对性检索。两级:通用知识(枢纽主题文件)+ 域知识(域语义库)。

## 一、通用知识(枢纽主题文件)

- 落点:`~/.claude/projects/-Users-yuanyunchen/memory/<topic>.md`,frontmatter `metadata.type: user | feedback | reference`;一事一文件、内容要厚(信息量优先);`MEMORY.md` ①/②组加一行指针(必做)。
- 有同主题文件就追加/更新,不新建重复;把相对日期换绝对日期;`[[wiki-link]]` 互链。
- 检索方式:MEMORY.md 索引定位(主题一跳)→ 文件内 grep(针对性);跨文件 grep 枢纽目录兜底。
- 来源主通道:工作区 note 中「跨任务恒真」的条目,经里程碑触发 / memory-update 升华入库(升级时机 = 第二次在别处用到,见 harness-management placement-table)。
- **规则不进这里**:行为约束(该怎么做/禁忌/流程)属 harness 桶 → AGENTS.md / SKILL.md,走 harness-management update 流程(硬判别见 update-rules.md)。

## 二、域知识(域记忆模式;现役实例 = 飞书/字节广告)

- **域执行坑**(怎么调 API/建块)→ 域 skill memory(如 `feishu-task-management/memory.md`);**域工作知识**(领域在讲什么)→ 域语义库(basic-memory,现唯一在用 project = `feishu-memory`,453 事实,`bin/bm tool search-notes` 语义检索);两者互补,做域任务前都先查(域入口 skill 强制)。
- **分作用域 = 分 project**:basic-memory project 是唯一硬隔离,搜一个 project 不混入另一个;主题 = namespace,任务 = tag/metadata。
- **诚实边界**:嵌入模型全局单例(无 per-scope 多语)、英文 query 会静默高分误报、`min_sim=0.35` → 语义层只能 project 级硬隔离,project 内靠 tag 过滤(不完美)。
- **按量启用,不预建空库**:某非飞书域积累出语料才新建独立 project(复制域模式:域入口 skill + 域 skill memory + 独立 basic-memory project);当前 `main` project 为空,不动。
- **全局零渗漏**:域细节不进枢纽,枢纽只留一行指针(现状即范本)。
