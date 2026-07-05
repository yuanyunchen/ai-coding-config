# exec-import-export:导入 / 导出 / Drive 下载(media vs file 两条路 + 静默假阴性)

> 来源:原 `memory.md` §4(导入/导出/读取坑)+ §11(Drive 下载:media 素材 vs file 独立文件)。逐字保真搬运。
> 取用场景:md→docx 导入、判断文档有没有图、分享文档、下载云盘图片/独立文件。横切主题 = **飞书静默假阴性**(导出吞图 / 下载空数组),别用错接口判断有没有内容。
> 边界:下面以旧 `mcp__feishu__*` / `useUAT:true` 记述的是**飞书后端行为事实**;CLI 命令见同目录 `cli.md`。授权配方(加 bot full_access)权威定义见 `exec-permission.md`。

## 导入 / 导出 / 读取的坑(原 memory.md §4)
- `docx_builtin_import` 吃**标准 markdown**(不是 lark-doc XML dialect):pipe 表格→原生表格✓;mermaid 只成代码块(不渲染);`<callout>/<lark-table>/<whiteboard>` XML 被拍平成纯文本。画图用 ASCII 代码块;彩色 callout/嵌套表格走 block API。
- `docs_v1_content_get` 的 markdown 导出会**吞掉 image/whiteboard 块**:别用 markdown 判断文档有没有图;数图用 block API 按 `block_type==27`。
- 分享文档别用 gmail(非飞书身份,1063001),用 open_id/user_id。
- 动手前先 `documentBlock_list`/读现状,别另建同名重复文档。

## Drive 下载:media 素材 vs file 独立文件分两条路(2026-06-18 实测,补充嵌图管线)

情境:下载飞书云盘里的图片/文件。飞书「下载」按对象分两条**完全不同**的路,先分清下的是「文档内嵌素材(media)」还是「云盘独立文件(type=file)」——`file_list` 返回的 `type` 字段直接区分。

- **媒体素材(docx/sheet/bitable 内嵌图、附件)**:`drive_v1_media_batchGetTmpDownloadUrl`(`useUAT:true`)→ 拿 24h 临时链接 → curl 下字节。**MCP 白名单内,直接可用**。media token 从 `documentBlock_list` 的 image 块(block_type 27)`image.token` 取。实测两张 docx 内嵌图正常下回有效 PNG。
- **云盘独立文件(`type=file`,如上传的 PNG/截图/附件文件)**:走 `GET /open-apis/drive/v1/files/{file_token}/download`(返回二进制)。**此接口不在 MCP 白名单**(无 file_download 工具)→ 只能 curl + access_token,或扩载工具。
- **坑(静默假阴性,最易误判)**:对 `type=file` 的 token 调 `media_batchGetTmpDownloadUrl` 会返回 `{"tmp_download_urls":[]}` —— **不报错、只给空数组**,极易误判成「没权限/接口挂了」。根因:media 接口只认内嵌素材,**不认独立文件 token**。判据=用真正的 media token 测同一接口立刻正常返回链接(反证)。注意这与嵌图管线记的「app token 对无权文档返回空」是**两种不同成因**,都表现为空数组。
- **权限阶梯**:`/files/{token}/download` 接口与 scope 本身没问题——bot 上传自己的文件可直接 200 下回(隔离测试已证)。对**用户私有文件**,bot 需先被加为协作者:`view` **不够**(仍裸 403、空 body)、`full_access` 才 200。流程 = UAT `permissionMember_create`(member_type=openid, member_id=bot open_id, perm=full_access, type=file)→ tenant token 下载 → tenant `DELETE /open-apis/drive/v1/permissions/{token}/members/{bot_openid}?type=file&member_type=openid` 自删(**自删可行**,即便 `permissionMember_list` 因 tenant 缺 `drive:drive` scope 报 99991672,DELETE 仍 code 0)。(此授权配方权威定义见 `exec-permission.md`。)
- **读 meta ≠ 能下载**:`meta_batchQuery`(tenant)对无下载权的用户文件照样返回标题/owner/url——**读元数据权与读内容权分离**,别用 meta 成功推断能下载。
- **(2026-06-18 修正)没有「MCP 直接下载」这条捷径**:lark-mcp **不封装任何二进制下载工具**——全量 49 个 drive 工具里查无 `file.download`/`media.download`(只有回 URL 的 `media.batchGetTmpDownloadUrl`)。所以独立文件下载**只能 curl** `/files/{token}/download`;白名单加全也加不出下载工具。要免「授权 bot→下载→撤权」三步,只能靠能拿到 UAT 明文的环境直接 curl(本机 UAT 加密存储取不出),否则就走三步法。
