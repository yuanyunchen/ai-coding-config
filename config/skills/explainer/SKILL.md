---
name: explainer
description: "生成给人看的说明型单页 HTML:代码库导览(模块全景、主流程、改动指南)与工作汇报(进度、结论、待决策)。触发:讲解代码库、代码库导览、架构说明页、工作汇报页、进度汇报、交接说明。默认低档不测试。翻页演示走 frontend-pipeline,飞书文档走 feishu-task-management,关系图探索器走 frontend-pipeline 的 starmap 分支。"
---

# explainer — 说明型 HTML

把「理解一个代码库」或「汇报一段工作」做成一页自包含 HTML:单文件、零外部依赖、不跑 JS 也完整可读、亮暗两色。规范一律引用 `design-principles`,本 skill 只装两套骨架、页面模板(含 SVG 组件)、ASCII 规则与检查脚本。

## 场景路由

| 我要做 | 读 |
|---|---|
| 讲清一个代码库 / 模块 / 系统 / 规则包 | [`references/codebase.md`](references/codebase.md) |
| 汇报进度、排查结论、交付说明、交接 | [`references/report.md`](references/report.md) |
| 画公式链路、逐步推导的等宽图 | [`references/ascii.md`](references/ascii.md)(画 ASCII 时任何档位都读) |
| 页面起稿 + SVG 组件 | 复制 [`assets/template.html`](assets/template.html) |
| 信息密度高的 hero 图原型 | `~/.claude/skills/design-principles/assets/diagrams/`(中、高档) |
| 写作、配色、作图、数据规则 | `~/.claude/skills/design-principles/SKILL.md`(核心摘要;要展开再按其路由读 references) |

## 流程

1. **判骨架**:`codebase` 或 `report`。混合时以读者最想拿走的东西为准(看懂系统 → codebase;知道进展和要做的决定 → report)。
2. **定读者**:心里定下给谁看,不写进页面。
3. **定档位**(见下表)并用一句话声明:「本次 explainer {骨架} · {档位}」。
4. **取材**:codebase 读入口、主流程经过的文件、配置与测试,记下真实的 `文件:行` 与一个真实使用样例;report 收集事实与数字并给每个数字打可信度级别(A/B/C/D)。只读产物需要的,不爬全仓。
5. **起稿**:复制模板,按骨架填。图用模板里的 SVG 组件起手(复制示例 svg 改坐标与文字),不从零手写样式。
6. **自查 + 交付**:按下方 6 条自查(低档只读不跑工具),然后交付。

## 档位(默认低档)

| 档位 | 何时 | 加载 | 篇幅上限 | 检查 |
|---|---|---|---|---|
| **低(默认)** | 用户没提验证 | 本文件 + 对应骨架 + design-principles `SKILL.md` + 模板(画 ASCII 时加 `ascii.md`) | 手绘 SVG ≤ 2 张(全景 + 主流程);模块节 ≤ 4,其余模块并成一张模块表;其他结构用表、列表或 ASCII | 只按 6 条自查过一遍,**不跑脚本、不截图、不开浏览器** |
| 中 | 用户说「验证 / 检查」,或产物给团队外的人 | 低档 + design-principles `diagrams.md` + hero 原型 | SVG ≤ 4 张;骨架全量 | 跑 `scripts/check.py`;用 `webapp-testing` 截桌面 1440 与手机 390 各一张并亲自看;≤ 2 轮修复 |
| 高 | 对外、正式、「打磨」 | 中档 + design-principles 全部 references;只读参考 `~/.claude/skills/frontend-pipeline/skills/ui-ux-design-pro/references/` 的 `accessibility.md`、`typography.md`、`cognitive-principles.md`、`critique-protocol.md` | 不设上限,按内容需要 | 中档检查 + design-principles `verification.md` 全量 + ≥ 4 路对抗审查;≤ 4 轮 |

升档只因用户要求或读者范围变化;不因「做得更好」自行升档。

## 作图要点(所有档位)

- 图在浅色画布(`.diagram`)里,深色模式下也保持浅色,所以图内**只用模板里的 SVG 组件类**(`.n.up/.main/.focus/.risk/.ok/.neutral`、`.edge`、`.lane`),不用页面 token。
- 画布 `viewBox` 宽 960,图内文字 ≥ 13(svg 最窄显示 820px,13 约显示 11px)。
- 圆角胶囊(`.n.data`)= 数据对象,方角 = 模块/过程;每张图配 `.legend` 写清颜色语义。
- 边:传数据或公式的边写标签;纯「下一步」顺序的流程(如泳道步骤)可在图例里写「箭头 = 下一步」代替逐条标注。

## 6 条自查(低档也必过,纯阅读)

1. **首屏**:页眉 + 三问/三个入口 + 第一节默认展开内容里,没有代码片段、成串参数、未解释缩写与专名、「本文/本轮」类自指;原始标识符(仓库、分支、表名)在页眉 `.ids` 里。
2. **结论先行**:h2 是一句结论或名词短语,正文第一句是判断;`.why` 行(这一节解决什么问题)是阅读理由,不算正文。
3. **图表都有解释**:每张图有 `figcaption` 读图一句 + 3–5 句正文解释,不复述图上文字;数据图走完读图三拍。表格只需表前一句结论。
4. **颜色同义**:图和提示块只用语义色,每张图有图例;琥珀出现处写明待谁确认。
5. **数字诚实**:每个数字可追到来源;推断与待确认的已标注;同一个数全页一致。
6. **展开区可达**:首屏拿掉的代码位置、命令、日志都在 `<details>` 里,没有被删掉。

## 产出

- **位置**:当前工作区有 `deliverables/` 就写在那里;没有就写到会话 scratchpad,并把完整路径告诉用户。不写进被讲解的仓库,除非用户要求。
- **单文件**:CSS 内联、SVG 内联、位图用 base64;外部引用为 0。
- **发布**:默认不发布。用户要分享、或说明这是给别人看的,才发布为 Artifact(先加载 artifact-design;模板已满足其亮暗 token 与 `<title>` 约定)。
- **关系节点 > ~30 且关系本身是重点**:主页面放简化全景,另走 frontend-pipeline 的 starmap 分支做探索器并互链。

## 边界

- 不管审美风格创新;要做营销页、dashboard、幻灯片走 frontend-pipeline。
- 不写飞书文档;要落飞书走 feishu-task-management。
- 不替代代码注释或 README;页面是给人一次性读懂用的。
