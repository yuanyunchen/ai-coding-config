---
id: T04.01/S07
from: T04.01
created: 2026-11-17
---
# 派发 T04.01/S07 round2_media

> 先读并遵守派发协议：/Users/yuanyunchen/.claude/skills/workspace-management/references/subagent-protocol.md（第一节）。
> 你的工作目录：/Users/yuanyunchen/Desktop/AI Programing/Play for Fun/ai-coding-config/.agents/task/04-slack-agent-setup/task/01-many-session/subagent/07-round2_media。只在本目录和下方「可写范围」内写文件。
> 结果写入本目录 result.md（frontmatter 必填 `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`，结构参照 /Users/yuanyunchen/.claude/skills/workspace-management/templates/node/result.md）：上层下一步要用的写进 result.md，只有复核才看的放本目录附件并列进「附件」。聊天最后只回一行：`<STATUS> /Users/yuanyunchen/Desktop/AI Programing/Play for Fun/ai-coding-config/.agents/task/04-slack-agent-setup/task/01-many-session/subagent/07-round2_media/result.md`。

## 任务与背景
检查图文拆分、部分成功、上传丢回执、重复发送、公开前缀变体与代码示例；写实际回归并修复可复现问题。负责 src/slack-answer.js、src/slack-format.js 以及相关测试，避免更改路由。检查所有实际出站路径，必要时通知主 agent。
仓库 ../slack-codex-bridge（同级），阅读其 AGENTS.md、本机 ~/.codex/skills/ponytail/SKILL.md 和本派发 task.md。用户要求继续系统性审查测试，Sol high 并行。本地夹具，不发送真实 Slack 消息，不部署或提交。最终提供用例、证据、未验边界到 result.md。

## 成功标准
每个新验证点有可重复测试与验证结果；修复复现的缺陷，保留原有可靠行为。
<!-- 可检验的完成条件 -->

## 必读
<!-- 路径清单：.agents/memory/ 下的规范、输入材料、相关代码 -->

## 可写范围
- 本目录
<!-- 其他可写路径；可写的 memory 文件（新建一律标 status: draft） -->

成功标准：以本地可重复回归验证任务描述的每个边界，复现的问题修复后变绿，并写入 result.md。

## 追加 2026-11-17 23:50 · 上层续派

实施已批准，明确追加可写范围：/Users/yuanyunchen/Desktop/AI Programing/Play for Fun/slack-codex-bridge/src/{slack-answer,slack-format,output-media,bridge,slack}.js，必要的新共享 fence 模块、对应 test/*.test.js 和派发目录。修复全部七个夹具及兼容性；operator 与 exact 返回值由主 agent 负责。不要发送外部消息/部署/提交。
