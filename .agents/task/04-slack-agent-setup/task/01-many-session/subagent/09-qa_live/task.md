---
id: T04.01/S09
from: T04.01
created: 2026-11-17
---
# 派发 T04.01/S09 qa_live

> 先读并遵守派发协议：/Users/yuanyunchen/.claude/skills/workspace-management/references/subagent-protocol.md（第一节）。
> 你的工作目录：/Users/yuanyunchen/Desktop/AI Programing/Play for Fun/ai-coding-config/.agents/task/04-slack-agent-setup/task/01-many-session/subagent/09-qa_live。只在本目录和下方「可写范围」内写文件。
> 结果写入本目录 result.md（frontmatter 必填 `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`，结构参照 /Users/yuanyunchen/.claude/skills/workspace-management/templates/node/result.md）：上层下一步要用的写进 result.md，只有复核才看的放本目录附件并列进「附件」。聊天最后只回一行：`<STATUS> /Users/yuanyunchen/Desktop/AI Programing/Play for Fun/ai-coding-config/.agents/task/04-slack-agent-setup/task/01-many-session/subagent/09-qa_live/result.md`。

## 任务与背景
<!-- 要做什么、为什么；背景讲够，子智能体不继承你的上下文 -->

## 成功标准
进行真实 Slack Web 浏览器验收，独立覆盖已授权 #test、所有者中文 @、英文线程追问、截图、架构图预览及沉默侧聊；仅在一个新测试线程内操作，不替换绑定。先验证浏览器可用，待主 agent 通知灰度再发消息，收回证据并控制测试噪声。只用 Chrome 插件或可用的浏览器自动化接口，禁止屏幕遥控网页、读取凭证或私有 token。查看其他真实角色账号是否可用，不可用如实标待验。可写范围为本派发目录和其中的脚本、result.md；不可修改 bridge 或线上设置。必读 ~/.codex/skills/ponytail/SKILL.md、slack-codex-bridge/AGENTS.md。在等待部署时准备双角色盲评中的 QA 量表及 24 个案例并告知主 agent 路径。

## 必读
<!-- 路径清单：.agents/memory/ 下的规范、输入材料、相关代码 -->

## 可写范围
- 本目录
<!-- 其他可写路径；可写的 memory 文件（新建一律标 status: draft） -->
