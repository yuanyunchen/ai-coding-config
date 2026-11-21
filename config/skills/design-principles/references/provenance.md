# 出处表

本 skill 的规则从用户自有规范复制改写而来,**运行时不读这些源文件**。源文件改动后,按本表找到对应条目判断是否跟改;本 skill 改动后同理。建立于 2026-11-01。

路径缩写:`FW` = `~/.claude/skills/feishu-task-management/subskills-workspace/`,`FL` = `~/.claude/skills/feishu-task-management/subskills-local/`,`FP` = `~/.claude/skills/frontend-pipeline/`。

## 改写通则(所有条目都做了的)

- 去掉飞书执行细节:XML 转义、block API、callout 颜色属性、图片嵌入管线、文档权限、读者前缀。
- 飞书「正文列约 700px」推出的数值闸,改成「按实际显示像素」的通用判据(visual-encoding §四、diagrams §四)。
- ASCII 行宽、学习文档开篇/收口固定骨架等说明页专属规则不在本 skill,归 explainer。
- Emoji 不设禁令(2026-11-01 用户删除全局禁令);SVG 图内不用 emoji 保留(渲染原因)。
- 「图数量底线 ≥4–6 张」不迁移,以「不按固定张数凑图」为准(源规范内部冲突,取后者)。

## W · writing.md

| 节 | 来源 |
|---|---|
| 一 先定读者、二 两层结构 | `FP/references/content-for-readers.md` 一、二、三;`FP/skills/starmap/references/content.md` 第零原则 |
| 三 结构与推理 | `FW/lark-doc-writer/SKILL.md` §0.2、§0.5;`FW/doc-trio/SKILL.md` 跨类型「信息结构与密度」 |
| 四 让人看进去 | `FW/lark-doc-writer/SKILL.md` §0.5「能看进去」;`FP/references/content-for-readers.md` 五、六 |
| 五 降字数 | `FW/lark-doc-writer/SKILL.md` §0.5 降字数五级、字数按可见文字 |
| 六 去 AI 味 | `FW/lark-doc-writer/SKILL.md` §0.3(含句式模板化、四种同源、三条不牺牲) |
| 七 界面文案 | `FP/skills/frontend-design-pro/SKILL.md` §3 Text Minimalism |

## V · visual-encoding.md

| 节 | 来源 |
|---|---|
| 一 语义配色 | `FW/dag-flow-diagram/references/hero-svg-design-system.md` 三;`FW/dag-flow-diagram/SKILL.md` hero 风格分区;`FW/whiteboard-design/SKILL.md` 分组配色;`FW/lark-doc-writer/references/lark-doc-style.md` 三 |
| 二 颜色不独立表意 | `lark-doc-style.md` 三(↑↓);`FW/chart-gen/references/colors-and-style.md`「避免」 |
| 三 形状与线型 | `FW/dag-flow-diagram/SKILL.md` 节点形状、布局对齐;`hero-svg-design-system.md` 二 |
| 四 字号与层级 | `hero-svg-design-system.md` 四;`FW/whiteboard-design/SKILL.md` 排版层级;`FW/dag-flow-diagram/references/technical-data-pipeline-diagrams.md` 视觉合同 |
| 五 克制 | `FP/skills/frontend-design-pro/SKILL.md` §0、§4;`lark-doc-writer` §0.2、§0.4、§1.1 |
| 六 控件默认值 | `FP/skills/frontend-design-pro/SKILL.md` §5 |
| 校准参照 | `assets/demo-recall-metrics.html` ← `FP/skills/frontend-design-pro/demo-recall-metrics.html` |

## D · data-honesty.md

| 节 | 来源 |
|---|---|
| 一 图型、二 轴与标签、三 配色 | `FW/chart-gen/SKILL.md`;`FW/chart-gen/references/colors-and-style.md`、`chart-types.md` |
| 四 诚实口径 | `FL/analytical-report/references/methodology.md` 二;`FW/data-analysis-report/SKILL.md` §2、§3.3 |
| 五 可信度分级 | `FW/lark-doc-writer/SKILL.md` §0.3 数字来源分级;`FW/doc-trio/references/learning_doc.md` §四 |
| 六 读图三拍 | `FL/analytical-report/references/methodology.md` 一 |
| 七 交互图表补充 | 由四推出(缺失不补 0)+ `FW/data-analysis-report/SKILL.md` §3.3 |

## G · diagrams.md

| 节 | 来源 |
|---|---|
| 一 是否该画图 | `lark-doc-style.md` 二「画板意图识别」12 行;`FP/skills/starmap/SKILL.md`「去掉连线还成立吗」 |
| 二 选型分层 | `FW/lark-doc-writer/SKILL.md` §0.6;`FW/ascii-strategy-diagram/SKILL.md` 分工段 |
| 三 节点与边 | `FW/dag-flow-diagram/SKILL.md` 节点规则、边规则、闭环与外部对象;`FW/whiteboard-design/references/content.md` 节点文字 |
| 四 布局与连线 | `FW/dag-flow-diagram/SKILL.md` 布局与长宽比、布局对齐;`FW/whiteboard-design/references/content.md`、`connectors.md` |
| 五 分层展示 | `FW/dag-flow-diagram/SKILL.md` 分层展示;`technical-data-pipeline-diagrams.md` 三图分工、反模式;`FW/dag-flow-diagram/references/examples.md` 范例四 |
| 六 hero 图 | `hero-svg-design-system.md` 一、二;`examples.md` 范例三、四、五 |
| 七 导出位图 | `FW/dag-flow-diagram/SKILL.md` 渲染配方;`templates/render_svg.sh` |
| 模板 `assets/diagrams/*` | `FW/dag-flow-diagram/templates/` 同名文件原样复制 |

## C · verification.md

| 节 | 来源 |
|---|---|
| 一 通用检查 | `technical-data-pipeline-diagrams.md`「交付前视觉检查」;`FW/lark-doc-writer/references/technical-data-pipeline-delivery.md` 三层验收 |
| 二 渲染自查四条 | `hero-svg-design-system.md` 五 |
| 三 内容检查 | `FP/references/verification.md`「内容面向读者」 |
| 四 对抗审查 | `FL/analytical-report/references/methodology.md` 三;`FW/data-analysis-report/SKILL.md` §3.4 |

`data-report.md` 不来自飞书规范:2026-11-19 至 11-20 auto-rater 项目的复盘,规则旁引用了用户原话。
