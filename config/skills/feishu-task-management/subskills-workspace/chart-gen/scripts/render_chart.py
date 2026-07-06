#!/usr/bin/env python3
"""Render a data chart to a self-contained SVG. Pure Python stdlib, no deps.

Handles the geometry-heavy chart types where hand-computing coordinates and
axis ticks is error-prone: bar, hbar (horizontal bar), line, area.
Other types (pie, scatter, radar, funnel, sankey, waterfall, heatmap...) are
authored by hand per SKILL.md — this script does not cover them.

Data format (same as all chart types):
  {"columns": ["X", "S1", "S2"], "data": [{"X": "Jan", "S1": 10, "S2": 8}, ...]}
First column = category/time axis; remaining columns = numeric series.

Usage:
  render_chart.py --type bar --data '<json>' --title "T" [--unit 万元] [--out f.svg]
  render_chart.py --type line --data-file data.json --out f.svg
No --out => SVG printed to stdout.
"""
import argparse
import html
import json
import math
import sys

W = 680
PAD_L, PAD_R, PAD_T, PAD_B = 64, 28, 56, 56
# Professional-blue series palette (see references/colors-and-style.md)
SERIES = ["#0A345E", "#18ADED", "#A6A7AD", "#1A82EB", "#74CEF4",
          "#138ABE", "#76B4F3", "#898A91", "#0E688E", "#E1E2E4"]
BAR_SERIES = ["#00295C", "#2568BD", "#9F9F9F", "#C5C5C5", "#00B0F0", "#4BCFFF"]

BASE_STYLE = """text{font-family:-apple-system,"SF Pro Text","Helvetica Neue","PingFang SC","Microsoft YaHei",Arial,sans-serif;fill:#1C1C1A}
.th{font-size:14px;font-weight:500}.ts{font-size:12px;font-weight:400}.t{font-size:14px;font-weight:400}
.grid{stroke:#E1E2E4;stroke-width:1}.axis{stroke:#898A91;stroke-width:1}
.lbl{fill:#3D4852}.ax{fill:#3D4852}"""


def esc(s):
    return html.escape(str(s), quote=True)


def nice_ticks(vmin, vmax, target=6):
    """Return (lo, hi, step) covering [vmin,vmax] with ~target steps of 1/2/5*10^n."""
    if vmax <= vmin:
        vmax = vmin + 1
    span = vmax - vmin
    raw = span / max(1, target)
    mag = 10 ** math.floor(math.log10(raw)) if raw > 0 else 1
    for m in (1, 2, 5, 10):
        if raw <= m * mag:
            step = m * mag
            break
    else:
        step = 10 * mag
    lo = math.floor(vmin / step) * step
    hi = math.ceil(vmax / step) * step
    return lo, hi, step


def fmt(v):
    if v == int(v):
        v = int(v)
    s = f"{v:,}"
    return s


def parse(data):
    cols = data["columns"]
    rows = data["data"]
    cats = [r[cols[0]] for r in rows]
    series = cols[1:]
    vals = {s: [float(r.get(s, 0) or 0) for r in rows] for s in series}
    return cols[0], cats, series, vals


def legend(series, palette, y):
    """Top-right legend. Returns SVG string."""
    if len(series) <= 1:
        return ""
    out, x = [], W - PAD_R
    items = list(enumerate(series))
    # measure right-to-left
    widths = [len(esc(s)) * 7 + 26 for _, s in items]
    x = W - PAD_R - sum(widths)
    for i, s in items:
        c = palette[i % len(palette)]
        out.append(f'<rect x="{x:.1f}" y="{y-9}" width="12" height="12" rx="2" fill="{c}"/>')
        out.append(f'<text class="ts ax" x="{x+16:.1f}" y="{y}" dominant-baseline="central">{esc(s)}</text>')
        x += widths[i]
    return "".join(out)


