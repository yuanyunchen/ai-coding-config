---
name: dag-flow-diagram
description: 将算法、策略、系统逻辑、技术数据链路或概念依赖关系画成 DAG 框架图。当用户要画 DAG、依赖图、系统框架、端到端流程、数据表链路，或表达变量来源与公式关系时使用。适用于变量依赖、服务拓扑、原始表→中间表→最终表→下游、多阶段流程；公式逐行推导走 ascii-strategy-diagram，统计图走 chart-gen。
---

# DAG 框架图专家(mermaid)

把算法 / 策略 / 系统逻辑 / 概念依赖画成 mermaid DAG。读者看完应当一眼看懂:有哪些实体 → 谁由谁经什么公式/模块推出 → 外部对象供给哪些自变量 → 整体怎么闭环。

## 场景路由

| 场景 | 必读 |
|---|---|
| 技术数据链路正式交付：原始表→中间表→最终表→下游，含计算收益和日更任务 | [`references/technical-data-pipeline-diagrams.md`](references/technical-data-pipeline-diagrams.md)(先看三张金标准 PNG) |
| 通用变量依赖、服务拓扑、开篇 / 收口 DAG | [`references/examples.md`](references/examples.md) |
| **事务型 hero 图**:状态全景 / 归因分解 / 机制对照 / 多人待办节奏(信息密度高、mermaid 与 dot 排不出的那类) | [`references/hero-svg-design-system.md`](references/hero-svg-design-system.md)(四种原型 + 配色 + 字号闸 + 渲染脚本,**手绘 SVG 前必读**) |

> **⭐ 开篇 / 定位 / 收口图 · 每次必读模版**(三类落地范例,做对应图前先读、照结构改):
> - 「**开篇全景 / 体系总控图**」(总览入口用,全系统多路)→ [`templates/panorama_overview.svg`](templates/panorama_overview.svg)(配套同名 PNG)——见 [`references/examples.md`](references/examples.md) 范例三。
> - 「**板块定位图**」(每篇开头 · 全链路定位 + 高亮本段 + 本段 I/O)→ [`templates/locator_b2.png`](templates/locator_b2.png)——见 [`references/examples.md`](references/examples.md) 范例五。
> - 「**全文结尾总收口图**」(收束细化、比正文更全)→ [`templates/closing_summary_b1.png`](templates/closing_summary_b1.png)——见 [`references/examples.md`](references/examples.md) 范例四。
>
> 都是落地验收过的范例,别退回「图少字多 / 瘦高竖条」。

> 选型(权威矩阵见 [`lark-doc-writer §0.6 作图选型矩阵`](../lark-doc-writer/SKILL.md)):概念依赖、流程/状态机/拓扑用本 skill(mermaid→PNG);**公式化 / 多阶段策略·竞价·计费·排序·定价链路,或需等宽精确对齐、同名变量分身 → 首选 `ascii-strategy-diagram`(ASCII,不是兜底)**;**纯线性短流(`A→B→C`)→ ASCII 比 PNG 更稳**(PNG 易被排成瘦高竖条)。
>
> **分工(与 `ascii-strategy-diagram` 不矛盾,一眼对照)**:**DAG(本 skill,mermaid→PNG)= 框架 / 概念关系 / 全景 / 总结**(高层鸟瞰、谁依赖谁、整体拓扑);**ASCII(`ascii-strategy-diagram`)= 细节 / 公式链路逐步展开**(逐阶段推导、同名变量换分身)。两者**分层而非互斥**:同一文档常"高层 DAG 全景 + 细节 ASCII 链路"配合。所以"ASCII 是公式链路的首选"与"DAG 是框架/概念/全景图的首选"并存,各管一层。**学习文档**即据此排:开头一张 **DAG 全景**(概念/框架骨架)→ 正文 **ASCII 展开细节** → 结尾 **DAG 变量依赖 + 全链 ASCII 双收口**(见 `doc-trio/references/learning_doc.md`)。⛔ 不用 ASCII 当开篇全景(高层概念关系是 DAG 的活)。
> **两套硬阈值并列(选 ASCII vs PNG 时一眼对照,免翻两个 skill)**:**ASCII 行宽闸 → 唯一权威 [`ascii-strategy-diagram`](../ascii-strategy-diagram/SKILL.md)**(每行 ≤ ~72 显示列、CJK 计 2、飞书代码块约 80 列右切);**PNG → 长宽比闸 w:h ≈ 1.3–1.8、拒 h/w>1.2、≤700×500、2× 渲染**(详下「布局与长宽比」)。同一内容若 ASCII 一行压不进 72 列又不想竖切,就转 PNG 走长宽比闸。

