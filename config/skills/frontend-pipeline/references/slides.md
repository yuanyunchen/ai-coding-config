# slides · 演示 / 幻灯片

演示文稿:16:9、一页一概念、有翻页导航。deck、pitch、技术分享、汇报。`theme-factory` 主导视觉一致性。

## 触发信号

- 关键词:slides / 幻灯片 / deck / 演示文稿 / pitch / 汇报 / 演讲 / PPT
- 上下文:16:9 / 翻页 / 一页一点 / presenter / 分章节
- 反信号:固定单页报告/海报 → `pdf`;长文档 → 不在本 pipeline 范围

## 三档工作流

### 简单(不验证)
- 链路:`theme-factory` 选预设主题 + 单 HTML 分页(每页一 section,16:9)
- 构建:单文件 HTML(CDN Tailwind),键盘/点击翻页
- 验证:无
- 成本:~6–10K tok · 2–4 min

### 简单 + 验证(默认)
- 同上构建
- 验证:普通验证 + slides 专属项(见 `verification.md`),逐页截图,走验证循环(测试→反思→规划→执行,≤3 轮)
- 成本:~9–13K tok · 3–6 min

### 复杂 + 验证
- 链路(完整调用,见 SKILL.md「复杂档:完整调用子 skill」):
  1. `frontend-design-pro` 完整 —— 读 `skills/frontend-design-pro/SKILL.md`,定视觉方向与母版风格
  2. `ui-ux-design-pro` 完整 —— 读 `skills/ui-ux-design-pro/SKILL.md`(含 references + CLI),优化内容密度/信息层级/对比度
  3. `theme-factory` 统一主题 —— 读 `skills/theme-factory/SKILL.md`(slides 的主视觉一致性 skill)
- 构建:多页打磨、统一母版、图表(Chart.js CDN 可选)
- 验证:高质量验证 + slides 专属项(见 `verification.md`),逐页 review,走验证循环(测试→反思→规划→执行,≤5 轮,极致优化、必要时大规模重构) → 可导出 PDF
- 成本:~30–48K tok · 15–28 min(完整调用子 skill)

## 升降档规则
- 升复杂:对外 pitch / 投资人 / 正式汇报 / 多章节 / 需要图表
- 降简单不验证:用户明确要"快速/草稿"

> 验证清单见 `verification.md`(slides 专属项已列)。
