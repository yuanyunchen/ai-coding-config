# lark-doc-writer · 执行落地层(§2–§6 + §8,动手改飞书文档前必读)

> 自 SKILL.md 迁出(2026-07-01,逐字未改写,原 § 编号保留——外部引用「lark-doc-writer §2-R18 / §5d / §6b」等均指本文件对应节)。
> 执行层声明 canonical 见 SKILL.md 头部(官方 lark-cli;旧 `mcp__feishu__*` 已退役,下文 MCP 记法仅作参数语义参考),此处不重复。落地 JSON 配方另必读 [`mcp-recipes.md`](mcp-recipes.md) 执行覆盖层(最高执行权威)。

## §2 GLOBAL RULES — 全局硬约束(每个操作都遵守)

> 迁移自 market lark-doc 的 GLOBAL RULES(本机适配为 R1–R19),执行层走官方 `lark-cli`(旧 `mcp__feishu__*` MCP 已退役;下表「说明」列的 MCP 记法仅作动作语义参考,见上 §0 一次性说明)。**违反任一条都视为错误**,不因某个 reference 没复述就以为可以例外。

| # | 规则 | 说明(MCP 表达) |
|---|------|------|
| 1 | **资源块绝对保真** | 改写时下列标签连同所有 token / id 属性**原样保留**:`<cite type="user/doc">`(@人 / @文档)、`<img>`、`<source>`、`<file>`、`<whiteboard>`、`<sheet>`、`<bitable>`、`<synced_reference>`;禁止替换成纯文本 / 链接 / 占位符。用 block API(JSON)操作时,同理不许丢 image/whiteboard/sheet/bitable 块的 token 字段。|
| 2 | **精准手术 > 全量覆盖** | 优先 `docx_v1_documentBlock_patch`(改单块文本)/ `documentBlockChildren_create`(插块)/ `documentBlockChildren_batchDelete`(删块);避免整篇重建。重组结构走"先插新块 → 再删旧块",能保住无关内容(图片、画板、评论)。⚠️ 整篇重建/清空再写会丢图片、画板、评论,代价不可逆 —— 触及全量覆盖前先看 R18。|
| 3 | **编辑已有文档前确认模式** | ⛔ 改一篇**已存在的**文档前,先确认是**副本编辑**(推荐:`drive_v1_file_copy` 复制一份再改)还是**原文编辑**(不可撤销)。用户明确说"原文编辑"时不得降级为副本;用户没表态时,输出 §5 的确认模板并等回复。本次会话自己刚建的文档可直接原文编辑。|
| 4 | **不可直接编辑的嵌入资源** | 文档里的 `<whiteboard>` / `<sheet>` / `<bitable>` / `<synced_reference>` **内部内容**,docx block 工具改不了。改画板内部图形 → 见 §6;改表格单元格 → `bitable_v1_*`(多维表)或 Sheets(见 §3 工具映射的限制);`<synced_reference>` 只能去源文档改。收到这类请求直接说明正确路径,不要硬试。|
| 5 | **同一块单次只改一次** | 同一个 block 的多处改动合并成一次 `documentBlock_patch`,否则报错或被静默忽略。|
| 6 | **块 ID 会漂移,改前先 fetch** | 对某块做整体替换 / 删除后,块及其子块的 block ID 会重新生成;后续若还要按 ID 操作,必须重新 `documentBlock_list`(局部读只拉目标节点范围)拿新 ID,不能复用旧 ID。盲改是踩雷最大来源。|
| 7 | **定位不跨段 / 跨块** | `documentBlock_patch` 的 `update_text_elements` 改的是**单个文本块**;跨段、跨容器(list / table / grid / quote / callout)的改动拆成多个原子操作或整块重建,别想一次 patch 跨多块。|
| 8 | **图要么渲染成图、要么 ASCII,别糊弄** | 结构 / 链路 / 依赖图:要可视化就把 mermaid/DAG **渲染成 PNG 嵌 Image(27) 块**(§6),纯文本兜底用 `<code language="text">` ASCII。⛔ 禁止用**与内容无关的 AI 生图 / 截图**冒充该画的结构图(可视化必须忠实表达逻辑)。⚠️ **经飞书 API(`lark-cli`)做不出可拖拽飞书画板**(`<whiteboard>` 拍平 / mermaid 只成代码块 / Diagram(21) 报 1770029),如实告知,走 PNG→Image 或 ASCII —— 机制与替代权威见 mcp-recipes 执行覆盖层。|
| 9 | **画板保护** | 编辑区间绝不跨越或覆盖 `<whiteboard>` 与 mermaid/plantuml 代码块,除非用户明确要求改画板(且按 §6 走画板路径)。|
| 10 | **复杂表格 / 嵌套结构谨慎编辑** | 含图片 / 分栏 / 画板的复杂表格单元格、嵌套 `<grid>/<column>`:先 `documentBlock_list`(取 block id)拿整块 block_id,**整块替换**(连同所有 token 原样保留),禁止用行内文本替换跨结构定位。|
| 11 | **禁止幻觉 ID** | `<cite type="user" user-id="ou_xxx">`、`@文档 doc-id`、`chat-id`、`task-id` 等必须是**真实 ID**。换 ID 用 `contact_v3_user_batchGetId`(手机/邮箱→open_id);拿不到就用纯文本姓名,⛔ 不许编造 `ou_xxx`。|
| 12 | **图片 URL 规范** | `<img href="...">` / `src` 仅支持 HTTP/HTTPS,⛔ 禁止 `data:` / `file://` / base64 / 本地路径 / 编造 URL。本地图走 §6 的 curl 上传管线;网络图才能在 XML 里直接 `<img href="https://...">`。|
| 13 | **大文件 / 长内容** | 单篇文档别一次塞超长内容(易触发限制 / 难调试):骨架先建,正文分段追加(见 §4 创建 SOP)。本地大附件 / 图片走 §6 的上传管线,不要把 base64 塞进文本。|
| 14 | **失败累计停止** | 任意一批写操作返回失败 → 立即停止;累计失败 ≥ 10 也立即停止并告知用户原因,禁止盲目重试。|
| 15 | **错误透明** | 不静默吞错;解释失败原因(贴 API 返回的 code / msg)并给用户下一步建议。常见 code 速查见 `feishu-doc-gotchas`。|
| 16 | **Scope 边界** | 本 skill 只管写作 + docx 排版。`Sheet / Excel` 单元格 → Sheets(见 §3 限制),`Bitable` 多维表 → `bitable_v1_*`;读评论 → `drive_v1_fileComment_*`。|
| 17 | **Language** | 输出语言匹配用户语言。|
| 18 | **整篇覆盖 / 批量替换前必须确认** | ⛔ 任何**整篇覆盖**(清空文档重写)或**批量替换**(一次性替换大段 / 跨多块 / 全文级 `documentBlock_batchUpdate` 重写)前,**必须先告知用户影响范围**(会丢图片、画板、评论,块 ID 全部重生,不可逆)**并取得用户肯定答复**;用户未明确答复前**绝不动手**。这与 R2(精准手术优先)、§5c(用户改过的已发布文档不覆盖)叠加:能精修就不覆盖,要覆盖先确认。本次会话自己刚建、尚无图/画板/评论的文档可直接重写,无需此 gate。|
| 19 | **读飞书文档只走 API,不浏览器抓取** | ⛔ 读取飞书文档内容一律用 `docx_v1_document_get` / `docx_v1_documentBlock_list`(要 block id 用后者 with-ids)。**禁止用浏览器 / computer-use / 截图去抓取或读取飞书文档** —— 截图/抓取会丢结构与 block id、吞掉图片/画板块、读出乱码,后续基于坏输入建的文档必然失真。同理数图/确认嵌入按 `block_type==27` 数,别信 `docs_v1_content_get` 的 markdown(吞 image/whiteboard)。|

