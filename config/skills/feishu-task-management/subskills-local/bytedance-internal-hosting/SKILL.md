---
name: bytedance-internal-hosting
description: "把 HTML 报告/网页/交互产物托管到字节内网拿可分享 link——双平台:要能跑的交互网页→Goofy 快速预览(deploy.bytedance.net→gf-preview URL,≤50MB 死限);要单文件报告+飞书原生权限→飞书云盘 Preview。含 create/redeploy/上传新版本保 link、file_upload 注入、大文件瘦身、踩坑。触发:内网托管、Goofy、gf-preview、快速网页预览、deploy.bytedance.net、托管 HTML、内部分享网页、飞书云盘 Preview、上传新版本 Upload New Version、starmap/大文件托管、redeploy 保 link、文件上传注入、50MB 上限。边界:飞书文档写作走 lark-doc-writer、云盘权限/文件操作走 lark-drive、不代改分享权限。"
---

# 字节内网托管(HTML 报告 / 网页 / 交互产物)

**一句话**:要**能跑的交互网页 + 可分享 link** → **Goofy 快速预览**(zip → 静态站 + `gf-preview` URL);要**单文件报告 + 飞书原生权限管理** → **飞书云盘 Preview**(上传 HTML 本体,靠文件 Preview 渲染)。一切浏览器操作走 claude-in-chrome 插件(全局规则,绝不 computer-use)。

## 0. 决策树 — 托管到哪(动手前一跳定)

| 内容 | 去哪 | 产物 | 硬约束 |
|---|---|---|---|
| **单文件自包含 HTML**(报告/dashboard),要**真 ACL 权限** | 飞书云盘 Preview | 文件 Preview 渲染 | 只能**单文件**;按人/部门权限 |
| **单文件 HTML**,要**开箱即用的公开 link** | Goofy 快速预览 | `<prefix>.gf-preview.bytedance.net` | 有效期≤30天;全内网 SSO 可见、无按人 ACL |
| **多文件交互应用**(index+data.js+assets) | **只能 Goofy** | 同上 | 飞书 Preview **跑不了多文件**;Goofy **≤50MB 死限** |
| 多文件 > 50MB | Goofy(先瘦身) | 同上 | 见 `references/shrink-oversized-site.md` |

**能力边界(钉死,别踩)**:
- 飞书云盘 Preview 只渲染**单个自包含 HTML**;多文件应用的相对引用(`data.js`、`assets/*.jpg`)会 404 → 白屏/无数据。starmap 这类只能上 Goofy。
- Goofy 快速预览**真实上限 = 50MB**(界面文案写"200MB"**是错的**,见 goofy.md 踩坑)。
- ~~Mira 托管网页~~ 不行(只会 import 成降级纯文字 docx),已弃用。
- **不代改分享/访问权限**(全局安全红线):agent 只上传,权限由用户用飞书 **Share** 自理。

## 场景路由(读哪个 reference)

| 我要做 | 一跳读 |
|---|---|
| Goofy 建站/覆盖更新/表单/踩坑(50MB、误判成功、大文件冻结) | `references/goofy.md` |
| 飞书云盘上传/保 link 覆盖/新文件绕过/权限/踩坑 | `references/feishu-drive.md` |
| 产物 > 50MB 要塞进 Goofy(无损→砍非主图→缩主图→改数据引用) | `references/shrink-oversized-site.md` |
| file_upload 注入配方(CORS server + fetch→File→input) | `references/inject_file.md` |
| 多份单文件拼卡片导航 landing + 扁平 zip | `references/build_site_zip.sh` |

## 1. 平台入口(网站清单)

| 平台 | 入口 | 产物 |
|---|---|---|
| Goofy 快速预览 | `deploy.bytedance.net/web/quick-preview/{create,list,redeploy/<name>}` | `<prefix>.gf-preview.bytedance.net` |
| 飞书云盘(网页) | `bytedance.larkoffice.com` / `bytedance.us.larkoffice.com`,`/file/<token>`、`/drive/folder/<token>` | 文件 Preview |
| 飞书云盘(CLI) | `lark-cli drive +upload / +create-folder`(执行层走 lark-drive) | file_token + url |

