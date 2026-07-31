# 项目定位库 — 定位卡规范

> 目标:**agent 从枢纽出发,两跳内定位到所有有价值的项目目录与云端文件**(`hub/MEMORY.md` → `hub/ns/<域>/INDEX.md` → 定位卡 → path/token)。
> 落点:`hub/ns/<域>/<slug>.md`(经 runtime 软链等价,见 `memory-management` §路径解析)。两级索引由 `<repo>/bin/build-index.py` 从 frontmatter 派生,**不手写**。

## 一、卡片形态

```markdown
---
name: <slug>
type: project
status: active | closed
updated: YYYY-MM-DD
topics: [<主归属域>, <跨域标签>…]
description: <一行 ≤80 字,召回判相关用>
permalink: <已有则原样保留,不动>
---

- 本地:`<工作区目录绝对路径>`
- 云端:飞书任务夹 `<token>`;live 交付 `<token>`(URL 可附)
- 现状:<一行当前态/结论>
- 下一步:<一行>
- 关联:[[相关项目]] [[相关子系统]]
- 细节:`hub/_detail/<slug>/`(有切片时才写)
```

### frontmatter 必须顶层承载

`type` / `status` / `updated` / `topics` 是**顶层键**,不得嵌进 `metadata:`。**判据**:BM 的 `--type` / `--status` / `--meta` 只读顶层键,嵌在 `metadata:` 下等于全部失效(实测数字 = `knowledge.md` §三 两条实测边界)。拍平是这组过滤器可用的前提,否则「列出所有已完结项目」没有可执行判据,只能人肉读索引。

- `type` 枚举与 `topics` 受控词表 = `knowledge.md` §一(唯一权威,不在本文件复制)。本文件管其中两个值:`project`(母卡,本节)与 `detail`(切片,§三)。
- `topics` 第一个值 = 主归属域,与所在 `ns/<域>/` 目录同名;其余为跨域标签。**分类真相在 frontmatter,目录只是主归属的浏览投影**——照搬 bytedance(469 条事实里 464 条挂多个 namespace)。
- `permalink` 已存在就别改——它是 relation 的连接键。

## 二、正文 ≤6,000 字符(硬上限)

**判据**:这是 FTS 的物理上限,不是拍的数——`select max(length(content_stems)) from search_index` 实测 **6000**,全库无一例外。超出的字符既不进 FTS 也不进向量 chunk,**写了等于没写**:实测最厚一张卡,字符偏移 1,780 的词命中(score 1.169),偏移 6,112 与 13,651 的词 0 命中,向量 chunk 只覆盖正文的 **8.7%**。

> 完整偏移实测表与论证 = 体检报告 §二·根因三:
> `/Users/bytedance/Desktop/AI Workspace/Agentic Engineering/memory-system-audit-2026-07-29/记忆系统体检与重构方案.md`(下称**体检报告**)

字段行(本地/云端/现状/下一步/关联/细节)是骨架,**6,000 是上限不是目标值**——超上限的内容一律切片(§三),不允许在卡片正文里长。

**超限卡清单不写死在这里**(写死立刻过期),现查 `<repo>/bin/lint.py --project all`,`body-too-long` 一项直接列出。

2026-07-29 迁移轮已切片的四张卡都在 `hub/_detail/` 下,母卡正文均已回到上限内:`llm-emb-data-analysis-task`(7 片,切前正文 25,681 字符)、`feishu-memory-system`(5 片,切前 6,041 字符)、`travel-catalog-embedding-offline-scope`(5 片)、`llm-emb-learning-project`(1 片)。

## 三、超上限 → 切片**进**索引

方向必须说清:把厚正文移出索引是负收益——现状已经是大部分查不到,移出去等于设计上永久查不到,连仅存能命中的那 8.7% 也一起丢。切片让每一片都进索引,覆盖率 8.7% → ≥95%。

- **切法**:按卡片正文的 `## ` 段落切,一段一文件 → `hub/_detail/<slug>/<NN>-<段落 slug>.md`;单段仍 >6,000 字符的,按 `### ` 再切或顺序分 `<NN>a`/`<NN>b`。
- **卡片留**:字段行 + 每个切片一行「段名 → 相对路径」,`- 细节:` 行指向 `hub/_detail/<slug>/`。
- **切片 frontmatter**(键同样必须**顶层**;`lint.py` 对切片用同一套判据,**没有免除条款**——缺 `status` 一样判 error):

