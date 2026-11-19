---
title: 把当前会话接入 Slack
subtitle: Columbia University · Slack 本机操作指南
lang: zh
template: doc
theme: paper
file: session-pairing
---
在目标会话中告诉 agent：**把这个会话接入 Slack #test**。打开返回的链接，在“回复线程”中 @Ethan's Bot (local) 提问。

**当前 #test 的实际权限**：该频道的内部成员可以向当前 Codex 会话发消息。回帖对频道读者可见。
[打开直接绑定的线程](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794957283609919)。现在接收消息和生成文字答复使用同一原生会话 01a1e733-39ae-7f50-86a1-f33356f1de49。文字回复使用 Codex 原生取样接口，不能执行这个窗口的私人工具。需要生成图片或语音的任务须有实际文件和 Slack 文件回执，文字确认不代表交付。

## A 从目标会话接入

Codex 和 Claude Code 都装有 `slack-bot`。想接入 #test 时，可以说“用 slack-bot 把这个会话接入 Slack #test”。

#test 已实测接入、Codex 中文回复和 Slack 回读。[打开实测线程](https://columbiaunive-zxm5569.slack.com/archives/C0CJN63KC66/p1794957283609919)。

给频道名时，同一会话会复用该频道已有的链接。要接入指定讨论，把 Slack 原帖链接交给 agent。应用须先加入目标频道。

已符合团队共享条件的 Codex 会话，首次接入可以沿用原会话。默认团队模式为私人来源或第二个讨论分配独立执行会话。明确授权精确收件后切到原生文字会话；#test 当前使用后者。来源历史留在原会话，回执会说明使用哪一种。Slack 回复对频道读者可见。

第一次在 Slack 发具体任务时，先 @Ethan's Bot (local)。同一人可在原线程直接追问。想收到公开进度时，发“有进展告诉我”。

一个讨论接入多个会话时，发送 `@Ethan's Bot (local) /sessions` 查看别名。用 `/use <会话别名>` 选择后续会话，或用 `/to <会话别名> <任务>` 指定本次任务。两条命令也需 @ 应用。

## B 继续已经绑定的会话

打开[截图中的 hi 线程](https://app.slack.com/archives/C0B27AUG8LD/p1794955202467249)。在“回复线程”中从提及菜单选中 Ethan's Bot (local)，再写一个具体问题。单发 hi 会保持安静。

在 Mac 终端用下面的命令打开同一会话：

```bash
codex --remote "unix://$HOME/.codex/app-server-control/app-server-control.sock" resume 01a1ebac-d2c3-7b91-8d94-c7cc1016988f
```

| 想做什么 | 在原线程提及应用后输入 |
|---|---|
| 追踪公开进度 | 运行测试，请同步实时进度 |
| 查询状态 | 状态 |
| 排队做另一件事 | 排队 再补一份变更说明 |
| 停止当前 Codex 任务 | 停止 |

## C 从 Slack 开始团队任务

在已接入的频道新发一条顶层消息，@Ethan's Bot (local) 并写明任务。该线程会获得专用团队 Codex 会话。

若要先创建团队会话，或手动配对一个已有的团队会话，在桥接仓库中执行相应命令：

```bash
cd "/Users/yuanyunchen/Desktop/AI Programing/Play for Fun/slack-codex-bridge"
npm run pair -- codex
# 已有且尚未配对的团队会话
npm run pair -- codex "已有团队会话的UUID"
```

负责人在 #random 发一条新的顶层消息，选中 @Ethan's Bot (local) 并输入终端打印的 bind 指令。配对码单次有效，十分钟内使用。看到应用确认后，回这条消息的线程继续提问。

## D 接入 Claude Code

用 Channels 启动或恢复目标 Claude 会话，再在 Claude Code 中说“用 slack-bot 把这个会话接入 Slack #random”。同一 Claude 会话服务一个讨论。接入其他讨论时，用各自的 Channels 会话。

手动配对需要两个 Mac 终端。终端 A 启动 Claude Code 并保持打开。终端 B 配置桥接和生成配对码。

终端 A 进入桥接仓库，启动团队项目的 Claude 会话：

```bash
cd "/Users/yuanyunchen/Desktop/AI Programing/Play for Fun/slack-codex-bridge"
TEAM_PROJECT="/Users/yuanyunchen/Library/Application Support/slack-coding-bridge/T0B2PK88RJ5/team-project"
node scripts/claude-launch.js "$TEAM_PROJECT"
```

若要接入已有的团队 Claude 会话，先等原会话空闲并退出，再用以下命令恢复：

```bash
node scripts/claude-launch.js "$TEAM_PROJECT" --resume "已有共享Claude会话的UUID"
```

按 Claude 终端提示确认加载本地 team-slack channel。记下打印的 Team Claude session ID 与 Unix socket。

终端 B 填入刚才的 ID 和 socket。这里使用默认 socket，以终端 A 打印值为准：

```bash
cd "/Users/yuanyunchen/Desktop/AI Programing/Play for Fun/slack-codex-bridge"
export CLAUDE_BRIDGE_THREAD_ID="替换成终端 A 打印的 UUID"
export CLAUDE_BRIDGE_SOCKET="$HOME/.slack-codex-bridge/claude.sock"
python3 scripts/service.py install
npm run pair -- claude
```

安装会重载本机桥接。等现有任务结束再执行。若已自定义项目、语言或状态目录，在终端 B 保留相同设置。

负责人在 #random 发一条新的顶层消息，选中 @Ethan's Bot (local)，再填入终端 B 打印的 bind 指令。用 `npm run status` 核对 backend 为 claude，threadId 与终端 A 一致。接着在原线程提问。要停止 Claude，在终端 A 按 Esc。

Claude 终端已实测收到 Slack 输入。该账号此前达到周额度，真实模型回复仍待复验。

## E 核对连接

Mac 唤醒后，在桥接仓库查看服务与绑定：

```bash
node scripts/check-service.js
npm run status
```

| 现象 | 检查项 |
|---|---|
| 回复丢了上下文 | 回绑定的 Slack 线程。新顶层消息会开始新任务 |
| 团队 bind 失败 | 负责人在尚未绑定的帖子里使用最新配对码 |
| Claude 无响应 | 检查终端 A、会话 ID、socket、channel 提示和额度 |
| 应用没收到提问 | 确认应用已加入目标频道，再通过提及菜单选中应用 |

## 源会话主动汇报
在发起连接的 Codex 或 Claude Code 会话里说：“用 slack-bot 把测试结果同步到 #test 的绑定线程。” 当前源会话已用这一入口实测送达。
