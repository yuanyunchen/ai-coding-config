---
name: feishu-doc-gotchas
description: "读写飞书文档/表格/画板(执行层走官方 lark-cli)前后遇到格式异常、block ID 失效、颜色丢失、上传/导入失败等时查阅。"
---

# feishu-doc-gotchas

飞书文档/表格/画板操作的「避坑」速查。只收录工具签名里**不会告诉你**的非显而易见陷阱:情境 → 规则 → 例子。

> **执行层(必读):** 执行层走官方 `lark-cli`(`@larksuite/cli`;见 `feishu-task-management` 入口 + `cli.md` 的三层命令/鉴权/踩坑)。旧 `mcp__feishu__*` MCP 已退役,不再是执行路径。
>
> 下文 `mcp__feishu__*` 旧记法仅作参数语义参考,执行以 `lark-cli <域> +<shortcut> --help` / `lark-cli schema <service.resource>` / `lark-cli skills read lark-<域>` 为准(见 `cli.md`)。常用动作 → 旧 MCP 映射速记(语义参考):
> - 读文档 / 取 block id → `docx_v1_documentBlock_list`(with-ids)
> - 改单块文本 → `docx_v1_documentBlock_patch`(`update_text_elements`)
> - 整块替换 → 先 `docx_v1_documentBlockChildren_create` 插新块,再 `docx_v1_documentBlockChildren_batchDelete` 删旧块
> - 插块 / 删块 → `documentBlockChildren_create` / `documentBlockChildren_batchDelete`
> - 整棵容器(callout/table/quote)一次建 → `docx_v1_documentBlockDescendant_create`
> - 本地图插入 → `lark-doc-writer/references/media-embed.md`(原 §6b)的 curl `medias/upload_all` 管线
> - 下载 / 预览素材 → `drive_v1_media_batchGetTmpDownloadUrl`
> - 读 / 写评论 → `drive_v1_fileComment_list` / `drive_v1_fileComment_create`
> - 原生画板 create / update → **本机无白名单工具,如实告知**

已在 `continue-learning` SKILL 记过的 3 条不重复:① 整块替换后底层 block ID 重生,需重新 `docx_v1_documentBlock_list`;② callout 颜色在 fetch 后丢失,做模版要从保留完整属性的源文件重建;③ `<ul>` 没有顶层 block id,每个 `<li>` 各自是一个 block。

## 按现象一跳定位（先查这张表）

| 我撞到的现象 | 去哪节 |
|---|---|
| 写操作报错误码（1770041/1770001/1061004/1770013…） | 「错误码速查」 |
| 建块/改块/表格/callout/XML 格式异常 | 「文档块 / XML」 |
| 图片插不进/下载 403/绑定报错 | 「媒体上传 / 下载」 |
| markdown 导入后内容变形/字符被吞 | 「Markdown 导入 / 转义」 |
| 画板改不动/图渲染问题 | 「画板 / whiteboard」（构图与 DSL 规则 → `whiteboard-design` skill） |
| 评论读写 | 「评论」 |
| 复盘旧报告里的 lark-mcp 现象（工具没加载/-32601/OAuth） | [`references/legacy-mcp.md`](references/legacy-mcp.md)（已退役，仅存档） |

## 文档块 / XML

