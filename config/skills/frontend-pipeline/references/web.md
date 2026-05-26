# web · 公开静态网页

落地页、营销页、portfolio、品牌站、活动页。访客一次性浏览、视觉重于交互、移动端必须可用。

## 触发信号

- 关键词:landing page / 落地页 / 营销页 / portfolio / 作品集 / 品牌站 / 活动页 / official site
- 上下文:hero / sections / CTA / footer / nav / SEO / 面向访客
- 反信号:state/登录/dashboard → `interactive`;PDF/打印 → `pdf`

## 三档工作流

### 简单(不验证)
- 链路:`frontend-design-pro` 选 1 种美学(优先轻档:Minimalism/Swiss · Brutalism · Dark OLED)
- 构建:单文件 HTML/CSS(CDN Tailwind 可选)
- 验证:无
- 成本:~5–8K tok · 1–3 min

### 简单 + 验证(默认)
- 同上构建
- 验证:普通验证(见 `verification.md`),走验证循环(测试→反思→规划→执行,≤3 轮)
- 成本:~7–10K tok · 2–4 min

### 复杂 + 验证
- 链路(完整调用,见 SKILL.md「复杂档:完整调用子 skill」):
  1. `frontend-design-pro` 完整 —— 读 `skills/frontend-design-pro/SKILL.md`,选定美学,做出版面/视觉设计
  2. `ui-ux-design-pro` 完整 —— 读 `skills/ui-ux-design-pro/SKILL.md`(含它要求的 references + CLI generate/audit),对上一步产物做设计系统级优化
  3. (可选)`theme-factory` 统一主题 —— 读 `skills/theme-factory/SKILL.md`
- 构建:单 HTML;有交互组件(modal/carousel/form)时按 `interactive.md` 判断是否升级工具
- 验证:高质量验证(见 `verification.md`),走验证循环(测试→反思→规划→执行,≤5 轮,极致优化、必要时大规模重构)
- 成本:~30–55K tok · 15–30 min(完整调用两个子 skill,比纯 CLI 路径贵)

## 升降档规则
- 升复杂:production/客户用/投资人/打磨/premium、多页面、需严格 design system
- 降简单不验证:用户明确要"快速/草稿"

> 验证清单见 `verification.md`。
