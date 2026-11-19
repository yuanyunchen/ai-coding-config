---
id: T04/S09
from: T04
created: 2026-11-17
---
# 派发 T04/S09 selflink-io

> 先读并遵守派发协议：/Users/yuanyunchen/.claude/skills/workspace-management/references/subagent-protocol.md（第一节）。
> 你的工作目录：/Users/yuanyunchen/Desktop/AI Programing/Play for Fun/ai-coding-config/.agents/task/04-slack-agent-setup/subagent/09-selflink-io。只在本目录和下方「可写范围」内写文件。
> 结果写入本目录 result.md（frontmatter 必填 `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`，结构参照 /Users/yuanyunchen/.claude/skills/workspace-management/templates/node/result.md）：上层下一步要用的写进 result.md，只有复核才看的放本目录附件并列进「附件」。聊天最后只回一行：`<STATUS> /Users/yuanyunchen/Desktop/AI Programing/Play for Fun/ai-coding-config/.agents/task/04-slack-agent-setup/subagent/09-selflink-io/result.md`。

## 任务与背景
Implement local Unix operator transport and self-link CLI/skill entrypoint for exact CODEX_THREAD_ID context. Own src/link-control.js, scripts/link-session.js, integration skills/slack-session-link/SKILL.md and tests. No Slack writes yourself. Strict OS-owned private socket. CLI accepts #channel, channel/thread URL + optional --session ID. Use fixed current workspace. API server receives validated object {threadId,target,project?}, callback returns link + reply. Caller can invoke local helper from current coding session; document sandbox caveat. Communicate interface immediately.
Repo /Users/yuanyunchen/Desktop/AI Programing/Play for Fun/slack-codex-bridge, current Slack deploy real workspace and internal #random linked. User delegates peripheral work using Sol high; root owns core backend binding, existing session safety and service integration. Read plan.md, specs and ~/.claude/skills/ponytail/SKILL.md.

## 成功标准
Implement and test your assigned interface, return dispatch result.md + limits. No personal history/secret exposure. No recursive dispatch.

## 必读
<!-- 路径清单：.agents/memory/ 下的规范、输入材料、相关代码 -->

## 可写范围
Implement local Unix operator transport and self-link CLI/skill entrypoint for exact CODEX_THREAD_ID context. Own src/link-control.js, scripts/link-session.js, integration skills/slack-session-link/SKILL.md and tests

## 追加 2026-11-17 18:18 · 上层续派

New enhancement to own src/link-control.js, scripts/link-session.js, skills/slack-bot/SKILL.md: add --report <text> option, owner-only operation=report, optional text field bounded by protocol size, require explicit destination plus current source UUID. Existing link operation default. Support native Claude Code SKILL.md substituted session UUID as documented; preserve source-only CLI and clearly state live-channel requirement. Test in your link-control test only. I handle router and installations.
