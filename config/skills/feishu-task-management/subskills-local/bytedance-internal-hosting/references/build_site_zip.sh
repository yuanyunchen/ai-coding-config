#!/bin/bash
# Goofy 快速网页预览的部署包打包脚本(扁平 zip)
# ---------------------------------------------------------------
# 从 Search×Pixel 分析的 build_site_zip.sh 清洗而来。把已 build 好的若干页
# (如 core/index.html + full/index.html)拷成扁平文件,再生成一个 landing
# index.html(卡片导航),zip -j -X 成扁平包,上传 deploy.bytedance.net。
#
# 用法:改 SITE 名、拷贝行、landing 文案后,在 deliverables 目录下 ./build_site_zip.sh
# 上传卡在 Chrome 插件 file_upload(只认会话目录)→ 见 inject_file.md 文件注入。
set -e
cd "$(dirname "$0")"

SITE=/tmp/my_site                 # 临时组装目录(改成你的名字)
rm -rf "$SITE"; mkdir -p "$SITE"

# ---- 1. 把各页拷成扁平文件(每个 build 产物 → 一个 .html)----
cp core/index.html "$SITE/core.html"
cp full/index.html "$SITE/full.html"

# ---- 2. 生成 landing index.html(卡片导航;Goofy 默认开 index.html)----
cat > "$SITE/index.html" <<'HTML'
<!doctype html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>报告标题</title>
<style>body{margin:0;font-family:"Hiragino Sans GB","PingFang SC",system-ui,sans-serif;background:#f7f4ee;color:#1a1a1a;display:flex;min-height:100vh;align-items:center;justify-content:center}
.wrap{max-width:680px;padding:48px 32px}.t{font-family:Georgia,serif;font-size:30px;font-weight:700;margin:0 0 6px}.s{color:#666;margin:0 0 32px;font-size:15px;line-height:1.6}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:18px}@media(max-width:560px){.cards{grid-template-columns:1fr}}
a.card{display:block;text-decoration:none;color:inherit;border:1px solid #e3ddd2;border-radius:14px;padding:24px;background:#fff;transition:.15s}
a.card:hover{border-color:#1f6f8b;box-shadow:0 6px 22px rgba(31,111,139,.12);transform:translateY(-2px)}
.k{font-size:13px;letter-spacing:.08em;color:#1f6f8b;font-weight:700}.h{font-size:19px;font-weight:700;margin:8px 0 6px}.d{font-size:13.5px;color:#666;line-height:1.6}
.foot{margin-top:28px;font-size:12.5px;color:#999}</style></head>
<body><div class="wrap">
<p class="t">报告标题</p>
<p class="s">一句话副标题(主分析窗 / 范围 / 怎么读)。</p>
<div class="cards">
<a class="card" href="core.html"><div class="k">核心分析</div><div class="h">决策向 · 一屏看懂</div><div class="d">关键结论摘要</div></a>
<a class="card" href="full.html"><div class="k">完整分析</div><div class="h">同行复核 · 全量</div><div class="d">方法学 · 全章 · 可折叠 SQL · 附录</div></a>
</div>
<p class="foot">数据源 / 引擎 / 口径脚注</p>
</div></body></html>
HTML

# ---- 3. 扁平 zip(-j 去路径,-X 去 macOS 扩展属性)----
ZIP="$PWD/my_site.zip"; rm -f "$ZIP"
( cd "$SITE" && zip -j -X "$ZIP" index.html core.html full.html >/dev/null )
echo "built $ZIP"; unzip -l "$ZIP" | tail -5
