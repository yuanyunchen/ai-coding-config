"""Make a concept-graph data file safe to ship as an example: keep the structure and the aggregate statistics, drop
everything that points at a single page.

    python3 tools/strip_graph.py <real graph.json> site/data/graph_v2/graph.json

Removed: the page id list (`pages`, `pages_own`), every node's example indices (`ex`, `exw`, `ex_pool`, `exemplars`) and the
thumbnail folder (`thumbs`). Floats are rounded to four significant decimals. Node names, definitions, counts, vote
effects and links stay: they are statistics over many pages, not user content.
"""
import json, sys

DROP_TOP = ("pages", "pages_own", "thumbs")
DROP_NODE = ("ex", "exw", "ex_pool", "exemplars")


def rnd(x):
    if isinstance(x, float):
        return float(f"{x:.4g}")
    if isinstance(x, list):
        return [rnd(v) for v in x]
    if isinstance(x, dict):
        return {k: rnd(v) for k, v in x.items()}
    return x


def main(src, dst):
    g = json.load(open(src))
    for k in DROP_TOP:
        g.pop(k, None)
    for n in g["nodes"]:
        for k in DROP_NODE:
            n.pop(k, None)
    g["example_data"] = "aggregates only: page ids, example pages and thumbnails removed (tools/strip_graph.py)"
    with open(dst, "w") as f:
        json.dump(rnd(g), f, separators=(",", ":"), ensure_ascii=False)


if __name__ == "__main__":
    main(*sys.argv[1:3])
