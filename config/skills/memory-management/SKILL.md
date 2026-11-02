---
name: memory-management
description: "全局记忆统一体系(hub 三库 + bytedance 域库),basic-memory 工具链唯一入口;模式 none/auto/full(缺省 auto),recall·update 两例程。触发:写入/维护全局记忆、语义检索工作知识、定位项目、TIMELINE、偏好、补记、解冲突。边界:判层归 harness-management,工作区文件归 workspace-management;轻量读枢纽不需加载。"
---

# memory-management — 全局记忆 Meta skill（unified BM；2026-07-29）

全局记忆 = **单仓 `global-memory` + basic-memory 双 project**，两侧都是层级化形态：

| BM project | 目录 | 装什么 | 层级 |
|---|---|---|---|
| **hub** | `hub/` | 项目定位 / 时间索引 / 偏好与跨任务主题 | `MEMORY.md` → `ns/<域>/INDEX.md` → `ns/<域>/<slug>.md` → `_detail/<slug>/<段>.md`（**hub 侧是 P5 后的目标态，见下**） |
| **bytedance** | `bytedance/` | 字节广告工作知识（原子事实） | `MEMORY.md` → `ns/<域>/INDEX.md` → `ns/<域>/<fact>.md` |

概念上仍称「三库」（定位 / 时间 / 知识），物理都在 `hub/`；域工作知识在 `bytedance/`（BM project 硬隔离）。

```
hub/
  MEMORY.md              L0 路由索引（由 bin/build-index.py 从 frontmatter 派生，勿手写）
  ns/<域>/INDEX.md       L1 域索引（派生）
  ns/<域>/<slug>.md      L2 卡片，正文 ≤6,000 字符
  _detail/<slug>/<段>.md L3 厚正文切片，每片独立进索引
  timeline/              TIMELINE.md + records/，在 .bmignore 里，不进语义索引
```

**上面是 P5 收口后的目标形态，不是当前磁盘现状**：`hub/ns/` 尚未创建，卡片平铺在 `hub/`；
时间线当前是 `hub/timeline/TIMELINE.md` + `hub/timeline/records/`，虽已写进 `.bmignore`，
但 reindex 前**仍在语义索引里**（实测查 `"TIMELINE"` 首条 1.154 命中 `hub/timeline/records/2026-06-21`）。

hub 域（P5 后权威清单以 `hub/MEMORY.md` 为准）：`search-city-signal` `user-preference`
`agent-harness` `memory-workspace` `travel-embedding`。
**当前 `hub/MEMORY.md` 里还没有域清单**，它是手写三组索引（① 偏好与用户 / ② 项目·子系统·参考 / ③ 时间线）。

**分类的真相在 frontmatter，目录只是主归属投影。** 顶层键 `type` / `status` / `updated` /
多值 `topics` 承载分类；嵌进 `metadata:` 会让 BM 的所有过滤器返回 0。规范细节：`references/*.md`。

## 路径解析（禁止写死本机绝对路径）

1. 枢纽 runtime 常见软链 → `…/global-memory/hub`（具体链路由各机 `bin/setup` 写入）
2. **仓库根** = hub 目录的 parent（或读同仓 `manifest.json`）
3. **CLI** = `<repo>/bin/bm`（包装 basic-memory；迁移后只要 clone + `./bin/setup`）
4. MCP 调用一律带 `project=hub` 或 `project=bytedance`

新机器：`clone global-memory` → `./bin/setup` → `./agent-config memory status`。契约见仓内 `manifest.json` / `README.md`。

## 域边界

日常任务按需检索 hub；仅当前任务确实涉及字节工作知识时检索 bytedance。索引中出现飞书历史项目不构成加载飞书技能或执行记忆的理由，也不改变当前任务的交付平台。飞书执行记忆仅供已确认的飞书操作使用。

## 检索契约

`bin/bm tool search-notes` 支持 `--page-size` `--page` `--type` `--status` `--meta k=v` `--tag`
`--after_date` `--permalink` `--title` `--vector` `--hybrid` `--entity-type` `--category`。
**默认必带 `--page-size 3`**：实测 `--project hub "浏览器"` 不带参数吐 74,927 字符，
带 `--page-size 3` 是 11,835 字符；单条 content 被截在 4,000 字符（`CONTENT_DISPLAY_LIMIT`），
默认 10 条里大半是截断残渣。