## 落地形式

mermaid 用 `flowchart`(不用旧 `graph`)。**方向默认 LR(左右),不用 TD/TB**——见下「布局与长宽比」。按产物去向选落地形式:

- **用户明确要求图进飞书文档或任务已有明确飞书目标→ 渲染成 PNG 再嵌 Image 块(首选)**:飞书 API(lark-cli)路径下 `<whiteboard type="mermaid">` **不会**变成画板,会被 convert 拍平成纯文本;原生 Diagram 块也无法创建。要在文档里有一张真实可见的图,把图本地渲染成 **PNG** → 建 **Image(27) 块**(媒体上传 + 绑字节,convert 不会替你嵌图)→ 见 `lark-doc-writer/references/mcp-recipes.md` 配方3 与 `media-embed.md` 管线(原 §6b)。
  - 🟢 **概念 / 依赖 / 全景类 DAG 的默认渲染器 = graphviz `dot`(不是 mermaid)**:多入边的概念关系网 / 变量依赖网 / 端到端全景这类图,**mermaid 渲染极易踩长宽比闸**——LR 出又扁又宽的薄条、TB 出又高又窄的竖条,且嵌套 subgraph 的 `direction` 被 mermaid 直接忽略(下「布局对齐」F5;两位 producer 实测 4 个方向变体全废)。**graphviz `dot`**(`rankdir=TB` + 每行 `rank=same` 锁平 + 隐形排序边控顺序 + 折行 fold 边)对蛇形 / 折行布局可控得多,实测一把过长宽比闸(opening 2534×1125 w/h=2.25、closing 1791×1427 w/h=1.26)。**所以:概念 / 依赖 / 全景 DAG 默认用 `dot` 渲 PNG;mermaid 仍可作授权语法(`flowchart` 源更易读写),但落地渲染走 `dot` 这条可靠路径。** 仅纯线性短链(`A→B→C`,无分支汇合)mermaid LR 也能稳过。长宽比闸数值不变(目标 w:h≈1.3–1.8、拒 h/w>1.2 / w/h>3、≤700×500、2× 渲染)。
