#!/usr/bin/env python3
"""把 shell + 引擎 + 样式 + 字体 + 数据装配成单文件 HTML。

单文件是硬要求：产物要能拷到别人机器上双击打开，不能依赖 http 服务、
不能依赖 CDN。所以字体走 base64 内嵌、CSS/JS 全部内联。

用法：
    python3 build_page.py --shell app.html --data data.json --out dist/index.html
    # 可选：--fonts <dir>  提供 woff2；没有就退化到系统字体栈

shell 里的占位符：
    __FONTS__   → @font-face 块（由 --fonts 生成，没有则空）
    __CSS__     → assets/starmap.css
    __ENGINE__  → assets/starmap.js
    __DATA__    → --data 的 JSON（紧凑序列化）
其余 __XXX__ 占位符由你自己在 shell 里填掉，本脚本不管。
"""
import argparse
import base64
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "assets")

# 只嵌拉丁子集：中文走系统字体（PingFang/微软雅黑），中文 woff2 动辄几 MB，
# 内嵌进单文件会让产物大到打不开。starmap 的中文本来就用不到特殊字形。
LATIN = ("U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+2122,"
         "U+2190-21BB,U+2212,U+2215,U+25A0-25FF,U+2600-26FF")

FAMILIES = [
    ("Syne",          "syne-latin.woff2",    "400 800"),   # display：标题
    ("Space Grotesk", "grotesk-latin.woff2", "300 700"),   # ui：正文
    ("JetBrains Mono","mono-latin.woff2",    "300 700"),   # data：标识符与数字
]


def font_css(font_dir):
    if not font_dir or not os.path.isdir(font_dir):
        return ""
    out = []
    for name, fn, wt in FAMILIES:
        p = os.path.join(font_dir, fn)
        if not os.path.exists(p):
            print(f"  [skip] {fn} 不存在，该字体退化到系统栈", file=sys.stderr)
            continue
        b64 = base64.b64encode(open(p, "rb").read()).decode()
        out.append(
            "@font-face{font-family:'%s';font-style:normal;font-weight:%s;"
            "font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2');"
            "unicode-range:%s;}" % (name, wt, b64, LATIN))
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shell", required=True, help="填好业务钩子的 shell HTML")
    ap.add_argument("--data", required=True, help="{nodes, links} 的 JSON")
    ap.add_argument("--out", required=True)
    ap.add_argument("--fonts", default=os.path.join(ASSETS, "fonts"))
    a = ap.parse_args()

    shell = open(a.shell, encoding="utf-8").read()
    css = open(os.path.join(ASSETS, "starmap.css"), encoding="utf-8").read()
    eng = open(os.path.join(ASSETS, "starmap.js"), encoding="utf-8").read()
    data = json.load(open(a.data, encoding="utf-8"))

    # 用函数替换，避免 JSON/CSS 里的反斜杠被当成 re 的组引用
    for token, payload in (("__FONTS__", font_css(a.fonts)),
                           ("__CSS__", css),
                           ("__ENGINE__", eng),
                           ("__DATA__", json.dumps(data, ensure_ascii=False,
                                                   separators=(",", ":")))):
        if token not in shell:
            print(f"  [warn] shell 里没有 {token}", file=sys.stderr)
        shell = shell.replace(token, payload)

    left = re.findall(r"__[A-Z_]+__", shell)
    if left:
        print(f"  [warn] 仍有未填占位符：{sorted(set(left))}", file=sys.stderr)

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    open(a.out, "w", encoding="utf-8").write(shell)
    print(f"→ {a.out}  ({len(shell)/1024:.0f} KB, "
          f"{len(data['nodes'])} 节点 / {len(data['links'])} 边)")


if __name__ == "__main__":
    main()