| 想知道 | 走 |
|---|---|
| 关于 X 我知道什么 | `search-notes --project hub "X" --page-size 3` |
| 有哪些已完结 / 活跃项目 | `--status closed` / `--status active`；**P5 reindex 前这两个都返回 0**，此期间读 `hub/MEMORY.md` 人肉筛是合法兜底 |
| 只要项目卡 / 只要偏好卡 | `--type project` / `--type feedback`（多值可重复传）。**偏好卡的值是 `feedback`；`user` 在 hub 里一张都没有**，别用 |
| 最近哪些卡被动过 | `--after_date 7d`（也接 `'1 week'`）——它过滤的是**索引里的文件 mtime**，不是 frontmatter `updated`，只能用来交叉验证哪些文件最近被动过 |
| X 月 / 上周做了什么 | 读 `hub/timeline/TIMELINE.md`，或 `rg '<关键词>' <repo>/hub/timeline/records/`。**TIMELINE 才是时间索引的权威**，`--after_date` 替代不了它 |
| 某个域下都有什么 | 把**域名当查询词**（目录名进 FTS）：bytedance 上实测 `"signal-pixel"` 首条 1.170。**hub 侧要等 P5 建出 `ns/` 才有效**——现在查 `"user-preference"` 首条只有 0.647，落在噪声带 |
| 卡名 / 工具名 / 表名等精确对象 | 直接当查询词，FTS 会命中 |
| 换个说法再找一次 | `--vector`（纯语义，绕开 FTS）；`--hybrid` 两路合并 |

**两条必须先知道的事实**（不知道就会把空结果当成"没有这条记忆"）：

- **frontmatter 过滤器在 P5 reindex 前基本是死的**。DB 仍是迁移前状态，实测 `--type note` → total 58，
  而 `--type project` / `--type feedback` / `--status closed` 全部 → total 0；磁盘上这三类分别有
  22 / 10 / 9 张。过滤器返回 0 时先怀疑索引没跟上，再怀疑记忆不存在。
- **`--after_date` 过滤的是索引里的文件 mtime，不是 frontmatter `updated`**
  （`sync_service.py:1101` `updated_at = file_metadata.modified_at`）。clone、批量重写、reindex
  都会把 mtime 整体重置，所以它对"这条知识什么时候成立"无效，只对"这个文件最近被动过"有效。
  实测 hub `--after_date '30d'` → total 59 = 整库。**时间维的权威是 `hub/timeline/TIMELINE.md`。**

**分数判读**（实测，不是估计）。下面三档**只适用于带 query 词的调用**：

- **≥1.0** = FTS 命中了查询里的字面 token，可信。精确 token 查询实测落在 1.14–1.21
- **0.5–0.7** = 纯向量距离，与噪声底（同库实测 0.52–0.65）完全重叠，**不构成命中**。
  换一个精确 token 重查，或 Read 原文自己确认，不要直接当答案用
- **<0.5** = 噪声（`semantic_min_similarity` 阈值以下会被截掉）

不带 query 词时分数换了一套语义，**别拿上面三档去判它，会把正确命中当噪声丢掉**：

- **`--title` 命中给负分**（SQLite FTS5 bm25 原始分，越负越匹配）。实测
  `--title "doc-system"` → -2.340、`--title "codex-plugin-cc-install"` → -4.103。负分是命中，不是噪声。
- **纯过滤（只给 `--type` / `--status` / `--after_date`）score 恒为 0**（实测 `-0.0`），
  因为根本没算相关性。这时看 `total` 和 `results` 数组，不看分。

参数逐条语义、坑与组合用法：`modules/recall.md`。

## 记忆模式（v3）

记在 `hub/MEMORY.md` 头部。缺省 **auto**。

| 模式 | 纪律 |
|---|---|
| **--none** | 不自动写。手动（对话或 /project-update）才更 |
| **--auto(缺省)** | 里程碑后三小件（定位卡现状 + TIMELINE 一行 + 恒真知识）；出入大时跑 update |
| **--full** | 定型即写；新 session/换项目自动 recall |

## 写入纪律

- **工具链**：读/写/改记忆优先 `bin/bm tool {search-notes,read-note,write-note,edit-note} --project …`；hub 索引行与 TIMELINE 亦可直接编辑 md
- **体积门禁（必做）**：任何写入后跑 `<repo>/bin/lint.py --path <改过的文件>`，
  正文超 6,000 字符必须切片到 `_detail/<slug>/`。三小件的动词全是"刷/补/入"，
  不设门禁就是单向增长（实测退化速率 21.5 KB/天）。细则见 `modules/update.md`