def y_axis(lo, hi, step, x0, top, bottom):
    out = []
    n = round((hi - lo) / step)
    for i in range(n + 1):
        v = lo + i * step
        y = bottom - (v - lo) / (hi - lo) * (bottom - top)
        out.append(f'<line class="grid" x1="{x0}" y1="{y:.1f}" x2="{W-PAD_R}" y2="{y:.1f}"/>')
        out.append(f'<text class="ts ax" x="{x0-8}" y="{y:.1f}" text-anchor="end" dominant-baseline="central">{esc(fmt(v))}</text>')
    return "".join(out)


def render_vbar(cats, series, vals, palette):
    top, bottom, x0, x1 = PAD_T, 0, PAD_L, W - PAD_R
    height = PAD_T + max(len(cats), 1) * 0 + 320  # plot area baseline set below
    plot_h = 280
    bottom = top + plot_h
    allv = [v for s in series for v in vals[s]]
    lo, hi, step = nice_ticks(min(0, min(allv, default=0)), max(allv, default=1))
    parts = [y_axis(lo, hi, step, x0, top, bottom)]
    n = len(cats)
    band = (x1 - x0) / max(n, 1)
    ns = len(series)
    bw = band * 0.62 / max(ns, 1)
    show_lbl = n <= 8
    for ci in range(n):
        cx = x0 + band * ci + band * 0.19
        for si, s in enumerate(series):
            v = vals[s][ci]
            bh = (v - lo) / (hi - lo) * (bottom - top)
            bx = cx + si * bw
            by = bottom - bh
            c = palette[si % len(palette)]
            parts.append(f'<rect x="{bx:.1f}" y="{by:.1f}" width="{bw:.1f}" height="{bh:.1f}" rx="2" fill="{c}"/>')
            if show_lbl:
                parts.append(f'<text class="ts lbl" x="{bx+bw/2:.1f}" y="{by-6:.1f}" text-anchor="middle">{esc(fmt(v))}</text>')
        parts.append(f'<text class="ts ax" x="{x0+band*ci+band/2:.1f}" y="{bottom+18}" text-anchor="middle">{esc(cats[ci])}</text>')
    parts.append(f'<line class="axis" x1="{x0}" y1="{bottom}" x2="{x1}" y2="{bottom}"/>')
    return "".join(parts), bottom + 40


def render_hbar(cats, series, vals, palette):
    x0, x1, top = PAD_L + 40, W - PAD_R, PAD_T
    n = len(cats)
    row_h = 38
    plot_h = n * row_h
    bottom = top + plot_h
    allv = [v for s in series for v in vals[s]]
    lo, hi, step = nice_ticks(0, max(allv, default=1))
    parts = []
    # vertical gridlines
    steps = round((hi - lo) / step)
    for i in range(steps + 1):
        v = lo + i * step
        x = x0 + (v - lo) / (hi - lo) * (x1 - x0)
        parts.append(f'<line class="grid" x1="{x:.1f}" y1="{top}" x2="{x:.1f}" y2="{bottom}"/>')
        parts.append(f'<text class="ts ax" x="{x:.1f}" y="{bottom+18}" text-anchor="middle">{esc(fmt(v))}</text>')
    ns = len(series)
    bh = row_h * 0.62 / max(ns, 1)
    for ci in range(n):
        ry = top + row_h * ci + row_h * 0.19
        for si, s in enumerate(series):
            v = vals[s][ci]
            bw = (v - lo) / (hi - lo) * (x1 - x0)
            by = ry + si * bh
            c = palette[si % len(palette)]
            parts.append(f'<rect x="{x0}" y="{by:.1f}" width="{bw:.1f}" height="{bh:.1f}" rx="2" fill="{c}"/>')
            parts.append(f'<text class="ts lbl" x="{x0+bw+6:.1f}" y="{by+bh/2:.1f}" dominant-baseline="central">{esc(fmt(v))}</text>')
        parts.append(f'<text class="ts ax" x="{x0-8}" y="{top+row_h*ci+row_h/2:.1f}" text-anchor="end" dominant-baseline="central">{esc(cats[ci])}</text>')
    parts.append(f'<line class="axis" x1="{x0}" y1="{top}" x2="{x0}" y2="{bottom}"/>')
    return "".join(parts), bottom + 40


