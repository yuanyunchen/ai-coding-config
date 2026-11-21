"""Synthetic site data in the contract shapes (.agents/memory/contracts.md, "Site data").

    python3 dual/site/make_fixture.py                       # 2,000 pages -> deliverables/dualmap/data/fixture
    python3 dual/site/make_fixture.py --pages 11000 --no-thumbs --out deliverables/dualmap/data/fixture11k

Every number is made up. points.json carries "fixture": true (one key beyond the contract) so the
site shows its fixture banner wherever the folder is copied. Thumbnails need Pillow.
"""
import argparse, json, math, os, random
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MONTHS = ["2026-%02d" % m for m in range(1, 10)]
ENCODERS = ["dinov2_b14__fold", "dinov2_b14__full", "clip_b16__fold", "clip_b16__full"]
K = 12  # clusters; the last two are home to no look, so corr.json lists them as unexplained
MODELS = ["fixture-model-%s" % c for c in "abcdefghij"]
SUBCATS = ["landing page", "dashboard", "portfolio", "online store", "blog"]
SUBJECTS = ["a neighbourhood bakery", "a climbing gym", "a note-taking app", "a jazz festival", "a bike repair shop",
            "a budgeting tool", "a ceramics studio", "a language school", "a weather service", "a plant nursery"]

