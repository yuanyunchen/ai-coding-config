#!/usr/bin/env python3
"""布局质量度量 —— 不开浏览器就能判断 xgap/ygap 调对没有。

这是 starmap 里最容易反复返工的一环："太长了""标签叠一起了""连线太长"
都是可量化的。与其截图靠眼睛，不如先把数算出来。

复刻 starmap.js 的 layoutDAG（ALAP 分层 → 重心排序 → 中位对齐），
然后报四组数：

  1 包围盒与长宽比      —— 长宽比 > 3 读起来就像一条带子，该收 xgap / 放 ygap
  2 边长的均值与标准差  —— 标准差大 = 有长边乱窜，分层没吃住
  3 交叉数与回边数      —— 回边应为 0；有回边说明 dagIgnore 漏了成环的边
  4 相邻列的标签余量    —— 最小余量 ≤ 0 就是标签叠在一起，xgap 到底了

用法：
    python3 check_layout.py data.json --label-fields name,raw --xgap 202 --ygap 200
    python3 check_layout.py data.json --sweep xgap 170 240 10   # 扫一遍找拐点

data.json = {"nodes": {id: {...}}, "links": [{"s":..,"t":..}]}
"""
import argparse
import itertools
import json
import math
import sys
import unicodedata


# ── 文本宽度估算 ──────────────────────────────────────────────────────
# canvas measureText 拿不到，这里按字符类别估：等宽拉丁 ≈ 0.6em，
# CJK 与全角 ≈ 1.0em。误差在 ±5% 量级，判断"叠没叠"足够；
# 真正卡在 0 附近时还是要在浏览器里用 measureText 复核。
def text_w(s, px):
    w = 0.0
    for ch in str(s):
        w += px if unicodedata.east_asian_width(ch) in ("W", "F") else px * 0.6
    return w


def layout_dag(nodes, links, xgap, ygap, ignore=()):
    ids = list(nodes)
    E = [l for l in links
         if l["s"] in nodes and l["t"] in nodes and (l["s"], l["t"]) not in ignore]
    succ = {n: [] for n in ids}
    pred = {n: [] for n in ids}
    for l in E:
        succ[l["s"]].append(l["t"])
        pred[l["t"]].append(l["s"])

    asap, s1 = {}, set()
    def up(n):
        if n in asap: return asap[n]
        if n in s1: return 0
        s1.add(n)
        asap[n] = max([up(p) + 1 for p in pred[n]], default=0)
        return asap[n]
    for n in ids: up(n)
    MAX = max(asap.values())

    alap, s2 = {}, set()
    def down(n):
        if n in alap: return alap[n]
        if n in s2: return MAX
        s2.add(n)
        alap[n] = min([down(c) - 1 for c in succ[n]], default=MAX)
        return alap[n]
    for n in ids: down(n)

    layer = dict(alap)
    byL = {}
    for n in ids:
        byL.setdefault(layer[n], []).append(n)
    Ls = sorted(byL)
    pos = {n: i for L in Ls for i, n in enumerate(byL[L])}

    for it in range(6):
        fwd = it % 2 == 0
        for L in (Ls if fwd else Ls[::-1]):
            def ref(n):
                rel = [pos[m] for m in (pred[n] if fwd else succ[n]) if layer[m] != L]
                return sum(rel) / len(rel) if rel else pos[n]
            byL[L].sort(key=ref)
            for i, n in enumerate(byL[L]):
                pos[n] = i

    P = {}
    for L in Ls:
        arr = byL[L]
        for i, n in enumerate(arr):
            P[n] = [L * xgap, (i - (len(arr) - 1) / 2) * ygap]

    for _ in range(40):
        for L in Ls:
            arr = byL[L]
            for n in arr:
                rel = [m for m in pred[n] + succ[n] if layer[m] != L]
                if not rel:
                    continue
                m = sorted(P[x][1] for x in rel)
                t = m[len(m) // 2] if len(m) % 2 else (m[len(m) // 2 - 1] + m[len(m) // 2]) / 2
                P[n][1] += (t - P[n][1]) * 0.28
            arr.sort(key=lambda n: P[n][1])
            for i in range(1, len(arr)):
                gap = P[arr[i]][1] - P[arr[i - 1]][1]
                if gap < ygap:
                    push = (ygap - gap) / 2
                    P[arr[i - 1]][1] -= push
                    P[arr[i]][1] += push
    return P, layer, byL, Ls


def seg_cross(a, b, c, d):
    def o(p, q, r):
        v = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1])
        return 0 if abs(v) < 1e-9 else (1 if v > 0 else 2)
    o1, o2, o3, o4 = o(a, b, c), o(a, b, d), o(c, d, a), o(c, d, b)
    return o1 != o2 and o3 != o4


