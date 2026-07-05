#!/usr/bin/env python3
"""Assemble two self-contained (offline, single-file) HTML reports.
Inlines shared CSS, chart data (2-week baseline), trend data, chart engine,
and (for full) base64 heatmap.
Single source of truth: _shared.css, _charts.js, _{core,full}_body.html.
主分析窗 = 2 周(charts_2w);时间趋势 = charts_trend.json(3d/1w/2w/1m)。
"""
import json, base64, pathlib, re
import _drill

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent

css   = (HERE / "_shared.css").read_text(encoding="utf-8")
charts_js = (HERE / "_charts.js").read_text(encoding="utf-8")

# mini-TOC 滚动高亮(scrollspy,零依赖):当前可视 section 对应的锚点加 .act
TOC_JS = """
(function(){
  var links = [].slice.call(document.querySelectorAll('.mini-toc a[href^="#"]'));
  if(!links.length) return;
  var map = {};
  links.forEach(function(a){ var t=document.getElementById(a.getAttribute('href').slice(1)); if(t) map[a.getAttribute('href').slice(1)]=a; });
  var secs = Object.keys(map).map(function(id){ return document.getElementById(id); });
  function onScroll(){
    var y = window.scrollY + 120, cur = null;
    secs.forEach(function(sec){ if(sec.offsetTop <= y) cur = sec.id; });
    links.forEach(function(a){ a.classList.remove('act'); });
    if(cur && map[cur]) map[cur].classList.add('act');
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
})();
"""

def inject_drills(body):
    # 把 {{DRILL:id}} 占位符替换为对应折叠区 HTML(id 含字母/数字/下划线)
    return re.sub(r"\{\{DRILL:([a-zA-Z0-9_]+)\}\}", lambda m: _drill.render([m.group(1)]), body)
# 主数据 = 2 周窗
data  = json.loads((ROOT / "charts_2w" / "chartdata.json").read_text(encoding="utf-8"))
data_json = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
# 趋势数据 = 4 嵌套窗
trend = json.loads((ROOT / "charts_trend.json").read_text(encoding="utf-8"))
trend_json = json.dumps(trend, ensure_ascii=False, separators=(",", ":"))

# base64 位图内联助手(自包含,无外部引用)
def _data_uri(rel):
    b = (ROOT / rel).read_bytes()
    return "data:image/png;base64," + base64.b64encode(b).decode()

# top100 主城热力图(仅 full 内联,替代旧 top18)
heatmap_top100_uri = _data_uri("charts_2w/c_D4_heatmap_top100.png")
# 大洲覆盖倍数横向条形(core + full 都内联)
continental_uri = _data_uri("charts_2w/c_F_continental.png")

def page(title, desc, body_html, embed_heatmap):
    body = (HERE / body_html).read_text(encoding="utf-8")
    # 大洲图:core + full 均内联(镜像 heatmap 逻辑)
    body = body.replace("CONTINENTAL_PLACEHOLDER", continental_uri)
    if embed_heatmap:
        body = body.replace("HEATMAP_TOP100_PLACEHOLDER", heatmap_top100_uri)
    body = inject_drills(body)
    # 占位符未被消费 = body 引用了未定义的 drill id,直接报错(防静默缺块)
    leftover = re.findall(r"\{\{DRILL:[^}]+\}\}", body)
    assert not leftover, f"{body_html}: unresolved drill placeholders {leftover}"
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="{desc}">
<title>{title}</title>
<style>
{css}
</style>
</head>
<body>
{body}
<script>
const PSQ_DATA = {data_json};
const PSQ_TREND = {trend_json};
</script>
<script>
{charts_js}
</script>
<script>
document.addEventListener("DOMContentLoaded", function () {{
  if (window.PSQCharts) window.PSQCharts.renderAll(PSQ_DATA, PSQ_TREND);
{TOC_JS}
}});
</script>
</body>
</html>
"""

core = page(
    "Search vs Pixel · City 信号增量分析(2 周)· 核心分析",
    "字节广告算法团队 · search 与 pixel city 信号离线增量分析核心结论(2 周为主 + 时间跨度趋势,决策向)",
    "_core_body.html", embed_heatmap=False)
full = page(
    "Search vs Pixel · City 信号深度增量分析(2 周)· 完整分析",
    "字节广告算法团队 · search 与 pixel city 信号离线增量分析完整报告(2 周为主 + 时间跨度趋势,同行复核)",
    "_full_body.html", embed_heatmap=True)

(HERE / "core" / "index.html").write_text(core, encoding="utf-8")
(HERE / "full" / "index.html").write_text(full, encoding="utf-8")

print(f"core/index.html  {len(core.encode('utf-8')):>9,} bytes")
print(f"full/index.html  {len(full.encode('utf-8')):>9,} bytes")
# sanity: no external refs (no http/cdn), heatmap inlined in full only
for name, html in (("core", core), ("full", full)):
    ext = re.findall(r'(?:href|src)="(https?:)?//', html)
    print(f"  {name}: external refs = {len(ext)} (expect 0); has data-uri img = {'data:image' in html}")
"""sanity on placeholders"""
for name, html in (("core", core), ("full", full)):
    assert "CONTINENTAL_PLACEHOLDER" not in html, f"{name}: continental placeholder not replaced"
    assert "HEATMAP_PLACEHOLDER" not in html, f"{name}: stale HEATMAP_PLACEHOLDER still present"
    assert "HEATMAP_TOP100_PLACEHOLDER" not in html, f"{name}: top100 heatmap placeholder not replaced"
assert "HEATMAP_TOP100_PLACEHOLDER" not in core, "core should not reference heatmap"
# core 内联大洲图(1 张),full 内联大洲 + top100 热力图(2 张)
assert core.count("data:image/png;base64,") == 1, f"core expected 1 inlined png, got {core.count('data:image/png;base64,')}"
assert full.count("data:image/png;base64,") == 2, f"full expected 2 inlined png, got {full.count('data:image/png;base64,')}"
print("OK: self-contained, no leftover placeholder (core 1 png, full 2 png)")
