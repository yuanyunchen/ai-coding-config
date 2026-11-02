# 知识检索库 — hub 主题 + bytedance 域库(basic-memory)

> 目标:按主题取内容 + 语义检索。两级:通用知识(`hub`) + 域工作知识(`bytedance`)。
> 本文件同时是 **hub 分类词表的唯一权威**(§一),其他 references 只引用不复制。

## 一、分类词表(hub)

### type — 顶层键,单值

| 值 | 装什么 |
|---|---|
| `project` | 项目定位卡(形态规范 = `project-index.md`) |
| `user` | 用户身份与环境事实 |
| `feedback` | 用户明确表达过的偏好与协作纪律(**取值**,不是行为规则) |
| `reference` | 跨任务恒真的工作知识、踩坑、方法 |
| `detail` | `_detail/` 厚正文切片(frontmatter 规范 = `project-index.md` §三,含 `detail_of` 回链) |
| `index` | 派生索引(`MEMORY.md` / `INDEX.md`,在 `.bmignore` 里,不进检索) |
| `note` | 时间线日记条目(`timeline/records/`);P5 后进 `.bmignore`,不进检索 |

### status — 顶层键

`active` | `closed`。closed **不移动文件**,靠 `--status closed` 过滤(理由见 `project-index.md` §四)。

### topics — 顶层键,多值,受控

第一个值 = 主归属域,与所在 `hub/ns/<域>/` 目录同名;其余为跨域标签。

**域(5 个,同时是目录名)**:

| 域 | 装什么 |
|---|---|
| `search-city-signal` | Search Query 城市信号工作线:相对 Pixel 的增量与价值、信号质量、意图到广告覆盖、召回排查与在线实验 |
| `user-preference` | 用户明确表达过的工作偏好与协作纪律:自主度、汇报长度、交付形式、模型选型、浏览器后端、工具调用与数据探测口径 |
| `agent-harness` | 全文权威在 harness 对象(skill/插件/配置仓)里的指针卡与踩坑卡:配置与 runtime 定位、CLI 委派、Codex 插件、skill 写法、取数双轨、飞书执行避坑 |
| `memory-workspace` | Agent 自己的记忆库与工作区文件系统:三层元系统重构、工作区 v2 规范、文档系统重构、bytedance 域库入口 |
| `travel-embedding` | Travel 商品与用户序列 embedding 双链路:catalog 注册表、dense 文本生产、LLM emb 学习与数据分析、表血缘与数据地图 |

**跨域标签**:`search-query` `pixel-signal` `intent-signal` `product-recall` `psort` `libra-experiment` `coverage-analysis` `ad-increment` `travel-catalog` `embedding` `user-sequence` `hive-table` `sql-query` `data-probe` `data-quality-gate` `skill-authoring` `subagent` `model-routing` `browser-automation` `cli-delegation` `codex` `tool-gotcha` `basic-memory` `feishu` `deliverable-format` `methodology`

新词先进本表再用——`topics` 是受控词表不是自由 tag,自由取值会让标签退化成噪声。

**目录只是主归属的浏览投影,分类真相在 frontmatter**:照搬 bytedance(469 条事实里 464 条挂多个 namespace),不用单值目录做分类。目录名之所以按主题域取,是因为它参与 FTS 且是最强信号——实测查询 `signal-pixel` 首条 score 1.170、`ad-algo-core` 首条 1.135。

## 二、通用知识(hub)

- 落点:`hub/ns/<域>/<slug>.md`(runtime 软链等价路径);一事一文件;正文 ≤6,000 字符(FTS 硬上限,实测 `max(length(content_stems))` = 6000),超出按 `## ` 切到 `hub/_detail/<slug>/`,每片仍进索引。
- 索引:`hub/MEMORY.md`(L0)与 `hub/ns/<域>/INDEX.md`(L1)由 `<repo>/bin/build-index.py` 从 frontmatter 派生,**不手写**;手写行会被下一次派生覆盖。
- 写入:`<repo>/bin/bm tool write-note|edit-note --project hub …`,或直接改 md。
  ⛔ 改完 md **不要**自己跑同步:`bm sync` 在 0.22.1 不存在,唯一同步路径 `bm reindex` 无并发保护,入库交触发层 L2(见 `update-rules.md` §四、§五)。
- 来源:工作区 `.agents/memory/`(v3:`.agent/memory/note/`)中跨任务恒真的内容,经里程碑 / update 升华。
- **规则不进这里**:行为约束 → harness(AGENTS / SKILL);这里只放事实、状态、偏好取值。

## 三、检索契约(别只用裸 query)

```
<repo>/bin/bm tool search-notes --project hub|bytedance [query] [选项]
```

| 选项 | 用法 |
|---|---|
| `--page-size N` | **默认写 3**。不写按 10 条返回,一次能吐三万字符进 context |
| `--type` | 顶层 `type`,可重复。例:`--type project` |
| `--status` | 顶层 `status`。例:`--status closed` 列已完结项目 |
| `--meta k=v` | 任意顶层**标量**键值,可重复 |
| `--tag` | frontmatter `tags`,可重复 |
| `--after_date '30d'` | 按**文件 mtime** 过滤(**不是** frontmatter 的 `updated`);可不带 query 单用,口径见 `time-index.md` §二 |
| `--permalink` / `--title` | 按 permalink / 标题匹配 |
| `--vector` / `--hybrid` | 纯向量 / 混合检索 |
| `--entity-type` / `--category` | 限定 entity·observation·relation / observation 分类 |

两条实测边界(2026-07-29,0.22.1):

- 过滤器只认**顶层** frontmatter:hub `--type project` → 0(键嵌在 `metadata:` 下),bytedance `--type semantic` → 438。拍平到顶层是这些参数可用的前提。
- **多值键不能用 `--meta` 过滤**:`--meta namespaces=signal-pixel` → 0,而该 namespace 磁盘上有 26 张卡。`topics` 同理——按域取内容走 `rg` 或直接把域名当 query 词(域名参与 FTS,首条 1.170)。

语义阈值 `semantic_min_similarity` 上游默认 `0.55`,本机 `bin/setup` 曾硬写 `0.35`;调回后同一查询返回量降 66%,召回噪声主要来自这里。

## 四、域工作知识(bytedance)

- **BM project 名 = `bytedance`**(目录 `bytedance/`,原 feishu-memory 并入本仓)。
- 检索:`<repo>/bin/bm tool search-notes --project bytedance "<问>"`(或 MCP `search_notes` + `project=bytedance`);带实体名,命中后核 `source.quote` 时效。
- 执行坑 → 域 skill memory;工作知识 → bytedance。做域任务前两者都先查。
- **硬隔离 = BM project**:搜 hub 不混 bytedance,反之亦然。
- **全局零渗漏**:域细节不进 hub 正文;hub 只留一行指针(卡片在 `hub/ns/memory-workspace/`,`topics` 首值 `memory-workspace`)。
- 新域:按量新建独立 BM project + 子目录,复制本模式;不预建空库。

## 五、可移植约定

- Skill / 指令只写 **project 名** + `bin/bm`(相对仓库根),不写死本机绝对路径。
- 仓库根 = `hub/` 的 parent;由各机 `bin/setup` 把绝对路径写入 `~/.basic-memory/config.json`。
