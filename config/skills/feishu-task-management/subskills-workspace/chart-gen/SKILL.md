---
name: chart-gen
description: 用户要把数据/指标画成图表、做可视化、生成 SVG 图（柱状/条形/折线/面积/饼/环形/散点/雷达/漏斗/桑基/瀑布/热力图等）时使用。把结构化数据转成一张干净、专业、自包含的静态 SVG 图表；需要时再走官方 lark-cli 上传到飞书。关键词：图表、可视化、画图、SVG、柱状图、折线图、饼图、趋势、占比、对比、桑基图。本 skill 专做数据→SVG 图表;变量依赖/流程图走 dag-flow-diagram、公式化策略链路走 ascii-strategy-diagram、飞书原生结构图构图走 whiteboard-design（其余作图选型见 feishu-task-management 作图节）。
---

# Chart Generator

把结构化数据转成一张**专业、自包含的静态 SVG 图表**。SVG 是矢量图：无交互、无暗色模式、无外部依赖，可直接嵌入文档或上传飞书。

设计取向（融合 Grafana Light / Financial Times / The Economist）：**少色相、多色阶，焦点色点睛，其余用灰**。数据真实第一,简洁优于花哨。

## 执行流程

1. **理解数据与意图**:对比 / 趋势 / 占比 / 分布 / 流向 / 增减 / 多维评估?受众与场景?
2. **选图表类型**:查 `references/chart-types.md` 决策树。不确定就用 `bar`(最安全)。
3. **选配色**:查 `references/colors-and-style.md`。语义优先(正负/同比)→ 类型专用色板 → 默认专业蓝系前 N 色。
4. **出图**:
   - **柱状图 / 折线图** → 坐标计算繁琐易错,跑 `scripts/render_chart.py`(纯 stdlib,见下)生成 SVG。
   - **其他类型**(饼/环形/散点/雷达/漏斗/桑基/瀑布/面积/热力)→ 按「SVG 规范」手写。
5. **校验**:逐条核对「校验清单」。
6. **输出**:默认在对话中直接给出 ```svg``` 代码块,并一句话说明图表结构。仅当用户要保存/上传时才存文件 + 走官方 `lark-cli`。

## 脚本:render_chart.py(柱状 / 折线)

纯 Python 标准库,无第三方依赖。读 JSON,写一张内嵌完整样式的 SVG。

```bash
python3 ~/.claude/skills/feishu-task-management/subskills-workspace/chart-gen/scripts/render_chart.py \
  --type bar \
  --data '{"columns":["月份","销售额"],"data":[{"月份":"1月","销售额":120},{"月份":"2月","销售额":150}]}' \
  --title "月度销售额" --out chart.svg
# --type: bar | hbar | line | area ; --data 可改为 --data-file path.json
# 不传 --out 时 SVG 打到 stdout
```

数据格式(与所有类型统一):`columns` 为 `string[]`(第 1 列分类/时间,其余列为数值系列),`data` 为对象数组。脚本自动算刻度(从 0 起、5~7 档)、配色、图例、数据标签。其它图表类型不归脚本管,手写即可。

## SVG 规范(手写图表时遵守)

### 骨架

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 {H}" width="100%"
     role="img" aria-labelledby="t d">
  <title id="t">{标题}</title><desc id="d">{描述}</desc>
  <style>/* 粘贴 references/colors-and-style.md 末尾的 BASE STYLE 全文 */</style>
  <!-- 图表内容 -->
</svg>
```

`H` = 最底部元素 `(y+height)+40`。背景透明,绘图安全区 x:40~640。每次只输出一个 `<svg>`。

### 文字(三个预设类,禁止自定义字号)

| 类名 | 字号/字重 | 用途 |
|---|---|---|
| `th` | 14px / 500 | 标题、节点标题 |
| `ts` | 12px / 400 | 副标题、轴标签、图例、数据标签 |
| `t`  | 14px / 400 | 正文 |

- 水平居中 `text-anchor="middle"`,垂直居中 `dominant-baseline="central"`。
- 不自动换行,一行一个 `<text>`/`<tspan>`。
- 宽度校验:14px 每字符约 8px(中文约 14px),12px 约 7px(中文约 12px);文字像素宽 + 16px ≤ 容器宽,放不下就加宽或换行。
- 禁止旋转文字、禁止全大写、禁止 < 11px。

### 颜色

- **数据系列**用 `references/colors-and-style.md` 的 HEX 色板(柱/线/扇区填充)。
- **图框/标注**(节点卡片、图例块)可用 9 个语义 CSS 类(`c-blue` `c-teal` `c-coral` `c-amber` `c-green` `c-red` `c-purple` `c-pink` `c-gray`):加在 `<g>` 上,内部 `rect`/`circle`/`ellipse` 自动继承填充+描边;**禁止**加在 `<path>` 上。
- 网格线 `#E1E2E4`、文字 `#1C1C1A`、副文字/轴 `#3D4852`、脚注 `#898A91`。
- 同一图最多 2~3 个色相;颜色编码含义,不编码顺序。

