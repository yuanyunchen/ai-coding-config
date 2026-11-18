# Slack Web 核验证据

Chrome 扩展的 DOM 自动化，账户菜单显示 Yunchen YUAN。工作区切换只有一个 Columbia University 登录项和一个不同域的工作区。没有同工作区第二登录身份。主验收操作在已有授权的 #test 新根帖或其回复内；没有修改绑定，没有将回复广播至频道。已删除的，仅为为 edit/delete 专门创建的合成旁聊。

所有消息链接通过 Slack Web 的时间戳链接重新读取。耗时差用本机点击发送 UTC 与 Slack 接受机器时间计算。中文首答浏览器首次观测到可见时延为 54.140 秒，Slack 时间戳差为 52.579 秒，两者都是单次观测。

## 七条浏览器验收路径

1. 所有者在私有 #test 新根帖真实 @ Ethan’s Bot，收到一句中文答复。短问首答超 10 秒。
2. 无提及的英文追问接续同帖，正确复述合成代号。「还是没变」后续能引用同帖截图，同时保留当前状态未知。
3. 架构图的中文说明和 PNG 分别送达。在 Slack 网页的原生预览中看到完整往返链路。
4. 同帖两批附件分别覆盖 PNG、TXT、PDF、WAV 和 DOCX、XLSX、PPTX、另一张 PNG。损坏对照被单独拒绝，四个有效附件不受影响。
5. 订阅后只出现一条主动里程碑。取消后，主会话核对旧进展票据被拒，网页只出现后来明确追问的正常答复。
6. 本人合成消息编辑后在原 Slack ID 显示新文本与 edited，删除后原文和新版均从线程消失。撤回与模型竞态由隔离测试覆盖。
7. 明确给同事的旁聊修复前后均未公开应答。修复前主会话收到原生投递。修复后 Slack journal 有消息，原生收件、等待投递和公开应答均为零。已完成后一条独立标记复验。

## 实际时间戳与回执