## 2. Goofy 快速预览(要「能打开的链接」)

**新建**:build 自包含产物 → 多文件**保结构递归 zip**(`zip -rX index.html data.js assets`,不能 `-j` 拍平)→ 插件开 `.../quick-preview/create` → 注入 zip(`references/inject_file.md`)→ 等 deploy.yml 自动生成 → 填 Validity(最大 30)/Description/Preview domain 前缀 → Create preview。
**覆盖保 link**:走 `.../quick-preview/redeploy/<preview-name>` 注入新 zip,**域名不变**。
细节、表单 React 填法、**三大坑(50MB 死限 · 误判成功 · 大文件冻结)**全在 `references/goofy.md`。

## 3. 飞书云盘(要存档 / 真权限)

上传 HTML **文件本体**(别 import 成 docx,会降级丢图),点文件 **Preview** 渲染。
- **CLI 首选**:`lark-cli drive +upload --as user`(在用户 Drive 建须 `--as user`)。Keychain 被沙箱锁时由 agent 执行 `lark-cli config keychain-downgrade`；若随后仍是 DNS/网络隔离，按主 skill 的执行降级规则处理，不把命令转交用户。
- **CLI 执行通道不可达时走网页版**:新文件网页上传注入不进(showOpenFilePicker/webkitGetAsEntry),用「**Make a Copy → Upload New Version**」技法绕。
- **保 link 覆盖** = 文件「**⋯ → Upload New Version**」(同 token/URL 不变,旧版进版本历史,评论保留,自动改名为上传文件名)。
全部命令、绕过技法、权限、踩坑在 `references/feishu-drive.md`。

## 3b. 覆盖 / 改名 / 大小限制 速查(跨平台)

| 事项 | Goofy 快速预览 | 飞书云盘 |
|---|---|---|
| **保 link 覆盖内容** | `redeploy/<name>` 注入新 zip,域名不变 | 文件「⋯ → Upload New Version」,token/URL 不变、留版本历史、保评论 |
| **改名** | 域名前缀 = 建时定;改名 = 换域名(另建/新 link) | 「⋯ → Rename」独立改名(不动内容);或 Upload New Version 时把注入 File 名设成目标名一步到位;大文件页卡时从**文件夹列表**改 |
| **大小限制** | **≤50MB 死限**(界面写 200MB 是错的);超了先瘦身 | **无 50MB 限**,`+upload` >20MB 自动分片,单文件大报告随便传;但 Preview 只渲单文件 |
| **有效期** | ≤30 天(填大被夹到 30),临期 Redeploy 续 | 长期(随云盘) |

## 4. 标准流程

1. 本地 build 自包含 HTML;判类型(单文件 vs 多文件)。
2. 按 §0 决策树选平台。
3. Goofy:打 zip → 若 >50MB 先按 `shrink-oversized-site.md` 瘦身 → 注入部署 → 拿 `gf-preview` URL。
4. 飞书:上传 HTML → Preview 渲染;覆盖更新用 Upload New Version 保 link。
5. **验证**(交付前必做):导航产物 URL 截图 + 点交互元素确认;覆盖更新用「新版唯一片段命中 + Modified 时间跳新」双验。
6. URL / 文件链接记进项目记忆与交付说明。

## references
- `references/goofy.md` — Goofy create/redeploy 全流程 + 表单 React 填法 + 三大坑。
- `references/feishu-drive.md` — 飞书云盘 lark-cli + keychain + 网页版 Upload New Version / Make-a-Copy / Move + 权限 + 踩坑。
- `references/shrink-oversized-site.md` — 多文件站 >50MB 分层瘦身(无损→删非主图→缩主图→改 data.js 引用)+ 可复用脚本。
- `references/inject_file.md` — file_upload 注入配方(CORS http.server + fetch→DataTransfer→input.files + 动态 input 的 click 覆写)。
- `references/build_site_zip.sh` — 多份单文件拼卡片导航 landing + 扁平 zip 打包。
