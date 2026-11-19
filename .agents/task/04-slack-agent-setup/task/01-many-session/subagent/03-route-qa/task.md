---
id: T04.01/S03
from: T04.01
created: 2026-11-17
---
# 派发 T04.01/S03 route-qa

> 先读并遵守派发协议：/Users/yuanyunchen/.claude/skills/workspace-management/references/subagent-protocol.md（第一节）。
> 你的工作目录：/Users/yuanyunchen/Desktop/AI Programing/Play for Fun/ai-coding-config/.agents/task/04-slack-agent-setup/task/01-many-session/subagent/03-route-qa。只在本目录和下方「可写范围」内写文件。
> 结果写入本目录 result.md（frontmatter 必填 `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`，结构参照 /Users/yuanyunchen/.claude/skills/workspace-management/templates/node/result.md）：上层下一步要用的写进 result.md，只有复核才看的放本目录附件并列进「附件」。聊天最后只回一行：`<STATUS> /Users/yuanyunchen/Desktop/AI Programing/Play for Fun/ai-coding-config/.agents/task/04-slack-agent-setup/task/01-many-session/subagent/03-route-qa/result.md`。

## 任务与背景
Own test/routing-acceptance.test.js. Independent regression tests for many-to-many self-link, idempotence, user alias, thread & cross-channel isolation. SessionRouter src/routes.js interface {store,config,slack,clients,makeBridge,report}, link({backend,threadId,target}), dispatch(event). Coordinate specifics early. No other product writes.
Repo: /Users/yuanyunchen/Desktop/AI Programing/Play for Fun/slack-codex-bridge; user wants Sol high and current local coding session self-link. Read parent T04 plan & ~/.claude/skills/ponytail/SKILL.md.

## 成功标准
Return working tested deliverable and result.md in dispatch. No recursive delegation.

## 必读
<!-- 路径清单：.agents/memory/ 下的规范、输入材料、相关代码 -->

## 可写范围
Own test/routing-acceptance.test.js. Independent regression tests for many-to-many self-link, idempotence, user alias, thread & cross-channel isolation. SessionRouter src/routes.js interface {store,config,slack,clients,makeBridge,report}, link({backend,threadId,target}), dispatch(event). Coordinate specifics early. No other product writes.

## 追加 2026-11-17 18:18 · 上层续派

Live test #test now bound; new robustness acceptance: stateful progress on/off mid-turn, original owner report to chosen Slack target only, duplicate selflink and two independent groups. Test operator report route once API arrives {operation:"report",text,...} with fake transport. Your existing routing test scope unchanged. Fix specific tests to correctly cover meaningful behavior; do not alter core.
