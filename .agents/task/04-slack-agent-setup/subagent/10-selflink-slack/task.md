---
id: T04/S10
from: T04
created: 2026-11-17
---
# 派发 T04/S10 selflink-slack

> 先读并遵守派发协议：/Users/yuanyunchen/.claude/skills/workspace-management/references/subagent-protocol.md（第一节）。
> 你的工作目录：/Users/yuanyunchen/Desktop/AI Programing/Play for Fun/ai-coding-config/.agents/task/04-slack-agent-setup/subagent/10-selflink-slack。只在本目录和下方「可写范围」内写文件。
> 结果写入本目录 result.md（frontmatter 必填 `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`，结构参照 /Users/yuanyunchen/.claude/skills/workspace-management/templates/node/result.md）：上层下一步要用的写进 result.md，只有复核才看的放本目录附件并列进「附件」。聊天最后只回一行：`<STATUS> /Users/yuanyunchen/Desktop/AI Programing/Play for Fun/ai-coding-config/.agents/task/04-slack-agent-setup/subagent/10-selflink-slack/result.md`。

## 任务与背景
Implement Slack lookup and create-or-resolve destination interface for owner-initiated session linking. Own src/slack.js, test/slack-link.test.js. Add methods resolveLinkTarget(target), createLinkThread(channelId,text,deliveryKey) fully validated internal bot-joined channel, name/#/ID/URL support, source scope exact, arbitrary external addresses/DM forbidden. Existing transport has single active channel; allow selecting registered channel only for this first release unless you implement true multi-channel without conflicts. Return canonical root link/ts. No real Slack posts in tests.
Repo /Users/yuanyunchen/Desktop/AI Programing/Play for Fun/slack-codex-bridge, current Slack deploy real workspace and internal #random linked. User delegates peripheral work using Sol high; root owns core backend binding, existing session safety and service integration. Read plan.md, specs and ~/.claude/skills/ponytail/SKILL.md.

## 成功标准
Implement and test your assigned interface, return dispatch result.md + limits. No personal history/secret exposure. No recursive dispatch.

## 必读
<!-- 路径清单：.agents/memory/ 下的规范、输入材料、相关代码 -->

## 可写范围
Implement Slack lookup and create-or-resolve destination interface for owner-initiated session linking. Own src/slack.js, test/slack-link.test.js. Add methods resolveLinkTarget(target), createLinkThread(channelId,text,deliveryKey) fully validated internal bot-joined channel, name/#/ID/URL support, source scope exact, arbitrary external addresses/DM forbidden. Existing transport has single active channel; allow selecting registered channel only for this first release unless you implement true multi-channel without conflicts. Return canonical root link/ts. No real Slack posts in tests.