def report(nodes, links, P, layer, byL, Ls, args, ignore=()):
    fields = args.label_fields.split(",")
    def half(n):
        return max((text_w(nodes[n].get(f, ""), args.label_px) for f in fields),
                   default=0) / 2

    # 包围盒按标签外沿算，跟 fitView 看到的一致 —— 只算节点中心会低估一整圈
    w = max(P[n][0] + half(n) for n in P) - min(P[n][0] - half(n) for n in P)
    h = (max(p[1] for p in P.values()) - min(p[1] for p in P.values())
         + args.label_stack_px)

    lens = [math.dist(P[l["s"]], P[l["t"]]) for l in links
            if l["s"] in P and l["t"] in P]
    mean = sum(lens) / len(lens)
    sd = math.sqrt(sum((x - mean) ** 2 for x in lens) / len(lens))

    segs = [(P[l["s"]], P[l["t"]]) for l in links if l["s"] in P and l["t"] in P]
    crossings = sum(1 for (a, b), (c, d) in itertools.combinations(segs, 2)
                    if a != c and a != d and b != c and b != d and seg_cross(a, b, c, d))
    # 回边只在参与分层的边里数：被 ignore 的边本来就允许逆向
    back = sum(1 for l in links
               if (l["s"], l["t"]) not in ignore
               and l["s"] in layer and l["t"] in layer and layer[l["s"]] >= layer[l["t"]])

    # 相邻列标签余量：两列间的水平空隙 - 两侧标签半宽
    worst = None
    for L1, L2 in zip(Ls, Ls[1:]):
        for a in byL[L1]:
            for b in byL[L2]:
                if abs(P[a][1] - P[b][1]) > args.label_row_px:   # 行不重叠就不会撞
                    continue
                slack = (P[b][0] - P[a][0]) - half(a) - half(b) - args.label_gap
                if worst is None or slack < worst[0]:
                    worst = (slack, a, b)

    vw = args.viewport
    k = min((vw - 50) / w, (args.viewport_h - 170) / h) * .96

    print(f"节点 {len(P)} · 边 {len(links)} · 层 {len(Ls)}"
          f"（每层 {[len(byL[L]) for L in Ls]}）")
    print(f"  包围盒        {w:.0f} × {h:.0f}   长宽比 {w/h:.2f}"
          f"   {'← 偏带状，收 xgap 或放 ygap' if w/h > 3 else ''}")
    print(f"  边长          均值 {mean:.0f}  标准差 {sd:.0f}"
          f"   {'← 长边乱窜' if sd > mean * .45 else ''}")
    print(f"  交叉 {crossings}   回边 {back}"
          f"   {'← 回边应为 0，检查 dagIgnore' if back else ''}")
    if worst:
        s, a, b = worst
        print(f"  标签最小余量  {s:+.0f}px  （{a} ↔ {b}）"
              f"   {'← 已重叠' if s < 0 else ('← 到底了' if s < 12 else '')}")
    print(f"  {vw}px 视口下自动缩放 k = {k:.2f}"
          f"   {'← 低于 0.55 会看不清' if k < .55 else ''}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("data")
    ap.add_argument("--xgap", type=int, default=202)
    ap.add_argument("--ygap", type=int, default=200)
    ap.add_argument("--label-fields", default="name",
                    help="用哪些字段当标签，逗号分隔（取最宽的一个）")
    ap.add_argument("--label-px", type=float, default=11.0, help="标签字号")
    ap.add_argument("--label-gap", type=float, default=10.0, help="两标签之间要求的最小空隙")
    ap.add_argument("--label-row-px", type=float, default=30.0,
                    help="纵向差小于此值才算同一行、可能相撞")
    ap.add_argument("--label-stack-px", type=float, default=100.0,
                    help="节点下方标签栈的总高，计入包围盒纵向")
    ap.add_argument("--viewport", type=int, default=1440)
    ap.add_argument("--viewport-h", type=int, default=900)
    ap.add_argument("--ignore", default="", help="不参与分层的边，形如 a>b,c>d")
    ap.add_argument("--sweep", nargs=4, metavar=("PARAM", "LO", "HI", "STEP"),
                    help="扫参：xgap|ygap 起 止 步长")
    a = ap.parse_args()

    D = json.load(open(a.data, encoding="utf-8"))
    nodes, links = D["nodes"], D["links"]
    ignore = {tuple(p.split(">")) for p in a.ignore.split(",") if ">" in p}

    if a.sweep:
        param, lo, hi, step = a.sweep[0], *map(int, a.sweep[1:])
        for v in range(lo, hi + 1, step):
            xg, yg = (v, a.ygap) if param == "xgap" else (a.xgap, v)
            P, layer, byL, Ls = layout_dag(nodes, links, xg, yg, ignore)
            print(f"\n── {param}={v} ──")
            args2 = argparse.Namespace(**{**vars(a), "xgap": xg, "ygap": yg})
            report(nodes, links, P, layer, byL, Ls, args2, ignore)
        return

    P, layer, byL, Ls = layout_dag(nodes, links, a.xgap, a.ygap, ignore)
    report(nodes, links, P, layer, byL, Ls, a, ignore)


if __name__ == "__main__":
    main()