def render_line(cats, series, vals, palette, area=False):
    top, x0, x1 = PAD_T, PAD_L, W - PAD_R
    plot_h = 280
    bottom = top + plot_h
    allv = [v for s in series for v in vals[s]]
    lo, hi, step = nice_ticks(min(allv, default=0), max(allv, default=1))
    parts = [y_axis(lo, hi, step, x0, top, bottom)]
    n = len(cats)
    xs = [x0 + (x1 - x0) * (i / max(n - 1, 1)) for i in range(n)]
    for ci in range(n):
        parts.append(f'<text class="ts ax" x="{xs[ci]:.1f}" y="{bottom+18}" text-anchor="middle">{esc(cats[ci])}</text>')
    for si, s in enumerate(series):
        pts = []
        for ci in range(n):
            v = vals[s][ci]
            y = bottom - (v - lo) / (hi - lo) * (bottom - top)
            pts.append((xs[ci], y))
        c = palette[si % len(palette)]
        d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
        if area:
            ad = d + f" L{pts[-1][0]:.1f} {bottom} L{pts[0][0]:.1f} {bottom} Z"
            parts.append(f'<path d="{ad}" fill="{c}" fill-opacity="0.18" stroke="none"/>')
        lw = 2 if len(series) == 1 else 1.5
        parts.append(f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{lw}" stroke-linejoin="round" stroke-linecap="round"/>')
        if n <= 15:
            for x, y in pts:
                parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2.5" fill="{c}"/>')
    parts.append(f'<line class="axis" x1="{x0}" y1="{bottom}" x2="{x1}" y2="{bottom}"/>')
    return "".join(parts), bottom + 40


def build(args, data):
    _, cats, series, vals = parse(data)
    t = args.type
    palette = BAR_SERIES if t in ("bar", "hbar") else SERIES
    if t == "bar":
        body, h = render_vbar(cats, series, vals, palette)
    elif t == "hbar":
        body, h = render_hbar(cats, series, vals, palette)
    elif t == "line":
        body, h = render_line(cats, series, vals, palette, area=False)
    elif t == "area":
        body, h = render_line(cats, series, vals, palette, area=True)
    else:
        sys.exit(f"unsupported --type {t}; use bar|hbar|line|area (other types are hand-authored)")
    head = []
    title = args.title or ""
    if title:
        unit = f"  ({esc(args.unit)})" if args.unit else ""
        head.append(f'<text class="th" x="{PAD_L}" y="28">{esc(title)}{unit}</text>')
    head.append(legend(series, palette, 28 if not title else 28))
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {int(h)}" width="100%" '
        f'role="img" aria-labelledby="t d">'
        f'<title id="t">{esc(title or t)}</title>'
        f'<desc id="d">{esc(t)} chart, {len(series)} series, {len(cats)} categories</desc>'
        f'<style>{BASE_STYLE}</style>'
        + "".join(head) + body + "</svg>"
    )
    return svg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--type", required=True, choices=["bar", "hbar", "line", "area"])
    ap.add_argument("--data")
    ap.add_argument("--data-file")
    ap.add_argument("--title", default="")
    ap.add_argument("--unit", default="")
    ap.add_argument("--out")
    a = ap.parse_args()
    if a.data_file:
        with open(a.data_file, encoding="utf-8") as f:
            data = json.load(f)
    elif a.data:
        data = json.loads(a.data)
    else:
        sys.exit("provide --data or --data-file")
    svg = build(a, data)
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(svg)
        print(a.out)
    else:
        print(svg)


if __name__ == "__main__":
    main()
