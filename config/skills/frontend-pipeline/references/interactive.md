# interactive · 交互应用 / dashboard

有 state、组件交互、多视图。dashboard、admin panel、wizard、可交互 demo。

## 触发信号

- 关键词:dashboard / admin / SaaS / wizard / 多步表单 / prototype / 可交互 demo
- 上下文:state / 登录 / 多视图 / shadcn / 组件交互
- 反信号:纯展示无状态 → `web`;固定排版出 PDF → `pdf`

## 分支:应用 vs 生成艺术(先判断)

- **应用/交互路线(默认)**:dashboard、admin、wizard、可交互 demo —— 走下面的「构建工具选择 + 三档工作流」。
- **生成艺术分支(`algorithmic-art`)**:p5.js 算法/生成艺术 —— flow field、粒子系统、noise、"用代码做艺术"。命中时**不走**下面三档(fd-pro→uux 不适用于生成艺术),改用 `algorithmic-art` 的完整工作流:
  - 触发:generative art / 生成艺术 / 算法艺术 / flow field / 粒子系统 / noise / p5.js / 用代码做艺术
  - 工作流:读 `skills/algorithmic-art/SKILL.md`,按其「算法哲学(.md)→ p5.js 实现」两步完整执行;**必须先读** `skills/algorithmic-art/templates/viewer.html` 作为 HTML 起点(保留其结构与品牌、只替换算法与参数控件);产物为单文件交互 HTML
  - 验证:按 `verification.md`「艺术产物验证」清单(轻量,不套设计系统清单),走验证循环(测试→反思→规划→执行,≤3 轮)
  - 成本:~12–20K tok · 5–12 min

## 构建工具选择

- **默认 CDN 单文件 React**(esm.sh):零构建、零依赖,覆盖绝大多数交互(modal/carousel/form/图表)。
- **`web-artifacts-builder`(仅按需)**:确实需要 shadcn/ui 整套组件,或多路由 SPA,或复杂 state/路由 时才触发。

## 三档工作流

### 简单(不验证)
- 链路:`frontend-design-pro` + CDN 单文件 React(或简单 vanilla JS)
- 构建:单文件,小 demo / 单视图少量交互
- 验证:无
- 成本:~8–12K tok · 3–6 min

### 简单 + 验证(默认)
- 同上构建
- 验证:普通验证 + interactive 专属项(见 `verification.md`),走验证循环(测试→反思→规划→执行,≤3 轮)
- 成本:~10–15K tok · 4–8 min

### 复杂 + 验证
- 链路(完整调用,见 SKILL.md「复杂档:完整调用子 skill」):
  1. `frontend-design-pro` 完整 —— 读 `skills/frontend-design-pro/SKILL.md`,定美学/视觉方向
  2. `ui-ux-design-pro` 完整 —— 读 `skills/ui-ux-design-pro/SKILL.md`(含 references + CLI),做设计系统/组件规范/可用性优化
  3. (需要 shadcn/多路由/重状态时)`web-artifacts-builder` —— 读 `skills/web-artifacts-builder/SKILL.md`(React + Tailwind + shadcn → bundle.html)
- 构建:多视图、组件库、状态管理
- 验证:高质量验证 + interactive 专属项(见 `verification.md`),写关键交互脚本,走验证循环(测试→反思→规划→执行,≤5 轮,极致优化、必要时大规模重构)
- 成本:~35–55K tok · 18–35 min(完整调用子 skill)

## 升降档规则
- 升复杂:dashboard/admin/SaaS、多视图、需要 shadcn、需要回归测试
- 降简单不验证:用户明确要"快速/原型"

> 验证清单见 `verification.md`。