- **索引派生不手写**：`MEMORY.md` / `INDEX.md` 由 `bin/build-index.py` 生成，手改会被覆盖
- **无痕**：auto/full 下三库内容直接落盘，不审批不汇报；可审计 = `updated` + git
- **仲裁序**：工作区 task.md 上层原话 > 工作区实物 > 全局记忆；不静默删文件；update 末步冲突检查
- **域执行坑**仍在域 skill memory（如 `feishu-task-management/memory.md`），**不**进 bytedance 事实库

## 索引同步与维护

**`bm sync` 这个子命令不存在**（0.22.1）。唯一同步路径是 `bm reindex`，它**没有并发保护**——
手跑之前必须 `pgrep -fa 'basic-memory mcp'` 为空；带 embeddings 的 reindex 必须后台 detached 跑，
前台会因加载模型超时被杀、留下 orphaned chunks。`bm status` / `bm doctor` / `search-notes` 只读，随时可跑。

日常不该手跑 reindex——只有一个执行器：

| 层 | 执行器 | 职责 |
|---|---|---|
| L2 后台 | `~/Library/LaunchAgents/` 加载 `<repo>/bin/maintain.sh`（900s） | `build-index.py --check`（只校验不写）→ `lint.py --json` → `bm reindex -p hub`（detached，本轮不等）→ 写状态文件 `~/Library/Logs/global-memory/lint.json` |

L2 **对 git 只做读操作**（`git status --porcelain` / `git rev-parse`），不 pull / 不 stash / 不 add /
不 commit / 不 push——commit 永远是人的动作。reindex 有四道门禁，任一命中就跳过：
`GM_NO_REINDEX=1`、`<repo>/.gm-maintenance-hold` 存在、`git status --porcelain` 非空、
`basic-memory mcp` 进程在跑（另外上一轮 detached reindex 没收完时本轮也不起新的）。
迁移期想彻底停掉 reindex 就 `touch <repo>/.gm-maintenance-hold`。
drift 对账与 TIMELINE 月压缩也折在 L2 里，**没有"每周自动"这一层**——需要时手动跑，别当它自动发生。

**这个执行器存在与否要自己确认**，别当它必然在跑（历史上有过一个根本不存在的周度执行器，
被 12 处规范指派了职责）：`ls <repo>/bin/maintain.sh` + `launchctl print gui/501/com.yunchen.global-memory-maintain`。
**截至 2026-11-01 该 job 未注册**(`~/Library/LaunchAgents/` 无 plist,`launchctl print` 报 service not found;`maintain.sh` 最后日志 2026-09-18),reindex 目前是手动步骤,
即 L2 现在没在跑，索引落后于磁盘是常态。不在 → 报给用户，别声称记忆库是新鲜的。

## 路由表

| 场景 | 走 |
|---|---|
| 项目在哪/什么状态 | `--project hub --type project` + 定位卡规范 `references/project-index.md`（P5 前该过滤器返回 0，退回读 `hub/MEMORY.md` ②组） |
| 列出已完结项目 | `--project hub --status closed`（同上，P5 reindex 后才有结果） |
| 何时做了什么 | 读 `hub/timeline/TIMELINE.md` 或 `rg` 一遍 `hub/timeline/records/`（P5 后为 `hub/timeline/`）；结构见 `references/time-index.md`。`--after_date` 只查文件 mtime，用来交叉验证哪些文件被动过，不回答"何时做了什么" |
| 偏好/跨任务知识 | `--project hub`（偏好卡 `--type feedback`，不是 `user`） |
| 字节广告工作知识 | `--project bytedance`（必带实体名；命中后核 `source.quote`） |
| 卡片 `type`/`topics` 填什么 | 分类词表 `references/knowledge.md` §一（受控词表唯一权威，新词先进表再用） |
| 写入纪律与门禁 | `references/update-rules.md`（无痕边界 / 红线 / 写完必跑 `lint.py`） |
| 更新 / 定向检索 | `modules/update.md` / `modules/recall.md` |
| 记不记/落哪层 | `harness-management` placement-table |

## 边界

- WHERE → harness-management；工作区文件 → workspace-management
- 不依赖 `~/feishu-memory` 目录名；旧路径若存在应为指向 `bytedance/` 的软链