- **没有独立的「公式块」block_type,要强调一行公式用加粗文本(可加浅底)或 inline 公式** → block_type 枚举里**没有公式块的独立类型编号**(标题/正文/代码/表格/callout 等都有,唯独公式没有);KaTeX 公式只能作为 **text element**(text_run 同级的 `equation` 元素)内联出现在某个文本/标题块里。所以想"居中展示一行核心公式"(如 `eCPM = pCTR × pCVR × bid × 1000`)时,**没有"公式块"可建**。落地姿势(produce_strategy F3 实测采用):退化为**加粗文本**(`text_run` 设 `bold:true`,需要更突出可加浅底 `background_color`,块 `style.align=2` 居中);要真排版数学符号(分式/上下标)则用 **inline equation 元素**嵌进文本块。别去找 `block_type` 建公式块(找不到)。
- **裸尖括号会被当标签解析,引擎报 `5000000`(仅 XML 导入路径,block API 无需转义)** → 现象:XML 导入 content 里裸 `<xxx>` 报 `5000000`。要点:`<`/`>`/`&` 转义成 `&lt;`/`&gt;`/`&amp;`、标签本身禁转义、block API(JSON)文本无需转义。完整转义/嵌套规则 **→ lark-doc-xml 七**。
- **markdown 导入路径下 XML 标签照样生效** → markdown 导入(`docx_builtin_import`)里写 `<b>`、`<u>`、`<img>` 仍被解析成富文本,不会按字面显示;要字面量须转义左尖括号 `\<b>`。
- **单块文本替换(`docx_v1_documentBlock_patch` 的 `update_text_elements`)只能改单个文本块,不能跨段/跨块** → 段落、列表、表格、grid、callout、引用这类容器级改动一律改走**整块替换**(先 `docx_v1_documentBlock_list`(with-ids)拿 block_id → `documentBlockChildren_create` 插新块 → `documentBlockChildren_batchDelete` 删旧块)。例:想用 `documentBlock_patch` 替换一整段→匹配不到/报错,改走整块替换。
- **同一个 block 一次只能 `documentBlock_patch` 一次** → 同一块的多处改动必须合并成一次 `update_text_elements`,否则报错或被静默忽略。
- **`documentBlock_patch` 文本里的中文弯引号会让 JSON 序列化炸,报 `path=undefined`(不是飞书报错,是请求根本没发出去)** → 现象(本次 live 实测):`update_text_elements` 的 content 里含中文弯引号 “ ” ‘ ’ 时,入参 JSON 序列化阶段就失败,报 `path=undefined` 一类底层错误,请求未抵达飞书。**修法**:正文里要表达引号一律用直角引号 「」『』,或把弯引号写成 `\uXXXX` 转义。⚠️ **转义要核对码点**:`“/”`=“ ”、`‘/’`=‘ ’,转义码写错会静默写进错字(渲染出别的字符),写完回读 `documentBlock_get` 核对。
- **整篇覆盖(清空重写)会丢图片/画板/评论** → 默认永远用 `documentBlock_patch`(改单块)/`documentBlockChildren_create`(插块)/`documentBlockChildren_batchDelete`(删块)精修;重组结构时「先插新块→再删旧块」比整篇覆盖安全,能保住无关内容。⚠️ 触及整篇覆盖 / 批量替换前先按 `lark-doc-writer/references/exec-landing.md §2-R18` 告知影响范围并取得用户肯定答复。
- **复杂表格 / 嵌套 grid 跨结构做单块文本替换会破坏 token** → 含图片/分栏/画板的单元格、嵌套 `<grid>/<column>`:先 `docx_v1_documentBlock_list`(with-ids)取整块 block_id,**整块替换**(`documentBlockDescendant_create` 重建 + `documentBlockChildren_batchDelete` 删旧)并原样保留所有 token。
- **资源块标签连同 token/id 必须原样保留** → 改写时 `<img>`、`<source>`、`<whiteboard>`、`<sheet>`、`<bitable>`、`<cite type=user/doc>`、`<synced_reference>` 禁止替换成纯文本/链接/占位符;`<synced_reference>` 只能去源文档改。
- **Callout(19) 裸建+回填、`emoji_id` create 时经原始 REST 设、正文不放前导 emoji;value→glyph 反直觉** → 现象:descendant 树里给 callout 塞显式 text 子块报 `1770041`;经 MCP 建的 callout 落默认 `emoji_id:"gift"` → 🎁,叠正文前导 emoji 成双图标。根因:cell/子块自动生成、MCP `callout` schema 无 `emoji_id`、事后 patch 报 `1770001`(改不掉,只能整块替换)。⚠️ **`emoji_id` 渲染映射反直觉(fix_round_x Chrome 实拍):`book→📖`、`open_book→💡`(不是 📖!)、`bulb/light_bulb→💡`、`pushpin→📌`、`paperclip→📎`、`memo→📝`。要 📖 用 `book` 不要 `open_book`;要 💡 用 `bulb`。** ✅ **硬检:任何文档收尾,callout 图标必须 ≠ gift(🎁)—— 见到 🎁 即漏设 `emoji_id`,走原始 REST 一次 create(callout+children)或整块替换补救。** **→ mcp-recipes 配方1**(含 value→glyph 表、create-time REST 一把建主路径、整块替换修 gift、只用 MCP 的退路)。
- **建表"裸建 + batchUpdate 回填",别在 descendant 树里塞 cell;行数/同批/列宽/表头有约束** → 现象:descendant 树塞 cell 报 `1770041`;`row_size>9`、table 与其它块同批、多列列宽合批均报 `1770001`。⚠️ **`column_width`/`header_row` 在 create 时持不持久取决于路径**(fix_round_x probe B 实测):**原始 REST create**(`children` 里 `table.property` 带 `column_width`+`header_row:true`)→ **两者持久、`header_row` 渲染成整行浅灰底真表头**(Chrome 实拍);**本机 MCP `documentBlockChildren_create`** → **静默丢弃**(回读变 `[100,100,100]`、`header_row` 消失,因该 MCP 工具 table schema 只有 `row_size/column_size/merge_info`,没有这两个字段;`documentBlockDescendant_create` 的 schema 则**有**)。所以:能发原始 REST 就 create 一把带宽 + 真表头;只用 children_create 才需「裸建 + 逐列 `documentBlock_patch` 设宽 + 表头退化为首行 `background_color:7` 贴字形近似」。根因:工具 schema 差异(非平台不支持)+ cell 自动生成。**→ mcp-recipes 配方2**。
- **某些 live 文档 `documentBlockChildren_create` 会拒批量 / 拒有序列表(13)块(报 `1770001`),只收单条 text(2)** → 现象(本次 live 实测):同一段 `documentBlockChildren_create` 在新建空文档里能一次插多块、含 ordered_list(13),但搬到某些**已有内容的 live 文档**上,一次传多块或带有序(13)块就报 `1770001`,降到一次只插一个 text(2) 块才过。同码、与「row_size 超限 / table 混批 / index 越界」难辨。**修法**:遇此类 live 文档退回**单条 text 块逐个 `documentBlockChildren_create`**(一次一块、不带 13),有序编号退化为正文里手写 `1. `/`2. ` 前缀;别盲目重试批量。
- **`documentBlockChildren_create` 的 `index` 越界(> 当前子块数)→ 裸 `1770001`,与建表那几类 1770001 同码难辨** → 现象:`index` 传得比父块当前 children 数还大(如父下 16 个顶层块却传 `index:21`),整调原子失败、报 `1770001 invalid param`,**和「row_size>9 / table 混批 / 多列列宽合批」是同一个错误码**,极易误判成「参数写错」。fix_round_x 实测:`index=21`(>16)报 1770001、`index=16`(==children,合法追加边界)`code 0`。**修法:要追加就省略 `index`(默认落尾部),或保证 `index ≤ 当前 children 长度`**(0..len 合法,len 是合法的「末尾追加」位)。
- **表格要 N 行却只建了 N-1 行:用 `insert_table_row {row_index:-1}` 长出来,再回读新 cell 填字** → 现象:配方2 建表上限 ≤9 行,或临时发现少一行,需要给已建好的 table 加行。fix_round_x 实测:对 TABLE 块(31)`documentBlock_patch` 传 `{"insert_table_row":{"row_index":-1}}`(-1 = 末尾)→ `code 0`,`row_size` 2→3、新一行的 cell **自动生成**(cell_count 4→6)。**加完必须重新 `documentBlock_get`/`documentBlock_list` 拉新行的 cell→text-child id,再 batchUpdate 填字**(新 cell id 在 create 响应里没有,只能回读)。这是「给已存在的表加行」的标准配方(配方2 原本只覆盖固定尺寸裸建 + ≤9 行拆表)。
- **表格 cell→text-child 映射:`useUAT` 逐 cell `documentBlockChildren_get`,或加 bot 协作者后一次 `documentBlock_list` 全量映射** → 现象:回填 cell 文本要的是「每个 cell 内自动 text(2) 子块的 id」,不是 cell(32) 自己的 id。配方2 推荐「先加 bot 协作者 → 一次 REST `GET /blocks` 拉全量、按 `parent_id` 把 text 映射回 cell」省往返;但**那条一次性 `GET /open-apis/docx/v1/documents/{doc}/blocks` 不在 MCP 白名单**(要么用 raw REST + tenant-token,要么逐 cell `documentBlockChildren_get`)。小表逐 cell get 可接受;大表务必走「加协作者 + 一次全量 list」。**→ mcp-recipes 配方2 第 2 步。**
- **`update_table_property` 静默接受未知字段(HTTP 200、丢弃)→ 永远读回,别信 200**(gotchas 独有) → M4 探针实测:传未识别字段(如 `header_row:true`)**返回 HTTP 200、无报错,但该字段被静默丢弃**(回读 `property` 里根本没有它);服务端只校验已文档化字段(`column_index` min 0,越界才报 `99992402`),从不在 violations 里提未知字段。**结论:改 table property 后必须 `documentBlock_get`/`documentBlock_list` 读回确认真的生效,不能凭 200 判定成功。**
- **`docx_v1_document_create` 的 title/folder_token 必须嵌在 `data` 里** → 实测裸调(不包 `data`)**不报错、却产出 `title:""` 的空文档并建在默认根目录**(漏 data 静默错位 + 污染根目录)。正确:`document_create({ data:{ title, folder_token }, useUAT:true })`。
- **`revision_id mismatch` / `block_id not found`** → 默认取最新版本即可(不要带过期的 revision);ID 失效多半是文档被改过或上次 `documentBlock_list` 没带 with-ids,重新 `docx_v1_documentBlock_list`(with-ids,局部 scope)取新 ID。
- **富文本行内标签嵌套顺序固定** → 外→内必须 `<a>→<b>→<em>→<del>→<u>→<code>→<span>→文本`,关闭顺序严格反转。
- **@人 / @文档不能写名字** → 用 `<cite type="user" user-id="ou_xxx">`,值必须是真实 `open_id`(不是飞书 user_id/工号);拿不到就用纯文本姓名,**禁止编造 `ou_xxx`**。Markdown 模式下 `<mention-user>` 会被转义成普通文本,只能用 `<cite>`。
- **局部读到 `<excerpt>` 不代表看到了整块** → 局部 `docx_v1_documentBlock_list` 下表格默认只返回 thead+命中行;想要整张表用整块范围读(以 table block_id 为起止)。读详情用 with-ids(带 block id),不要用已弃用的纯 text 详情级别(API 返 400)。

