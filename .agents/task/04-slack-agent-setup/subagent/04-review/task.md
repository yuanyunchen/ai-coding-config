---
id: T04/S04
from: T04
created: 2026-11-17
---
# 派发 T04/S04 review

> 先读并遵守派发协议：/Users/yuanyunchen/.claude/skills/workspace-management/references/subagent-protocol.md（第一节）。
> 你的工作目录：/Users/yuanyunchen/Desktop/AI Programing/Play for Fun/ai-coding-config/.agents/task/04-slack-agent-setup/subagent/04-review。只在本目录和下方「可写范围」内写文件。
> 结果写入本目录 result.md（frontmatter 必填 `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`，结构参照 /Users/yuanyunchen/.claude/skills/workspace-management/templates/node/result.md）：上层下一步要用的写进 result.md，只有复核才看的放本目录附件并列进「附件」。聊天最后只回一行：`<STATUS> /Users/yuanyunchen/Desktop/AI Programing/Play for Fun/ai-coding-config/.agents/task/04-slack-agent-setup/subagent/04-review/result.md`。

## 任务与背景
Fresh whole-system review of Slack coding agent bridge in sibling slack-codex-bridge directory. Read parent plan.md, deliverables/memory-design.md, ~/.claude/skills/ponytail/SKILL.md and sibling repo code. Real Slack app installed and waiting for enrollment. Code may be finishing. Focus security (team scope, Codex & Claude data exposure), delivery & recovery, ordering, multilingual handling, latency and coverage. Inspect native code only, no live Slack messages, no secrets, don't edit product. Do not run offensive tests.

## 成功标准
Prioritized concrete findings with file/line, behavior, recommended minimal fix. Confirm tests observed, distinguish live integration. Write result.md in this dispatch as required, send urgent findings as discovered. Review integration and final tests toward end.

## 必读
<!-- 路径清单：.agents/memory/ 下的规范、输入材料、相关代码 -->

## 可写范围
- 本目录
<!-- 其他可写路径；可写的 memory 文件（新建一律标 status: draft） -->
