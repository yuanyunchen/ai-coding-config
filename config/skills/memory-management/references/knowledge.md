# 知识检索库 — hub 主题 + bytedance 域库（basic-memory）

> 目标:按主题取内容 + 语义检索。两级:通用知识(`hub`) + 域工作知识(`bytedance`)。

## 一、通用知识（hub）

- 落点:`hub/<topic>.md`（runtime 软链等价路径）;frontmatter `metadata.type: user | feedback | reference`;一事一文件;`hub/MEMORY.md` ①/②组加指针。
- 检索:`bin/bm tool search-notes --project hub "<问>"`；或 MEMORY.md 索引一跳 → Read/grep。
- 写入:`bin/bm tool write-note|edit-note --project hub …` 或直接改 md 后依赖 BM sync。
- 来源:工作区 note 中跨任务恒真，经里程碑 / update 升华。
- **规则不进这里**:行为约束 → harness（AGENTS / SKILL）。

## 二、域工作知识（bytedance）

- **BM project 名 = `bytedance`**（目录 `bytedance/`，原 feishu-memory 并入本仓）。
- 检索:`<repo>/bin/bm tool search-notes --project bytedance "<问>"`（或 MCP `search_notes` + `project=bytedance`）。
- 执行坑 → 域 skill memory；工作知识 → bytedance。做域任务前两者都先查。
- **硬隔离 = BM project**：搜 hub 不混 bytedance，反之亦然。
- **全局零渗漏**:域细节不进 hub 正文；hub 只留一行指针（见 `hub/feishu-memory-system.md` 或后继更名卡）。
- 新域:按量新建独立 BM project + 子目录，复制本模式；不预建空库。

## 三、可移植约定

- Skill / 指令只写 **project 名** + `bin/bm`（相对仓库根）。
- 仓库根 = `hub/` 的 parent；由各机 `bin/setup` 把绝对路径写入 `~/.basic-memory/config.json`。