## 媒体上传 / 下载

> 本机**没有一键插图命令**:MCP 只暴露 `drive_v1_media_uploadPrepare/uploadFinish`(不推字节),本地图必须走 `lark-doc-writer/references/media-embed.md`(原 §6b)的 **curl `medias/upload_all` 管线**(建空 image 块 → curl 推字节并绑 `parent_node=图片块ID` → `docx_v1_documentBlock_patch` 的 `replace_image`)。下载/预览素材走 `drive_v1_media_batchGetTmpDownloadUrl`。

- **本地图片别直接写进 `<img src>`** → 在文本里塞本地路径或 `data:`/`file://`/base64 都不显示;`<img href>`/`src` 仅支持 HTTP/HTTPS。本地图走 §6b curl 管线(它做建块→上传→绑定 4 步),网络图才可在 XML 里直接 `<img href="https://...">`。
- **curl 管线的本地文件用绝对路径** → §6b 的 curl `-F file=@/abs/path` 用绝对路径即可(本机 Bash 工作目录每次会重置,务必用绝对路径,见全局规约)。截图/剪贴板的图先让用户保存为本地文件再走管线,**不要自己瞎猜某个本地 png**。
- **图片块没有移动 API,要挪位置只能删旧块 + 在新位重嵌(重新走 §6b 上传)** → 现象(本次 live 实测):想把一个已插好的 Image(27) 块上移/下移到另一位置,`docx_v1_*` 里**没有移动块的工具**;`documentBlock_patch` 改不了块的父/序位置。**修法**:`documentBlockChildren_batchDelete` 删掉原图块,在目标位置重新建空 image 块并走 §6b curl 管线重传字节绑定(老 media token 跨块复用会报 `1770013`,见下条,所以必须重新上传)。别指望「就地移动」。
- **绑定 token 绑错位置报 `1770013 relation mismatch`** → `medias/upload_all` 的 `parent_type=docx_image`、`parent_node` 必须是**图片块 ID**(不是文档 ID),`extra={"drive_route_token":"文档ID"}`。跨文档直接复用别的文档的图片 token 也报 `1770013`,必须对目标块重新上传绑定。
- **「把 bot 加 full_access 协作者」是 tenant token 读/写任何 `useUAT` 建文档的【通用前置】** → 完整机制(为何 owner=用户、读撞 `1770032` 静默返 0 块 / 写撞 `1061004`、`bot.open_id` 怎么取、`permissionMember_create` 加 full_access、`1062501` 删权坑)= 唯一权威 **`lark-doc-writer/references/media-embed.md`(原 §6b)步骤0**。本机实测佐证:加协作者前 REST `blocks` 返 0、加完返 85→121 块(produce_strategy),极易误判成"文档是空的"。
- **`/wiki/...` 链接换 obj_token 再操作** → 知识库节点是 `/wiki/<token>`,要先用 `wiki_v2_space_getNode` 把 wiki token 换成底层 `obj_token`(docx token)再做文档/插图操作;别拿 `/wiki/...` token 当 docx token 用。
- **下载报 `HTTP 403` / 跨租户拿不到原图** → `drive_v1_media_batchGetTmpDownloadUrl` 要 `useUAT:true`,他人/源文档原图须用 **user token**(tenant token 对无权文档静默返回空 `tmp_download_urls:[]`,不是报错)。拿到临时 url 后普通 HTTP GET 即可;跨租户(源在 `.larkoffice.com`/`.sg.`、token 在 `.us.`)拿不到原图,按 `mcp-recipes` 配方5 高质量重绘并标注。
- **单次写入别塞超长内容** → 单篇文档别一次塞超长正文(易触发限制、难调试):骨架先建,正文分段 `documentBlockChildren_create` 追加(见 §4 创建 SOP);本地大附件/图片走 §6b 管线,不要把 base64 塞进文本。Word/Excel/CSV 转在线版用 `drive_v1_importTask_create`。

