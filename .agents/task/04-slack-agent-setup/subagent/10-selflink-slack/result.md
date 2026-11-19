---
id: T04/S10
status: DONE
---
# 结果 — T04/S10 Slack 目的地与多频道传输

## 结论

频道可通过名称、#名称、ID 或 Slack 官方频道链接选择。消息链接只返回 Slack 验证过的线程根坐标，带 `thread_ts` 的回复地址也核实回复与根的关系。解析阶段只返回坐标。注册及实际调用都会复核工作区和机器人频道成员身份。DM、群组 DM、归档频道、Slack Connect、跨工作区共享和外部链接均被拒绝。

频道注册后，事件、历史、文件、回复、更新和上传都按频道独立核验。同一时间戳在不同频道不会使传输混用频道。并发撤权会阻止尚在等待作者校验的入站消息。旧的首次频道注册和单频道调用仍可用。

## 接入契约

- `createSlack({ channelId, channelIds, ... })` 用旧频道和持久注册的频道 ID 初始化。单频道兼容入口默认使用原频道。
- `resolveLinkTarget(target)` 返回 `{ teamId, channelId }`，已有根额外返回 `{ threadTs, permalink }`。
- `registerChannel(channelId)` 复核并激活该频道，仅影响进程运行期。由本地 owner 控制入口调用，服务层负责持久化并启动对应频道的历史处理。
- `createLinkThread(channelId, text, deliveryKey)` 要求已注册频道，返回 `{ threadTs, permalink }`。请求以发件元数据保留 delivery key，遇不确定写入仍交给调用方对账，不自动重新提交。
- `historyScopes()` 列出所有活跃作用域，`forChannel(channelId)` 固定作用域。原顶层历史、文件和发送方法也接受末位频道 ID。首次通过 Slack 注册的回调为 `onConnection(true, enrolledAt, channelId)`。
- 支持同工作区 `/archives/{channel}`、`/archives/{channel}/p…` 和 `https://app.slack.com/client/{team}/{channel}`。中性 `app.slack.com` 的 archives 路径通过当前已验证的工作区 API 核验。返回的规范链接使用 Slack 身份返回的工作区域名。 [Slack 频道 URL](https://slack.com/help/articles/221769328-Locate-your-Slack-URL-or-ID) · [消息 permalink](https://docs.slack.dev/reference/methods/chat.getPermalink/)

## 需要上层处理

无该派发遗留。服务层接入与真实 Slack 验证由上层任务处理。

## 验证

- `node --test test/slack-link.test.js` → 12 通过，覆盖地址与根验证、收据范围、频道与作者隔离、文件撤权及并发撤权。
- `npm test` → 81 通过，0 失败。Slack 客户端在本派发测试中全部模拟。
- `node --check src/slack.js` 和 `node --check test/slack-link.test.js` → 通过。

## 产物

- [Slack 传输](</Users/yuanyunchen/Desktop/AI Programing/Play for Fun/slack-codex-bridge/src/slack.js>)
- [Slack 目的地和隔离测试](</Users/yuanyunchen/Desktop/AI Programing/Play for Fun/slack-codex-bridge/test/slack-link.test.js>)

## 写入 memory

无。

## 附件

无。
