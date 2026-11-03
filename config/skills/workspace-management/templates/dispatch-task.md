---
id: {id}
from: {parent}
created: {date}
---
# 派发 {id} {title}

> 先读并遵守派发协议：{protocol}（第一节）。
> 你的工作目录：{dir}。只在本目录和下方「可写范围」内写文件。
> 结果写入本目录 result.md（frontmatter 必填 `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`，结构参照 {result_template}）：上层下一步要用的写进 result.md，只有复核才看的放本目录附件并列进「附件」。聊天最后只回一行：`<STATUS> {dir}/result.md`。

## 任务与背景
{body}

## 成功标准
<!-- 可检验的完成条件 -->

## 必读
<!-- 路径清单：.agents/memory/ 下的规范、输入材料、相关代码 -->

## 可写范围
- 本目录
<!-- 其他可写路径；可写的 memory 文件（新建一律标 status: draft） -->