# layer 0, the elements: id, type, name, base rate, effect on resid
ELEMENTS = [
    ("ctx_landing", "context", "Landing page", .25, 0), ("ctx_dashboard", "context", "Dashboard app", .10, 0),
    ("ctx_portfolio", "context", "Portfolio", .08, 0), ("ctx_store", "context", "Online store", .08, 0),
    ("prim_violet", "primitive", "Violet accent", .08, -.10), ("prim_gradient", "primitive", "Dominant gradient", .06, -.15),
    ("prim_cream", "primitive", "Cream background", .05, .08), ("prim_warm", "primitive", "Warm accent", .06, .06),
    ("prim_dark_bg", "primitive", "Dark background", .06, -.05), ("prim_neon", "primitive", "Neon accent", .03, -.08),
    ("prim_mono", "primitive", "Monochrome palette", .06, .02), ("prim_serif", "primitive", "Serif headline", .06, .10),
    ("prim_sysfont", "primitive", "System font headline", .15, -.12), ("prim_oversized", "primitive", "Oversized headline", .08, .05),
    ("prim_mono_type", "primitive", "Monospace type", .03, 0), ("prim_photo", "primitive", "Photo imagery", .08, .30),
    ("prim_icon_tiles", "primitive", "Icon tile cards", .08, -.08), ("prim_illustration", "primitive", "Illustration", .05, .04),
    ("str_hero_split", "structure", "Split hero", .08, .05), ("str_stats_strip", "structure", "Stats strip", .06, 0),
    ("str_card_grid", "structure", "Card grid", .10, -.04), ("str_marquee", "structure", "Logo marquee", .04, .03),
    ("str_sidebar", "structure", "Sidebar navigation", .04, 0), ("str_whitespace", "structure", "Generous whitespace", .08, .06),
    ("rel_text_over_photo", "relation", "Text over photo", .03, .18), ("rel_cta_first", "relation", "Call to action up top", .20, .07),
    ("rel_centered", "relation", "Centred hero text", .12, -.03),
    ("fail_overflow", "failure", "Text overflow", .04, -.45), ("fail_blank", "failure", "Blank first screen", .015, -.90),
    ("fail_broken_img", "failure", "Broken image", .025, -.35),
]
# layers 1-3: id, type, layer, name, parts, what combining adds beyond the parts (planted: positive, negative or nothing)
COMBOS = [
    ("c_editorial", "composition", 1, "Serif on cream", ["prim_serif", "prim_cream"], .40),
    ("c_purple_grad", "composition", 1, "Violet gradient", ["prim_violet", "prim_gradient"], -.40),
    ("c_photo_hero", "composition", 1, "Photo split hero", ["prim_photo", "str_hero_split"], 0),
    ("c_text_photo", "composition", 1, "Headline over photo", ["prim_oversized", "rel_text_over_photo"], .35),
    ("c_icon_grid", "composition", 1, "Icon card grid", ["prim_icon_tiles", "str_card_grid"], -.35),
    ("c_neon_dark", "composition", 1, "Neon on dark", ["prim_neon", "prim_dark_bg"], 0),
    ("c_dash_shell", "composition", 1, "Sidebar with stats", ["str_sidebar", "str_stats_strip"], 0),
    ("c_warm_serif", "composition", 1, "Warm serif", ["prim_warm", "prim_serif"], 0),
    ("c_mono_space", "composition", 1, "Mono with whitespace", ["prim_mono", "str_whitespace"], .35),
    ("c_centered_cta", "composition", 1, "Centred call to action", ["rel_centered", "rel_cta_first"], 0),
    ("c_illus_cards", "composition", 1, "Illustrated cards", ["prim_illustration", "str_card_grid"], 0),
    ("c_term", "composition", 1, "Terminal type on dark", ["prim_mono_type", "prim_dark_bg"], -.30),
    ("c2_magazine", "composition", 2, "Magazine layout", ["c_editorial", "c_photo_hero"], .30),
    ("c2_saas_tpl", "composition", 2, "SaaS template", ["c_purple_grad", "c_icon_grid", "c_centered_cta"], -.40),
    ("c2_immersive", "composition", 2, "Immersive photo", ["c_text_photo", "c_photo_hero"], 0),
    ("c2_cyber", "composition", 2, "Cyber dashboard", ["c_neon_dark", "c_dash_shell"], 0),
    ("c2_gallery", "composition", 2, "Quiet gallery", ["c_mono_space", "prim_photo"], .30),
    ("c2_boutique", "composition", 2, "Boutique storefront", ["c_warm_serif", "c_photo_hero"], 0),
    ("c2_friendly", "composition", 2, "Friendly product", ["c_illus_cards", "c_centered_cta"], 0),
    ("c2_hacker", "composition", 2, "Hacker console", ["c_term", "prim_neon"], -.30),
    ("sty_editorial", "style", 3, "Editorial serif", ["c2_magazine", "str_whitespace"], 0),
    ("sty_luxury", "style", 3, "Luxury elegant", ["c2_boutique", "prim_cream"], .30),
    ("sty_photo", "style", 3, "Photo immersive", ["c2_immersive", "rel_cta_first"], 0),
    ("sty_minimal", "style", 3, "Minimal clean", ["c2_gallery", "rel_centered"], 0),
    ("sty_saas", "style", 3, "Corporate SaaS", ["c2_saas_tpl", "str_marquee"], 0),
    ("sty_purple", "style", 3, "Purple gradient", ["c2_saas_tpl", "prim_dark_bg"], -.30),
    ("sty_dark_neon", "style", 3, "Dark neon tech", ["c2_cyber", "prim_mono_type"], 0),
    ("sty_dashboard", "style", 3, "App dashboard", ["c2_cyber", "str_card_grid"], 0),
    ("sty_playful", "style", 3, "Playful illustrated", ["c2_friendly", "prim_warm"], .25),
    ("sty_terminal", "style", 3, "Retro terminal", ["c2_hacker", "str_sidebar"], 0),
]
# look -> home cluster, monthly trend
LOOK_HOME = {"sty_editorial": (6, .9), "sty_luxury": (8, .4), "sty_photo": (5, .2), "sty_minimal": (7, .1), "sty_saas": (1, -.6),
             "sty_purple": (2, -.9), "sty_dark_neon": (9, -.5), "sty_dashboard": (3, 0), "sty_playful": (0, 0), "sty_terminal": (4, .3)}
