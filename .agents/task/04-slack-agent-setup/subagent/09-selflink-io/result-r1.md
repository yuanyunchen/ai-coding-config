---
id: T04/S09
status: DONE
---
# 结果 — T04/S09 自助绑定本机入口

## 结论

- 本机 Unix 套接字仅接受已验证的 Slack 目的地和准确会话 ID。回执仅返回链接、回复指令以及显式公开的错误。macOS 检查私有目录归属、权限与 ACL，避免误连或覆盖其他进程的套接字。
- `slack-bot` 入口支持 Codex 与 Claude Code。Codex 读取 `CODEX_THREAD_ID`。Claude 必须显式选择后端，由 `CLAUDE_BRIDGE_THREAD_ID` 或 `--session` 指定准确会话，可使用默认 Claude Channel 或提供已知的绝对套接字路径。
- 技能可从两种客户端使用同一本机命令。遇到会话沙箱阻挡时，技能给出使用准确会话 ID 的本机终端路径。已经验证包含空格的路径下，可直接执行符号链接形式的 `slack-bot`。

## 需要上层处理

无。服务回调、全局技能安装与真实 Slack 联调按分工由上层负责。此派发只连接测试套接字，未操作真实 Slack。

## 验证

- `node --test test/link-control.test.js` 的本机入口、私有权限、错误过滤和会话 ID 检查通过。最终完整套件包含这 8 项。
- `npm test` 完整套件 82 项全部通过。Node 自带 SQLite 输出实验性功能提示。详见附件。
- `./scripts/link-session.js --help` 与 `node --check` 通过。

## 产物

- `slack-codex-bridge/src/link-control.js` 提供 `startLinkControl({ socketPath, onLink })`。回调请求形状为 `{threadId,target,project?,backend?,socketPath?}`。省略 `backend` 时表示 Codex。Claude 专用 `socketPath` 的归属与实际通道匹配由上层回调核验。回调返回 `{link,reply}`，通过 `publicMessage` 暴露可告知操作者的错误。
- `slack-codex-bridge/scripts/link-session.js` 提供可执行入口。主服务和入口默认使用 `~/.slack-codex-bridge/link.sock`。`LINK_CONTROL_SOCKET` 可用于本地测试覆盖，实际部署应保证两端一致。
- `slack-codex-bridge/skills/slack-bot/SKILL.md` 是供上层写入 harness 和全局安装的技能正文。
- `slack-codex-bridge/test/link-control.test.js` 是隔离的端到端入口测试。

## 写入 memory

无。

## 附件

| 文件 | 内容 | 何时查看 |
|---|---|---|
| `npm-test.log` | 完整测试输出 | 核对测试范围或追溯警告 |
