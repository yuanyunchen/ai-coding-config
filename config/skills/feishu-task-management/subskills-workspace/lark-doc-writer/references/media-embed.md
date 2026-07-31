# 媒体嵌图管线(本地图 / 渲染 PNG → 飞书 Image 块)

> canonical 落地配方。执行层走官方 `lark-cli`(旧 `mcp__feishu__*` MCP 已退役;下文 MCP/REST 记法仅作动作语义参考,实际以 `lark-cli` 对应命令为准,见 `cli.md`)。源自 module5 image_recipe(本机实跑通并回读验证)。执行路径与凭据细节呼应 §3 执行层映射、§6b 插本地图;本篇是单一完整序列 + 坑表。

> ⭐ **先试一条命令的官方路径,不行才回落本篇五步管线(2026-07-29 实测,lark-cli 1.0.65)**:
> ```bash
> lark-cli docs +media-insert --doc <doc> --type image --file ./fig.png \
>   --selection-with-ellipsis "图 1 · <caption 原文>" --align center --as user
> ```
> 它把「加协作者 → 建空块 → 推字节 → 绑 token」四步连回滚一起封好,**自己不用碰 TAT / `parent_node` / `1061004`**;`--selection-with-ellipsis` 传 caption 段落的纯文本即可精准插到**该段之下**(caption 在上、图在下,正合 §10 自检),多张图各锚各自 caption、互不干扰,无需算 index。整篇正文同样一条命令:`docs +create --doc-format xml --content @body.xml --parent-token <folder>` 直接落 callout / 原生 table / checkbox / cite,**不必逐块建**。
> **仍需回落本篇五步 curl 管线的情形**:要把图插进 callout / 表格单元格等容器内部(`+media-insert` 落的是顶层块)、要替换已有图块的 token、或 `+media-insert` 报错需要自己拆步排查。

---

## 0. 前置:凭据与身份(每会话一次)

- App 凭据:用 `lark-cli --as bot` 现取 tenant token(旧配方读的 `~/.config/lark-mcp/env` 已随 MCP 退役删除,2026-07-30 实测不存在)(`APP_ID`/`APP_SECRET`)。换 `tenant_access_token`(下称 TAT,有效 ~2h):POST `{BASE}/open-apis/auth/v3/tenant_access_token/internal`,body `{app_id, app_secret}`。
- `{BASE}` 按租户(如 `https://open.larkoffice.com`);取 bot open_id:TAT `GET {BASE}/open-apis/bot/v3/info` 取 `bot.open_id`。
- **读写用户文档**:MCP 工具传 `useUAT:true`(`useUAT` 建的文档 owner 是用户,不是 app)。
- **curl 推字节 / REST patch**:用 TAT。

---

## 1. 五步管线(照搬顺序)

**根因**:`useUAT` 建的文档 owner 是用户,TAT 直接推字节 / 写块会 `1061004`。解法 = 临时把 bot 加为 `full_access` 协作者,走 curl 管线,完事删除。

1. **加 bot 协作者(MCP,useUAT)** — `drive_v1_permissionMember_create`,`type:"docx"`、`member_type:"openid"`、`member_id:<bot open_id>`、`perm:"full_access"`。**不加这步,后面推字节 / replace_image 必 `1061004`,读必 `1770032`(静默返 0 块,易误判文档为空)。** 凡 owner=用户的文档,任何经 TAT 的读 / 写 / 设 callout emoji_id 都先做这步——作为 `useUAT` 建文档后的默认第一步。
2. **建空 image 块(27)(MCP,useUAT)** — `documentBlockChildren_create`,父块 = 目标位置的 parent,`children:[{block_type:27, image:{}}]`、带 `index` 定位。返回里拿新 image 块 `block_id`(token 此时为空)。
3. **curl `medias/upload_all` 推字节并绑定(TAT)** — `POST {BASE}/open-apis/drive/v1/medias/upload_all`,multipart:`file=@<本地图>`、`file_name`、`size`、**`parent_type=docx_image`、`parent_node=<图片块ID>`(不是文档 ID!)、`extra={"drive_route_token":"<文档ID>"}`**。绑错(填文档 ID)→ `1770013 relation mismatch`。成功返回 `data.file_token`。(要嵌的图先本地渲染 PNG;CJK 字体用 `/System/Library/Fonts/Hiragino Sans GB.ttc` 避免乱码。)
4. **绑 token 到块** — `documentBlock_patch`(bot 已是 full_access,可走 MCP tenant 身份不传 useUAT,或 REST):`data:{replace_image:{token:<file_token>}}`。回读 `image.token` = file_token、`width/height` 变真实像素即成。
5. **删 bot 协作者(收尾必做,TAT)** — `permissionMember_delete` 不在白名单,用 REST `DELETE {BASE}/open-apis/drive/v1/permissions/<DOC>/members/<bot>?type=docx&member_type=openid`(TAT)。图片绑定写进文档内容、owner 是用户,删协作者后仍在。验证:删后 TAT 读任一块返 `1770032` 即证清理完成。

> 顺序:加协作者 → 嵌图 → (交叉链接 / 改字若有,REST 用 TAT 全程需 bot 在) → **删协作者**。或全程改用 MCP `useUAT:true` 不依赖协作者。

---

## 2. 坑表(本机实测)

| 坑 | 现象 | 修法 |
|---|---|---|
| **CJK 弯引号致 patch 序列化失败** | `documentBlock_patch` 文本含中文弯引号 `“”‘’` → JSON 序列化报 `path=undefined`;转义不当还会写错字 | 文本用直角引号 `「」`,或写成 `\uXXXX` 转义码点 |
| **childrenCreate 拒批量 / 拒有序块** | 某些 live 文档 `documentBlockChildren_create` 批量插或插有序(13)块报 `1770001` | 退**单条插入**,只接受单条 text(2);有序块改无序或逐条建 |
| **图片块无移动 API** | 图嵌错位置,无接口挪动 image 块 | 删旧块 + 在新位重嵌(重新 `upload_all`) |
| **跨文档 token 不可复用** | 拿别文档的图片 token 去 `replace_image` → `1770013 relation mismatch` | 必须对目标块重新 `upload_all` 绑定 |
| **`1061004` 本质 = owner≠app** | 不止"他人文档",自己用 `useUAT` 建的也命中(owner 是用户);读对应 `1770032`、写对应 `1061004` | 加 bot full_access 协作者(步骤 1);UAT 用户对 app 建的空文档无删权(`drive_v1_file_delete` 报 `1062501`) |
| **复用源文档原图** | 同租户原图想复用 | `media_batchGetTmpDownloadUrl`(**user token**)取临时链接 → 下字节 → 对目标文档新建 image 块重新 `upload_all` |

> 错误码速查另见 `feishu-doc-gotchas`;mermaid 在飞书不渲染(DAG 走 PNG/ASCII,不写 mermaid 源期望渲染)见 §0.6 / mcp-recipes 执行覆盖层。
