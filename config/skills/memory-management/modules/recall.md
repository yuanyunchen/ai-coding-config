# recall — 全局记忆定向检索（BM 工具链）

规范权威 = `memory-management` skill。参数:`[主题/项目名/问题] [--deep]`。
**读域**:hub 三库 + bytedance 域库；只读不写。

## 流程

1. **入口**:读 hub 索引 `MEMORY.md`（经 runtime 软链或 `<repo>/hub/MEMORY.md`；含模式行 +
   手写三组索引 ① 偏好与用户 / ② 项目·子系统·参考 / ③ 时间线，**域清单要 P5 后才有**）。
   只在需要"有哪些域"时读它——**具体内容一律用 `search-notes` 找，别逐级读 INDEX**。
2. **按问题类型路由**（命令表见下）。
3. **新鲜度**:比 `updated` 与现状；可疑标「可能过期」。索引本身也可能陈旧——
   `bin/bm status` 看 db 与磁盘的时钟差，差得多就说明 L2 维护没在跑，检索结果不代表磁盘。
4. **输出**:命中摘要 + 指针（path/permalink/project）;未命中如实说，不要拿 0.6 分的结果凑答案。

## 命令表

全部 `<repo>/bin/bm tool search-notes --project <hub|bytedance>` 打头，**默认追加 `--page-size 3`**。

| 问题 | 参数 |
|---|---|
| 关于 X 我知道什么 | `"X"` |
| X 项目在哪 / 什么状态 | `"X" --type project`（P5 前该过滤器返回 0，去掉它只用 `"X"`）；细节去工作区 AGENTS.md（v3：`.agent/MEMORY.md`），定位卡只给指针 |
| 已完结 / 活跃项目有哪些 | `--status closed --page-size 20` / `--status active`（不带 query）。**P5 reindex 前 hub 上返回 0**，此期间读 `hub/MEMORY.md` 人肉筛 |
| 我有哪些偏好 | `--type feedback --page-size 20`。**偏好卡的 type 是 `feedback`，`user` 这个值在 hub 里一张都没有** |
| 上周 / 最近哪些文件被动过 | `--after_date 7d`（也接 `'2d'` `'1 week'`）——查文件 mtime，只做交叉验证 |
| X 月 / 上周做了什么 | 读 `hub/timeline/TIMELINE.md`，或 `rg '<关键词>' <repo>/hub/timeline/records/`（P5 后为 `hub/timeline/`） |
| 某个域下都有什么 | `"<域名>"`——目录名进 FTS，bytedance 实测 `"signal-pixel"` 首条 1.170。**hub 要等 P5 建出 `ns/`**，现在 `"user-preference"` 首条 0.647 = 噪声 |
| 卡名 / 工具名 / 表名 / 实验号 | 直接当 query，走 FTS |
| 只想按标题或路径命中 | `--title "X"` / `--permalink "<glob>"` |
| 换个说法再找 | `--vector`（纯语义）或 `--hybrid` |
| 大结果集翻页 | `--page 2`（配 `--page-size`） |
| bytedance 观察/关系粒度 | `--entity-type observation --category <类>` |

`--deep` 时二跳展开：命中卡的 `_detail/<slug>/` 全部切片、对应工作区 AGENTS.md（v3：`.agent/MEMORY.md`）、
`hub/timeline/TIMELINE.md` + `hub/timeline/records/`（P5 后为 `hub/timeline/`）里同名条目、
bytedance 命中的 `source.quote` 原文。

## 分数判读

**带 query 词时**：

| 区间 | 含义 | 该怎么做 |
|---|---|---|
| ≥1.0 | FTS 命中字面 token（实测 1.14–1.21） | 可信，直接用 |
| 0.5–0.7 | 纯向量距离；同库噪声底实测 0.52–0.65，完全重叠 | **不算命中**。换精确 token 重查，或 Read 原文确认 |
| <0.5 | 阈值边缘 | 丢弃 |