| 步骤 | 点击发送 UTC 或观察 | Slack 回执与证据 |
|---|---|---|
| 新根帖真实 @ | 05:20:55.841 | [根帖](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794979255976339) 的提及是独立链接，Slack 提及选择器显示 APP。 |
| 中文首答 | 点击后约 54.140 秒首次看见答复 | [中文答复](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794979308419699?thread_ts=1794979255.976339&cid=C0CJN63KC66)「这个帖子的合成代号是『松针 47』。」 |
| 无提及英文追问 | 05:21:57.736 | [英文答复](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794979348920219?thread_ts=1794979255.976339&cid=C0CJN63KC66) “The synthetic code you gave me was ‘松针 47.’” 点击至回执 31.184 秒。 |
| 图文路径说明 | 05:22:47.871 | [正文](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794979389205349?thread_ts=1794979255.976339&cid=C0CJN63KC66) 21.334 秒与 [图](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794979390466699?thread_ts=1794979255.976339&cid=C0CJN63KC66) 22.596 秒分别送达。文件 F0CJNV0E3EJ，点击进入 Slack 缩放预览，加载为 401 × 695。原帖/桥接/Codex/桥接/原帖五个节点均清楚可读。 |
| 四附件输入 | 05:24:29.390 | [四附件发出](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794979469537699?thread_ts=1794979255.976339&cid=C0CJN63KC66) 与 [正确读出](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794979489185029?thread_ts=1794979255.976339&cid=C0CJN63KC66)；图片 WAITING FOR REVIEW / QA-CORAL-516，TXT T-LUMA-082，PDF P-KITE-793，WAV blue pebble。点击至回执 19.795 秒。 |
| 订阅与进展 | 05:24:54.723 开启，05:26:17.774 发明确任务 | [订阅](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794979494830289?thread_ts=1794979255.976339&cid=C0CJN63KC66) 后，[实际四附件及图预览进展](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794979615929539?thread_ts=1794979255.976339&cid=C0CJN63KC66) 在原帖一次送达。主会话通过该任务的真实进展票据投递，这是受邀主动推送通道的验收。 |
| 取消和回读 | 05:32:03.705 取消，05:32:49.308 询问「还是没变」 | [取消](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794979923895309?thread_ts=1794979255.976339&cid=C0CJN63KC66) 后旧票据提交被主会话核对拒绝，浏览器没有新增主动消息。[回读](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794979981811879?thread_ts=1794979255.976339&cid=C0CJN63KC66) 12.504 秒，正确区分截图当时状态与当前未知状态。 |
| 编辑与删除 | 05:34:11.044 点击 Slack 删除 | 编辑前后为同一个 Slack ID 1794979528.990429，展示从「周五」变为「周六」及 Slack “edited”。删除后同线程仍在，两个文本均不在 DOM。该合成消息无对外回复。 |
| 未补丁旁聊 | 05:25:28.870 点击 | Slack ID 1794979528.990429，公开静默。主会话却观察到原文进 Codex，零投递断言失败。该旁聊后来作为编辑／删除的合成测试消息。 |
| 补丁后旁聊 | 05:36:02.354 点击 | [SIDE-CEDAR-472](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794980162640109?thread_ts=1794979255.976339&cid=C0CJN63KC66) 在约 59.5 秒观察时仍无公开回复。主会话查询确认消息在真实频道 journal，原生收件表 0 条、交接等待表 0 条且无已发回帖。 |
| 第二附件批次 | 05:36:53.955 点击 | [五附件输入](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794980218709989?thread_ts=1794979255.976339&cid=C0CJN63KC66) 显示为五附件。目标码 D-MINT-663、X-MAP-041、S-FINCH-344、I-ASH-592。对照文件是有 DOCX 扩展名的截断 ZIP。 |
| 第二附件批次答复 | 05:37:25.443 Slack 回执，点击差 26.489 秒 | [真实答复](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794980245443539?thread_ts=1794979255.976339&cid=C0CJN63KC66) 四码全部正确，新图状态 READY FOR ARCHIVE，损坏文件明确报告结构无效。Slack 界面仍将损坏附件标成 Word Document，桥接读取结果明确失败，其余附件独立交付。 |
| 继续结单 | 05:38:20.829 点击 | [结单提问](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794980301077719?thread_ts=1794979255.976339&cid=C0CJN63KC66)。 |
| 结单答复 | Slack 回执 05:39:03.319 UTC | [原帖结单回执](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794980343319469?thread_ts=1794979255.976339&cid=C0CJN63KC66) 概括真实附件和图预览结果，并说明短问首答超 10 秒。 |

## 独立的限量空闲路径复验

主会话另行用正常绑定机制建一个获准的[团队 Codex 测试根帖](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794981052208939)，由不同团队 Codex 会话承接。该根帖复验用另一个合成代号，浏览器连续等待符合条件的 Bot 回复进入可见 DOM。

| 步骤 | 浏览器点击 → 可见 UTC 与耗时 | Slack 回读 |
|---|---|---|
| 正式 @ 中文提取 | 05:52:15.299 → 05:52:18.059，2.760 秒 | [中文答复](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794981137744519?thread_ts=1794981052.208939&cid=C0CJN63KC66)「雪松 82。」 |
| 无 @ 英文追问 | 05:52:28.153 → 05:52:32.311，4.158 秒 | [英文答复](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794981152173309?thread_ts=1794981052.208939&cid=C0CJN63KC66) “The code was ‘雪松 82’ (‘Cedar 82’ in English).” |

两条答复在第二根帖，未出现第一根帖合成代号。该次验证空闲的独立团队路径。第一根帖是桌面所有者路径，两组数据分别解读。接管未操作。

## 最终部署的图片交付

第二个测试帖在最终部署后只追加一次图文请求。06:05:32.324 UTC 点击发送，4.838 秒后浏览器看见图片缩略图。[一句中文正文](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794981935541439?thread_ts=1794981052.208939&cid=C0CJN63KC66) 和 [Slack PNG 文件消息](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794981936913599?thread_ts=1794981052.208939&cid=C0CJN63KC66) 分别送达。文件 F0CKKHZ4EF2，点开预览有 200 × 479 PNG，可读出五步往返路径。[最终部署图预览](live-final-diagram-preview.jpg)。

同时回读第一根帖，Ethan’s Bot 显示名、原图、四附件与五附件记录仍可在 Slack Web 查看。复验后将独立临时绑定交由主会话按授权撤销。
