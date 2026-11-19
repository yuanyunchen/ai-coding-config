# 本机媒体生成验证

将本机新生成的文件通过 `deliverOutputMedia` 交给测试传输对象。对象会核对收到的字节与执行项目路径字节完全一致并返回测试文件 ID。分别用 Graphviz、macOS 语音与 ffmpeg 产出图像和音频。ffprobe 实际识别到这些格式。此验证未访问生产 Slack。

| 生成方式 | ffprobe 结果 | 测试文件 ID | SHA-256 |
|---|---|---|---|
| Graphviz 渲染包含中文节点的流程图 | PNG，5854 bytes | FLOCAL1 | d3af4b715740b5abeba69722b73537e5e09fac2889083a90d322ab33f59afc1e |
| `say -v Tingting` 合成中文，再经 `ffmpeg -c:a pcm_s16le` 转为 WAV | WAV，3.202993 秒，141330 bytes | FLOCAL2 | f2ab26a470a8d112df200092e58e8a2dc7ebd3a09858f7c395c60733d82d67ea |
| `say -v Samantha` 合成英文 AIFF | AIFF，2.331973 秒，106936 bytes | FLOCAL3 | ca2cf28aecd63dd06ae9334feb442fc2fe9f4e6d0809aad323df9a410b057d67 |

独立的 Bridge 端到端测试使用本机新渲染的 PNG 与真实 PCM 波形 WAV，并从本地 HTTP 服务的 Slack 文件对象读取下载路径。这条交付链使用真实 SDK，后端模型事件与 Slack 服务为测试对象。

Slack SDK 先申请上传地址，再上传原始数据并完成上传。完成请求中的 `channel_id` 与 `thread_ts` 指定目的地，响应中的文件 ID 用于保存回执和取回文件对象。两项 API 要求 `files:write`，仓库已有该 scope。 [Slack 上传地址接口](https://docs.slack.dev/reference/methods/files.getUploadURLExternal/) · [Slack 完成上传接口](https://docs.slack.dev/reference/methods/files.completeUploadExternal/)
