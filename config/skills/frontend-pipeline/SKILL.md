---
name: frontend-pipeline
description: "从头创作有设计感前端产物的统一入口:网页/落地页(web)、设计型 PDF——报告/海报/信息图(通用 PDF 读取/合并/填表用 pdf skill)、交互应用/dashboard(interactive)、幻灯片(slides)、生成/算法艺术(p5.js)与视觉艺术海报。先识别类型,再按 effort 档位路由到底层设计能力并管理验证。Entry point for creating designed frontend artifacts from scratch (web, design PDFs, interactive apps, slides, generative art)."
---

# frontend-pipeline

前端任务的统一调度入口。它本身**只做路由**:识别产物类型、选定 effort 档位、声明计划、再加载对应的 `references/{type}.md` 执行。具体工作流不写在这里,下沉到 references。

## 唯一入口原则

本 skill 是前端任务的规范入口。底层能力(美学方向、设计系统、主题、复杂 artifact 构建、浏览器验证)以**完整内部子 skill** 的形式 copy 在 `skills/` 下,由本 skill 编排调用。为什么:统一入口能在动手前就声明类型/档位/成本,避免 agent 各自挑 skill 导致路由错档、成本失控;自包含也保证不依赖外部 skill 是否存在。

调用子 skill 时,读 `skills/<name>/SKILL.md`(它们是与原始完全一致的完整副本)并按其原始流程执行。子 skill 嵌套在本目录内,不会被 harness 当作独立 skill 发现,因此天然不对外暴露——无需也未改动它们的 frontmatter。

> 内部子 skill 清单见本文件末尾。

## 路由流程

### Step 1 · 识别类型(4 选 1)

| 类型 | 是什么 | 典型触发 |
|---|---|---|
| `web` | 公开访问的静态网页 | 落地页、营销页、portfolio、品牌站、活动页 |
| `pdf` | 无交互、固定排版、最终交付 PDF/图片 | 报告、白皮书、海报、信息图(HTML → PDF) |
| `interactive` | 有状态、组件交互、多视图 | dashboard、admin、wizard、可交互 demo |
| `slides` | 演示文稿,16:9、一页一概念、可翻页 | deck、pitch、技术分享、汇报 |

**反信号纠偏**:提到 state/登录/dashboard → 改 `interactive`;提到 PDF/打印/A4 → 改 `pdf`;提到翻页/演讲/slide → 改 `slides`。

**艺术分支**:两类「艺术」任务不走常规设计链(fd-pro→uux),而在所属类型里改用专门子 skill 的完整流程——
- 生成/算法艺术(p5.js、flow field、粒子、noise、"用代码做艺术")→ 归 `interactive`,走 `algorithmic-art` 分支(见 `references/interactive.md`)。
- 纯视觉艺术海报(美术馆/杂志级、90% 视觉 10% 文字、非数据报告)→ 归 `pdf`,走 `canvas-design` 分支(见 `references/pdf.md`)。

### Step 2 · 识别档位(默认「简单 + 验证」)

| 档位 | 何时 | 验证(标准见 `references/verification.md`) |
|---|---|---|
| 简单(不验证) | 用户明确要"快速/草稿/不用测" | 无 |
| **简单 + 验证(默认)** | 默认走这档 | 普通验证 |
| 复杂 + 验证 | 出现高质量信号:`production`/客户用/投资人/打磨/`premium`/senior-level,或结构复杂 | 高质量验证 |

### Step 3 · 声明路由

执行前先用一句话声明:**「本次走 {类型} 类型 + {档位},预计 ~{Z} tokens、~{N} min」**。这能避免路由错档导致成本暴增。

### Step 4 · 加载对应 reference

读 `references/{类型}.md`,按其中对应档位的链路执行。

## 复杂档:完整调用子 skill

复杂+验证档调用子 skill 时,**读它的原始 `SKILL.md` 并完整执行其流程,与单独使用该 skill 完全一致**——不要用本仓库 references 里的概述替代原始流程,也不要只取它的 CLI 输出而跳过它要求读的文档。为什么:复杂档的质量正来自子 skill 的完整方法论(如 ui-ux-design-pro 强制先读的 reference 文档);只吃 CLI token 表会丢掉这部分判断。

复杂档的标准顺序:**先 `frontend-design-pro`(完整,做版面/视觉设计)→ 再 `ui-ux-design-pro`(完整,做设计系统级优化与 audit)**。

## references 索引

- `references/web.md` — web 三档工作流
- `references/pdf.md` — pdf 三档工作流(含 HTML → PDF 路线、`canvas-design` 艺术海报分支)
- `references/interactive.md` — interactive 三档(含 web-artifacts-builder 触发条件、`algorithmic-art` 生成艺术分支)
- `references/slides.md` — slides 三档(theme-factory 主导)
- `references/verification.md` — 普通 / 高质量两档验证清单 + 验证循环

## 验证

验证统一用内部 `webapp-testing`(Playwright)。**每轮按「测试 → 反思 → 规划 → 执行」走,循环到无主要问题再交付**,有轮数上限:普通验证最多 3 轮(改到无主要问题即可),高质量验证最多 5 轮(做极致优化,必要时大规模重构)。两档清单与循环细节见 `references/verification.md`——简单+验证走「普通验证」,复杂+验证走「高质量验证」,艺术分支走轻量「艺术产物验证」。

## 内部子 skill(`skills/`,已内置完整副本)

- `frontend-design-pro` — 审美方向(11 种风格)
- `ui-ux-design-pro` — 数据驱动设计系统(Bun CLI + CSV + references)。`node_modules` **已预装,CLI 开箱即用**(纯 JS、可移植,无需现场 `bun install`)。注:其 SKILL.md 提到的 `scripts/*.py` 在上游该版本不存在,实际能力在 `cli/`(Bun)——用 `cli/` 即可。
- `theme-factory` — 主题/配色/字体
- `web-artifacts-builder` — React/Tailwind/shadcn 复杂 artifact(仅 interactive 重档按需)
- `webapp-testing` — Playwright 验证
- `frontend-design` — 通用前端设计
- `algorithmic-art` — p5.js 生成/算法艺术(interactive 艺术分支按需;含 `templates/viewer.html`)
- `canvas-design` — 静态视觉艺术海报 → PNG/PDF(pdf 艺术分支按需;含 `canvas-fonts/` 字体库)

> 副本与各自原始 skill 完全一致,未改 frontmatter(靠嵌套隐藏,不靠 `disable-model-invocation`)。这些 skill 作为顶层 skill 已在三个工具中 disable(移入 `skills-disabled/`),只通过本 skill 的内部副本调用。
