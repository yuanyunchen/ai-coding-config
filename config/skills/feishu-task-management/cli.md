# 飞书 CLI 使用手册(官方 lark-cli,独立于 MCP)

> 飞书执行层的 **官方 CLI 形态**实操 + 避坑。与同目录 `memory.md`(MCP 执行记忆)**物理分开、互不并入**。
> 用的是飞书**官方** `lark-cli`(`@larksuite/cli`),自带鉴权 / HTTP / 分页 / 上传下载 / 三层命令 + 27 个内置 agent skill。**查接口面用官方自带入口**(与当前 CLI 版本同步,见 §3):`lark-cli <域> --help` / `lark-cli schema <service.resource>` / `lark-cli skills read lark-<域>`。旧的 `~/feishu-cli/deliverables/*` 两份清单已随该任务区删除,不要再引用;当年的直测结论(333 shortcut + 225 API,0 不可用)保留在 §7 正文里。

---

## 1. 是什么 + 起步

**官方 `lark-cli`**(`@larksuite/cli`,Go 单二进制,npm 分发)已装且在 PATH 里,终端直接敲 `lark-cli`。**绝对路径与版本以探针为准,不要在本文硬编码**:`~/Library/Logs/harness/probe.md` 的「运行时/飞书」段(刷新 = `python3 ~/.claude/skills/harness-management/scripts/harness-probe.py`)。历史教训:本行曾写死 `~/.local/bin`,而实际安装位置是 `~/.local/node/bin`,照抄绝对路径必 no such file。

```
lark-cli                 # 官方二进制,在 PATH 里,直接敲
command -v lark-cli      # 要绝对路径时现算,别抄死值
```

- **app** `cli_aaad33abb3f81bd7`,**brand=feishu**(默认走 `open.feishu.cn`,实测直达本租户;`open.feishu.cn` / `open.larkoffice.com` / `open.larksuite.com` 是同一租户同后端的三个区域前门,brand=feishu 即够,无需切 larkoffice)。
- **配置 / 凭据**存 `~/.lark-cli/`(`config.json` + token cache + keychain),**独立于 MCP**(MCP 用自己的 keychain,二者不共享 token)。
- **身份**:`--as bot`(租户/机器人,token 自动获取)/ `--as user`(用户 UAT,走 device-flow 一次登录)。bot + user 当前都 `ready`。
- **scope** 已补齐(181 项),**user token 有效期**:access ~1h(`expiresAt`)、refresh 到 **2026-06-27**(`auth status` 的 `refreshExpiresAt`);**到期后重 `auth login`**(见 §4)。读类全域覆盖;**写类有一处缺口**:user token 无 `im:message.send_as_user`,以 user 身份发 IM(`im +messages-send --as user`)会 `missing_scope`,改用 `--as bot`(见 §5 踩坑表)。

**先确认就绪**(只读、不改配置):

```bash
lark-cli doctor          # config / auth / 连通性体检
lark-cli auth status     # bot/user 是否 ready、user token 剩余有效期(expiresAt/refreshExpiresAt)
```

两个身份都 `ready` 就能直接干活(§2)。只有没配 / 过期时才碰 §4。

---

## 2. 三层调用法

官方 CLI 是**三层命令系统**,从高到低:

### 高层(首选):`lark-cli <域> +<shortcut>`

AI/人友好,自带智能默认 + 分页 + 上传下载 + 表格输出。**verb 带 `+` 前缀**。每域几个到几十个(base 85 个、sheets 72 个),全清单见 `cli-interface.md`。

```bash
lark-cli calendar +agenda                          # 看今日日程
lark-cli im +chat-search --query "项目群" --as user # 按名搜群拿 chat_id
lark-cli docs +search --query "AI"                 # 搜文档/wiki/表格
lark-cli base +record-list --base-token <base> --table-id <tbl> --limit 50 --as user  # 列多维表记录(自带分页;flag 是 --base-token,不是 --app-token)
```

### 中层:`lark-cli <域> <group> <method>`

从 Lark OpenAPI 元数据 1:1 生成的资源命令(225 个),用 `--params`(query)/ `--data`(body):

```bash
lark-cli calendar events instance_view --as user \
  --params '{"calendar_id":"primary","start_time":"1700000000","end_time":"1700086400"}'
lark-cli im chats get --as user --params '{"chat_id":"oc_xxx"}'
```

