# 图表类型 — 选型 · 数据格式 · 专用色板

数据格式统一:`columns` 是 `string[]`(第 1 列为分类/时间维度,其余列为数值系列),`data` 是对象数组,每个对象的键 = 列名。

```json
{ "columns": ["月份", "销售额"],
  "data": [ {"月份": "1月", "销售额": 120}, {"月份": "2月", "销售额": 150} ] }
```

## 决策树:想表达什么?

```
对比大小 ── 类别 ≤7 → bar          多组对比 → barGroup
          └ 类别 >7 / 名称长 → hbar(条形,名称更易读)
趋势变化 ── 1~3 系列 → line          要体现体量 → area / areaStack
          └ 看占比变化 → areaPercent
占比构成 ── ≤7 类 → pie              要看汇总 → doughnut(环形)
          └ 堆叠对比 → barPercent
两种量纲 → dualAxis      关联分布 → scatter / bubble
流程转化 → funnel        流向分配 → sankey      增减过程 → waterfall
多维评估 → radar         矩阵分布 → heatmap     比例×绝对值 → mekko
词频     → wordCloud
```

常见错误:时间序列别用柱状(用 line);>7 类别别用饼图(合并或改 bar);同量纲别上双轴;排名用 hbar 而非竖柱。

## 类型 → 数据形状 → 推荐色板

`render_chart.py` 支持 `bar / hbar / line / area`;其余类型按 SKILL「各类型出图要点」手写。色板定义见 `colors-and-style.md`。

| 类型 | chartType | 列要求 | 第1列 | 其余列 | 推荐色板 |
|---|---|---|---|---|---|
| 柱状图 | `bar` | 2+ | 分类 | 数值×N(并列) | 深蓝对比系 |
| 条形图 | `hbar` / `horizontalBar` | 2+ | 分类 | 数值×N | 深蓝对比系 |
| 分组柱/条 | `barGroup` / `horizontalBarGroup` | 3+ | 分类 | 多数值并列 | 专业蓝系 |
| 百分比柱/条 | `barPercent` / `horizontalBarPercent` | 3+ | 分类 | 多数值(堆叠100%) | 专业蓝系前6色 |
| 折线图 | `line` | 2+ | 时间/分类 | 各折线数值 | 专业蓝系 |
| 面积图 | `area` | 2+ | 时间/分类 | 数值(填充透明度≤0.3) | 专业蓝系 |
| 堆叠面积 | `areaStack` | 3+ | 时间/分类 | 多数值(堆叠,≤5系列) | 专业蓝系 |
| 百分比面积 | `areaPercent` | 3+ | 时间/分类 | 多数值(堆叠100%) | 深蓝对比系 |
| 饼图 | `pie` | 2 | 分类 | 数值 | 饼图/热力渐变系 |
| 环形图 | `doughnut` | 2 | 分类 | 数值 | 饼图/热力渐变系 |
| 散点图 | `scatter` | 3~4 | 标识 | X, Y, [分组] | 散点/马赛克系 |
| 气泡图 | `bubble` | 4~5 | 标识 | X, Y, 尺寸, [分组] | 散点/马赛克系 |
| 双轴图 | `dualAxis` | 3+ | 分类 | 柱值×N + **末列折线** | 暖冷对比系 |
| 雷达图 | `radar` | 3+ | 维度 | 多系列(≤3) | 专业蓝系 |
| 漏斗图 | `funnel` | 2 | 阶段 | 数值 | 漏斗渐变系 |
| 桑基图 | `sankey` | 3(固定) | Source | Target, Value | 专业蓝系 |
| 瀑布图 | `waterfall` / `waterfallDecrease` | 2+ | 分类 | 数值(空串=无值) | 涨绿`#53B589`/跌红`#D03132` |
| 词云 | `wordCloud` | 2 | 词语 | 权重 | 专业蓝系 |
| 热力图 | `heatmap` | 3+ | 行标签 | 各列值 | 饼图/热力渐变系 |
| 马赛克 | `mekko` / `mekkoPercent` | 3+ | 分类 | 多数值 | 散点/马赛克系 |

## 容易踩的格式细节

- **dualAxis**:VChart 按**列位置**区分 —— 最后 1 列是折线(右轴),其余数值列是柱状(左轴)。`columns` 仍是 `string[]`,不是对象。
- **waterfall**:不需要的格用**空字符串** `""`,不是 `null`/`0`。
- **sankey**:固定 3 列 `Source, Target, Value`,每行一条边。
- **scatter/bubble**:第1列标识,第2/3列 X/Y,bubble 第4列为尺寸,最后可选分组列。

## 场景速配(组合推荐)

| 场景 | 主图 | 辅图 |
|---|---|---|
| 经营报告 | line(营收趋势) | barGroup(业务线) + pie(收入构成) + dualAxis(收入+增长率) |
| 销售漏斗 | funnel | bar(各阶段转化率) |
| 财务分析 | waterfall(利润) | dualAxis(收入+利润率) |
| 竞品分析 | scatter(价格-质量) | radar(多维能力) |
| 项目进度 | hbar(达标绿/未达标红) | barPercent(资源占比) |