## 错误码速查(code → 原因 → 修法)

> M4 端到端实测高频错误码;§2-R15 要求贴 code/msg 时对照本表给修法。

- **`1770041 open schema mismatch`** → 在 `documentBlockDescendant_create` 的树里给**自动子块容器**显式塞了子块,与飞书自动生成的子块冲突。两类高频:① callout(19) 自动带空 text 子块,树里又塞显式 text;② table(31) 自动生成全部 cell,树里又塞 cell/text。**修法**:容器一律"裸建 + 回填"——裸建容器 → 读回自动子块 id → `documentBlock_patch`/`documentBlock_batchUpdate` 填内容(callout 见 `mcp-recipes` 配方1,table 见配方2)。
- **`1770001 invalid param`** → 建表/改 callout/设列宽/插块的几类参数越界,**同码多因、极易误判**:① 建表 `row_size` 超上限(本租户 ≤9 安全,12 报错);② table 与其它块类型同批 `documentBlockChildren_create`;③ **事后** `documentBlock_patch` 改 callout `emoji_id`(任何 body 形状都报;但 `emoji_id` 在 **create 时**经原始 REST 是可设的 —— 见上方 callout 图标条);④ **多列 `update_table_property` 合进同一个 `documentBlock_batchUpdate.requests`**;⑤ **`documentBlockChildren_create` 的 `index` 越界(> 父块当前 children 数)**(fix_round_x 实测:16 个子块传 `index:21` 报此码,与①②④同码);⑥ **某些 live 文档 `documentBlockChildren_create` 拒批量 / 拒有序(13)块,只收单条 text(2)**(本次 live 实测,空文档能批量、live 文档不能,详见上方文档块节同名条)。**修法**:大表拆 ≤9 行;table 单独一次 children_create;callout 图标在 create 时经原始 REST `children` 带 `emoji_id` 设定(别事后 patch、别靠正文前导 emoji 叠图标);列宽逐列各调一次独立 `documentBlock_patch`,不要合批;**插块要追加就省略 `index`(或保证 `index ≤ 当前 children 长度`)**;遇拒批量的 live 文档退回单条 text 逐块插、有序编号手写前缀。
- **`1061004 forbidden`(写)** → tenant token 写一篇 **app 非 owner** 的文档(典型:`useUAT:true` 建的文档 owner 是用户),如本地图 `medias/upload_all` 推字节。**修法**:先用 UAT `drive_v1_permissionMember_create` 把 bot open_id 加为该文档 `full_access`(bot open_id 用 `GET /open-apis/bot/v3/info` 取),再走管线;完事可 `drive_v1_permissionMember_delete`(白名单外需扩载)。读非 app 文档对应 `1770032`。
- 其它已收录:`1770013`(媒体 token 绑错位置/跨文档复用)、`1770029`(原生 Diagram(21) create 不支持)、`5000000`(XML 导入路径裸尖括号)、`1062501`(UAT 用户删 app 建的文档无权)、`99991679`(跨租户 file_copy 缺 scope)、`-32601 Method not found`(`-t` 用了下划线名导致 0 工具注册)。