中层命令的 `--help` 会把每个参数渲染成 **typed flag**(如 `im chats get` 给 `--chat-id`/`--user-id-type`),官方提示「typed flag 优先于 `--params`」(两者都给时 typed 覆盖同名键)。先 `lark-cli <域> <group> <method> --help` 看 typed flag 与必填,比手搓 `--params` JSON 更稳。

### 通用(底层):`lark-cli api <METHOD> <PATH>`

裸调任意 `/open-apis/...` 端点(覆盖 2500+,含上传/下载等字节级端点):

```bash
lark-cli api <METHOD> <PATH> --as user|bot \
  [--params '<query-json>'] [--data '<body-json>'] [--file '[field=]path'] [-o out] [--page-all] [-q '<jq>']
```

**通用输出/控制 flag(三层通用)**:`--format json|table|csv|ndjson`、`-q/--jq '<expr>'` 过滤、`--dry-run` 只打请求不发(裸 `api` 与部分写命令支持)、`-o` 二进制落盘、`--page-all`(+`--page-limit`/`--page-size`)自动翻页、`--data @file` / `--data -`(stdin)。

---

## 3. 自助发现(优先用官方自带,版本同步)

测接口 / 查参数 **不要靠记忆或 grep 本地文件**,用官方自带的四个入口(都与当前 CLI 版本同步):

| 入口 | 命令 | 给什么 |
|---|---|---|
| 命令帮助 | `lark-cli <cmd> --help` | 命令树 + shortcut 列表 + flag |
| **端点 schema** | `lark-cli schema <service.resource>` | 该资源全部方法的 **参数 / 类型 / 必填 / `_meta.scopes` / `access_tokens`(身份) / `risk`**;`lark-cli schema <service> <resource> <method>` 钻到单方法。**仅覆盖 14 个有 OpenAPI 元数据的域**(approval/attendance/calendar/contact/drive/im/mail/minutes/okr/sheets/slides/task/vc/wiki);`base`/`docs`/`apps`/`markdown`/`note`/`whiteboard` 无 schema(报 `Unknown service`)→ 这些域查参数改用 `--help`(中层命令的 `--help` 直接列 typed flag + 必填)+ `skills read` |
| **内置 skill** | `lark-cli skills list` / `lark-cli skills read <name>` | 官方 27 个 agent skill(`lark-doc`/`lark-base`/`lark-im`/`lark-sheets`/`lark-drive`…),含 workflow + 坑 + 范例。**docs 等域明确要求先 `skills read lark-doc` 再用** |
| 健康检查 | `lark-cli doctor [--offline]` | config / auth / 连通性 |

例:`lark-cli schema im.messages` 列出 im 消息资源全部方法,每个带 `inputSchema`(必填字段)+ `access_tokens`(`["user","tenant"]` 还是仅 `["tenant"]`);写方法还带 `yes` 确认门字段。

### 真实例子(5 读 + 1 写 dry-run + 1 schema + 1 shortcut)

```bash
# (1) docx 读正文(user):取某文档纯文本
lark-cli api GET /open-apis/docx/v1/documents/Iw9jdKE3IoD2t1xMa9qucpz8s0c/raw_content \
  --as user --params '{"lang":0}' -q '.data.content'

# (2) bitable 读记录(POST,body 必填 → 必须 --data '{}',见踩坑表)
lark-cli api POST /open-apis/bitable/v1/apps/<app>/tables/<tbl>/records/search \
  --as user --params '{"page_size":5}' --data '{}' -q '.data.items|length'

# (3) im 列群(user)
lark-cli im +chat-list --as user --page-size 20

# (4) drive 列文件(user)
lark-cli api GET /open-apis/drive/v1/files --as user --params '{"folder_token":"<folder>","page_size":50}'

# (5) calendar 读主日历日程(user,page_size≥50,见踩坑表)
lark-cli api GET /open-apis/calendar/v4/calendars/primary/events --as user --params '{"page_size":50}'

# (6) 写类先 --dry-run 看请求成形(裸 api),确认无误再去掉 --dry-run
lark-cli api POST /open-apis/docx/v1/documents/<doc>/blocks/<block>/children \
  --as user --data '{"children":[{"block_type":2,"text":{"elements":[{"text_run":{"content":"hi"}}]}}],"index":0}' --dry-run

# (7) 查端点参数/scope/身份(测前必用)
lark-cli schema drive permission.members create

# (8) 高层 shortcut:导出文档为 PDF(自带异步轮询 + 下载)
cd /tmp && lark-cli drive +export --token <doc> --type docx --extension pdf -o ./out.pdf
```

