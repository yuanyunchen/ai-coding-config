---
id: T04.01/S06
from: T04.01
created: 2026-11-17
---
# 派发 T04.01/S06 exactqa

> 先读并遵守派发协议：/Users/yuanyunchen/.claude/skills/workspace-management/references/subagent-protocol.md（第一节）。
> 你的工作目录：/Users/yuanyunchen/Desktop/AI Programing/Play for Fun/ai-coding-config/.agents/task/04-slack-agent-setup/task/01-many-session/subagent/06-exactqa。只在本目录和下方「可写范围」内写文件。
> 结果写入本目录 result.md（frontmatter 必填 `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`，结构参照 /Users/yuanyunchen/.claude/skills/workspace-management/templates/node/result.md）：上层下一步要用的写进 result.md，只有复核才看的放本目录附件并列进「附件」。聊天最后只回一行：`<STATUS> /Users/yuanyunchen/Desktop/AI Programing/Play for Fun/ai-coding-config/.agents/task/04-slack-agent-setup/task/01-many-session/subagent/06-exactqa/result.md`。

## 任务与背景
Evaluate Codex app-server exact existing thread direct send and constrained Slack turns; verify synthetic direct existing shared conversation test with NO private tools or credentials. Own test/exact-thread.test.js, document safe feasible approach ASAP. I own production changes. No real Slack posts. Repo /Users/yuanyunchen/Desktop/AI Programing/Play for Fun/slack-codex-bridge. User wants genuine current session connected to Slack #test, all internal members, scoped only Slack replies, no canned messages, Chinese/English per input. Core by main.

## 成功标准
Actual tests and evidence, result.md in dispatch. Read ~/.claude/skills/ponytail/SKILL.md. No commits, further delegation, production posts or deploys.

## 必读
<!-- 路径清单：.agents/memory/ 下的规范、输入材料、相关代码 -->

## 可写范围
Evaluate Codex app-server exact existing thread direct send and constrained Slack turns; verify synthetic direct existing shared conversation test with NO private tools or credentials. Own test/exact-thread.test.js, document safe feasible approach ASAP. I own production changes. No real Slack posts.

## 追加 2026-11-17 19:46 · 上层续派

Validate thread/sample as the exact-thread answering primitive. Use synthetic local isolated Codex model/MCP fixture; confirm inherited history & same sourceTurnId, show that a requested tool call is not executed by the sample (null/error, no marker invocations). Own test/exact-thread.test.js only. Sol high. No live Slack writes. Original native source latest sample already returned SAME_THREAD_OK in root's live probe.

## 追加 2026-11-17 20:08 · 上层续派

New user steering: Slack interruptions should send a native turn/steer signal into an already active original turn, answer in Slack from same thread sample promptly, continue original work. Root implements production and unit tests. Independently run isolated live app-server/loopback proof for turn/steer + thread/sample + continuation, no credentialed Slack posts. Verify same thread+turn, no separate turn, original completion, no injection of raw untrusted Slack text into private active tools. Own only a smoke script or additional test in test/exact-thread.test.js and dispatch result.md. Sol high.

## 追加 2026-11-17 20:17 · 上层续派

复用上轮真实 app-server 测试，验证 owner 的 Slack 正文进入正在运行的同一个 turn，模型依次发回复 helper 的真实 shell tool 调用、等待它完成、再继续原来的工具及同一回合。可用模拟模型和模拟 Slack，只写你的 06-exactqa 派发目录；协调等主进程实现后再用，预计协议 SessionRouter.dispatch；helper 形如 slack-bot steer-UUID --report=文本。找不到 Codex 内的 shell 工具时先完成独立协议层用例。不要访问真实 Slack 或开新服务。