## 画板 / whiteboard

> **本机状态:** 飞书侧(官方 `lark-cli`,旧 `mcp__feishu__*` MCP 已退役)**没有原生画板 create/update 能力,经飞书 API(`lark-cli`)也做不出可拖拽画板**(whiteboard 拍平 / mermaid 不渲染 / Diagram(21) 报 `1770029` 的实测与落地替代 **→ mcp-recipes 执行覆盖层 + 配方3**)。下面的 DSL 布局规则是 `whiteboard-design` skill 的**设计方法论**(图怎么构图),不是本机可执行的写入接口;若后续有画板写入能力,再据此落地下列 DSL 规则。

- **docx 工具改不动已有画板内部内容** → `docx_v1_*` 只能在文档里**新增**一个画板块(占位),改不了已有画板内部图形;要填/改内部内容当前无 MCP 工具,如实告知。空白占位不算完成。
- **画板 DSL 布局/配色/文字规则的单一权威 = `whiteboard-design` skill 的 references** → media token 与 2891001(`dsl-schema.md` 图片节点)、connector 必须顶层 / gap·padding 必写 / 虚拟 frame 被优化(`dsl-schema.md`)、fill-container 死锁与绝对定位(`layout.md`)、文字高度 fit-content 与 textAlign 默认值(`typography.md`)、色板约束(`style.md`)。本节不再复述(2026-07-01 收敛,原文已逐条核证迁移)。
- **从画板导出 mermaid/plantuml 源码仅限画板内恰好一个图** → 画板有 0 个或多个图时取不到源码;此能力本机无 MCP 工具,如实告知。

