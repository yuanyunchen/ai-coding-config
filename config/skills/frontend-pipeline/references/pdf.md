# pdf · 报告 / 海报

无交互、固定排版、最终产物是 PDF 或图片。报告、白皮书、海报、信息图。路线:print-friendly HTML → 渲染成 PDF/图片。

不允许:WeasyPrint(反模式);不允许直接生成 PDF 二进制。

## 触发信号

- 关键词:PDF / 报告 / 白皮书 / 海报 / 信息图 / infographic / annual report / 招股书摘要
- 上下文:A4 / A3 / Letter / 横版 / 竖版 / 打印 / 印刷 / 分页
- 反信号:交互/链接跳转/表单 → `web` 或 `interactive`

## 分支:数据报告 vs 艺术海报(先判断)

- **数据/报告路线(默认)**:报告、白皮书、信息图、数据海报 —— 走下面的「HTML → PDF 工具 + 三档工作流」(fd-pro→uux 的 print-friendly HTML → PDF)。
- **艺术海报分支(`canvas-design`)**:纯视觉艺术作品 —— 美术馆/杂志级海报、艺术 print、90% 视觉 10% 文字、无数据图表。命中时**不走**下面三档,改用 `canvas-design` 的完整工作流:
  - 触发:艺术海报 / poster art / 视觉作品 / 美术馆级 / 杂志封面 / 纯视觉极简文字 / 平面艺术
  - 工作流:读 `skills/canvas-design/SKILL.md`,按其「设计哲学(.md)→ canvas 表达」两步完整执行;字体从 `skills/canvas-design/canvas-fonts/` 取;产物为 PNG 或 PDF
  - 验证:按 `verification.md`「艺术产物验证」清单(轻量,不套设计系统清单),走验证循环(测试→反思→规划→执行,≤3 轮)
  - 成本:~12–20K tok · 5–12 min

## HTML → PDF 工具

`webapp-testing`(Playwright)的 `page.pdf()` + `page.screenshot()`,与验证同栈、零新依赖。

## 三档工作流

### 简单(不验证)
- 链路:`frontend-design-pro`(print-friendly 美学)
- 构建:print-friendly HTML(`@page` CSS,A4/A3/Letter)
- 验证:无(直接出 PDF)
- 成本:~6–10K tok · 2–4 min

### 简单 + 验证(默认)
- 同上构建 → Playwright 出 PDF
- 验证:普通验证 + pdf 专属项(见 `verification.md`),走验证循环(测试→反思→规划→执行,≤3 轮)
- 成本:~8–12K tok · 3–5 min

### 复杂 + 验证
- 链路(完整调用,见 SKILL.md「复杂档:完整调用子 skill」):
  1. `frontend-design-pro` 完整 —— 读 `skills/frontend-design-pro/SKILL.md`,做 print-friendly 的版面/视觉设计
  2. `ui-ux-design-pro` 完整 —— 读 `skills/ui-ux-design-pro/SKILL.md`(含 references + CLI),对版面做排版/信息层级/对比度优化与 audit
- 构建:高级排版 HTML(多页/分栏、数据可视化,`@page` 控制尺寸与分页)
- 验证:高质量验证 + pdf 专属项(见 `verification.md`),`page.pdf()` + 多页 review,走验证循环(测试→反思→规划→执行,≤5 轮,极致优化、必要时大规模重构)
- 成本:~30–50K tok · 15–30 min(完整调用两个子 skill)

## 升降档规则
- 升复杂:年报/营销级海报/多页报告/显式质量词
- 降简单不验证:用户明确要"快速/草稿"

> 验证清单见 `verification.md`(pdf 专属项已列)。
