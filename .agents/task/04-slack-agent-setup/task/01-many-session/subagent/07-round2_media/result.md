---
id: T04.01/S07
status: DONE_WITH_CONCERNS
---
# 结果 — T04.01/S07 出站媒体和格式审查

## 结论

按用户最新要求先出计划。原有测试全绿，新增本地夹具复现七项差异。夹具直接调用桥接、SQLite、Slack 载荷构建和 Graphviz，Slack HTTP 层使用本地替身。仓库文件未改，未发 Slack 消息、部署或提交。

## 需要上层处理

| 优先级 | 已复现或定位的问题 | 建议实现和验收 |
|---|---|---|
| P1 | 普通 Markdown 外层围栏中的 `bridge-diagram` 被当成执行指令，`bridge-diagram-example` 也会被匹配。原生回答的 `bridge-media` 独立解析器存在同类问题，夹具观察到普通示例被移除且返回上传声明。 | 共用围栏识别并精确匹配媒体标签。覆盖四反引号、波浪号、更长闭合、CRLF，以及未闭合或非法专用块原文不可外发。验证示例逐字保留、实际媒体只向目标线程上传一次。 |
| P1 | 原生重启恢复只排除以 `/diagram` 结尾的记录。暂未发出的 `/diagram/1` 和 `/media/image.png` 被当成正文发送，文件意图损坏。 | 使用明确的文本交付类型或与现有持久键完全匹配的白名单恢复；复用旧持久记录。构造 pending 正文、标题、通知和未知文件回执，核对只有合法正文和通知可走聊天写入。 |
| P1 | exact 自动回复及三个 operator 分支丢弃 `{ts,imageFailed}`。正文只有署名时可能无任何出站但仍报送达。手工回复对部分成功的文案一律称图未生成，也覆盖上传状态未知。该项为代码路径确认，尚缺调用级回归。 | 对 operator、exact 自动、steer 正文与进度、native 完成和重放分别断言空白、纯图、图文部分成功与无回执行为；保留实际正文链接，完成状态区分空白、已送达、渲染失败和传输未确认。 |
| P2 | 图失败通知覆盖已经收到的文字时间戳。同一正文和图重放没有重复出站，缺文件回执保持 unknown，第二张图仍正常送达。 | 单独保留正文、图标题和通知时间戳；优先使用正文或标题，只有通知时以通知回执兜底。延续数据库的未知状态隔离，补同一键并发、无正文混合图、授权撤销以及网络完成后丢响应的测试。 |
| P2 | 首行的 Markdown 署名变体会发布到公屏，包含 `**Skills used**:`、`__Used skills:__`、CRLF、BOM 和全角缩进。超过 Slack 字符预算的代码后半部分失去代码样式。正文经过多次署名过滤，危险边界在分段后再次匹配。 | 仅在完整公开回答开头识别署名，保留代码、引用及正文里的同样字样。渲染分段带着围栏上下文，用原文本验证拼接和 SQLite 回执。测试恰好跨转义预算、围栏边界和署名样式代码行。 |

并发同一文件键时，第二个调用可能见到 `sending` 后抢先发布未确认通知。源码路径成立，尚无确定性夹具。未验证真实 Slack 富文本显示和文件回执，也未验证跨版本重放的已发送内容是否需要迁移。先补本地测试，再由主任务决定授权联调范围。

## 验证

- `npm test` 基线 → 148 通过，0 失败。
- `SLACK_BRIDGE_REPO="<slack-codex-bridge 的绝对路径>" node --test regression.test.mjs` → 新增七项失败均为行为断言。其中两项在失败前已经验证已有的无重复上传、独立成功图片回执、未知状态留存和错误通知只发一次。
- 出站路径 → 核对 native agent 完成、native 进度和恢复、精确会话自动回复、owner 手工回复和进度、operator 三分支，以及公共 Slack post/update/upload。

## 产物

- 本目录内可执行的本地回归夹具和失败日志。

## 写入 memory

无。

## 附件

| 文件 | 内容 |
|---|---|
| [regression.test.mjs](./regression.test.mjs) | 七条可复现的测试。Node 和 `dot` 使用仓库的现有依赖。 |
| [regression-red.log](./regression-red.log) | 七次断言失败及实际输出。 |

使用 skill：ponytail、superpowers:systematic-debugging、superpowers:test-driven-development、superpowers:verification-before-completion
