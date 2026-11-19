---
status: DONE_WITH_CONCERNS
---
# Claude Channels 与多模态附件适配

## 结论

已实现 Claude Code 原生 Channels 的同会话输入、可见进度和结果回传。专属共享目录内启动 CLI，通过 MCP 与只限本机用户的 Unix socket 桥接。用户问题的语言优先，语言不明时使用工作区语言。Codex 与 Claude 共享附件下载、文本提取、图像解析输入及本地音频转写。交付文件位于 slack-codex-bridge。

## 验证

- Claude Code 2.1.326 在独立临时团队目录接收合成 Slack 桥接消息，现场终端显示“← team-slack: Team bridge smoke…”。本地 MCP 真协议测试确认 channel capability、通知、公开 progress/final、回传 turn ID 对应工作。
- 真实 Claude 回复被账号额度阻断。终端提示 “You've hit your weekly limit · resets Nov 18 at 11pm (America/New_York)”。已结束该测试进程，未购买额度、未向 Slack 发消息。
- 本机语音运行时安装于 ~/Library/Application Support/slack-coding-bridge/media-venv，预缓存本地多语言 tiny 模型。完整 prepareFiles 对合成语音返回 “[0.0s–1.4s] The bridge test is complete.”，未触发原生音频降级。
- node --test test/claude.test.js test/media.test.js：10 项通过，覆盖真实 stdio MCP 和 Unix socket、新旧 turn 校验、路由绑定、launcher 权限设置、HTTP 来源限制、UTF-8、PNG、PDF 页码和扫描页、Word 段落、PowerPoint 顺序、Excel 工作表/单元格、音频回退及超限提示。
- Graphviz 真实生成 PNG。Slack 文件上传调用留待真实团队频道验收。

## 需要上层处理

- Claude Channels 是研究预览，原生中断接口未公开。当前 stop 拒绝声称中断成功，操作者需在绑定终端按 Escape。适配器观察 channel 驱动的 turn，纯桌面发起的活动不会自动广播。账户额度恢复后才能复测模型生成的完整回答。
- 生产使用专用团队项目目录。启动器设置 CLI 级沙箱、文件工具不可读写项目外、禁用 unsandboxed retry、桌面 Bash 权限确认、无 Chrome、只启用该 MCP，并过滤启动环境。已测试有效参数，未获得额度运行对抗性测试。
- 附件 I/O 入/出单项默认各 24 MiB，Office 解压限 128 MiB，保护本地资源。超限按文件或页报告。若桥接异常退出，未清理临时文件可能留在专用项目的 .slack-bridge-media 下，恢复流程需遵守文件保留与隐私策略。
- 不持久缓存提取物，避免撤权后继续检索。可以在需要时按该 Slack 源文件重新读取，正常完成轮次会删除临时文件。
- 仅包含插件已验证的本机准入路径；Teams/Enterprise 的 Channels policy 必须允许该能力。

## 产物

- src/claude.js、scripts/claude-channel.js、scripts/claude-launch.js
- src/media.js、src/media-extract.py
- test/claude.test.js、test/media.test.js
- CLAUDE-MEDIA.md（启动、配对、权限、附件依赖、限制）
- 使用 skill：ponytail、workspace-management

## 写入 memory

无。

## 附件

无。