---

## 4. 鉴权 / scope(复现步骤)

> **分工(单一权威,2026-07-01)**:鉴权的**通用规范**(身份类型选择、device-flow/split-flow 完整协议、二维码生成、scope 缓存规则、高风险门禁、更新检查)以官方 `lark-shared` skill 为权威(`lark-cli skills read lark-shared`);本节只放**本租户复现快速路径**与本机特有配置,两处不重复讲解。注:lark-shared 是 CLI 托管副本、会随 `lark-cli update` 刷新,反向指针不写进它——查通用规范永远以它现版为准。
> 仅在没配 / token 过期时执行。只动 CLI 自己的 `~/.lark-cli`,不碰 MCP。

**配 app 身份**(secret 走 stdin 不回显):

⚠ **凭据来源已失效,这一步现在需要人工提供 secret。** 原配方从 `~/.config/lark-mcp/env` 读 APP_ID/APP_SECRET,该文件随 MCP 退役已删除(2026-07-30 实测不存在);照抄会把空串喂进 `--app-secret-stdin`。app id 是 `cli_aaad33abb3f81bd7`(见上文),secret 请用户从密码管理器或飞书开放平台取,agent 不要去别处翻。

```bash
# secret 由用户在交互式终端粘贴,不落文件、不进 agent 上下文
lark-cli config init --app-id cli_aaad33abb3f81bd7 --app-secret-stdin --brand feishu
```
- 落 `~/.lark-cli/config.json`(`brand:"feishu"`)。bot/tenant token 之后**自动获取 + 刷新**,`auth status` 显示 `bot.status:"ready"` 即可用。
- `config init` 在检测到 Agent 工作区 env(`OPENCLAW_HOME`/`HERMES_HOME`)时会拒绝,改用 `lark-cli config bind`;普通终端不触发。

**user 身份 device-flow**(两段式,适配「只能在 turn 末给链接」):
```bash
# 第一段:发起,立即返回 verification_url + device_code(不阻塞)
lark-cli auth login --no-wait --json --domain all \
  --scope "$(lark-cli auth scopes 2>/dev/null | tr '\n' ' ')"   # scope 清单现算;原 ~/feishu-cli/src/scope-gap.txt 已随该任务区删除,展开为空串会静默请到零 scope
```
- 浏览器打开 `verification_url` → Authorize 批准(**走 Chrome 插件 `mcp__Claude_in_Chrome__*`,不用 computer-use**)。device-flow 无 redirect,**无需往 app 加白名单**。
```bash
# 第二段:批准后,用第一段的 device_code 完成
lark-cli auth login --device-code <device_code>
```
- token 含 `offline_access` 自动刷新;refresh 到 **2026-06-27**,到期重跑本段。
- 缩小授权面:`--domain <逗号分隔域>` 只请求需要的域;`--recommend` 只要免审 scope。
- 补/查 scope:`lark-cli auth scopes`(app 已开)、`lark-cli auth check --scope <s>`(退出码判当前 token 是否覆盖)。

---

## 5. 踩坑表(本租户 / 实战,官方文档没有)

> 这些是**用官方 CLI 打本租户**才会撞的坑,均 2026-06-20 对 `lark-cli v1.0.56` 实测复现。通用飞书坑(嵌图 parent_node 用图片块 ID、建块姿势、导入导出吞图等)仍以 `memory.md` 为准。