```yaml
---
name: <slug>-<段落 slug>
type: detail            # detail 已在 type 枚举内(枚举权威 = knowledge.md §一)
status: <继承母卡的值>   # active | closed,跟着母卡走
updated: YYYY-MM-DD
topics: <继承母卡的列表>
description: <该段一行摘要,召回判相关用>
detail_of: <母卡 slug>   # 机读回链
permalink: <已有则原样保留,不动>
---

> 母卡:[[<slug>]]        ← 正文首行必写,人读回链 + BM relation
```

- **回链两份都要**,`detail_of` + 正文首行缺一不可。理由:切片存在的意义就是**被独立召回**,只在母卡留链等于让召回到切片的 agent 无路可回。母卡独占的警告(路径已废、口径 superseded 之类)也要把一句话版复制进相关切片,否则切片被单独读到时既无纠正上下文也无回母卡的路。

- **`_detail` 不进 `.bmignore`**。ignore 一个已索引路径不是「不索引」,是删除 entity 并级联删关系(实测 entity 61→36 / relation 122→56)。
- **切片是搬移不是删除**:原文逐字完整保留,总内容一个字不少。与 `update-rules.md` §三红线的关系在那里写明。

## 四、归档联动:只改 status,不移动文件

工作区归档(`tasks/_archive/`)时:`status: closed` + 本地 path 换归档路径 + 现状行改完结态一句 + 刷 `updated`。**卡片文件留在原 `ns/<域>/` 不动。**

两条判据(论证过程 = 体检报告 §三·一个必须纠正的对齐方向、§七 P3):

1. 生命周期不该进目录名:目录名参与 FTS 且是最强信号(实测主题词查询首条 score 1.170),而 `active`/`archive` 没人拿来提问,检索增益为零;过滤用 `--status closed` 一条命令即可。
2. 归档是「既改内容又移动文件」,同批提交走 delete+new 路径,丢 `created_at` 与入边——hub 120 条 relation 里 **62 条**是 TIMELINE → 卡片的反向链接,正是这类入边。

归档不删卡——定位库对归档项目同样承诺可达。

## 五、存量卡:豁免条款已删除

原「存量兼容」段的厚卡豁免(旧卡「正文原样保留为历史态——不重写内容」)**已 override 删除**,用户 2026-07-29 批准。按 AGENTS.md harness 红线,冲突只能 override 或 keep-old 二选一、不共存——这里取 override,旧条款不再以任何形式保留。

**判据**:该条款给的是无截止日期的免检权,而实测单张活跃卡一天追加 **21.5 KB(字节)**(07-28 3,773 B → 07-29 8,758 B → 同日工作区未提交 30,329 B),「重组一次 + 事后巡检」在这个速率下必然追不上,所以执行点必须在写入那一刻(= `update-rules.md` §五 的写入后门禁 + L1 hook)。退化速率论证 = 体检报告 §五。

存量卡按新规范一次性处理,**没有豁免**:

1. frontmatter 从 `metadata:` 拍平到顶层,补 `status` / `updated` / `topics`;
2. 双 frontmatter 块(`ensure_frontmatter_on_sync: true` 回写所致,现有 3 个文件各有 2 行 `permalink:`)合并成一块,保留原 `permalink` 值;
3. 正文超 6,000 字符 → 按 §三 切片;
4. 修悬空 `[[wikilink]]`(2026-07-29 实测 DB `to_id is null` 全库 9 条,hub 占 8 条);修法 = 改指向真实存在的路径或 slug,**不许改写成一句「已回灌 / 已并入 X」的断言**——那是把 lint 能抓的悬空换成 lint 抓不到的假话。

## 六、边界

- 落哪层不在这判(harness-management 的事);本文件只管「已定为项目层」后的落盘形态。
- **细节唯一权威 = 工作区 `.agent/MEMORY.md`**;定位卡只管「在哪 + 现状一行 + 下一步一行」。全局层只维护指针不维护内容,这是低 overhead 的来源。
- 已有同项目卡 → **更新该卡**(刷 status/updated/现状行),不新建重复。
- 只记代码/git 历史记不到、且本项目专属的内容;相对日期换绝对日期。
- **索引行不手写**:改完卡片跑 `<repo>/bin/build-index.py` 重新派生 L0/L1;手写的行会被下一次派生覆盖。写完必过 `<repo>/bin/lint.py`(见 `update-rules.md` §五)。
- 底层 md 读写交给 `lark-markdown`(write-md-file)。