IS_A = [("sty_terminal", "sty_dark_neon"), ("sty_purple", "sty_saas")]
CONTRASTS = [("prim_serif", "prim_sysfont"), ("prim_cream", "prim_dark_bg"), ("sty_minimal", "sty_saas")]
CONDITIONED = [("str_stats_strip", "ctx_dashboard"), ("rel_cta_first", "ctx_landing")]
PARTS = {c[0]: c[4] for c in COMBOS}
EFFECT = {**{e[0]: e[4] for e in ELEMENTS}, **{c[0]: c[5] for c in COMBOS}}


def below(cid):  # the concept and everything it is built from
    return {cid}.union(*(below(p) for p in PARTS.get(cid, [])))


for _c, _ps in PARTS.items():  # parts of one combination share nothing, so "sum of its parts" counts each element once
    assert sum(len(below(p)) for p in _ps) == len(below(_c)) - 1, _c


def build(n_pages, seed=0):
    R = random.Random(seed)
    T = n_pages // 4
    strength = {m: R.gauss(0, .5) for m in MODELS}
    centre = [(R.uniform(-5, 5), R.uniform(-5, 5)) for _ in range(K)]
    base_w = [R.uniform(.6, 1.4) for _ in range(K)]
    home = {k: (look, tr) for look, (k, tr) in LOOK_HOME.items()}
    looks = list(LOOK_HOME)

    pages, tours, z, clus, has = [], [], [], [], defaultdict(set)
    for t in range(T):
        mi = t * len(MONTHS) // T
        tm = (mi - 4) / 4
        rows = []
        for _ in range(4):
            k = R.choices(range(K), [b * math.exp(home[k][1] * tm) if k in home else b for k, b in enumerate(base_w)])[0]
            zz = (centre[k][0] + R.gauss(0, .6), centre[k][1] + R.gauss(0, .6))
            mine = set()
            if k in home and R.random() < .7:
                mine |= below(home[k][0])
            if R.random() < .04:
                mine |= below(R.choice(looks))
            for c in COMBOS:
                if c[2] == 1 and R.random() < .03:
                    mine |= below(c[0])
            mine |= {e[0] for e in ELEMENTS if R.random() < e[3]}
            if "prim_serif" in mine:
                mine.discard("prim_sysfont")
            for c in COMBOS:  # a combination is present exactly when all its parts are (COMBOS is in layer order)
                if mine >= set(c[4]):
                    mine.add(c[0])
                else:
                    mine.discard(c[0])
            model = R.choice(MODELS)
            resid = sum(EFFECT[c] for c in mine) + R.gauss(0, .8)
            rows.append(dict(model=model, k=k, z=zz, mine=mine, resid=round(max(-3, min(3, resid)), 2),
                             rank=resid + strength[model] + R.gauss(0, .5)))
        rows.sort(key=lambda r: -r["rank"])
        idx = []
        for place, r in enumerate(rows, 1):
            i = len(pages)
            idx.append(i)
            pages.append(dict(id="fx-%06d" % i, t=t, month=MONTHS[mi], model=r["model"], placement=place,
                              resid=r["resid"], thumb="thumbs/fx-%06d.webp" % i))
            z.append(r["z"]); clus.append(r["k"])
            for cid in r["mine"]:
                has[cid].add(i)
        sub = R.choice(SUBCATS)
        tours.append(dict(id="fxt-%05d" % t, prompt="Build a %s for %s." % (sub, R.choice(SUBJECTS)),
                          month=MONTHS[mi], subcategory=sub, pages=idx))
    N = len(pages)

    # monthly score per page, within +-0.5 like a win rate minus one half: a direction in the latent plane that turns
    # over the year, plus the concept effects
    def score(i, mi, ctrl):
        a = math.pi * mi / (len(MONTHS) - 1)
        s = .035 * (math.cos(a) * z[i][0] + math.sin(a) * z[i][1]) + .3 * sum(EFFECT[c] for c in EFFECT if i in has[c])
        return max(-.5, min(.5, s + (0 if ctrl else .12 * strength[pages[i]["model"]])))

    encoders = {}
    for ei, enc in enumerate(ENCODERS):
        Re = random.Random(seed * 100 + ei + 1)
        cen = [(Re.uniform(-30, 30), Re.uniform(-30, 30)) for _ in range(K)]
        rot = Re.uniform(0, 6.28)
        cs, sn = math.cos(rot), math.sin(rot)
        xs, ys = [], []
        for i in range(N):
            dx, dy = z[i][0] - centre[clus[i]][0], z[i][1] - centre[clus[i]][1]
            xs.append(round(cen[clus[i]][0] + 7 * (cs * dx - sn * dy), 2))
            ys.append(round(cen[clus[i]][1] + 7 * (sn * dx + cs * dy), 2))
        # stand-in for the 30-neighbour mean: mean resid over the 3x3 grid cells around the page
        cell = defaultdict(list)
        for i in range(N):
            cell[(int(xs[i] // 3), int(ys[i] // 3))].append(pages[i]["resid"])
        knn = []
        for i in range(N):
            cx, cy = int(xs[i] // 3), int(ys[i] // 3)
            v = [r for a in (-1, 0, 1) for b in (-1, 0, 1) for r in cell.get((cx + a, cy + b), ())]
            knn.append(round(sum(v) / len(v), 3))
        encoders[enc] = dict(
            x=xs, y=ys, cluster=clus, resid_knn=knn,
            pref={m: [round(score(i, mi, False) + Re.gauss(0, .02), 3) for i in range(N)] for mi, m in enumerate(MONTHS)},
            pref_ctrl={m: [round(score(i, mi, True) + Re.gauss(0, .02), 3) for i in range(N)] for mi, m in enumerate(MONTHS)})

    meta = [(e[0], e[1], 0, e[2]) for e in ELEMENTS] + [c[:4] for c in COMBOS]
    ids = [m[0] for m in meta]
    by_month = defaultdict(list)
    for i, p in enumerate(pages):
        by_month[p["month"]].append(i)
    # Node effects are drawn around the planted values (parts + what combining adds), with the sampling error the
    # member count would give. They are not estimated from the pages: a present-vs-absent contrast counts a part
    # again in everything built from it, and the sum over parts then swamps the planted combination effects.
    drift = {c: R.uniform(-.8, .8) for c in EFFECT}  # how much a planted effect changes from January to September

    def stats(cid, done, members, total, tm):  # -> effect fields for one node over one set of pages
        own = EFFECT[cid] * (1 + drift[cid] * tm)
        nin = max(1, len(members))
        se = .8 * math.sqrt(1 / nin + 1 / max(1, total - nin))
        d = own + sum(done[p]["true"] for p in PARTS.get(cid, [])) + R.gauss(0, se)  # planted value + sampling error
        o = dict(pref=round(d, 3), pref_lo=round(d - 1.96 * se, 3), pref_hi=round(d + 1.96 * se, 3), n=len(members),
                 true=own + sum(done[p]["true"] for p in PARTS.get(cid, [])), se=se)
        if cid in PARTS:
            exp = sum(done[p]["pref"] for p in PARTS[cid])
            dse = math.sqrt(se ** 2 + sum(done[p]["se"] ** 2 for p in PARTS[cid]))
            o.update(expected=round(exp, 3), delta=round(d - exp, 3),
                     delta_lo=round(d - exp - 1.96 * dse, 3), delta_hi=round(d - exp + 1.96 * dse, 3))
        return o

    public = lambda o: {k: v for k, v in o.items() if k not in ("true", "se")}
    nodes, pooled, monthly = {}, {}, {m: {} for m in MONTHS}
    for cid, typ, layer, name in meta:  # layer order, so parts are done before what they form
        pooled[cid] = stats(cid, pooled, has[cid], N, 0)
        for mi, m in enumerate(MONTHS):
            monthly[m][cid] = stats(cid, monthly[m], has[cid] & set(by_month[m]), len(by_month[m]), (mi - 4) / 4)
        nodes[cid] = dict(id=cid, type=typ, layer=layer, name=name,
                          definition="Fixture concept: stands in for a page whose first screen shows %s." % name.lower(),
                          supply={m: round(len(has[cid] & set(ix)) / len(ix), 4) for m, ix in by_month.items()},
                          supply_all=round(len(has[cid]) / N, 4), **public(pooled[cid]),
                          # beyond the contract: the same fields per month, so the month control can recolour the graph
                          by_month={m: public(monthly[m][cid]) for m in MONTHS})

    edge = lambda a, b, t, **kw: dict(src=a, dst=b, type=t, lift=None, phi=None, **kw)
    edges = [edge(p, c, "composed_of", part_pref=nodes[p]["pref"]) for c, ps in PARTS.items() for p in ps]
    edges += [edge(a, b, "is_a") for a, b in IS_A] + [edge(a, b, "contrasts_with") for a, b in CONTRASTS]
    edges += [edge(a, b, "conditioned_on") for a, b in CONDITIONED]
    tied = {frozenset((e["src"], e["dst"])) for e in edges}
    for ai, a in enumerate(ids):
        for b in ids[ai + 1:]:
            na, nb, nj = len(has[a]), len(has[b]), len(has[a] & has[b])
            # parts and what they form co-occur by construction; that is the composed_of flow, not a co_occurs link
            if frozenset((a, b)) in tied or a in below(b) or b in below(a) or not na or not nb or nj < .01 * N:
                continue
            lift = nj * N / (na * nb)
            if lift >= 1.5:
                phi = (nj * N - na * nb) / math.sqrt(na * nb * (N - na) * (N - nb))
                edges.append(dict(src=a, dst=b, type="co_occurs", lift=round(lift, 2), phi=round(phi, 3)))

    in_k = [[i for i in range(N) if clus[i] == k] for k in range(K)]
    lift = [[round(sum(i in has[c] for i in in_k[k]) / max(1, len(in_k[k])) / max(1e-9, len(has[c]) / N), 2)
             for c in ids] for k in range(K)]
    one = dict(clusters=list(range(K)), concepts=ids, lift=lift,
               unexplained=[k for k in range(K) if max(lift[k]) < 1.5])
    return dict(points=dict(fixture=True, months=MONTHS, encoders=encoders, pages=pages), tournaments=tours,
                graph=dict(nodes=list(nodes.values()), edges=edges), members={c: sorted(has[c]) for c in ids},
                corr={e: one for e in ENCODERS})


def check(d):
    P, N = d["points"], len(d["points"]["pages"])
    for enc in P["encoders"].values():
        assert all(len(enc[f]) == N for f in ("x", "y", "cluster", "resid_knn"))
        assert all(len(enc[f][m]) == N for f in ("pref", "pref_ctrl") for m in P["months"])
    for ti, t in enumerate(d["tournaments"]):
        assert [P["pages"][i]["placement"] for i in t["pages"]] == [1, 2, 3, 4]
        assert all(P["pages"][i]["t"] == ti for i in t["pages"])
    ids = {n["id"] for n in d["graph"]["nodes"]}
    assert set(d["members"]) == ids and all(0 <= i < N for m in d["members"].values() for i in m)
    assert all(e["src"] in ids and e["dst"] in ids for e in d["graph"]["edges"])
    assert all(c["unexplained"] for c in d["corr"].values())
    by = {n["id"]: n for n in d["graph"]["nodes"]}
    for e in d["graph"]["edges"]:  # composed_of runs from a part to the thing it forms, one layer or more up
        assert e["type"] != "composed_of" or by[e["src"]]["layer"] < by[e["dst"]]["layer"]
    dl = [n for n in by.values() if "delta" in n]
    assert any(n["delta_lo"] > 0 for n in dl) and any(n["delta_hi"] < 0 for n in dl) \
        and any(n["delta_lo"] <= 0 <= n["delta_hi"] for n in dl), "need positive, negative and neutral combinations"


def thumbs(d, out):
    from PIL import Image, ImageDraw
    os.makedirs(os.path.join(out, "thumbs"), exist_ok=True)
    os.makedirs(os.path.join(out, "thumbs_s"), exist_ok=True)
    has = defaultdict(set)
    for c, ix in d["members"].items():
        for i in ix:
            has[i].add(c)
    for i, p in enumerate(d["points"]["pages"]):
        h, R = has[i], random.Random(i)
        bg = (18, 20, 28) if "prim_dark_bg" in h else (243, 234, 214) if "prim_cream" in h else \
             (122, 104, 224) if "prim_gradient" in h else (250, 250, 250)
        dark = sum(bg) < 400
        ink = (236, 238, 245) if dark else (30, 30, 34)
        acc = (116, 104, 224) if "prim_violet" in h else (224, 140, 70) if "prim_warm" in h else \
              (63, 224, 240) if "prim_neon" in h else (60, 120, 220)
        im = Image.new("RGB", (480, 300), bg)
        g = ImageDraw.Draw(im)
        g.rectangle([24, 16, 84, 26], fill=ink)
        for x in (300, 350, 400):
            g.rectangle([x, 18, x + 36, 24], fill=ink)
        if "fail_blank" not in h:
            w = 190 if "str_hero_split" in h or "prim_photo" in h else 300
            hh = 26 if "prim_serif" in h else 20
            g.rectangle([24, 70, 24 + w, 70 + hh], fill=ink)
            g.rectangle([24, 104, 24 + int(w * .7), 104 + hh], fill=ink)
            g.rectangle([24, 146, 24 + w - 30, 152], fill=acc if dark else (140, 140, 146))
            if "rel_cta_first" in h:
                g.rounded_rectangle([24, 172, 124, 198], 6, fill=acc)
            if "prim_photo" in h:
                g.rectangle([260, 60, 456, 200], fill=(143, 174, 140))
                g.ellipse([400, 76, 436, 112], fill=(240, 220, 150))
            if "str_card_grid" in h or "prim_icon_tiles" in h:
                for x in (24, 172, 320):
                    g.rounded_rectangle([x, 226, x + 136, 290], 8, outline=acc, width=2)
            if "str_stats_strip" in h:
                for x in (40, 160, 280, 400):
                    g.rectangle([x, 212, x + 50, 220], fill=acc)
        g.text((396, 284), "FIXTURE %d" % R.randint(100, 999), fill=(150, 150, 150))
        im.save(os.path.join(out, "thumbs", p["id"] + ".webp"), quality=60)
        im.resize((96, 60)).save(os.path.join(out, "thumbs_s", p["id"] + ".webp"), quality=60)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=2000)
    ap.add_argument("--out", default=os.path.join(ROOT, "deliverables/dualmap/data/fixture"))
    ap.add_argument("--no-thumbs", action="store_true", help="write thumb: null and no image files")
    a = ap.parse_args()
    d = build(a.pages)
    check(d)
    if a.no_thumbs:
        for p in d["points"]["pages"]:
            p["thumb"] = None
    os.makedirs(a.out, exist_ok=True)
    for name in ("points", "tournaments", "graph", "members", "corr"):
        with open(os.path.join(a.out, name + ".json"), "w") as f:
            json.dump(d[name], f, separators=(",", ":"))
    if not a.no_thumbs:
        thumbs(d, a.out)
    print(a.out, len(d["points"]["pages"]), "pages,", len(d["tournaments"]), "tournaments,",
          len(d["graph"]["nodes"]), "concepts,", len(d["graph"]["edges"]), "edges, unexplained clusters",
          d["corr"][ENCODERS[0]]["unexplained"])
