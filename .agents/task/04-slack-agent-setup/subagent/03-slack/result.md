---
id: T04/S03
status: DONE_WITH_CONCERNS
---
# Slack Socket Mode 接入

## 结论

实现了 Bolt Socket Mode 接收器、真实 Slack Web API 发送/更新/上传、安装 manifest 与 CLI hook。启动时核验 token 所属机器人和组织。入站按 workspace、频道、用户类别校验，拒绝外部共享频道、访客和其他 bot；本人在授权频道显式发送一次性 connect 指令可激活待配对应用。未指定频道前不会自动选择频道或收集群聊。处理事件成功才发送 transport ACK，模型执行应由主控制器后台排队。普通讨论和附件引用、消息修订/删除、bot 回流均按独立事件进入记忆，bot 回流不会唤醒 agent。

## 需要上层处理

- 主控制器应逐段记录发送回执，chat.postMessage 的可选 deliveryKey 与 bot 回流可用于对账。图解以文件 ID 为成功依据。
- 暂无真实目标频道和第二名内部成员可做真实收发测试。未代表用户发送消息。实际确认延迟包含权限查询与 Slack 限流，尚无 p95 数据。
- 收件只覆盖 app 已获授权、进入频道后 Slack 实际送达的事件。没有自动全量历史回填。权限不明或文件 shares 没有目标频道时拒绝读取。
- Slack 频道变为外部共享或失去 bot 会籍后，首次相关访问触发 revoke 并停止后续投递。消息上传成功但网络中断需按文件回执核对。
- 回答语言由 bridge 决定；本适配器只在标准化时移除 bot 自身 @ 标记，保留用户文本、Unicode 及其他成员标记。

## 验证

- node --test test/slack.test.js 验证 10 组用例，覆盖 Socket ACK、访问边界、权限缺失时分页、文件二次授权、启用和发言、删除与回执、Unicode 长消息、双订阅事件与 bot 自身 @。
- slack manifest validate --app A0CJMTC8BEE --skip-update --no-color 返回 App Manifest Validation Result: Valid。
- 使用内存测试替身验证 SDK 调用形态；真实 Slack 用户消息、重试延迟、附件上传由团队内联调验证。

## 产物

slack-codex-bridge/src/slack.js、test/slack.test.js、manifest.json、.slack/hooks.json。

## 写入 memory
无。
## 附件
无。
