---
id: T04.01/S10
from: T04.01
created: 2026-11-18
---
# 派发 T04.01/S10 quality

> 先读并遵守派发协议：/Users/yuanyunchen/.claude/skills/workspace-management/references/subagent-protocol.md（第一节）。
> 你的工作目录：/Users/yuanyunchen/Desktop/AI Programing/Play for Fun/ai-coding-config/.agents/task/04-slack-agent-setup/task/01-many-session/subagent/10-quality。只在本目录和下方「可写范围」内写文件。
> 结果写入本目录 result.md（frontmatter 必填 `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`，结构参照 /Users/yuanyunchen/.claude/skills/workspace-management/templates/node/result.md）：上层下一步要用的写进 result.md，只有复核才看的放本目录附件并列进「附件」。聊天最后只回一行：`<STATUS> /Users/yuanyunchen/Desktop/AI Programing/Play for Fun/ai-coding-config/.agents/task/04-slack-agent-setup/task/01-many-session/subagent/10-quality/result.md`。

## 任务与背景
为当前候选实现做24组中英文多轮质量测试，两名独立评审评分。阅读同层09-qa_live中的qa-cases.md、qa-rubric.md和qa-key.md；实际模型生成候选，不手写金标准答案充当模型输出。使用本地已授权的 Codex 真实模型，优先受限/只读、本地夹具，不能写入真实 Slack。控制条件、样本来源和限制明确。可用同一次或分批真实模型评估，但不要让模型看到判分键或分数，保留候选原文。先交出 anonymized candidates + mapping，再由主 agent 派两位独立盲评；本角色不判最终质量。

## 成功标准
每案例实际候选输出，含中英各角色与多轮，标明真实/模拟边界、未产生/无回执单列。

## 必读
<!-- 路径清单：.agents/memory/ 下的规范、输入材料、相关代码 -->

## 可写范围
本派发目录及独立脚本；不要改运行服务或仓库源文件。读 ~/.codex/skills/ponytail/SKILL.md；可拆解执行，不需要消耗实际 Slack。