| 坑 | 现象 | 规避 |
|---|---|---|
| **brand 与本租户** | 文档只说 feishu/lark 两 brand,看似不支持 larkoffice | brand=feishu 即直达本租户(`open.feishu.cn` 与 `open.larkoffice.com` 同后端);**别去找 larkoffice 切域入口**(没有,`FEISHU_DOMAIN` 是 no-op) |
| **裸 POST 缺 body → 9499** | body 必填的 POST(如 `bitable .../records/search`)不带 `--data` → `9499 Invalid request parameters`,空 body 也得发 | 裸 `api` 打这类 POST **必须手动 `--data '{}'`**(实测:不带=9499,带 `{}`=ok)。高层 `+record-search` shortcut 已自带 body,无此坑 |
| **个别端点 `.data` 恒空** | 个别端点(如 `GET /open-apis/bot/v3/info`)`ok:true` 但 CLI 返回 JSON 里 `.data` = `{}`,且顶层只有 `ok/identity/data` 三键(无 `.bot` 等额外字段,`-q '.bot'` 取到 `null`) | 先 `-q '.'` 看清真实返回结构再取字段,别假设 payload 在某顶层键;取 bot/用户信息改走有正常 `.data` 的端点,如 `lark-cli contact +get-user --as user -q '.data.user.name'`(实测返回用户名) |
| **tenant-only 端点 `--as user` 无效** | 部分 im/contact 端点只认 tenant(`im chats create`、`im messages merge_forward/read_users/urgent_*`、`im images create`、`contact .../batch_get_id`),传 `--as user` 也被当 bot | `schema` 看 `access_tokens` 仅 `["tenant"]` 的就 **`--as bot`**;读用户私聊 / bot 不在的群正文 CLI 做不到,走 Chrome 插件读网页(`memory.md` §7/§8) |
| **scope 集与默认域不同、有到期** | user token 用新版细粒度 scope(`base:*`/`docs:*`/`docx:*`/`drive:*`),与 app 默认 scope 不同;到期 token 撞 `99991679` | scope 已补齐(`scope-gap.txt` 的 9 主缺 + 2 次缺已在 token 内);**refresh 2026-06-27 到期**后按 §4 重 login;缺哪个 scope 看错误返回的 `missing_scopes` 字段 |
| **user 身份发 IM 缺 scope** | `im +messages-send --as user`(及 `+messages-reply --as user`)→ `missing_scope: im:message.send_as_user`(user token 未含此 scope;`--dry-run` 也救不了,scope 门在成形前先挡) | 发 IM 走 `--as bot`(`im:message` 已在 bot 侧,bot 须在目标群/会话内);确需 user 身份发,按 §4 补 `im:message.send_as_user` 重新 login |
| **写类 shortcut 无 enum 校验 → 真执行** | 高层 shortcut(如 `im +chat-create`、`im +messages-send`)**不带确认门、立即真发/真建**(实测 `+messages-send` 直接打到后端);MCP 侧曾误建残留群 `MCP_PROBE_DO_NOT_CREATE` | **写类先 `--dry-run`**(裸 `api` 支持)或先在 `schema` 看清参数;`im chats create` 这类危险参数会被静默接受真建群 |
| **calendar event-list `page_size` 下限 50** | `page_size<50` → `99992402 field validation`(参数门,不是 scope 门) | calendar 列日程 `page_size` 给 ≥50(实测 10 直接 ok:false) |
| **fileVersion.list 用 `obj_type`** | 用 `file_type` 先撞 `99992402` 参数门,掩盖真实结果 | 该端点参数名是 `obj_type`,不是 `file_type` |
| **media 下载对 type=file 静默空数组** | `drive .../medias/batch_get_tmp_download_url` 对 type=file 的 token 返回空数组(不报错) | 独立文件下载改走 `drive +download` / `drive +export-download` 直下载端点(`-o` 落盘) |
| **异步族要 create→poll** | 导出/导入/复制/删除/move 是异步,create 返 `ticket`/`task_id`,不轮询拿不到结果 | shortcut 已封装轮询(`drive +export`、`wiki +node-delete` 等自带 poll);裸 `api` 自己轮 `drive +task_result` 或对应 get;**本环境禁 foreground sleep,用 busy-wait/Monitor,别裸 `sleep`** |
| **`-o` 只接受 cwd 内相对路径** | 二进制下载给绝对路径/逃逸路径 → `unsafe output path` | 先 `cd` 到目标目录或用 `./xxx`(安全设计,非 bug) |
| **优先 shortcut 而非裸 api** | 裸 `api` 要自己管分页(`page_token` 循环)、上传 multipart、下载落盘、异步轮询 | 这些 `+shortcut` 都已封装(`--page-all`、`+upload`/`+download`、异步 poll);**没有特殊理由先用 `+shortcut`**,裸 `api` 留给 shortcut 没覆盖的端点 |
| **`docs +fetch` 定位文档必须 `--doc <token>`** | 位置参数报 `positional arguments are not supported`;用 `--token` 报 invalid_argument —— 都易被误判成权限问题,实为 flag 错(2026-06-28~07-01 feishu-memory 维护任务实测) | 读文档一律 `docs +fetch --doc <token> [--doc-format markdown]`;子命令名是 `docs` 非 `docx` |
| **错误 JSON 走 stderr** | lark-cli 出错时错误 JSON 打到 **stderr** 而非 stdout;批量探测/脚本只收 stdout 会把真实错误误判成空输出/解析失败(2026-06-29/06-30 维护任务实测) | 批量探测与脚本解析一律 `2>&1`(或 `> file 2>&1`)合并流后再解析 |