---

## §3 执行层映射(动作 → lark-cli;旧 MCP 形态见下注)

写作方法论与飞书结构规则与执行工具无关;下面把"要做的动作"映射到对应工具。**执行层走官方 `lark-cli`(`@larksuite/cli`;见 `feishu-task-management` 入口 + `cli.md`),旧 `mcp__feishu__*` MCP 已退役,不再是执行路径。** 下表的 `mcp__feishu__*` 列是退役 MCP 的旧记法,**仅作「动作 → 参数语义」参考**;实际执行用 `lark-cli` 对应命令,以 `lark-cli <域> +<shortcut> --help`、`lark-cli schema <service.resource>`、`lark-cli skills read lark-<域>` 为准(身份 `--as bot|user`、鉴权、踩坑全在 `cli.md`)。

| 动作 | MCP 工具(旧记法,仅参数语义参考) | 要点 |
|---|---|---|
| **读文档** | 首选 `docx_v1_document_get` / `docx_v1_documentBlock_list`;`docs_v1_content_get` 仅末选 | 后续要编辑就用 `documentBlock_list` 拿 block id。⛔ 一律走 API 读,**不要浏览器/截图抓取飞书文档**(会丢结构与 block id,见 §2-R19)。⚠️ `content_get` 的 markdown **会吞掉 image/whiteboard 块**,只在纯粹要整篇 markdown 正文时用;数图 / 确认嵌入要用 block API 按 `block_type==27`(image)数,别信 markdown。大文档 list 输出可能超 token,落盘后切片。|
| **建文档** | `docx_v1_document_create` | 可带 `folder_token`;在用户 Drive 根 / 文件夹下建须 `useUAT:true`。先建空文档(或只带标题)再补内容,见 §4。|
| **整篇导入 md** | `docx_builtin_import` | 吃**标准 markdown**:pipe 表格 / HTML `<table>` → 原生 Table(31) ✓,标题/加粗/链接/bullet/代码块 ✓;但 ` ```mermaid ` 只成代码块(不渲染白板),`<callout>`/`<lark-table>`/`<whiteboard>` 这类 Mira XML 标签会被**拍平成纯文本**(实测确认)。结论:此路径画图用 ASCII 代码块或 PNG→Image,表格用 markdown-pipe/`<table>`,彩色 callout 走 block API。|
| **md/html → 块树** | `docx_v1_document_convert` | 把整段 markdown/html 转成 blocks。|
| **改单块文本** | `docx_v1_documentBlock_patch`(`update_text_elements`) | 等价市场版的"单块文本替换"场景。block API(JSON)里文本的 `<` `>` `&` **无需转义**(只有飞书 XML 导入路径才要转义)。|
| **改多块** | `docx_v1_documentBlock_batchUpdate` | 一次多块更新。|
| **插块** | `docx_v1_documentBlockChildren_create` | 带 `index` 定位插入位置;**多处插入先大 index 后小 index**(避免前面插入把后面下标顶掉)。对应早期的"在锚点后插块 / 追加"动作。|
| **一次建嵌套树** | `docx_v1_documentBlockDescendant_create` | quote_container 等容器**整棵一次建**(每块带 `block_id`,容器用 `children:[子id]`)。⛔ **两个例外别走这条**:**table(31)** 塞 cell → `1770041`,改裸建+回填(**配方2**);**callout(19)** create 自带空 text 子块,别再塞 text 子块,改裸建+patch 自动子块、emoji_id 走 create-time REST、正文不放前导 emoji(**配方1**)。|
| **删块** | `docx_v1_documentBlockChildren_batchDelete` | 对应早期的"删块"动作。|
| **搜文档** | `docx_builtin_search` | 仅 user_access_token(`useUAT:true`)。|
| **复制文档(副本编辑)** | `drive_v1_file_copy` | §2-R3 副本编辑用这个先复制再改。|
| **插图(本地图,见 §6)** | curl `medias/upload_all`(tenant token)+ `docx_v1_documentBlock_patch`(`replace_image`) | MCP 只有 `media_uploadPrepare/uploadFinish`,**没有推字节的接口**,所以本地图必须走 curl 管线。详见 §6。|
| **下载素材 / 复用原图** | `drive_v1_media_batchGetTmpDownloadUrl` | `useUAT:true`;他人 / 源文档的原图要用 **user token**(tenant token 对无权文档返回空)。|
| **Drive** | `drive_v1_*` | list / createFolder / copy / move / delete / uploadPrepare+uploadFinish / importTask / exportTask / meta_batchQuery / permissionMember_create+list / fileComment_create+list。|
| **读 / 写评论** | `drive_v1_fileComment_list` / `drive_v1_fileComment_create` | 对应早期的"读取评论"动作。已解决/已删除评论只有 Owner 可见。|
| **多维表 Bitable** | `bitable_v1_*` | app_create / appTable_create / appTable_list / appTableField_list / appTableRecord_create\|batchCreate\|search\|update\|delete。|
| **@人换 ID** | `contact_v3_user_batchGetId`(手机/邮箱→ID)/ `contact_v3_user_get` | R11 禁止编造 ID。|
| **Wiki** | `wiki_v1_node_search` / `wiki_v2_space_list\|getNode` / `wiki_v2_spaceNode_create\|copy` | |

**白名单缺口(如实标注,不要假装能做):**
- **Sheets 单元格读写 / 格式**:MCP 白名单**只有** `sheets_v3_spreadsheet_create`(+meta scope)。**单元格按值读写 / 设格式的工具不在白名单。** 用户要在嵌入电子表格里改单元格时,如实告知:需要在 `~/.config/lark-mcp/env` 加 `export LARK_TOOLS=...` 扩载对应工具,或改配置 `-t`(注意 `-t` 用**点号名** `sheets.v3.xxx`,不是下划线名)。
- **原生画板(whiteboard)create / 改内部图形**:无 docx 之外的画板接口,**经飞书 API(`lark-cli`)做不出可拖拽画板**(拍平 / 1770029 机制权威见 mcp-recipes 执行覆盖层)。**fallback**:要图就渲染成 PNG 嵌 Image(27) 块(§6b),纯文本兜底用 `<code language="text">` ASCII。复杂自定义布局画板做不了,如实告知用户。
- **Calendar 高级能力**(会议室预订 / waitlist 等)、**Task 高级能力**(子任务 / 评论等)不在白名单,如实标注。

---

## §4 INTENT ROUTING — 决策树(动作 → 工具;执行走 lark-cli,下方工具名为旧 MCP 记法的动作语义参考)

```
用户请求
│
├─ "读取 / 查看 / 看看文档"
│      → docx_v1_document_get / docx_v1_documentBlock_list
│        ├─ 后续要编辑 → documentBlock_list(取 block id)
│        ├─ 文档大 / 只关心某节 → documentBlock_list 局部读;大输出落盘后切片
│        └─ 要数图 / 确认嵌入 → 走 block API 数 block_type==27,别用 content_get 的 markdown(吞图)
│
├─ "新建文档 / 起草一篇"
│      → docx_v1_document_create 先建骨架(标题 + 开头两 callout + 各级标题 + 占位摘要)
│        → 正文分段:documentBlockChildren_create / Descendant_create 追加
│        → 或整篇标准 md 一次导入:docx_builtin_import(注意它拍平 callout/mermaid)
│        → 详见 references/create-workflow.md
│
├─ "改这段 / 替换 / 加一节 / 删一段"(已有文档)
│      → 🛑 §2-R3 先确认 副本/原文(用户没表态先问)
│      → 先 documentBlock_list 取现状拿 block ID(局部读只拉目标节点范围)
│        ├─ 行内 / 单块文本改 → documentBlock_patch(update_text_elements)
│        ├─ 多块一起改       → documentBlock_batchUpdate
│        ├─ 加新章节         → documentBlockChildren_create(带 index;多处插先大后小)
│        ├─ 建 callout       → 裸 callout(descendant 或 children_create) → patch 自动子块(配方1,勿在树里塞 text)
│        ├─ 建 table         → 裸 table children_create → children_get 读 cell → batchUpdate 回填(配方2,勿走 descendant 塞 cell)
│        ├─ 建 quote 等其它容器 → documentBlockDescendant_create(整棵一次建)
│        └─ 删段落           → documentBlockChildren_batchDelete
│        → 详见 references/update-workflow.md
│
├─ "复制一份再改"
│      → drive_v1_file_copy 复制 → 对新文档做上面的编辑(R3 副本编辑)
│
├─ "插图 / 加附件"
│      → 本地图:§6 curl 上传管线(建 image 块 → upload_all → patch replace_image)
│      → 网络图:XML 里 <img href="https://..."> 直接插
│      → 复用他人/源文档原图:media_batchGetTmpDownloadUrl(user token)下字节 → 对目标文档重新上传绑定
│
├─ "下载 / 预览素材"
│      → drive_v1_media_batchGetTmpDownloadUrl(useUAT:true;他人原图用 user token)
│
├─ "画板 / 架构图 / 流程图 / 时序图 / 思维导图 / 组织架构 / Roadmap …"
│      → 要可视化:渲染成 PNG → Image(27) 块(§6b);纯文本兜底:ASCII <code language="text">(语法库见 references/mermaid|plantuml)
│      → ⛔ <whiteboard type="mermaid"> / 原生 Diagram(21) 经飞书 API(lark-cli)做不出可拖拽画板(实测拍平/1770029),如实告知(§3 缺口)
│      → ⛔ 不要用与内容无关的生图/截图冒充该画的结构图(§2-R8)
│
├─ "文档评论 / @人 review"
│      → 读:drive_v1_fileComment_list   写:drive_v1_fileComment_create
│
├─ "找一个表格 / 报表 / 最近编辑过的 …"
│      → drive_v1_file_list / 搜索;不是写文档任务
│
└─ "改嵌入的表格单元格 / 画板内部图形 / 同步块"
       → §2-R4:docx block 工具改不了内部;Bitable→bitable_v1_*;Sheets 单元格→白名单外(§3 缺口);同步块→源文档改
