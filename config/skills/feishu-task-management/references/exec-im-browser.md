# exec-im-browser:IM 读消息能力边界 + 浏览器开飞书网页版兜底 SOP

> 来源:原 `memory.md` §7(IM 读消息:能定位读不了正文)+ §8(浏览器开飞书网页版兜底 SOP + row 数据中心渲染空白)。逐字保真搬运。
> 取用场景:读用户私聊/机器人不在的群的消息 → 结论直接指向「唯一解 = Chrome 插件」,§7→§8 是「问题→唯一解」连续叙事。
> 边界:下面以旧 `mcp__feishu__*` / `useUAT:true` 记述的是**飞书后端 IM 能力事实**;CLI 命令见同目录 `cli.md`,对齐全局规则「浏览器走 Chrome 插件」。

> ⚠ **域名说明(2026-06-23 核真,M-1)**:本文出现两个飞书网页版域 —— bare `bytedance.larkoffice.com`(走 `accounts.feishu.cn`,CN-routed)与 `bytedance.us.larkoffice.com`(走 `accounts-us.feishu.cn`,US-routed),**实测二者均 HTTP 200 可达,是同一 `bytedance` 租户的两个有效网页入口域,不是矛盾、不是新旧**(API 租户域是第三维度,`lark-cli doctor` 报 `open.feishu.cn`)。原文记录的两个域**一律保留原值**;开网页时按实际能进的那个用,拿不准就两个都试,别据「方向性结论」批量替换。

## 7. IM 读消息:能定位、读不了正文(2026-06-17 实证)

情境:想读「用户(非机器人)所在会话」里某条消息或聊天记录(同事 DM、群),比如别人 @ 你/转给你的消息(`aime://mention/<uuid>` 这类 mention 引用本机无工具解析,UUID 也不是飞书 message_id)。实测白名单能力边界:

- **`search_v2_message_create` + `useUAT:true` = 唯一能碰用户私聊的入口**:按 `query`(必填)/`from_ids`(user_id)/`chat_ids`/`chat_type`(group_chat|p2p_chat)/`from_type`(user|bot)/`start_time`/`end_time` 搜「用户可见消息」。**但只返回 `message_id` 列表(om_...),无正文、无所在 chat、无时间戳**。
- **`im.v1.message.get`(按 ID 取单条)2026-06-17 加了白名单,但 2026-06-18 实测【不解决】读 DM**:该工具 **schema 无 `useUAT`、只按 bot 身份执行**,传 `useUAT:true` 也被忽略 → 读用户私聊/机器人不在的群仍报 `230002 "Bot/User can NOT be out of the chat"`(和 message_list 一个毛病)。它只能读**机器人所在**会话的消息。`search_v2`(UAT)能定位拿 message_id,但拿到也喂不进一个 UAT 的取正文接口——**lark-mcp 没有 UAT 身份的「按 ID/会话取消息正文」工具**。
- **`im_v1_message_list` 不认 `useUAT`**:传了也按 **app/bot 身份**执行 → 只能读**机器人所在**的会话。机器人不在用户任何私聊/群里 → 报 `230002 "Bot/User can NOT be out of the chat"`(即便会话名里就有用户本人)。
- **`im_v1_chat_list` + `useUAT:true` 能列「用户所在的群」**(chat_mode=group/topic,带 chat_id/name/owner),**但不含 p2p 私聊**。
- 结论:**MCP 读不了用户私聊 / 机器人不在的群的消息正文**——search_v2 只给 message_id,而 message_get/message_list 都是 bot 身份、进不去。**读这类消息只能走 Chrome 插件(§8)**,这是当前唯一可行路径。
- **实测可行解 = Chrome 插件读飞书网页版(2026-06-17 走通)**:`mcp__Claude_in_Chrome__*` 连本地浏览器 → `navigate` 到 `https://bytedance.larkoffice.com/messenger/`(US 租户;首次可能要再 navigate 一次等 SPA 加载)→ 截图找到对方会话(左侧会话列表按头像/名字)→ 点开 → `get_page_text` 一次性抓全对话(含代码块/SQL/链接);**发件方向以截图里的头像左右为准**(对方头像在左),`get_page_text` 线性化时 sender label 可能错位,别只信文字标签。这是读「机器人不在的私聊/群」消息的首选路径(对齐全局规则「浏览器走 Chrome 插件」)。computer-use 对浏览器只读且 Feishu 桌面常被拒授权,不走。
- 其他兜底:(a)让用户粘贴/截图;(b)把机器人 `im_v1_chatMembers_create` 拉进群再 `im_v1_message_list`(私聊不行、打扰他人)。

## 8. 浏览器打开飞书网页版(执行层够不到时的首选兜底,对齐全局规则「浏览器走 Chrome 插件」)

何时用:要读「机器人不在的私聊/群」的消息正文、看渲染后的文档/多维表格、或核对刚建文档的渲染效果——凡执行层(`lark-cli`)做不到或要"看渲染"的,用 Chrome 插件开飞书网页版。computer-use 不走(对浏览器只读、Feishu 桌面授权常被拒、弹窗挂 5min)。

SOP:
1. `mcp__Claude_in_Chrome__list_connected_browsers` → `select_browser`(取本地浏览器 deviceId)。**绝不询问用户选哪个浏览器——哪个能用用哪个,自动选能用的那个**(2026-06-25 用户明确,每次必读):按 **deviceId** select、**别按 name**(编号/名字随重连漂移);优先已登录 bytedance/SG 内网的那个;候选都连着就直接 select 第一个能用的,只有都没连上才停下说明,绝不退回 computer-use。
2. `navigate` 到目标:
   - 消息:`https://bytedance.larkoffice.com/messenger/`(US 租户;**首次常加载成空白,再 `navigate` 同址一次**等 SPA 起来)。
   - 文档/表格:直接开 `https://bytedance.us.larkoffice.com/docx/<token>` 之类。
3. 读消息:截图在左侧会话列表按头像/名字找到对话 → 左键点开 → `get_page_text` 一次性抓全对话(含代码块/SQL/链接)。
4. **发件方向以截图里头像左右为准**(对方在左、自己在右);`get_page_text` 线性化时 sender label 可能错位,别只信文字标签——拿不准就滚动截图核对头像。
5. 纯查看即可,别在浏览器里点「发送/提交/分享/改权限」。
- 注意:`data.tiktok-row.net`(row 数据中心)在插件里渲染空白(body 0 字、跳 /connection);`data.bytedance.net`(CN)能开但 TikTok/row 数据因合规隔离不在其内。row 侧数据/表权限入口要问 mentor 或让用户给链接。
