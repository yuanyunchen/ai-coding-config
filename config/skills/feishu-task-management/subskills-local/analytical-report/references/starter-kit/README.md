# starter-kit — 分析报告设计系统(拷来改)

这是一套**经实战 + 4 路对抗审查打磨**的自包含 HTML 分析报告设计系统,直接从
Search×Pixel City 信号分析的交付物拷来。文件保留了项目专有的口径/数字作为**可工作的范例**,
你新建报告时按下面清单替换专有部分即可。

## 文件作用

| 文件 | 作用 | 通用 / 需改 |
|---|---|---|
| `_shared.css` | 全套设计系统(双色 / 排版 / KPI 卡 / 表 / 趋势表 / 折叠区 / ladder / mini-TOC / 响应式 / 打印) | **几乎全通用**;只在想换调色板时改 `:root` 变量 |
| `_charts.js` | 原生 SVG 图表引擎(纯函数:数据 → `<svg>`,零外部库;`human()` 中文数字、去尾零) | **通用**;按需增删 chart 函数,renderAll 里挂 |
| `_drill.py` | SQL 钻取折叠区单一数据源 + 渲染器(状态 chip / SQL 高亮 / 结果表) | `BLOCKS` 字典是**项目专有内容**,整体替换;渲染器 `block()/_meta()/_table()` 通用 |
| `build.py` | 组装器:内联 css/js/data/base64 图,注入 `{{DRILL:id}}`,自包含 assert | **改路径与 assert**(见下) |
| `heatmap_top.py` | matplotlib 热力图 PNG 渲染器范例(CJK 字体 / ASCII-fold 刻度 / log 色阶) | 范例;按你的图改 |
| `continental_chart.py` | matplotlib 横向发散条形 PNG 范例(双色 / parity 参考线) | 范例;按你的图改 |

> 还需要两份 `_core_body.html` / `_full_body.html` 正文(本 kit 未附,因高度项目专有)。
> 自己写,用 `_shared.css` 的 class、`{{DRILL:id}}` 占位、`CHART_xxx` 容器 id;
> core = 决策向(hero 图 + KPI + verdict),full = 同行复核(全章 + 方法学 + 全图 + 附录)。

## 新建报告时改这些(build.py)

1. **数据路径**:`charts_2w/chartdata.json`(主数据)、`charts_trend.json`(趋势)→ 换成你的。
2. **base64 图**:`_data_uri("charts_2w/c_*.png")` → 换成你的 PNG;core/full 各内联几张要对上 assert。
3. **正文文件名**:`_core_body.html` / `_full_body.html` → 你的。
4. **页面 title / description** → 你的。
5. **收尾 assert**:`core.count("data:image...")==N` 等数字 → 改成你的图数;`占位符全消费` 与
   `外链=0` 两条通用,**保留**(防静默缺块/防意外外部依赖)。

## 调色板(默认)

`search/正 = teal #1f6f8b`,`pixel/负 = orange #c8742a`,暖纸底 `#f7f5f0`,深海军墨 `#16202e`,
serif 标题 + 系统 sans。换主题只改 `_shared.css` 的 `:root` 与 `_charts.js` 顶部 `C` 对象(两处同步)。

## 构建

```bash
python3 build.py            # → core/index.html + full/index.html,过自包含 assert
./build_site_zip.sh         # 打 Goofy 部署包(见 bytedance-internal-hosting skill)
```
build 后必走:Playwright 截图肉眼复验 → ≥4 agent 对抗审查 → 修复闭环(见 ../methodology.md)。
