# 飞书块级 API 落地配方(把"写作规则"翻译成块级 API 的具体 JSON)

> **执行层走官方 `lark-cli`(`@larksuite/cli`;见 `feishu-task-management` 入口 + `cli.md`),旧 `mcp__feishu__*` MCP 已退役,不再是执行路径。** 本篇里的 `mcp__feishu__*`(`{path, params, data}` 形态)是退役 MCP 的旧记法,**仅作「动作 → 块级 API 参数语义 / JSON 形状」参考**;实际执行用 `lark-cli` 对应命令(裸 `api` 打同一 `/open-apis/...` 端点、或高层 shortcut),以 `lark-cli <域> +<shortcut> --help`、`lark-cli schema <service.resource>`、`lark-cli skills read lark-<域>` 为准(见 `cli.md`)。下文 JSON 配方(块顺序 / 带 link 的 callout / 对比表 / ASCII+PNG 图 / 列宽)描述的是**飞书 block API 的请求体形状**,与具体 CLI/MCP 调用形态无关、照旧适用。

> 为什么有这篇:本 skill 的写作规则原来用 Mira 的 XML 方言(`<whiteboard>`/`<img href>`/`[[标题]](url)`),Mira 渲染器免费帮你渲染。但本机落地是直接打 **飞书 block API(JSON)**,没有渲染器:超链接要写进 `text_element_style.link`、表格要逐 cell 建、mermaid 不渲染。没有下面这些配方,执行时就会**丢链接、不画表、图太少、块错位**(这正是上一版测试稿的硬伤)。**写飞书文档前必读本篇 + §1.4 + 收尾对照 §10 清单。**

用户 Drive 操作走用户身份(`lark-cli --as user`;旧 MCP 记法的 `useUAT:true` 即此语义)。

⚠️ **`docx_v1_document_create` 的 `title` / `folder_token` 必须嵌在 `data` 里**:实测裸调 `document_create`(不包 `data`)**不报错、却产出 `title:""` 的空文档并建在默认根目录**(漏 data 静默错位,还污染根目录)。正确入参:`document_create({ data: { title, folder_token }, useUAT:true })`。

---

## ⚠️ 执行覆盖层(最高优先级,先读这一段再动手)

**本篇 = 本机飞书侧执行的唯一权威(执行走官方 `lark-cli`,下文 MCP 记法仅作动作语义参考)。** `lark-doc-xml.md`(恢复自 Mira 官方,逐字 gold)描述的是 Mira 渲染器的 XML 方言与**视觉意图**——它讲"想要什么效果",**不保证本机飞书 API 能产出**。凡 `lark-doc-xml.md`(及 `lark-doc-style.md`)写的构造与本节冲突,**以本节实测结论为准**:`lark-doc-xml.md` 是 STYLE / intent 参考,本篇 mcp-recipes 是 EXECUTION 权威。

下表是 M4 在真实租户上实测、经飞书 API **不可原样实现**的 Mira 构造及其落地替代(原始 API 响应见 module4 探针报告):

