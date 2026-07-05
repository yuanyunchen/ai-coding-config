# exec-appendix-legacy:(历史·MCP 已退役)白名单启用 + 扩载流程 + 完整工具目录

> 来源:原 `memory.md` §9。**纯历史参照,日常不读**——MCP 已退役、不再是执行路径,隔离到 appendix 防止在 active reference 里制造「MCP 还能用」的误导。逐字保真搬运。
> 路由表仅在「想知道飞书后端历史上有哪些 MCP 能力」这一冷场景指向本文。执行一律走官方 `lark-cli`(见同目录 `cli.md`)。

## 9. (历史·MCP 已退役)lark-mcp 启用白名单 + 扩载流程 + 完整目录

> **本节是 MCP 时代的记录,MCP 已退役、不再是执行路径。** 下面的 `-t` 白名单 / 扩载流程(加点号名→改三处配置→重启)**已死**,不要再走。官方 `lark-cli` 没有白名单——558 个一级接口(333 shortcut + 225 API)全可达;查能力/参数用 CLI 自带 `lark-cli schema <svc.res>` / `lark-cli skills read lark-<域>` / `--help`(见 `cli.md §3`),全接口面清单在 `~/feishu-cli/deliverables/cli-interface.md`。本节工具目录仅作「飞书后端有哪些能力」的历史参照保留。

执行层(MCP 时代)只暴露 lark-mcp `-t` 白名单里的工具(当时 97 个;2026-06-18 把 drive 域补成全量 49 个),**skill 正文按业务域讲方法,真正能调的工具清单以本节为准**。

**当前启用(按域)**:
- docx:builtin.search/import;document.create/get/rawContent/convert;documentBlock.list/get/batchUpdate/patch;documentBlockChildren.create/get/batchDelete;documentBlockDescendant.create
- docs:content.get  ·  search:v2.message.create  ·  wiki:v1.node.search、v2.space.list/getNode、spaceNode.create/copy
- drive:**全量 49 工具(2026-06-18 起)**——file(list/createFolder/copy/move/delete/uploadPrepare/uploadFinish/createShortcut/subscribe/getSubscribe/deleteSubscribe/taskCheck);media(uploadPrepare/uploadFinish/batchGetTmpDownloadUrl);meta.batchQuery;importTask/exportTask(create/get);fileComment(create/list/get/patch/batchQuery)+fileCommentReply(list/update/delete);fileVersion(create/get/list/delete);fileSubscription(create/get/patch);fileStatistics.get;fileViewRecord.list;permissionMember(create/list/get→update/delete/batchCreate/auth/transferOwner);permissionPublic(get/patch)+permissionPublicPassword(create/update/delete)。**注意:lark-mcp 整个 drive 域无任何二进制下载工具**(无 file.download/media.download),`media.batchGetTmpDownloadUrl` 只回 URL;独立文件下载只能 curl `/files/{token}/download`(见 `exec-import-export.md`)。
- bitable:app.create、appTable.create/list、appTableField.list、appTableRecord.create/batchCreate/search/update/delete
- im:chat.create/list、chatMembers.get/create、message.create/list、**message.get(2026-06-17 新增,待重启生效)**
- contact:user.batchGetId/get  ·  sheets:spreadsheet.create  ·  task:task.create/patch
- calendar:calendar.list/primary、calendarEvent.create/list  ·  minutes:minute.get/minuteStatistics.get

**容易忽略但已启用的能力**:`im_v1_message_get` 按 ID 读消息正文(**仅 bot 所在会话;不认 useUAT,读不了用户私聊——读 DM 走 `exec-im-browser.md` Chrome**)· `im_v1_chatMembers_create` 把机器人拉进群(嵌图到 UAT 文档前的协作者授权也用它)· `drive_v1_permissionMember_create` 加协作者 · `drive_v1_media_batchGetTmpDownloadUrl` 取他人文档图片临时链 · `drive_v1_importTask`/`exportTask` md↔docx 导入导出 · `docx_v1_documentBlockDescendant_create` 一次建嵌套块树。

**需要的功能不在上面 → 扩载流程**:
1. 查全量目录确认工具点号名:`~/.npm/_npx/*/node_modules/@larksuiteoapi/lark-mcp/docs/tools-zh.md`(或 `dist/.../zod/<domain>_v1.js` grep 工具名)。lark-mcp 远多于这 66 个(如 `im.v1.message.get/readUsers`、`sheets` 单元格读写、`calendar` freebusy 等)。
2. 把点号名(如 `im.v1.message.get`)加进**三处配置**的 `-t`:`~/.claude.json`、`~/.cursor/mcp.json`、`~/.codex/config.toml`(都在那串 `npx ... lark-mcp ... -t a,b,c` 里;每处只出现一次,改完用 python 校验 JSON 合法)。
3. **重启 Claude / 重连 MCP** 后才会出现在工具列表(`select:mcp__feishu__<name>`);改完不重启当场调不到。
4. 凭据/身份不变:App `cli_aaad33abb3f81bd7`、域 `open.larkoffice.com`、`~/.config/lark-mcp/env` 存 APP_ID/SECRET;OAuth 的 user token 加密存 `~/Library/Application Support/lark-mcp-nodejs/storage.json`(`iv:密文`,取不出明文,要测 UAT 接口得靠 MCP 自己跑或重新 OAuth)。读用户数据传 `useUAT:true`。