**不带 query 词时换一套语义，别套上表**（套了会把正确命中当噪声丢掉）：

| 调用形态 | 分数 | 该怎么做 |
|---|---|---|
| `--title "X"` | **负分**，越负越匹配（SQLite FTS5 bm25 原始分）。实测 `--title "doc-system"` → -2.340、`--title "codex-plugin-cc-install"` → -4.103 | 负分是命中，直接用 |
| 纯过滤（只给 `--type` / `--status` / `--after_date`） | 恒为 `0`（实测 `-0.0`），根本没算相关性 | 看 `total` 与 `results` 数组，不看分 |

例：`--project hub "浏览器偏好"` → 首条 1.206（目标卡），第二条 0.613（无关）；
而 `"怎么让 agent 汇报得简短一点"` 这种口语化问法首条只有 0.63，前五条全是 timeline 噪声。
**结论：想查准就打出对象的真实名字，别用自然语言描述它。**

## 六个坑（都实测过）

1. **`--tag` 只认 `tags` 这个 frontmatter 键**。`topics:` 用 `--tag` 查不到。
   实测 `--tag hosting` → total 1，改成 `--meta tags=hosting` → total 0。
2. **`--meta k=v` 不做列表元素匹配**，只匹配标量。`--meta namespaces=ad-algo-core` → 0，
   哪怕该卡 frontmatter 里明写 `namespaces: [ad-algo-core]`。列表值只能靠 `--tag` 或当 query 词。
3. **带 query 时返回的 `total` 恒为 0**，是坏计数器，不代表没命中——看 `results` 数组。
   纯过滤调用（只给 `--status` / `--after_date`）的 `total` 才是真的
   （实测 bytedance `--status active` → 464，hub `--after_date 7d` → 7）。
4. **`--permalink` 匹配的是 permalink 值，不是文件路径**。hub 卡片搬进 `ns/<域>/` 后
   permalink 仍冻结为 `hub/<slug>`，所以 `--permalink "*<域>*"` 在 hub 上查不到东西；
   bytedance 的 permalink 本来就带 ns 段，那边可用（`--permalink "*signal-pixel*"` → 26 条）。
   **hub 想按域收窄，用域名当 query 词，不用 permalink glob。**
5. **FTS 只覆盖每个 entity 的前 6,000 字符**（`MAX_CONTENT_STEMS_SIZE`）。超出部分
   既不在 FTS 也不在向量 chunk 里 = 永久查不到。查不到时先怀疑正文超限，
   去 `_detail/<slug>/` 里 ripgrep，别断言"没有这条记忆"。
6. **每条结果的 content 被截在 4,000 字符**（`CONTENT_DISPLAY_LIMIT`）。看到的正文不是全文，
   要引用/判断细节必须 `read-note` 或 Read 原文。

## timeline 与语义索引

时间线已写进 `.bmignore`（为了把 62% 的召回预算从日志手里拿回来，代价是 TIMELINE→卡片的反向链接断了），
但**要等 P5 reindex 才真的出索引**——当前实测查 `"TIMELINE"` 首条 1.154 仍命中 `hub/timeline/records/2026-06-21`。
当前路径是 `hub/timeline/TIMELINE.md` + `hub/timeline/records/`，P5 后收进 `hub/timeline/`。

时间维检索：

- **权威 = 读 `hub/timeline/TIMELINE.md`**，或 `rg '<关键词>' <repo>/hub/timeline/records/`。
- `--after_date` 只是辅助：它按**索引记录的文件 mtime** 找卡片，不是 frontmatter `updated`
  （`sync_service.py:1101` `updated_at = file_metadata.modified_at`）。clone、批量重写、reindex
  都会整体重置 mtime，所以它只能回答"哪些文件最近被动过"，回答不了"这件事什么时候发生"。
  实测 hub `--after_date '30d'` → total 59 = 整库。
