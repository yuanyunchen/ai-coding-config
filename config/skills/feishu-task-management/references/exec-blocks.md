# exec-blocks:建块 + 嵌图 + 表格 + 图片复用 + 本地渲 PNG

> 来源:原 `memory.md` §2(建块姿势)+ §3(嵌图/图片复用管线)。逐字保真搬运。
> 取用场景:往 docx 写结构化内容的同一工作流(建块 → 建图块 → 绑图 → 渲图),错误码族 1770041/1061004/1770013/1770001 交织,做表格嵌图几乎必同时查。
> 边界:**建块/嵌图完整配方以 `lark-doc-writer` 为唯一权威**,本文存「摘要 + 错误码 + 何时查权威」防漂移;CLI 命令语法/三层调用/鉴权见同目录 `cli.md`。下面以旧 `mcp__feishu__*` 工具名记述的是**飞书后端行为/错误码事实**(同一后端经 lark-cli 仍会撞);执行路径走官方 `lark-cli`。

## mini-TOC(单文件内二跳定位)
- **建块 / 表格 / callout / 多处插入** → 看「§A 建块的正确姿势」(下半上段)
- **嵌图 / 跨文档复用 / 跨租户拿不到 / 本地渲 PNG** → 看「§B 嵌图 / 图片复用管线」(下半下段)

---

## §A 建块的正确姿势(原 memory.md §2)

- `docx_v1_documentBlockDescendant_create` 支持一次建嵌套树:每个块带 `block_id` + 容器块 `children:[子id]`,`children_id` 列首层。quote_container 这么建;callout 也可,但**别在树里塞它的自动子块**(见下条)。
- **table(31) "裸建+回填",不走 descendant**(三要素摘要,完整步骤见权威):情境=树里塞 cell 必 `1770041`、列宽/表头有平台坑;规则=裸建 `{block_type:31, table:{property:{row_size≤9,column_size}}}` → 读回自动 cell id → `batchUpdate` 按行优先回填 → **建表后逐列**对 TABLE 块 `documentBlock_patch` 设宽(3 列 **160/360/90**=标签/长描述/数字,多列合批 `1770001` 须分次);例=已 Chrome 实测列宽生效、长描述列单行横排。约束补充:table 不与其它块同批 children_create;`column_width`/`header_row` 持久性**按 create 路径分**——原始 REST create 在 `table.property` 带 `column_width`+`header_row:true` → 列宽与整行浅灰底真表头**都持久且正确渲染**(rgb(242,243,245) 整格填充,非贴字形);MCP `documentBlockChildren_create` 会**静默剥离这两个属性**(回读即丢)→ 只能退回裸建 + 逐列 `documentBlock_patch` 设宽 + 首行 cell 文本 `{bold:true, background_color:7}` 近似(贴字形高亮,非整格;= [platform-limit 仅 MCP 路径])。**要真表头就走原始 REST 建表。****完整配方以 `lark-doc-writer` 配方2 为唯一权威**(此处只存摘要防漂移)。
- callout(19) 创建后自动带一个空 text 子块;**别在 descendant 树里再塞显式 text 子块**(撞自动子块 → `1770041`),裸建 callout → `documentBlock_patch` 写那个自动子块。`callout.text_color` 必须 1–7(传 0 报错)。`callout.emoji_id` **在 create 时经原始 REST `children` 带 `emoji_id` 可设并正确渲染**(Chrome 实拍推翻旧"不可靠"结论);**正文【不要】再放前导 emoji**,否则默认 🎁 + 正文 emoji 叠成双图标。本机 MCP 的 callout schema 无 `emoji_id`、事后 patch 报 `1770001`,只用 MCP 时退路=正文也不放、接受单 🎁。详见 `lark-doc-writer` 配方1。
- 大文档 `documentBlock_list` 输出会超 token 限制 → 落盘到文件后用 python 切片解析。
- 多处插入:`documentBlockChildren_create` 带 `index` 定位;**先插大 index 再插小 index**,避免前面插入顶掉后面下标。
- block API(JSON)里文本的 `< > &` 无需转义(只有飞书 XML 导入路径才转义)。

---

## §B 嵌图 / 图片复用管线(原 memory.md §3,已跑通,务必照搬)

MCP 的 `media_uploadPrepare/uploadFinish` 不推字节,光靠 MCP 传不了图。正解:
1. `~/.config/lark-mcp/env` 的 APP_ID/APP_SECRET → POST `/open-apis/auth/v3/tenant_access_token/internal` 换 `tenant_access_token`。
2. 建空 image 块(block_type 27)→ 拿 `block_id`。
3. curl POST `/open-apis/drive/v1/medias/upload_all`,**关键绑定**:`parent_type=docx_image`、`parent_node=图片块ID`(不是文档ID!)、`extra={"drive_route_token":"文档ID"}`、multipart `file`。绑错→ `1770013 relation mismatch`。
4. `docx_v1_documentBlock_patch` `{"replace_image":{"token":新token}}` 绑定。
- **图片原样复用(重写别人文档用相同图)**:`drive_v1_media_batchGetTmpDownloadUrl`(`useUAT:true`)取他人/源文档图片临时链接 → curl 下字节(md5 一致)→ 对目标文档**新建 image 块**重新 upload_all 绑定。跨文档不能直接复用图片 token(relation mismatch)。app(tenant) token 对无权文档返回 `tmp_download_urls:[]`,下载要用 user token。
- **跨租户原图复用做不到(2026-06-15 实证)**:源文档在 `bytedance.larkoffice.com`(CN)/`.sg.`,而本 token 在 `.us.` → `media_batchGetTmpDownloadUrl` 对其图片**静默返回空**(`tmp_download_urls:[]`,从不报错;混一次请求里自有图能下、源文档图被剔除 = 决定性证据)。能读 meta/rawContent/block(阅读权 OK),唯独 media 下载被安全层拦;`file_copy` 也 99991679(缺 drive:drive/docs:document:copy + 跨租户)。结论:**跨租户/禁下载的原图拿不到 → 只能高质量重绘并标「(重绘)」,或让用户手动截图**。同租户自有文档则正常可下。
- **往 app 非 owner 的文档插图(含 `useUAT:true` 建的文档!)**:tenant 读写非 app 拥有的文档会 1770032(读)/1061004(写)——`useUAT` 建的文档 owner 是用户、不是 app(连"自己刚用 UAT 建的"也算),curl 管线推字节同样撞 `1061004`。加协作者-自删的三步配方见 `exec-permission.md`(**权威定义**;权限码 99991679/1255002 与 OAuth 重授同见该文件)。
- 本地渲染 PNG:matplotlib,中文字体用 `/System/Library/Fonts/Hiragino Sans GB.ttc`,否则 CJK 乱码。
- **有设计感的图优先手写 SVG → headless Chrome 2x 截图渲 PNG**(`--headless --screenshot --force-device-scale-factor=2 --window-size=W,H`,SVG 里 `font-family="Hiragino Sans GB"`),比 matplotlib 更可控、扁平专业。**嵌飞书前必须自己 `Read` 看一遍 PNG 再嵌**——盲画/盲嵌必踩裁切:内容超画布右侧被切、ASCII 代码块超 ~72 显示列右切(CJK 计 2)。情境=2026-06-17 周会 note 实证(D2 初版右列被裁、K1 ASCII 先量行宽 ≤72 才嵌);规则=渲完先看再嵌、ASCII 先量行宽。