- **无渲染器可用时 → ASCII 退路**:把同一 DAG 用 **ASCII 画进 `<code language="text">`(Code(14) 块)**,等宽对齐、随处可用,是始终可落地的文本兜底。复杂逐行链路转 `ascii-strategy-diagram`。
- **只在对话里展示(不落飞书)**:产出标准 markdown mermaid 代码块(` ```mermaid `)即可;这只是"给用户拷进 mermaid 渲染器的源码",**不会在文档内渲染**。
- ⚠️ **实测结论**:**真正可拖拽的飞书原生画板经飞书 API(lark-cli)做不到**(mermaid 围栏只成代码块 / `<whiteboard type="mermaid">` 拍平成纯文本 / Diagram(21) create 报 `1770029` —— 机制与替代权威见 `lark-doc-writer/references/mcp-recipes.md` 执行覆盖层)。如实告知用户;要图就走 PNG→Image,要纯文本兜底就走 ASCII code 块。

## 节点规则

### 节点形状
- **算法过程 / 服务模块 / 公式计算**:方角 `["..."]`
- **输入 / 输出 / 数据 / 信号 / 变量**:圆角 `(["..."])`

### 节点内三层视觉分层(强制)
```
<b>标题</b><br/>━━━━━━━<br/>解释/公式/参数
```
- 第 1 行 `<b>` 加粗标题(可含术语,如 "rank_bid"、"viking 倒排")
- 第 2 行 `━━━━━━━` 横线分隔
- 第 3 行起写做什么 + 关键公式/参数

### 高亮
- 核心节点 / 本任务焦点:`style XXX fill:#ffeaa7,stroke:#e67e22,stroke-width:2px`
- 外部参与者可按身份配色区分(广告主 / 平台系统 / 用户),颜色一致表示同类身份。

### hero 风格规范(成套作图统一视觉,跨篇一致)
一套学习体系 / 多张配套图,配色按**链路阶段分区**(同区同色、同色表同类,读者扫一眼颜色就知节点属哪段):

| 分区 | 色相 | 装什么 |
|---|---|---|
| 上游 / 入口 / 输入 | indigo(靛) | 原始请求、用户特征、广告主参数 |
| 召回 / 候选 | sky(天蓝) | 定向、粗排、候选集 |
| 精排 / 打分 | amber(琥珀) | 精排模型、pCTR/pCVR、竞价分 |
| 评估 / 横切 / 调控 | slate(石板灰) | A/B、计费比、PID 风控、监控 |
| 收益 / 结算 / 产出 | green(绿) | cost、ADVV、最终扣费、回灌 |

- **形状=语义**:圆角 `(["…"])` = 数据对象 / 信号 / 变量;方角 `["…"]` = 模块算子 / 公式计算(同「节点形状」)。
- **有向边必标关系或公式**(同「边规则」):`A --|"= cpa_bid × coef"|--> B`,不画裸箭头。
- 焦点节点仍用 amber 高亮描边(上「高亮」),不被分区色覆盖。

## 边规则

- 每条 edge 必须标注传递的**具体数据或公式**(如 `rank_bid = cpa_bid × coef` / `uid + ad` / `X 减去主路 = X'`),**不画无标签箭头**。
- **公式连接 entity**:概念之间由公式 / 算法模块连接,不断层。

## 闭环与外部对象(强制,本 skill 核心)

- **无凭空变量**:系统中不出现无来源的变量。每个自变量必须有入边,由**有身份的外部对象**供给:
  - 广告主定义(cpa_bid / budget)
  - 系统/模型预测(pCTR / pCVR / convert)
  - 调控模块(coef 由 PID/风控/流控给)
  - 用户(convert 来自被广告展现的用户)
- 外部对象**画出来并标明身份**,不用"外部输入"这类模糊标签。
- **因变量由 自变量 + 公式/模块 引导得出**,不跳步。
- 回路 / 反哺用一句文字或虚线回指,形成闭环(如计费比虚线回灌 coef)。

## 布局与长宽比(强制 —— 避免瘦高竖条,probe_visual 实测确认)

渲染成 PNG 嵌飞书时,**最常见缺陷是把流程排成又高又窄的竖条**(doc 宽固定 ~700px、纵向无限滚,竖条越拉越细、字越缩越小)。落地前过这套闸:

- **线性顺序流默认 `flowchart LR`(左右),不用 `TD`/`TB`**:纯线性流 TD 排成 N 行高×1 宽的竖条(probe 实测 6 节点 TD = 154×539px、h/w=3.5;10 节点 TD ≈ 135×923px、h/w=6.8,正是用户看到的瘦高条)。LR 把流程摆成一条可读的横带。
- **节点 ≥7 的长链:不要排成单行(LR 单行会溢成超宽扁条、缩到页宽字小到看不清),也不要排成单列**——**折成多行(蛇形 / snake,每行 4–5 节点,排满再换行)**,让图填满一个矩形区而非一条。mermaid 里用 subgraph 分组 + 组间连线实现折行。
- **嵌图前过长宽比闸**:测 PNG 尺寸,**拒绝 height/width > 1.2(太高)或 width/height > 3(太扁)**,目标 w:h ≈ **1.3–1.8**(4:3 ~ 16:9)。probe 的 TD(3.5)、LR 单行(17.2)都不合格;10 节点折 2 行可过闸。
  - ⚠️ **小图(≤6 节点的时序/流程图)放宽到 ~1.2 即可,别硬凑 1.3–1.8(F4,produce_strategy 提炼)**:1.3–1.8 是"理想带",但**节点数少**时(6 节点 2 行 3 列这种紧凑布局)自然就落在 **w:h≈1.2–1.3**,再想更扁只能砍节点或缩字、反而损可读。硬边界(h/w≤1.2 不超高、w/h≤3 不超扁)是必须过的闸;**理想带 1.3–1.8 是大图/长链的目标,小图 ~1.2(过硬闸、视觉清晰)就可交付**,不必为凑理想带牺牲内容。produce_strategy 的 6 节点时序图取 w/h=1.29 即交付。
- **尺寸预算**:宽 ≤ **700px**(此处是「图片渲染宽度」,非表格列宽;按飞书内容列宽,更宽缩放糊字)、高 ≤ **500px**(更高成竖条要滚屏);**按 2× 渲染**(如 1400×1000 源)保证字清晰,长宽比仍须落在上面区间。
- **纯线性短流(`A→B→C`)优先 ASCII**(`ascii-strategy-diagram` 进 `<code language="text">`):永不被压成竖条、不用上传、可编辑、随处一致渲染;PNG 留给**有分支/汇合/并行泳道**、ASCII 排不清楚的流程。
- **字号闸(与长宽比闸并列的第二道硬闸,2026-07-29 实测补)**:飞书正文列 ~700px,**逻辑画布宽 W 的图显示时缩放 = 700/W**,逻辑字号乘这个系数才是读者看到的像素。W=1160 时系数 ≈0.61 —— **逻辑正文字号 < 11.5 一律不许出现**(10.5 落到 ~6.4px,实测肉眼吃力);放不下就删字、拆图、加画布高度,**不许缩字**。手绘 SVG 的完整字号表见 [`references/hero-svg-design-system.md`](references/hero-svg-design-system.md) 四。

## 布局对齐(强制)

- 尽量**垂直或水平**布局,用**直线**,不让线交叉成网。
- **实线 / 虚线区分不同关系**:实线 = 主数据流;虚线 = 反哺 / 回灌 / 弱依赖。
- ⚠️ **别靠"TB 父图 + subgraph 内 `direction LR`"折行 —— 嵌套 subgraph 方向不可靠(F5,produce_strategy 实测)**:在 TB 顶层图里给子图写 `direction LR` 期望它横向摆放,**mermaid 常直接忽略该 `direction`、把子图仍按竖排渲染 → 产出又高又窄的竖条**(produce_strategy 实测踩中:`direction LR` 嵌在 TB 父图被忽略,出竖条,改用 graphviz dot 才达标)。**正确折行/蛇形两条路**:① **顶层就用 `flowchart LR`**(整图左右走向),长链靠"排满一行的节点数 + 连线自然换行"折行,**不要在 LR 顶层里再嵌带 `direction` 的子图**;② 要严格可控的蛇形(每行 N 个、行间回折),**改用 graphviz `dot` 渲染**(`rankdir=TB` + 每行 `rank=same` 把同一行节点锁平 + 加隐形排序边控制顺序 + 折行 fold 边),比 mermaid 嵌套子图方向可控得多(见 `mcp-recipes` 配方3)。
- 不同阶段拆为**独立 entity**(广告召回 / 商品召回 / 广告精排 是三个 node,不塞进一个)。
- 流程图标题与文档小标题统一用**名词短语**(不用动宾、不用句子)。

## 渲染配方(SVG → PNG,hero 图走这条)

手写 SVG 的 hero 图(或 mermaid/dot 先导出 SVG)落 PNG 走 **headless Chrome 截图**,字体最稳、可控 2×:

- **headless Chrome 渲 SVG → PNG**:`"$CHROME" --headless --screenshot --window-size=W,H --force-device-scale-factor=2 file.svg`(或包成 HTML 内嵌 SVG 再截),比 `rsvg`/`cairosvg` 更贴浏览器实渲,中文不缺字。**`chrome` 不在 PATH 里**,必须用全路径(本机 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,以探针 `~/Library/Logs/harness/probe.md` 作图段为准);同目录 `templates/render_svg.sh` 已写对,照抄它即可。该脚本末尾用 Python `PIL` 量成图尺寸——**PIL 缺失时脚本在最后一步 crash 而 PNG 其实已经生成**,别误判为渲染失败,探针的「作图」段会显示 PIL 在不在。
- **CJK 字体钉死 `Hiragino Sans GB`**(macOS 自带,黑体、笔画清晰):SVG 里 `font-family="Hiragino Sans GB, sans-serif"`,不靠默认 fallback(易踩到衬线或缺字方框)。
- **按 2× 渲染**:`--force-device-scale-factor=2`,源 1400×1000 出 PNG 字才清晰(同「布局与长宽比」尺寸预算)。
- **长宽比闸值见上「布局与长宽比」**(此处不重复)。**唯一新增例外:开篇导览 DAG 这种横向阶段带**(节点少、天然又宽又扁),长宽比放宽到 **≤3** 即可,不必硬折行凑理想带。
- **手绘 hero 图走 2.5×、不是 2×**(1160 逻辑宽 → 2900px PNG,飞书列宽内不糊、点开看原图清晰);可直接抄的脚本 = [`templates/render_svg.sh`](templates/render_svg.sh)(包 HTML 再截图,顺带打印尺寸与 w/h 过闸),设计系统见 [`references/hero-svg-design-system.md`](references/hero-svg-design-system.md)。

## 分层展示(强制)

- **概述图**:展示高阶段过程,把底层细节藏进大 entity。
- **模块图**:展开某一阶段的内部细节。
- 同一文档常需"概述图 + 展开图"配合:概述图 high-level,其后跟一张含全部核心概念、按公式引导的展开图。

## 学习文档的两个 DAG 范式(与 [`lark-doc-writer §0.6`](../lark-doc-writer/SKILL.md) 同口径)

learning 文档每节用**双图配合**讲一个逻辑——DAG 给框架/依赖关系,ASCII(`ascii-strategy-diagram`)给公式逐步细节,两图分层不互斥。本 skill 在这套骨架里出**两端的 DAG**:

- **开篇导览 DAG(鸟瞰概览,定位用)**:全文第一张图,只画**高阶段过程 + 谁连谁**(每阶段一个大 entity、隐藏内部细节),读者看完知道这套系统分几段、自己在读哪段。句法 = `flowchart LR` 横向阶段链,每节点是一个阶段(上游→召回→精排→评估→收益,按 hero 分区配色),边标"传递什么"。⛔ 不堆公式、不展开变量(那是正文 ASCII 的活)。
- **结尾总收口 DAG(展开细化的总结,比正文更全)**:全文最后一张图(与全链 ASCII 一起构成「双收口」),画**纳入全部核心概念的变量依赖网**——所有自变量按身份 sourced、每条边带公式、回路虚线回灌闭环(即「范例一」那种多入边依赖网),比开篇导览更全、把散在各节的概念收成一张关系总图。句法见「范例一:变量依赖图」。

## 转义提示

把 mermaid/ASCII **以文本形式**写进飞书文档(XML 导入路径,如落进 `<code>` 块)时,节点 / 边文字里的 `<` `>` `&` 需转义为 `&lt;` `&gt;` `&amp;`(`<br/>` `<b>` 等标签本身保留)。漏转义飞书会从 `<` 处吞掉后续内容(高发:`p<20%`、`< 30%`、`eCPC <= rank_bid`)。纯 markdown 对话输出、渲染成 PNG 的路径、以及走 block API(JSON)的路径**无需转义**。

## 范例（按场景必读）

五个完整范例在 [`references/examples.md`](references/examples.md)，动笔前按场景挑读：

| 我要画的 | 必读范例 | 配套模版 |
|---|---|---|
| 变量依赖图（自变量→公式→因变量） | 范例一 | — |
| 端到端服务拓扑（概述图,藏细节） | 范例二 | — |
| **开篇全景总控图**（总览入口,hero SVG）| **范例三（必读）** | [`templates/panorama_overview.svg`](templates/panorama_overview.svg) |
| **全文结尾总收口 DAG**（hero）| **范例四（必读）** | [`templates/closing_summary_b1.png`](templates/closing_summary_b1.png) |
| **板块定位图**（每篇开头）| **范例五（必读）** | [`templates/locator_b2.png`](templates/locator_b2.png) |
| **技术数据链路三图**（主链路 / 计算收益 / 日更） | [`references/technical-data-pipeline-diagrams.md`](references/technical-data-pipeline-diagrams.md) | 先查看 reference 登记的三张金标准 PNG |
