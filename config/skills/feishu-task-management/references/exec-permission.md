# exec-permission:权限 / scope / OAuth 重授 / UAT vs tenant / 加协作者-自删

> 来源:原 `memory.md` §1(权限/scope/OAuth/UAT vs tenant 根目录限制)+ §3 的「协作者授权」子流程(此处为**权威定义**,`exec-blocks.md` 嵌图、`exec-import-export.md` 私有文件下载均交叉引用本文)。逐字保真搬运。
> 取用场景:建文件夹/文档报权限错(99991679/1255002)、新增 scope 不生效、嵌图/下载撞 1061004/403 需临时把 bot 加为协作者。
> 边界:下面以旧 `mcp__feishu__*` / `useUAT:true` 记述的是**飞书后端权限行为事实**(`useUAT:true` ≈ CLI 的 `--as user`);CLI 命令/鉴权复现见同目录 `cli.md`。

## 权限(2026-06-15, v1.0.6 已发布,已重新 OAuth)
- 4 项曾缺的 scope 已补齐并实测通过:`im:message.group_msg`(读群)、`contact:user.id:readonly`(手机/邮箱换ID)、`docx:document.block:convert`(md→块)、`sheets:spreadsheet.meta:write_only`;`docs:document.media:download/upload` 确认已有。
- **关键教训**:新增 scope 不会自动进旧 user_access_token —— 必须**重新 OAuth 同意**。lark-mcp 在 UAT 缺权时返回一个 60s 有效的 `http://localhost:3000/authorize?...` 链接,浏览器打开点「Authorize」(redirect 回 localhost:3000/callback,token 落本地存储)。重授后旧 token 也会补上 `drive:drive/space:folder:create` 等基础写权限(否则在用户 Drive 建文件夹/文档会 99991679)。
- 在用户 Drive(My Space)建文件夹/文档/Bitable 必须 `useUAT:true`;tenant 身份会撞根目录限制(1255002)。

## 加协作者-自删授权配方(权威定义)

> 何时用:tenant token 要对**非 app owner 的文档/文件**做写操作(嵌图 1061004、下载用户私有文件 403)时,临时把 bot 加为协作者、操作完自删。`exec-blocks.md`(嵌图)、`exec-import-export.md`(§11 私有文件下载)都引用本配方。

核心三步(docx 嵌图场景):
1. `GET /open-apis/bot/v3/info` 取 `bot.open_id`。
2. UAT `permissionMember_create` 把它加为 `full_access` 协作者(`view` 不够)。
3. tenant token 完成操作后,tenant token `DELETE /open-apis/drive/v1/permissions/{token}/members/{bot_openid}?type=docx&member_type=openid` 自删。

下载独立文件(`type=file`)场景同理,只是 `type=file`:UAT `permissionMember_create`(member_type=openid, member_id=bot open_id, perm=full_access, type=file)→ tenant token 下载 → tenant `DELETE /open-apis/drive/v1/permissions/{token}/members/{bot_openid}?type=file&member_type=openid` 自删。**自删可行**,即便 `permissionMember_list` 因 tenant 缺 `drive:drive` scope 报 99991672,DELETE 仍 code 0。**`view` 权限不够**(裸 403、空 body),`full_access` 才 200。
