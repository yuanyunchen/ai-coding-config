# 配色与样式

基于 118 个真实图表统计,融合 Grafana Light / Financial Times / The Economist。核心理念:**少色相、多色阶**;焦点数据点睛,其余用灰。所有色板经对比度与色盲友好性验证。

## 数据系列色板(HEX,用于柱/线/扇区填充)

### 专业蓝色系(默认,10 色)
```
#0A345E #18ADED #A6A7AD #1A82EB #74CEF4 #E1E2E4 #138ABE #76B4F3 #898A91 #0E688E
```
适用:line, area, areaStack, barGroup, radar, sankey, wordCloud。系列数 = 1 用 `#0A345E`;= 2 用 `#0A345E #18ADED`;3~6 取前 N 色;7~10 用全 10 色;>10 建议合并数据。

### 深蓝对比系(8 色,柱状少系列)
```
#00295C #2568BD #9F9F9F #C5C5C5 #00B0F0 #4BCFFF #C2C2C2 #D7D7D7
```
适用:bar, hbar, areaPercent。单系列 `#00295C`;双系列 `#00295C #2568BD`。

### 暖冷对比系(双轴专用)
```
#D03132 #FFC330 #0147B2 #758D6C #801F1F #5476A9 #3F4F3A #EA750A
```
柱状用暖色(左轴),折线用冷色(右轴)。适用:dualAxis。

### 漏斗渐变系(深→浅)
```
#00328e #0048aa #005fc5 #2778e2 #4e91ff #70abff #8fc7ff #aee2ff
```

### 饼图/热力图渐变系(浅→深,10 色)
```
#D1E6FB #A3CDF7 #76B4F3 #489BEF #1A82EB #1568BC #104E8D #0A345E #051A2F #030D18
```
适用:pie, doughnut, heatmap。

### 瀑布多色系
```
#1A82EB #53B589 #F5A25E #18ADED #857CE1 #F1C649 #898A91 #EE75B4 #77B165 #029EB5
```

### 散点/马赛克系(4 色对比)
```
#003655 #ee5699 #67c9d9 #207281
```

## 灰色 5 级(文字与装饰)

| 级 | 色值 | 用途 | 对比度(on white) |
|---|---|---|---|
| G1 | `#0A345E` 深灰蓝 | 标题、轴标签、关键数据 | 12.6:1 AAA |
| G2 | `#3D4852` 中灰 | 副标题、说明、轴标题、数据标签 | 7.8:1 AAA |
| G3 | `#898A91` 铅灰 | 网格线、辅助轴、脚注 | 3.8:1 AA(大字) |
| G4 | `#C5C5C5` 浅灰 | 背景填充、分隔线、边框 | 仅装饰 |
| G5 | `#E1E2E4` 雾灰 | 区域背景、占位 | 仅装饰 |

文字仅用 G1~G3;G4/G5 仅作装饰。图表背景白色,网格线 G3 虚线,分隔线/边框 G4。

## 语义色板(数据有含义时优先)

| 语义 | 色值 |
|---|---|
| 正值/增长/达标 | `#53B589` 翠绿 |
| 负值/下降/未达标 | `#D03132` 商业红 |
| 中性/基准 | `#898A91` 铅灰 |
| 警告/注意 | `#F5A25E` 橙 |
| 信息 | `#1A82EB` 蓝 |

**同比/环比对比**:本期实色,上期同色系 35% 透明度 —— 如 `["#0A345E", "rgba(10,52,94,0.35)"]`。

## 配色决策优先级

1. **数据有语义** → 用语义色板(正负 → 绿/红;同比 → 实色 + 35% 透明;状态 → 状态色)。
2. **类型有专用色板** → 用上方对应色板(dualAxis 暖冷、funnel 渐变、pie/heatmap 渐变、bar 深蓝对比、waterfall 多色、scatter 马赛克)。
3. **无特殊要求** → 专业蓝系前 N 色。

### 焦点对比(一个焦点 + 多背景)
焦点用一个暖色(`#D03132` 或 `#FFC330`),背景系列全用灰(`#898A91` `#E1E2E4` `#C5C5C5`)。

### 避免
- 红+绿作为唯一区分(色盲不友好);橙+绿、红+棕同理 —— 改用蓝系渐变 / 形状 / 直接标注。
- 浅背景上用黄系(对比不足)。
- 相邻系列用相近色相。
- 3+ 系列饼图用同色系渐变(扇区难分)。

---

## BASE STYLE(手写 SVG 时整段粘进 `<style>`)

```css
/* Chart Gen — Base Embedded Stylesheet (static / image-only, no interaction, no dark mode) */
text {
  font-family: -apple-system, "SF Pro Text", "Helvetica Neue", "PingFang SC",
               "Microsoft YaHei", Arial, sans-serif;
  fill: #1C1C1A;
}
.th { font-size: 14px; font-weight: 500; }
.ts { font-size: 12px; font-weight: 400; }
.t  { font-size: 14px; font-weight: 400; }

/* 9 语义色系 —— 加在 <g> 上,内部 rect/circle/ellipse 继承填充+描边 */
.c-purple > rect, .c-purple > circle, .c-purple > ellipse { fill: #EEEDFE; stroke: #7F77DD; }
.c-purple > text { fill: #3C3489; }
.c-teal > rect, .c-teal > circle, .c-teal > ellipse { fill: #E1F5EE; stroke: #1D9E75; }
.c-teal > text { fill: #085041; }
.c-coral > rect, .c-coral > circle, .c-coral > ellipse { fill: #FAECE7; stroke: #D85A30; }
.c-coral > text { fill: #712B13; }
.c-amber > rect, .c-amber > circle, .c-amber > ellipse { fill: #FAEEDA; stroke: #BA7517; }
.c-amber > text { fill: #633806; }
.c-blue > rect, .c-blue > circle, .c-blue > ellipse { fill: #E6F1FB; stroke: #378ADD; }
.c-blue > text { fill: #0C447C; }
.c-green > rect, .c-green > circle, .c-green > ellipse { fill: #EAF3DE; stroke: #639922; }
.c-green > text { fill: #27500A; }
.c-red > rect, .c-red > circle, .c-red > ellipse { fill: #FCEBEB; stroke: #E24B4A; }
.c-red > text { fill: #791F1F; }
.c-pink > rect, .c-pink > circle, .c-pink > ellipse { fill: #FDE8F0; stroke: #E0478A; }
.c-pink > text { fill: #7D1F48; }
.c-gray > rect, .c-gray > circle, .c-gray > ellipse { fill: #F1EFE8; stroke: #888780; }
.c-gray > text { fill: #444441; }

/* 无色系通用节点 */
.box > rect { fill: #F1EFE8; stroke: #D3D1C7; }
.box > text { fill: #1C1C1A; }

/* 连线 */
.arr    { stroke: #5F5E5A; stroke-width: 1.5; }
.leader { stroke: #888780; stroke-width: 0.5; stroke-dasharray: 4 3; }
.grid   { stroke: #E1E2E4; stroke-width: 1; }
.axis   { stroke: #898A91; stroke-width: 1; }
```