## Markdown 导入 / 转义

> 本机走 `docx_builtin_import`(整篇标准 markdown)/`docx_v1_document_convert`(md/html→块树);两者都会把 Mira XML 标签 `<callout>`/`<lark-table>`/`<whiteboard>` **拍平成纯文本**、` ```mermaid ` 只成代码块(画板/mermaid 拍平的完整机制与替代见 mcp-recipes 执行覆盖层)。实测:**markdown-pipe 表格 / HTML `<table>` → 原生 Table(31) ✓,但 `<lark-table>` → 纯文本 ✗**;彩色 callout 走 block API;图走 PNG→Image(27) 或 ASCII code 块,不靠 `<whiteboard>`。

- **`docx_builtin_import` 会改字面内容:替换同形字 / 吞 `$..$` / `[[文字]](url)` 塌成单括号 → 导入后必须对源稿逐字核对** → 现象(本次 live 实测):整篇 markdown 走 `docx_builtin_import` 后,部分字符被替换成视觉相近的同形字(homoglyph)、`$...$` 行内公式定界符被连内容一起吞掉、`[[文字]](url)` 这类双中括号链接被塌成单括号 `[文字](url)` 甚至纯文本。引擎不报错,导入「成功」但正文与源稿对不上。**修法**:凡走 import 路径,导入后回读 `docx_v1_document_rawContent` 与源稿比对,核字、补回被吞的公式/链接;有公式/特殊定界符的内容优先走 XML / block API 别走 import(见本节末「默认走 XML / block API」)。
- **导出的 markdown 里 `\` 转义不要去掉** → 从飞书导出的 markdown 中 `\[`、`\|`、`\\` 是有意义的,去掉会让后续写入时字符被 Markdown 吞掉;要按导出的转义形式去匹配/回写。
- **markdown 写入时字面特殊字符必须转义** → 无条件转义(行内任意位置):`` \ ` * _ [ ] $ ~ < ``;位置敏感(仅行首):`# + - >`;表格 cell 内 `|`。例:字面 `C:\Users` 写 `C:\\Users`,`a]b` 写 `a\]b`。代码块/`$...$` 内不转义。
- **走 §6b curl 管线时多行/特殊字符内容用 `--data-binary @文件`,别靠 shell 引号** → 单引号里 `\n` 是字面量不换行,`$'...'` 下 zsh 会吞掉未知转义(如 `\<`)的 `\`;把 JSON body 写到文件再 `@文件` 引用。本机 Bash 工作目录每次会重置,临时文件用**绝对路径**引用,否则 `FileNotFoundError`。(block API 走 MCP 工具时直接传 JSON 入参,无此坑。)
- **默认走 XML / block API,别擅自切 Markdown 导入** → markdown 导入不携带 block ID、不带样式(颜色/对齐/callout);只有用户给 `.md` 或明确说「导入 Markdown」才用 `docx_builtin_import`。文档有图不是切 markdown 的理由(XML 支持 `<img href>`)。
- **Mermaid/PlantUML 渲染失败有固定处方**(gotchas 独有) → 旧 `graph` 语法报 `Cannot set properties of undefined (setting 'rank')` → 改 `flowchart`;PlantUML `syntax error` 多半是不支持的 `skinparam`(飞书只支持 `componentStyle`/`ArrowHeadColor`)。(经飞书 API(`lark-cli`)做不出画板、要图渲 PNG 嵌 Image(27) → `mcp-recipes` 配方3。)
- **渲染成 PNG 的流程图别成瘦高竖条(长宽比闸)** → 现象:纯线性流用 `TD`/`TB` 排成又高又窄的竖条。根因 + 闸值(LR、蛇形折行、长宽比 / 尺寸 / 2× 全套阈值)= 唯一权威 **`dag-flow-diagram`「布局与长宽比」**。

## 评论

- **读/写评论用 `drive_v1_fileComment_*`** → 读评论用 `drive_v1_fileComment_list`,写评论用 `drive_v1_fileComment_create`(`docx_v1_*` 文档块工具本身不含评论操作)。表情回复/评论订阅等当前不在白名单,如实告知。
- **已解决/已删除评论只有 Owner 可见** → 当前身份非 Owner 时 `solved` 评论会被静默过滤,看不到不代表没有;需要时提示用户用 Owner 身份。