```

---

## §5 编辑安全护栏

### 5a. 编辑模式确认(改已有文档前,不允许跳过)

⛔ **改一篇已存在的文档前必须确认模式**——四种情形(原文 / 副本 / 本会话刚建可直接原文 / 其他先问)的规则权威见 **§2-R3**。用户没表态(第 4 种)时输出下面模板并等回复:

```
请选择编辑模式:
| 模式 | 说明 |
|------|------|
| 副本编辑(推荐) | 先 drive_v1_file_copy 复制一份,再编辑新文档,原文不动 |
| 原文编辑 ⚠️    | 直接改原文,不可撤销 |
请回复「副本」或「原文」。
```

> ⚠️ 用户明确要原文编辑时,不得以"安全风险"为由改用副本(§2-R3)。

### 5b. 编辑前先 fetch、改动预演、分批

- **先 fetch**:编辑场景先 `documentBlock_list`(取 block id;局部读只拉目标节点范围)取现状再下手(块 ID 漂移 → 改前必 fetch 的规则见 §2-R6)。
- **改动预演**(本节独有):一次涉及 **≥ 3 处编辑**,或要整块替换**核心标题 / 引言 / 含资源块的段落**时,先把"打算做什么(block_id → 动作 → before/after 摘要)"列给用户,等确认再下手。
- **分批**(本节独有的批量大小):同一文档单次写操作 ≤ 5 个一组;跑完一批局部 fetch 校验再继续。失败即停 / 累计 ≥ 10 终止见 §2-R14。

### 5c. 用户手动改过的已发布文档

用户手动改过的已发布文档(改了数据 / 加了图 / 加了评论 / @了人)**绝不整篇覆盖** —— 改动会丢。正确做法:fetch 拿块 ID → 用 `documentBlock_*` 在目标块前后插新块、删旧块、局部 patch,用户手动改过的块一律不碰。

### 5d. 不可编辑的内容 —— 按类型走对的路(拒绝清单)

文档里下列嵌入资源,docx block 工具**改不了其内部内容**;收到这类请求时,**直接按下表给出正确路径**,不要硬试错工具、也不要给"去看 §3"这种模糊答复:

| 嵌入资源 | docx 能做的 | 改它内部的正确路径(MCP) |
|---|---|---|
| `<whiteboard>` 画板内部图形 | 改不了已有画板内部 | **本机无原生画板 create/update 接口,且经飞书 API(`lark-cli`)做不出新画板**(`<whiteboard type="mermaid">` 拍平成纯文本 / Diagram(21) create 报 1770029)。要补图就渲染成 PNG 嵌 Image(27),纯文本兜底用 ASCII `<code language="text">`;复杂自定义布局如实告知做不了。构图方法见 `whiteboard-design` skill。 |
| `<sheet>` 嵌入电子表格单元格 | 不能改单元格 | 单元格按值读写 / 格式的工具**当前不在白名单**(§3 缺口),如实告知需扩载 `sheets.*` 工具;方法论见 `lark-sheets` skill。 |
| `<bitable>` 多维表记录 / 字段 | 不能改 | `bitable_v1_*`(`appTableRecord_*` / `appTableField_list` / `appTable_*`),见 `lark-base` skill。 |
| `<synced_reference>` / 同步块 | 不能改 | **只能去源文档改**;改源头后同步块自动更新。 |
| 含图片 / 分栏 / 画板的复杂表格(Table(31))单元格、嵌套 `<grid>/<column>` | 不能跨结构局部改 | 先 `documentBlock_list`(with-ids)取**整块** block_id → `documentBlockDescendant_create` 整块重建(连同所有 token 原样保留)+ `documentBlockChildren_batchDelete` 删旧块。 |
| 评论 | 不能用文档块工具 | 读 `drive_v1_fileComment_list` / 写 `drive_v1_fileComment_create`。 |
| `<cite type="user/doc">`、`<img>`、`<source>`、`<file>` 等资源块 token | —— | 改写时连同 token **原样保留**(§2-R1),禁止替换成纯文本 / 链接 / 占位符。 |

### 5e. 定位边界规则

- **patch 不跨段 / 跨块 / 跨容器**(list / table / grid / quote / callout)——拆原子操作或整块 `documentBlockDescendant_create` 重建,规则权威见 **§2-R7 / R10**。
- `<ul>` 顶层在飞书没有独立 block id,只有其中的 `<li>` 才有;按块定位 / 插入时锚到 `<li>` 或相邻段落,别锚 `<ul>`(§8)。

---

## §6 画板 / 插图 — 落地路径

### 6a. 画图(结构 / 链路 / 流程图)

本机经飞书 API(`lark-cli`)**做不出可拖拽飞书原生画板**(拍平 / mermaid 不渲染 / Diagram(21) 报 1770029 的机制权威见 mcp-recipes 执行覆盖层)。两条可落地路径:

- **要一张"渲染成图"的可视化(首选)**:把 mermaid/DAG 本地渲染成 **PNG**(mermaid-cli / Graphviz),再走 §6b 管线建 **Image(27) 块**并绑字节。语法照抄 [`references/mermaid/`](references/mermaid/) / [`references/plantuml/`](references/plantuml/);mermaid 用 `flowchart` 不用旧 `graph`(旧语法报 `Cannot set properties of undefined (setting 'rank')`),plantuml 仅支持 `componentStyle` / `ArrowHeadColor`。
- **纯文本兜底(无渲染器时)**:`<code language="text">` ASCII 块(等宽、始终可落地)。走 XML 导入路径时节点 / 边文字里的 `<` `>` `&` 必须转义(§0.6)。
- **复杂自定义布局画板 / 原生交互图表**:当前 MCP 无原生工具,如实告知用户(§3 缺口),不要用与内容无关的生图 / 截图冒充结构图(§2-R8)。

### 6b. 插本地图片(高层接口缺推字节,必须走 curl 管线)

`media_uploadPrepare/uploadFinish` 这类高层接口**没有推字节的 `upload_all`**,光靠它们传不了本地图。凭据:tenant_access_token 用 `lark-cli --as bot` 现取(旧配方读的 `~/.config/lark-mcp/env` 已随 MCP 退役删除);useUAT 建的文档 owner 是用户,curl 推字节前须先把 bot 加为 full_access 协作者(否则写报 `1061004`、读静默返 `1770032`)。

**完整五步管线 + 坑表(跨文档 token 不可复用 / `1770013` / `1061004` / CJK 弯引号 / childrenCreate 拒批量 / 图块无移动 API)见 canonical [`references/media-embed.md`](references/media-embed.md)**;其它踩坑(code 速查、画板节点 JSON 规则)见 `feishu-doc-gotchas` 与飞书 memory。


---

## §8 飞书 XML 格式硬坑(MCP 不会替你处理)

这些是飞书文档结构的真实坑,无论用哪种工具落地都要守。多数有专属权威,此处只点"坑在哪 + 指针",不复述细节:

- **表格列宽**:建表默认 100px → 长中文逐字竖排不可读,**必须裸建+回填后逐列设宽(一列一次)** → 配方与列宽数值见 [`references/mcp-recipes.md`](references/mcp-recipes.md) 配方2。
- **PNG 图别成瘦高竖条**:线性流默认 LR、长链蛇形折行、嵌前过长宽比闸 → 数值与闸门见 `dag-flow-diagram`「布局与长宽比」、落地 JSON 见 mcp-recipes 配方3;纯线性短流(`A→B→C`)用 ASCII 更稳。
- **`<` `>` `&` 转义(仅 XML 导入路径,block API 无需)**:ASCII code 块内高发(`p<20%`),漏转义会从 `<` 处吞内容 → 规则见 [`references/lark-doc-xml.md`](references/lark-doc-xml.md) 七。
- **别把 Mira XML 当 markdown 导入**:`docx_builtin_import` 把 `<callout>`/`<lark-table>`/`<whiteboard>` 拍平成纯文本 → 走对路径见 §3(表格 markdown-pipe/`<table>`、彩色 callout 走 block API、图走 PNG/ASCII)。
- **callout 颜色 fetch 时会丢**:拉回已发布文档再改时 `background-color`/`border-color` 可能丢,按 §1.4 重新补色;做模版从保留完整属性的源文件重建。
- **块 ID 在整体替换后重生**:后续按 ID 操作必须重新 fetch 拿新 ID(§2-R6)。
- **`<ul>` 顶层无 block id**:只有其中的 `<li>` 才有;按块定位 / 插入锚到 `<li>` 或相邻段落,别锚 `<ul>`。
- **富文本行内标签嵌套顺序固定**:外 → 内 `<a> → <b> → <em> → <del> → <u> → <code> → <span> → 文本` → 完整顺序见 lark-doc-xml 七。