### 形状与连线

- 圆角:卡片 `rx=10`、子块 `rx=6`、小标签 `rx=4`、胶囊 `rx≥h/2`;柱子顶部圆角 2~4px。
- 描边:图形 `stroke-width=0.5`、分隔/网格 `1`。
- 连线 `<path>` 必须 `fill="none"`;箭头不穿节点,穿越改 L 形折线。
- **禁止**:渐变、阴影、模糊、发光、emoji(用 SVG 形状)、交互(onclick/hover)、暗色切换。

### 各类型出图要点(详见 references/chart-types.md)

- **饼/环形**:降序,最大扇区从 12 点起;蓝色渐变(浅→深)比多彩更专业;扇区外引导线 + 名称 + 百分比;环形中心可放总计。
- **散点/气泡**:双数值轴;分组用 4 色对比板;气泡半径 ∝ √尺寸值。
- **雷达**:正多边形轴,3~6 个维度;系列 ≤3。
- **漏斗**:居中梯形逐层收窄,蓝色渐变(深→浅);标阶段名 + 数值 + 转化率。
- **桑基**:左右两列节点 + 中间贝塞尔色带,带宽 ∝ value。
- **瀑布**:升/降用浮动柱,涨用 `#53B589`、跌用 `#D03132`,首尾为实柱。
- **热力**:网格单元按值映射蓝色渐变深浅。

## 轴与标签规则(数据图通用)

- 柱状图 Y 轴**必须从 0 起**(否则放大差异、误导);折线图可聚焦数据范围但要标起始值。
- Y 轴 5~7 档,步长取 2/5/10 的倍数;轴标题必须带单位(万元 / % / 人)。
- 大数值在数据阶段就换算(>10000 → ÷10000,列名加「(万)」)。
- 时间轴升序;分类名 >8 字改用 `hbar`(条形图)。
- 标签:数据点少(柱 ≤8、线 5~15)可显示,过密则隐藏靠 tooltip;饼图始终显示;数据标签色 `#3D4852`、千分位分隔、百分比留 1 位小数。

## 校验清单(出图后逐条核对)

1. ✅ viewBox 高 = 最底部元素 (y+height)+40;元素 x≥40 且 x+width≤640。
2. ✅ 同行元素不重叠(左 x+width+间距 ≤ 右 x)。
3. ✅ 文字未溢出容器(中文按双宽估算)。
4. ✅ 柱状图 Y 轴从 0 起;轴标题带单位。
5. ✅ 所有连线 `<path>` 有 `fill="none"`;箭头不穿节点。
6. ✅ 所有 `<text>` 带 `th`/`ts`/`t` 类;无旋转文字、无 emoji、无渐变/阴影。
7. ✅ `c-*` 只在 `<g>`/`rect`/`circle`/`ellipse` 上;数据系列用 HEX 色板。
8. ✅ 配色:同比用同色系 35% 透明度;正负用绿/红;系列 ≤7 或已合并。

## 输出与上传

- **默认**:对话中直接输出完整 ```svg``` 代码块 —— 这是首选,不转 PNG(位图会让中文乱码)、不默认存盘。
- 代码块前用一句话说明结构(类型、系列数、要点)。
- **仅当用户要求保存/上传飞书**时:把 SVG 存为 `.svg`,再走官方 `lark-cli`(`@larksuite/cli`;见 `feishu-task-management` 入口 + `cli.md`)落地。旧 `mcp__feishu__*` MCP 已退役,不再是执行路径。下文 `drive_v1_*` / `docx_*` 旧 MCP 记法仅作「动作 → 参数语义」参考,执行以 `lark-cli <域> +<shortcut> --help` / `schema` / `skills read` 为准:
  - 上传文件到云空间 → drive 上传(对应旧 `drive_v1_*` 分片 `file_uploadPrepare`+`file_uploadFinish`,素材 `media_uploadPrepare`+`media_uploadFinish`);具体见 `lark-drive` 技能,别杜撰工具名。
  - 插入到文档 → docx(对应旧 `docx_v1_documentBlockChildren_create`,以 image/file block 引用上传返回的 token)。
  - 按 `lark-cli` 实际命令与参数调用;不要内置任何 Mira 命令行或飞书私有脚本。

## 飞书原生交互图表(白名单外,本机当前做不了)
飞书文档里的「图表小组件 / 图表助手(Chart AddOns)」是**原生可交互**图表块(数据可联动、可在文档内编辑),与本技能产出的**静态 SVG** 不同 —— Mira 的 `chart-builder` 走的就是这条路。
- 本机飞书侧(官方 `lark-cli`,旧 `mcp__feishu__*` MCP 已退役)**没有** AddOns/图表块的创建能力 → 当前无法生成原生交互图表。
- 替代落地:本技能出静态 SVG → 经 `lark-drive` 上传 → 作为 image 块嵌入文档(见上)。确需真交互图表时,提示用户在飞书端手动插入「图表」组件(见 `feishu-task-management`)。
