# legacy-mcp — 已退役 lark-mcp 的配置/工具注册坑（存档）

> **存档（2026-07-01 自 SKILL.md 迁出）**：旧 `mcp__feishu__*` MCP 已退役，执行层 = 官方 `lark-cli`。本文件仅供考古（复盘旧报告、理解历史记录里的现象），**不指导当前执行**。live 坑表见 SKILL.md。

## lark-mcp 配置 / 工具注册（工具压根没加载时查这里）

- **`-t` 工具白名单必须用「点号名」(dot-case)，不能用下划线名** → lark-mcp 0.5.1 的 `filterTools` 用 `allowTools.includes(tool.name)` 精确匹配**原始点号名**(`docx.builtin.search`、`docx.v1.documentBlock.list`、`im.v1.chat.list`），**不做任何大小写/分隔符转换**。传下划线名(`docx_builtin_search`)→ 命中 0 个 → 不注册任何工具 → 高层 `McpServer` 从不挂载 `tools/list` handler → 该请求返回 `-32601 Method not found` → 客户端表现为 feishu「一直连接中 / ToolSearch 检索不到工具」。**症状极具迷惑性:lark-mcp 进程在跑、`initialize` 成功、OAuth 也成功,却一个工具都没有。** 修法:`-t` 整段下划线名 `_`→`.`(驼峰段无下划线,直接替换即可)。会话内显示名仍是下划线(由 `-c` 默认 `snake` 做展示转换),与本工作区文档/报告一致,无需改 `-c`。验证:手动 stdio 跑 `initialize`+`notifications/initialized`+`tools/list`,数返回的 tools 条数;0 条且 `Method not found` 即此坑。
- **ToolSearch 载 feishu 工具用关键词检索,别用 `select:<下划线名>`** → 实测(两份 M4 报告一致):`ToolSearch "select:docx_v1_document_create,..."` 返回「No matching deferred tools found」(`select:` 不按会话内的下划线显示名匹配);改关键词检索(如 `feishu docx document create block children`)才命中。与上一条"`-t` 用点号名"呼应——会话内显示名虽是下划线,但 `select:` 的下划线名失效。白名单外工具(如 `permissionMember_delete`)关键词也搜不到,需先扩载。
- **token 不持久,每个新进程都要重新 OAuth** → AuthStore 是内存态(启动日志 `Initialized storage successfully with 0 tokens`)。access_token 过期后,user-token 工具(跨公司搜索 `docx_builtin_search`/`wiki_v1_node_search`/`search_v2_message_create`)在 `--oauth` 下靠浏览器同意页换取;builtin 搜索拿不到 token 直接返回 `当前未配置 userAccessToken`。**tenant-token 工具(IM/Bitable/Docs/Sheets/Task/Calendar 等绝大多数)不需要 OAuth,纯 app 身份即可用。**
- **`--token-mode` 会过滤掉工具** → `tenant_access_token` 模式下只支持 user-token 的 3 个搜索工具被 `filterTools` 滤掉(66→63);`auto`(默认,harness 用)不过滤,全 66 注册。
- **端口 3000 单实例** → `--oauth` 起本地 OAuth server 占端口(默认 3000),多实例并存 `EADDRINUSE`,调用静默失败。保证单实例或用 `-p` 区分。
- **lark-mcp 工具入参形状固定为 `{path, params, data}` 三段** → `path`=URL 路径参数(如 `app_token`/`table_id`/`document_id`),`params`=query,`data`=body;返回的 `content[0].text` 是 API 的 `data` 字段**已拆封**的 JSON(不是 `{code,data}` 整包),取值直接 `result.app.app_token`,不要再 `.data`。