| Mira XML 构造 | 经飞书 API 实际发生 | 本机落地替代 |
|---|---|---|
| `<whiteboard type="mermaid">` | `document_convert` 把它**拍平成一段纯 Text(2)**(连换行都丢),不出画板 | **渲染成 PNG → Image(27) 块**(配方3 + §6b);纯文本兜底 ASCII `<code language="text">`(Code(14)) |
| ` ```mermaid ` 围栏 | 只成普通 **Code(14)** 块,不渲染成画板 | 同上;mermaid 源码仅作"给用户拷进渲染器"用 |
| 原生 Diagram(21) 块(流程图/UML) | 块 create 直接报 `1770029 block not support to create`——**根本建不出来** | 同上(PNG→Image / ASCII);别尝试 create type 21 |
| `<lark-table>` | `document_convert` **拍平成纯 Text(2)**(单元格文字连成一串) | **markdown pipe 表格** 或 **HTML `<table>`** → 原生 **Table(31)**(已验证);或 block API"裸建 table + batchUpdate 回填 cell"(配方2,**勿在 descendant 树里塞 cell**) |

**已验证可正常实现**(无需替代):标题 H1/H2/H3(3/4/5)、bullet(12)、有序列表(13)、quote(15)、Code(14)、Table(31)、Callout(19)、Image(27)。结论:**绝不盲目 emit `<whiteboard>` / `<lark-table>` / Diagram(21) 期待它们渲染**;按上表走替代。

---

## 配方 0(最重要):**保证块顺序正确**——别再让图/段落掉到文末
上一版 bug:文字先建、图后面单独 append → 图/公式/段落全掉到文档末尾。根因是**多次单独插入 + 用了末尾 index**。硬规则:

1. **同一段内容一次建完**:把"这一节的标题 + 正文 + 图占位"放进**同一个** `documentBlockChildren_create` 的 `children` 数组里(数组顺序 = 文档顺序),一次调用插入。不要正文一批、图再一批。⚠️ **唯一例外:table(31) 不能和其它块类型同批**,必须单独一次 children_create 调用(同批会 `1770001`,见配方2);其余块(含 image)可自由混建。
2. **图片块要"就地建"**:图片块先以**空 image 块**(block_type 27)建在它该在的位置(放进上面那个 children 数组),拿到 block_id 后再走 §6 curl 管线把字节绑上去。**绝不**"先写完全文再把图 append 到末尾"。
3. **分多批 append 时只用"尾部追加"**:每一批都追加到当前文档末尾(`index` = 当前子块数,或省略走默认尾部),**按章节先后顺序一批批来**。需要往**中间**插时,`documentBlockChildren_create` 的 `index` 指定位置,且**多处插入先大 index 后小 index**(后插的不顶掉先插的下标)。
4. **收尾必做回读校验**:全部建完后 `docx_v1_documentBlock_list` 拉一遍,确认末尾不是孤儿图/公式、章节顺序与大纲一致。错位就 move/删重建。
5. 复杂容器(callout/表格/quote 容器)用 `documentBlockDescendant_create` **整棵一次建**,天然不会错位。

---

## 配方 1:文档开头两 callout —— 概述框 + **带 link 的 Context 框**(§1.4 强制)
**Context 框里每个来源都要是可点链接**(这就是上一版"引用没 link"的修法)。超链接 = 在 text_run 上挂 `text_element_style.link.url`(url 要 url_encode)。

⚠️ **callout 创建正确姿势(实测,踩过坑)**:Callout(19) **创建时会自动带一个空 Text(2) 子块**。所以**两步走**:① 先建**裸 callout**(只给 `callout` 属性,**不要**在同一棵 descendant 树里再塞一个显式 text 子块)→ ② 拿到自动子块的 block_id 后,用 `documentBlock_patch` 把内容写进那个自动子块(多条内容则在 callout 下 `documentBlockChildren_create` 追加 text/bullet)。**反例(必报错)**:`documentBlockDescendant_create` 里给 callout 显式塞一个 child text → `1770041 open schema mismatch`(因为和自动子块冲突)。

要点:
- callout = block_type 19;`callout.background_color` 用 1–15、`border_color` 1–7、`text_color` 1–7(传 0 报错)。概述框用浅蓝(background 5 / border 5),Context 框用浅橙(background 2 / border 2)。
- **callout 图标:在「裸建」时把 `callout.emoji_id` 设成想要的图标,并且正文【不要】再放前导 emoji —— 一个 callout 只留一个图标。**(这是 fix_round_visual 在 Chrome 上肉眼验证后的定稿,推翻了旧的"正文前导 emoji"写法。)
  - **为什么改**:callout 的原生图标 `emoji_id` **默认是 🎁 gift**。旧写法靠"正文首字符放 📘/📎"维持视觉契约,但默认 gift 并不会消失 —— 渲染出来是 **🎁 + 📘 两个图标并排**(用户看到的"🎁 📘 概述"双图标缺陷,fix_round_visual D2 在 Chrome 实拍确认)。
  - **正确做法(实测可行,fix_round_x 在 Chrome 肉眼 + DOM 双确认)**:`emoji_id` **可以在创建时设定并正确渲染**。⚠️ **value→glyph 不是字面直觉,必须按实拍映射,别想当然**。fix_round_x 在 test folder 建 7 个 callout 逐一开 Chrome 实拍,确认的可靠映射:

    | `emoji_id`(存储值) | 实际渲染 glyph | 备注 |
    |---|---|---|
    | `book` | **📖** | 「概述/学习」开场框用这个(渲染成翻开的书) |
    | `open_book` | **💡** | ⚠️ **反直觉**:存 `open_book` 渲染出来是灯泡,**不是** 📖 —— 旧配方写「open_book→📖」是错的,别再用 `open_book` 当「书」图标 |
    | `bulb` / `light_bulb` | **💡** | 「小结/提示/洞察」框用 `bulb`(语义直观,渲染灯泡) |
    | `pushpin` | **📌** | Context/置顶框可选 |
    | `paperclip` | **📎** | Context/附注框 |
    | `memo` | **📝** | 笔记/备忘框 |

    全部**渲染成上表 glyph、无一回落 gift**,且正文无前导 emoji 时**左侧只有这一个图标,干净**。**开场契约定稿(按实拍值)**:概述/学习框 `emoji_id:"book"`(📖)、小结/提示框 `emoji_id:"bulb"`(💡)、Context/附注框 `emoji_id:"paperclip"` 或 `"pushpin"`(📎/📌)。⚠️ **要 📖 用 `book` 不要用 `open_book`;要 💡 用 `bulb`。**
  - ⚠️ **`emoji_id` 必须走原始 REST 在 create 时设,不能靠本机 MCP 工具,也不能事后改**:① 本机 MCP `documentBlockChildren_create` / `documentBlockDescendant_create` 的 `callout` 入参 schema **只有 `background_color`/`border_color`/`text_color` 三个字段、根本没有 `emoji_id`**——经 MCP 建的 callout **一律落默认 `emoji_id:"gift"` → 渲染 🎁**(fix_round_x 实测:纯 MCP `documentBlockChildren_create` 建 callout 不传 emoji_id,回读 `callout.emoji_id` 就是 `"gift"`,Chrome 实拍渲染 🎁)。② 事后改:`documentBlock_patch` 改 callout `emoji_id` 报 `1770001 invalid param`(三种 body 形状 `update_block_property.callout.emoji_id` / `callout.emoji_id` / `update_block_property.emoji_id` —— fix_round_x 在真实日报上复测,三种全报 1770001,**事后改不了,只能整块替换**)。③ **唯一可行路径 = 原始 REST `POST /open-apis/docx/v1/documents/{doc}/blocks/{parent}/children`,在 children 的 `callout` 对象里直接带 `emoji_id`**(实测 `code 0`,回读 `callout.emoji_id` 持久为所设值)。这条 REST 复用 §6b 同一套 tenant-token + bot-协作者凭证(`useUAT` 建的文档要先把 bot 加 full_access,见 §6b / gotchas)。
  - ✅ **清洁主路径 = 原始 REST 一次 create(callout + children 一把建)**:这条 REST 的 `children` 数组里就一个 `{block_type:19, callout:{background_color, border_color, text_color, emoji_id}}` 即可建出带正确图标的裸 callout(飞书自动给它配一个空 text 子块);要多条内容就在该 callout 下再 `children_create` 追加 text/bullet。**这是带图标 callout 的首选——比「MCP 裸建 + 自动落 gift + 再想办法改」干净得多(后者根本改不掉,见上 ②)。**
  - 🔴 **任何产 callout 的路径都必须走这条 REST 设 emoji_id —— 包括 daily-report / compile**:fix_round_x 的根因诊断:`📖 日报 2026-06-16` 的概述 + 小结两个 callout 当初走纯 MCP compile,落了双 🎁(视觉 Fail)。**只要某条管线会产出 callout(日报开场/小结、学习文档开场、checklist Context 框…),它就必须在 create 时经原始 REST 带 `emoji_id`**;纯 MCP 路径无法补救(事后 patch 报 1770001)。daily-report compile 落概述用 `book`(📖)、小结用 `bulb`(💡)。
  - **落地姿势(裸建 + 回填,与下文一致)**:用上面那条原始 REST 建**裸 callout**(`callout:{background_color, border_color, text_color, emoji_id}`,**不塞显式 text 子块**)→ 拿回自动 text 子块 id → `documentBlock_patch` 写正文(**正文不放前导 emoji**)。若某 callout 已经被纯 MCP 落成 🎁、又必须改对:**唯一办法是整块替换** —— 原始 REST 在旧 callout 后插一个带正确 `emoji_id` 的新 callout、把旧 callout 的子块内容复刻进去、再 `children/batch_delete` 删掉旧的(fix_round_x 修日报两 callout 即用此法,回读 0 个 gift)。若你只用本机 MCP 工具、实在不便发原始 REST,而该 callout 又非要正确图标,**退而求其次:正文也不要放前导 emoji**,接受左侧是默认 🎁(单图标、不重复),靠 callout 配色 + 加粗标题维持视觉契约 —— **绝不能"默认 gift + 正文前导 emoji"叠加成双图标**。
- **带链接的 text_run 范例**(写进自动子块或追加的 text 块;关键字段 `text_element_style.link`):
```json
{ "block_type": 2, "text": { "elements": [
  { "text_run": { "content": "lead Ads 新人串讲", 
                  "text_element_style": { "link": { "url": "https%3A%2F%2Fbytedance.larkoffice.com%2Fwiki%2FNxQPw0PcEiWVQRkPROHcTMgunrb" } } } },
  { "text_run": { "content": " —— 本节主线:数据流 / Fast Emit / 纠偏。" } }
] } }
```
- 多个来源就在 Context callout 的 children 里放多条 bullet(block_type 12),每条一个带 link 的 text_run + 一句简介。
- **行内引用出处**(global-memory 规则):正文里事实/数值/quote 句末挂同样的 link text_run,效果即 `[[出处标题]](URL)`。不要把引用堆到文末。

---

## 配方 2:对比表(同字段横向对比就该用表,别用 bullet 堆)
上一版 0 张表、B 版 11 张表 —— 对比性内容(窗口拼接 vs Fast Emit、两类纠偏、slot/FID/FC、各序列模型)**必须上表**。

⚠️ **建表正确姿势(实测,踩过坑 —— 与 callout 配方1 完全对称的"裸建 + 回填"两步法)**:table cell **和 callout 自动子块一样是自动生成的**,**禁止在 descendant 树里显式提供 cell**。两份 M4 实测均确认:用 `documentBlockDescendant_create` 提交 31(table)→32(table_cell)→2(text) 这棵树(无论 cell 带不带空 children、cell 带不带 text)**一律报 `1770041 open schema mismatch`**——这是 descendant 显式塞 cell 与自动 cell 冲突,和 callout 显式塞 text 子块同一个错误码。**正确两步法**:

1. **建裸 table**:`documentBlockChildren_create` 只传一个 `{block_type:31, table:{property:{row_size, column_size}}}`(**不给任何 cell**)。飞书**自动生成全部 row×col 个 cell(32),每个 cell 还自动带一个空 text(2) 子块**(与 callout 自动带空 text 同理)。
2. **回填 cell 文本**:`batchUpdate` 的 `update_text_elements` 要的是**每个 cell 内那个自动 text(2) 子块的 id**(不是 TableCell(32) 自己的 id —— 往 cell id 上写文字不生效)。所以要先把"cell → 它的 text 子块"映射拿到,再 `documentBlock_batchUpdate` 一次性 `update_text_elements` 按行优先(首行即表头)批量填进各 text 子块。
   - ⚠️ **拿"cell 的 text 子块 id"的高效做法(F1,produce_strategy 踩坑修法)**:**别**对每个 cell 单独 `documentBlockChildren_get`(N 个 cell = N 次往返,慢)。正确:**先把 bot 加为该文档 `full_access` 协作者(通用前置,权威见 `lark-doc-writer §6b` 步骤0;不加则 tenant token 读撞 `1770032` 静默返 0 块)**→ **再用一次** REST `GET /open-apis/docx/v1/documents/{doc}/blocks`(或本机 `documentBlock_list`)**拉全量块**,在结果里按 `parent_id` 把 text(2) 块映射回它的 cell(32)(cell 的 `parent_id` 又指回 table) → 一次解析得到全部 cell→text-child,**0 次逐 cell get**。表越大省得越多。

> 这与 callout 配方1 读起来完全一致:**裸建容器 → 读回自动子块 id → patch/batchUpdate 回填内容**。别再尝试"一棵 descendant 树建整张表",照原文必报 1770041。

**建表硬约束(实测,务必遵守):**
- **`row_size` 有上限**:本租户实测 **≤9 行可建,12 行报 `1770001 invalid param`**(边界在 10–11 间未精确二分;不是按总格数、是按行数)。**大表拆成多张 ≤9 行的表**(或先建小表后用 `documentBlock_batchUpdate insert_table_row` 逐行加 —— 是否绕过上限未测)。超限静默以 `1770001` 报错,极易被误判成"参数写错了"。
- **table 不能与其它块类型同批 children_create**:把 `[divider, heading, text, table]` 放进**同一个** `documentBlockChildren_create` 的 children → `1770001`。**table(31) 必须单独成一次 children_create 调用**(children 里只有那一个 table);其余普通块(heading/text/bullet/divider/callout,**含 image(27)**)可自由混在一个 children 数组(此为配方0 第1条的唯一例外)。
- ⚠️ **`column_width` / `header_row` 在 create 时持不持久,取决于「走哪条 create」——这是路径差异,别一刀切**(fix_round_x probe B 在 test folder 用同一组宽度 `[140,300,280]`+`header_row:true` 三路对比、Chrome 实拍 + DOM 量列宽定论):
  - **原始 REST create(`POST .../children`,在 `table.property` 里带 `column_width`+`header_row`):两者都持久、都渲染**。回读 property 原样保留 `[140,300,280]`+`header_row:true`;Chrome 实拍:列宽按比例排开(长中文一行不竖排)、**首行整行渲染成浅灰底(rgb(242,243,245))的真表头行**(不是贴字形高亮,是整格填充 + 加高的表头行)。**这条路径下 create 一把到位,下方「第 3 步逐列 patch」和「表头 background_color:7 近似」都可省。**(producers 当初说「create 持久」是对的——他们正是走 REST。)
  - **本机 MCP 工具 create(`documentBlockChildren_create`):`column_width`/`header_row` 被静默丢弃**。probe B-c 实测:把 `column_width:[150,320,230]`+`header_row:true` 传进 MCP `documentBlockChildren_create`,**回读变回 `column_width:[100,100,100]`、`header_row` 字段消失**(MCP 那个 table schema 根本没有这两个字段,见工具入参——只有 `row_size/column_size/merge_info`)。Chrome 实拍:100px 窄列,长中文逐字竖排(缺陷态)。**所以走 MCP create 的话,列宽只能 create 后逐列 patch(下方第 3 步),且 `header_row` 旗标补不上、表头只能退化为首行文本 `background_color:7` 贴字形近似。**
  - **口径**:`documentBlockDescendant_create` 的 table schema **有** `column_width`/`header_row`/`header_column`(与 REST 一致),`documentBlockChildren_create` 的 **没有**——这是工具 schema 差异,不是平台不支持。**想 create 一把带宽 + 真表头 → 用原始 REST(或 descendant_create);只用 children_create → 退回「裸建 + 逐列 patch + 表头近似」。**

**建表第 3 步(仅「MCP children_create 裸建」路径需要;走原始 REST 带 `column_width` 的可跳过):逐列设可读列宽。** 走 MCP `children_create` 裸建后每列默认 `column_width:100`,**短而窄**——长中文在 100px 列里逐字竖排换行,正是用户看到的"列窄到每个字竖着堆、读不了"的缺陷态。所以这条路径裸建+回填之后**必须**再补一步,给每列设一个可读宽度:对 TABLE 块(block_type 31,**不是 cell**)调 `documentBlock_patch`,`data.update_table_property = {column_index:i, column_width:px}`,**一列一次、分开调用**(probe B-b 实测此 patch 路径把列宽改到 `[140,300,280]` 持久且渲染正确,但 **patch 只设宽、设不了 `header_row`**,表头仍需 `background_color:7` 近似)。

⚠️ **致命坑(实测,probe_visual 确认)**:把多列的 `update_table_property` 塞进**同一个** `documentBlock_batchUpdate.requests` 数组 → `1770001 invalid param`。必须**每列一次独立的 `documentBlock_patch`**(probe 实测 `[160] → [160,360] → [160,360,90]` 逐列累加生效并持久)。

```json
// 逐列各调一次 documentBlock_patch(对 TABLE 块,不是 cell);共 N 列调 N 次
{ "path": { "document_id": "<doc_id>", "block_id": "<TABLE block_id(block_type 31)>" },
  "data": { "update_table_property": { "column_index": 0, "column_width": 160 } },
  "useUAT": true }
