#!/usr/bin/env python3
"""explainer 页面检查(中、高档使用)。

用法: python3 check.py page.html [--width 1030]
检查: 外部资源引用、残留占位符、首屏禁用项、ASCII 行宽、内联 SVG 显示字号、图是否有解释。
退出码: 有 FAIL 时为 1。WARN 只提示。
"""
import argparse
import re
import sys
import unicodedata

SELF_REF = ["本文", "本轮", "本节", "留档", "未探测", "接下来我们", "我们来看", "如图所示", "一图带走", "详见下文", "下面展开"]
ASCII_MAX = 90
MIN_PX = 11.0


def dwidth(s):
    return sum(2 if unicodedata.east_asian_width(c) in ("W", "F") else 1 for c in s)


def strip_tags(s):
    s = re.sub(r"<script\b.*?</script>|<style\b.*?</style>", "", s, flags=re.S | re.I)
    return re.sub(r"<[^>]+>", " ", s)


def unescape(s):
    return s.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")


def first_screen(html):
    """首屏 = 第二个 <section> 之前的 body 内容,去掉 <details>。"""
    body = re.search(r"<body\b.*?>(.*)</body>", html, flags=re.S | re.I)
    body = body.group(1) if body else html
    secs = [m.start() for m in re.finditer(r"<section\b", body, flags=re.I)]
    cut = secs[1] if len(secs) > 1 else len(body)
    return re.sub(r"<details\b.*?</details>", "", body[:cut], flags=re.S | re.I)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("page")
    ap.add_argument("--width", type=float, default=820, help="图的最窄显示宽度(px),模板中 svg 的 min-width")
    a = ap.parse_args()
    html = open(a.page, encoding="utf-8").read()
    fails, warns = [], []

    # 1. 外部资源(<a href> 链接不算)
    ext = re.findall(r"<(?:script|img|link|iframe|source|video|audio)\b[^>]*?(?:src|href)=[\"'](?:https?:)?//[^\"']+", html, flags=re.I)
    ext += re.findall(r"url\(\s*[\"']?(?:https?:)?//[^)]+\)|@import\s+[\"']?(?:https?:)?//", html, flags=re.I)
    if ext:
        fails.append(f"外部资源引用 {len(ext)} 处,单文件要求为 0: {ext[:3]}")

    # 2. 残留占位符与标题
    ph = re.findall(r"\{\{[^}]*\}\}", html)
    if ph:
        fails.append(f"残留模板占位符 {len(ph)} 处: {ph[:3]}")
    t = re.search(r"<title>(.*?)</title>", html, flags=re.S | re.I)
    if not t or not t.group(1).strip():
        fails.append("缺少 <title>")

    # 3. 首屏
    fs = first_screen(html)
    fs_text = strip_tags(re.sub(r'<div class="ids">.*?</div>', "", fs, flags=re.S))
    for w in SELF_REF:
        if w in fs_text:
            fails.append(f"首屏出现自指/元说明: 「{w}」")
    code_in_fs = re.findall(r"<(?:code|pre)\b", re.sub(r'<div class="ids">.*?</div>', "", fs, flags=re.S), flags=re.I)
    if code_in_fs:
        warns.append(f"首屏有 {len(code_in_fs)} 处 <code>/<pre>;代码与参数应放展开区(原始标识放页眉 .ids)")
    params = re.findall(r"\b\w+=\S+(?:\s*[·,]\s*\w+=\S+){2,}", fs_text)
    if params:
        warns.append(f"首屏疑似成串参数: {params[:2]}")
    caps = sorted(set(re.findall(r"\b[A-Z][A-Z0-9_]{3,}\b", fs_text)))
    if caps:
        warns.append(f"首屏全大写标识,确认已解释: {caps[:8]}")

    # 4. ASCII 行宽
    for i, m in enumerate(re.finditer(r'<pre class="ascii"[^>]*>(.*?)</pre>', html, flags=re.S | re.I), 1):
        lines = unescape(re.sub(r"<[^>]+>", "", m.group(1))).split("\n")
        over = [(n + 1, dwidth(l)) for n, l in enumerate(lines) if dwidth(l) > ASCII_MAX]
        if over:
            warns.append(f"ASCII 图 #{i} 有 {len(over)} 行超过 {ASCII_MAX} 列: {over[:3]}")

    # 5. 内联 SVG 显示字号
    for i, m in enumerate(re.finditer(r"<svg\b(.*?)>(.*?)</svg>", html, flags=re.S | re.I), 1):
        vb = re.search(r'viewBox="[\d.\s-]+?\s([\d.]+)\s+[\d.]+"', m.group(1))
        if not vb:
            continue
        vw = float(vb.group(1))
        scale = min(a.width, vw) / vw
        sizes = [float(x) for x in re.findall(r'font-size[=:]\s*"?([\d.]+)', m.group(2))]
        small = sorted({s for s in sizes if s * scale < MIN_PX})
        if small:
            fails.append(f"SVG #{i}(viewBox 宽 {vw:.0f},显示缩放 {scale:.2f})逻辑字号 {small} 显示后 < {MIN_PX}px")

    # 6. 图有解释
    figs = re.findall(r"<figure\b.*?</figure>", html, flags=re.S | re.I)
    nocap = [n for n, f in enumerate(figs, 1) if not re.search(r"<figcaption\b[^>]*>\s*\S", f, flags=re.I)]
    if nocap:
        fails.append(f"第 {nocap} 个 <figure> 没有 figcaption(读图说明)")

    for f in fails:
        print("FAIL ", f)
    for w in warns:
        print("WARN ", w)
    print(f"结果: {len(fails)} FAIL, {len(warns)} WARN, {len(figs)} 张图")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