---

## 6. 速查

```bash
# 健康 / 身份
lark-cli doctor                              # config/auth/连通性体检
lark-cli auth status                         # bot/user ready、token 有效期

# 三层调用
lark-cli <域> +<shortcut> [...]              # 高层(首选,verb 带 +)
lark-cli <域> <group> <method> [--params][--data]   # 中层(1:1 REST)
lark-cli api <METHOD> <PATH> --as user|bot [--params '<json>'][--data '<json>'][--file][-o][--page-all][-q '<jq>']

# 自助发现
lark-cli <cmd> --help
lark-cli schema <service.resource>           # 参数/类型/必填/scope/身份
lark-cli skills list / lark-cli skills read <name>   # 官方内置 agent skill

# 重新授权(token 过期 / 补 scope)
lark-cli auth login --no-wait --json --domain all --scope "$(lark-cli auth scopes 2>/dev/null | tr '\n' ' ')"
# 浏览器(Chrome 插件)批准 verification_url 后:
lark-cli auth login --device-code <code>
```

**铁律**:写类先 `--dry-run`(shortcut 无确认门会真执行);只动 CLI 自己的 `~/.lark-cli`,不碰 MCP 配置 / keychain / 凭据;查接口面用 `lark-cli <域> --help` / `lark-cli schema <service.resource>` / `lark-cli skills read lark-<域>`(旧的 `~/feishu-cli/deliverables/*` 已随该任务区删除)。

---

## 7. 全接口直测结论(摘要,详见 cli-test-report.md)

558 个一级接口(333 shortcut + 225 API)逐个安全探测,结论 **0 不可用**——全部 wired 且可达后端,跑不出数据只因 scope 没开或 flag 传错,非 CLI 缺陷。该结论是 2026-06 对 v1.0.56 的一次性直测,当年的完整分域表 / scope 缺口 / flag 汇总随 `~/feishu-cli/` 任务区一并删除,未留副本;要重新核验就用 §3 的自助发现入口。原报告见 **`~/feishu-cli/deliverables/cli-test-report.md`**。三件要点:

- **已知 scope 缺口**(app 未申请,非缺陷,console 加 scope + 重授可解锁):**OKR 全域**(5 scope)、**attendance**(`attendance:task:readonly`)、**base 6 类读**(block/history/dashboard/form/role/workflow read)、**mail 发送**(`mail:user_mailbox.message:send`)、**im user 发消息**(`im:message.send_as_user`,走 `--as bot` 可绕)。`auth scopes` 需的管理员 scope 属 app 根本没有。
- **flag 名常非直觉**(猜错报 unknown flag):base 多个写类用 `--json` 整对象而非 `--name`;sheets `--cells`/`--font-weight`/`--replacement`/`--index`;task `--task-guid`/`--add`/`--set`;calendar `--rsvp-status`;approval `--instance-code` 等。**传参前先 `lark-cli <域> +<shortcut> --help` 或 `schema <svc> <res> <method>` 或 `skills read lark-<域>` 查准**,别靠记忆(§3 三入口都与版本同步)。
- **官方 27 个内置 skill** 经 `lark-cli update` 已同步进本机 Claude Code(`lark-base`/`lark-im`/`lark-drive`/`lark-doc`/`lark-sheets`/...),是各域官方接口介绍 + 范例 + 坑的载体,`lark-cli skills read <name>` 读取。