// 再 column_index:1 → 360,column_index:2 → 90 …各一次独立调用
```

**推荐默认宽度(让长中文一行内排开,各列宽总和 ≈ 飞书内容列宽 ~700px;此处是「表格列宽之和」,非图片宽度):**
- label / 序号 / 短标签列:**140–170 px**(probe 用 160)
- 长中文描述 / 长文本列:**340–380 px**(probe 用 360,长描述整句一行不换)
- 数字 / 短值列:**80–100 px**(probe 用 90)

> probe_visual 在 live 飞书渲染器实测确认:设 `[160,360,90]` 后,col1 的整句长中文("用于承载业务逻辑的运行时容器实例集合"等)**一行排开、不再逐字竖排**;**省掉这步就退回 100px 窄列缺陷态**。所以这步是建表的默认收尾,不是"有空再优化"。

**表头样式(实证可靠做法 —— 浅灰底表头行)**:裸建 table → 回填 cell 文本(上面两步)之后,再对**首行(表头)每个 cell 的 text 子块**用 `documentBlock_batchUpdate` 的 `update_text_elements` 把 `text_run.text_element_style` 设为 `{ bold:true, background_color:7 }`(7 = LightGray);正文 cell 留空 style。M4 探针实测(`module4/probe_table_header.md`):这套**持久**(JSON 回读到 `background_color:7, bold:true`)且渲染为**加粗表头文字 + 浅灰高亮**,是 §8/§三"表头浅灰底"经 MCP 的标准近似。
```json
// 对首行某个表头 cell 的 text 子块:
{ "block_type": 2, "text": { "elements": [
  { "text_run": { "content": "列A",
                  "text_element_style": { "bold": true, "background_color": 7 } } }
] } }
```
- ✅ **真·整格灰底表头:走原始 REST create 设 `header_row:true` 就有**(fix_round_x probe B-a 推翻旧「做不到」结论):原始 REST `children` 里 `table.property.header_row:true` create → Chrome 实拍**首行整行浅灰底(rgb(242,243,245))、加高的真表头行**,整格填充、不是贴字形高亮。**这是带表头的首选,无需任何 cell 文本样式近似。**
- ⚠️ **`[platform-limit]` 仅「MCP children_create / 事后 patch」路径下,整格灰底表头做不到、`header_row` 旗标补不上**(走原始 REST 不受此限):① MCP `children_create` 的 table schema 没有 `header_row`,create 时静默丢;post-create `update_table_property{header_row:true}` 返回 **HTTP 200 却静默丢弃**(回读 `property` 仍无 `header_row`)。② 这条路径下退化方案 = 首行 cell 文本 `text_element_style.background_color:7`,渲染成**贴着字形的文字高亮**(glyph-hugging highlight),**不是整格填充**;TableCell(32) schema 是 `{}`,没有 cell 填充字段。**结论:能发原始 REST 就用 `header_row:true`(整格灰底);只能用 MCP children_create 时退回首行 `background_color:7` 近似(或渲染 PNG 嵌 Image(27))。** 需要更强对比时近似可改 `background_color:15`(DarkSlightGray),仍是 glyph-hugging。

---

## 配方 3:图——ASCII 多用、DAG 渲染成 PNG(本机 mermaid 不渲染)
"多做图"在本机的正确落地(mermaid 代码块在 MCP 路径下**不会渲染成画板**,只是代码):
- **ASCII 框架/链路图**:最划算,直接 `block_type 14`(code)、`style.language` 用 PlainText/Text。等宽渲染、零依赖、随便多画。链路/数据流/分层结构优先用它(找 `ascii-strategy-diagram` skill 出图)。**节点文字里的 `< > &` 在 block API(JSON)里无需转义。** ⚠️ **每行宽度 ≤ ~72 等宽列(visual_qa D1)**:飞书代码块约 80 列就右切,过宽行(尤其带长中文尾注的公式行、`=====` 分隔行)在加载/skim/PDF 导出时右尾被裁、需横向滚动才看得到。出图时把长中文尾注(`>>> …`/`<-- …`)挪到**自己的续行**或缩短,任何一行不超过无滚动可见宽度;`=====` 分隔规则也按 ~72 列截。详见 `ascii-strategy-diagram`。
- **DAG / 流程图**:`dag-flow-diagram` 出图,本机要它"显示成图"就得**渲染成 PNG 再嵌**(→ §6 image 管线)。🟢 **概念 / 依赖 / 全景类 DAG 默认用 graphviz `dot` 渲染(不是 mermaid)**:多入边的概念关系网 / 变量依赖网 / 端到端全景,**mermaid 渲染几乎必踩长宽比闸**(LR 出薄条 / TB 出竖条,且嵌套 subgraph `direction` 被忽略 —— F5;两位 producer 实测 mermaid 4 方向全废、改 `dot` 才过闸:opening 2534×1125 w/h=2.25、closing 1791×1427 w/h=1.26)。`dot`(`rankdir=TB` + 每行 `rank=same` + 隐形排序边 + 折行边)蛇形 / 折行可控得多,是可靠落地路径;**mermaid `flowchart` 仍可作授权语法(源好写),但渲染走 `dot`**。仅纯线性短链(`A→B→C`,无分支汇合)mermaid LR 也稳;或退而用 ASCII 表达同一 DAG。⚠️ **折行/蛇形别靠"TB 父图 + 子图 `direction LR`"(F5,produce_strategy 实测被忽略 → 出竖条)**:要蛇形,**要么顶层 `flowchart LR`(不嵌带 `direction` 的子图)、要么直接用 `dot`**。长宽比闸数值不变(见下条)。
- **图的长宽比(嵌图前必过的闸)**:线性流默认 LR、节点 ≥7 蛇形折行、**绝不嵌瘦高竖条**。这些选型/长宽比/尺寸阈值(拒比值、目标带、尺寸预算、2× 渲染、小图例外)的**唯一权威 = [`dag-flow-diagram`「布局与长宽比」](../../dag-flow-diagram/SKILL.md)**(含 probe_visual 实测数据与 F4 小图例外);本篇只负责其执行落地(下条 F5 渲染路径)。
- **数量底线**:图数量底线以 [`lark-doc-style.md`](lark-doc-style.md) 五「丰富度自检」为准(ASCII 与渲染图都要有);每个"系统逻辑/链路/演进/对比结构"段落都该配图,不要纯文字。
- 图要"就地建"(配方 0 第 2 条):空 image 块建在正确位置 → 再 curl 绑定。

---

## 配方 4:层级 / 可读性(别写成平铺 bullet 流)
- 标题分层 H1(block_type 3)/H2(4)/H3(5),大纲一眼可见骨架。
- 列表用嵌套:子要点用第二层 bullet(建块时把子 bullet 作为父 bullet 之后、更深层级;飞书用 list 的缩进/`children` 表达)。并列对象用 bullet,有先后/步骤用有序列表(13)。
- 结论先行:每节开头一句 `<p>` 点结论,再展开。
- 关键结论/易错/自测才用 callout(§0.4 节制),正文主体用普通 p/ul/表格。
- 章节间用分割线(block_type 22 divider)。

---

## 配方 5:原图复用的边界(诚实告知)
- **同租户**自有/有下载权的文档:`drive_v1_media_batchGetTmpDownloadUrl`(useUAT)能下原图字节 → §6 重新上传绑定(已验证 md5 一致)。
- **跨租户 / 源文档禁下载**:接口**静默返回空**(`tmp_download_urls:[]`,从不报错)。典型:源文档在 `.larkoffice.com`(CN)/`.sg.` 而你 token 在 `.us.`。此时**原图拿不到**,`file_copy` 也会 99991679(缺 drive:drive/docs:document:copy 且跨租户)。
- 拿不到原图时:① 按 `rawContent` 语义**高质量重绘**(ascii/dag/chart-gen)并标注「(重绘)」;② 或请用户在浏览器手动截图存本地,再走本地图上传管线。**不要假装复用了原图,也不要因此就不配图。**
