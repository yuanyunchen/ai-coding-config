---
id: T04.01/S05
status: DONE_WITH_CONCERNS
---
# 结果 — T04.01/S05 媒体交付

## 结论

交付了执行会话生成媒体的线程内上传和回执。桥接从模型最终答复提取 `bridge-media` 声明，仅上传本请求私有输出目录中的实际图片和音频文件。普通文件名、生成教程等文字按正常回复处理。Slack 返回文件 ID 后才记录送达。拒绝可安全重试，结果不明则阻止自动重发。

- `prepareOutputMedia(project, messageId)` 创建并返回 `.slack-bridge-output/<UUID>/` 的绝对路径。目录权限为 0700。
- `extractOutputMedia(text)` 返回 `{body, files, invalid}`。声明格式为 `{"files":[{"path":"result.png","title":"可选标题"}]}`，仅允许文件名。解析时移除内部标记。
- `deliverOutputMedia({store, slack, scope, id, project, messageId, files, authorize})` 返回 `{sent,failed}`。成功项含 `filename,fileId`，失败项含 `filename,state,error`。`authorize()` 在每个新上传前重新核验可见范围。持久化键为 `${id}/media/${filename}`。上传接口为 `slack.upload(scope.threadTs, {filename,bytes}, title)`。
- 文件头校验覆盖 PNG、JPEG、GIF、WebP、WAV、AIFF、MP3、M4A、AAC、FLAC、Ogg 和 Opus。文件必须是本请求私有目录里的普通文件，拒绝绝对路径、父目录跳转、子目录、软链接、硬链接和文件头不匹配。Slack SDK 在内存组装上传，每个文件超过 24 MiB 明确报错。

## 需要上层处理

1. 端到端测试使用本地 Slack HTTP 测试服务与模拟 Codex 事件。文件确实在本机生成，测试通过真实 SDK 上传和 HTTP 下载核对字节。生产 Slack 文件对象和当前隔离执行会话的原生图像生成仍需上层预约验收，未对 Slack 生产发送。
2. 上层桥接目前根据消息里的媒体关键词才开放输出目录。建议覆盖依赖上下文或无既定关键词的生成请求，例如“做一张周报封面”。模块可用于任何已授权的 Slack 请求，无上述词表约束。

## 验证

- `node --test test/output-media.test.js` → 8/8 通过。覆盖上传、去重、损坏与越界文件、本地大小上限、撤权、无回执、明确拒绝后安全重试。
- 本地端到端桥接测试 → PNG 和 WAV 从 Slack 文件对象下载后逐字节相同。两次不同请求生成同名 PNG，两者的文件 ID 和内容不同。仅含附件声明的回复没有文字占位。描述文件的回复只发文字。文件完成接口返回 `fatal_error` 时没有文件回执，且重复完成事件未重传。
- `npm test` → 123/123 通过。 `git diff --check` 以及两个新增文件的 `node --check` → 通过。
- 本机生成语音 → macOS `say` 直接合成 Tingting 中文与 Samantha 英文。经过交付验证，ffprobe 可识别中文 WAV 3.202993 秒和英文 AIFF 2.331973 秒。Graphviz 确实渲染 PNG。详细文件和 SHA-256 见附件。
- 本机 Codex 检查 → `codex features list` 显示原生 `image_generation` 功能已开启，实验协议中 `imageGeneration` 有 `savedPath`，`localAudio` 属于输入。入站图片查看与 Whisper 转写独立于生成，现有输出通道只上传实际二进制文件。

## 产物

- `slack-codex-bridge/src/output-media.js`
- `slack-codex-bridge/test/output-media.test.js`

## 写入 memory

无。

## 附件

| 文件 | 内容 | 何时查看 |
|---|---|---|
| [test.log](test.log) | 测试全量原始输出 | 复核交付 |
| [local-generation.md](local-generation.md) | 本机图像及中英文语音生成证据 | 区分生成、转写和上传 |
