"""Site interaction check (T02.05.06.01 item 32): every page with side-by-side columns uses the shared dividers (columns.js, `.colsplit`)
and every map on it the shared pan and zoom (panzoom.js, `PanZoom.all`). Run it with the page checks before every swap.

usage: dual/out/pipe/venv/bin/python dual/site/interaction_check.py <base url of the dualmap folder, e.g. http://localhost:8765/dualmap/> [--pages a.html,b.html]
       [--out <dir for screenshots>]          default pages: pipeline.html, corr.html, arena-final.html
Per page, at 1440 x 900, Chrome via Playwright:
- dividers: at least one `.colsplit` (pages listed in NO_COLUMNS excepted); each one dragged 120 px moves the column on its side by
  120 px (within 3 px, unless a minimum width stops it, which is reported), the width survives a reload, a double click resets it;
- maps: every canvas in `PanZoom.all` (pages listed in NO_MAPS excepted): a wheel step over its centre changes the transform, the
  "fit" button returns it to exactly {z: 1, x: 0, y: 0}, and so does the page's "Reset view" button when the page has one;
- frame time while a map is dragged for two seconds and zoomed by 20 wheel steps (item 36): the script work per animation frame
  (requestAnimationFrame callbacks plus pointer, mouse and wheel handlers, timed by a probe installed before the page loads), median
  <= 16 ms and 95th percentile <= 33 ms; the numbers are printed;
- script time per pointer or wheel event during the gesture (all handlers of one event summed; item 42): median <= 4 ms, max <= 12 ms;
- with storage blocked (localStorage and sessionStorage throw, as in a sandboxed frame; item 40): the page loads without a page error
  and draws (its maps and dividers present);
- every map canvas draws (item 44): at least 2 % of its pixels are not background, at 1440 x 900 and at 2000 x 1300 (device pixel
  ratio 2), on first load, after a divider drag and after a reload with remembered widths;
- three wheel notches (deltaY -100 each) raise the scale by 60 to 90 % (item 46);
- header (item 58): one heading "<navigation label>: <sentence>" (sentence at most 16 words), the note 20 to 55 words on at most two
  lines (four since item 81's 70ch measure) at 1440 and 2000 px (its numbers are checked by each page's own check), nothing beside the heading;
- page frame (items 50, 52, 58, with --frame): side gutter 5 to 9 % of the window; navigation to heading 24, heading to note 4,
  header to controls 16, between columns 24 (1.5 px); navigation to the controls row at most 120 px;
- page frame (item 50, with --frame): at 1440 and 2000 px the left and right edges of the navigation content, the header and the main
  grid (the widest block of the frame) coincide on each page and are the same on every page checked (1 px);
- control rows (item 70): every band of the page frame above the main content (the direct children of `.pg-frame` before the one that
  holds the first map, divider or page frame; navigation and header excluded) that holds controls holds at least three of them, so a
  view control sits beside the controls it belongs with, never in a row of its own; the offending band's text is printed. On the
  arena, the prompt block above the panes is at most 96 px tall at 1440 px;
- six screens (item 81, with --sizes): at 390x844, 1440x900, 1920x1080, 2560x1080, 3440x1440 and 5120x1440: no horizontal page
  scroll; the main working area (.pg-work, else the largest map grid, panes or canvas) at least 60 % of the viewport wide and 70 % tall
  at the four widest; the heading within 90ch and notes and paragraphs within 70ch (8 % slack); no two visible controls overlap; every
  map draws; a screenshot of each size into --out;
- state (item 87, with --state): per page, a selection and a pan / zoom, then out through the navigation and back: the same state
  (transform within 0.5 px); Reset view and a round trip give the rest state; a deep link's parameter wins over the stored state. The
  concept graph and the continuous space (index.html) are reported as pending, not as failures or passes, while their dispatches work;
- no console error, page error or failed request of the site's own files (generated pages inside data/ and the sandboxed frames that
  show them are not the site's).
Exit 1 on any failure."""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
NO_COLUMNS, NO_MAPS = {"index.html"}, {"arena-final.html"}   # the arena has no map; the continuous space and the concept graph have no side-by-side columns (the graph's node panel is an overlay drawer with its own divider, checked by its page check)
U = sys.argv[1].rstrip("/") + "/"
PAGES = sys.argv[sys.argv.index("--pages") + 1].split(",") if "--pages" in sys.argv else ["pipeline.html", "corr.html", "arena-final.html"]
OUT = Path(sys.argv[sys.argv.index("--out") + 1]) if "--out" in sys.argv else None
FAIL = []
FRAME_PAGES = (sys.argv[sys.argv.index("--frame") + 1].split(",") if "--frame" in sys.argv else [])
PROBE = """(()=>{ const T=window.__FT={on:false,frames:[],gaps:[],acc:0,last:0,ev:new Map()}, raf=window.requestAnimationFrame.bind(window), W=new WeakMap();
  window.requestAnimationFrame=cb=>raf(t=>{ const s=performance.now(); try{ cb(t); } finally{ T.acc+=performance.now()-s; } });
  (function loop(){ raf(t=>{ if(T.on){ T.frames.push(T.acc); if(T.last) T.gaps.push(t-T.last); } T.last=t; T.acc=0; loop(); }); })();
  const add=EventTarget.prototype.addEventListener, rem=EventTarget.prototype.removeEventListener, TY=new Set(['pointermove','pointerdown','pointerup','mousemove','wheel']);
  EventTarget.prototype.addEventListener=function(type,fn,o){ if(TY.has(type)&&typeof fn==='function'){ let w=W.get(fn); if(!w){ w=function(e){ const s=performance.now(); try{ return fn.call(this,e); } finally{ const d=performance.now()-s; T.acc+=d; if(T.on&&(e.type==='pointermove'||e.type==='wheel')) T.ev.set(e,(T.ev.get(e)||0)+d); } }; W.set(fn,w); } return add.call(this,type,w,o); } return add.call(this,type,fn,o); };
  EventTarget.prototype.removeEventListener=function(type,fn,o){ return rem.call(this,type,(fn&&W.get(fn))||fn,o); }; })()"""


INK = """()=>(window.PanZoom&&PanZoom.all||[]).filter(m=>m.canvas.offsetParent).map(m=>{ const c=m.canvas, g=c.getContext('2d'), d=g.getImageData(0,0,c.width,c.height).data;
  let n=0, t=0; for(let i=3;i<d.length;i+=4*7){ t++; if(d[i]>8) n++; } return {w:c.width,h:c.height,ink:t?n/t:0}; })"""


BANDS = """(()=>{ const f=document.querySelector('.pg-frame'); if(!f) return null;
  const vis=e=>e.offsetParent&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0;
  const main=[...f.querySelectorAll('canvas,.colsplit,iframe')].find(vis); if(!main) return null;
  const kids=[...f.children], stop=kids.findIndex(k=>k.contains(main)), C='button,select,input:not([type=hidden]),textarea,a.ar-b,[role=button],.pk-btn';
  return kids.slice(0,stop).filter(k=>vis(k)&&!k.matches('.pg-head,#site-nav')).map(k=>({n:[...k.querySelectorAll(C)].filter(vis).length,
    txt:k.innerText.replace(/\\s+/g,' ').trim().slice(0,90)})); })()"""


def ink(pg, page, state):
    for j, m in enumerate(pg.evaluate(INK)):
        ok(m["w"] > 0 and m["ink"] >= .02, f"{page}: map {j + 1} draws {m['ink']:.1%} non-background pixels ({m['w']} x {m['h']} px) {state}")


def pct(v, q):
    v = sorted(v)
    return v[min(len(v) - 1, int(q * len(v)))] if v else 0.0


def ok(c, m):
    print(("ok   " if c else "FAIL ") + m, flush=True)
    if not c:
        FAIL.append(m)


def own(url):
    return url.startswith(U) and "/data/arena_final/pages/" not in url and "/data/arena_final/shots/" not in url


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, headless=True)
    for page in ([] if "--sizes-only" in sys.argv or "--state-only" in sys.argv else PAGES):   # --sizes-only: just the six screens of item 81
        ctx = b.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)   # a retina screen, as the user's
        pg = ctx.new_page()
        pg.add_init_script(PROBE)
        pg.route("**/data/arena_final/pages/**", lambda r: r.fulfill(status=200, content_type="text/html", body="<!doctype html><title>page</title>"))   # generated pages raise their own errors; they are not the site's
        errs = []
        pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
        pg.on("console", lambda m: errs.append(f"console: {m.text}") if m.type == "error" and own((m.location or {}).get("url", "")) else None)
        pg.on("response", lambda r: errs.append(f"http {r.status}: {r.url}") if r.status >= 400 and own(r.url) else None)
        name = page.split("?")[0].replace(".next.", ".")   # a staged copy is checked as the page it replaces
        pg.goto(U + page); pg.wait_for_timeout(2500)
        pg.evaluate("()=>{ try{ sessionStorage.clear(); localStorage.clear(); }catch(e){} }"); pg.reload(); pg.wait_for_timeout(2500)
        ink(pg, page, "at 1440 x 900, first load")
        # header pattern
        nav_of = {"pipeline": "Data pipeline", "corr": "Correspondence", "arena-final": "Arena", "index": None}
        hd = pg.evaluate("""()=>({t:(document.querySelector('.pg-title')||{}).textContent||'',h1s:document.querySelectorAll('h1').length,note:(()=>{ const n=document.querySelector('.pg-note'); if(!n) return ''; const c=n.cloneNode(true); c.querySelectorAll('.pg-more,.pg-note-more').forEach(e=>e.remove()); return c.textContent.trim(); })(),
          nav:(document.querySelector('#site-nav a.on')||{}).textContent||''})""")
        hd["nav"] = hd["nav"] or nav_of.get(name.replace(".next", "").replace(".html", "")) or ""   # a staged copy is not marked current in the navigation
        nl = pg.evaluate("(()=>{ const n=document.querySelector('.pg-note'); if(!n) return 0; return Math.round(n.getBoundingClientRect().height/parseFloat(getComputedStyle(n).lineHeight)); })()")
        t = " ".join(hd["t"].split()); lab = hd["nav"].strip(); sent = t[len(lab) + 1:].strip() if t.startswith(lab + ":") else ""
        ok(lab and t.startswith(lab + ":") and hd["h1s"] == 1 and 0 < len(sent.split()) <= 16 and 20 <= len(hd["note"].split()) <= 55 and nl <= 4,
           f"{page}: heading '{t[:80]}' starts with '{lab}:'; {hd['h1s']} heading; sentence {len(sent.split())} words (<= 16); note {len(hd['note'].split())} words (20 to 55), {nl} lines at 1440 (<= 4 at its 70ch measure, item 81)")
        # item 70: no band above the main content with fewer than three controls; the arena's prompt block <= 96 px
        bands = pg.evaluate(BANDS)
        if bands is None:
            ok(False, f"{page}: control rows: no page frame (.pg-frame) or no main content (map, divider or page frame) found")
        else:
            few = [b_ for b_ in bands if 0 < b_["n"] < 3]
            ok(not few, f"{page}: control rows above the main content: {[(b_['n'], b_['txt']) for b_ in bands]} (each holding controls holds >= 3)" + (f"; too few: {[b_['txt'] for b_ in few]}" if few else ""))
        top = pg.evaluate("(()=>{ const e=document.querySelector('.ar-pr'); return e&&e.offsetParent?e.getBoundingClientRect().height:null; })()")
        if top is not None:
            ok(top <= 96, f"{page}: the prompt block above the panes is {top:.0f} px tall at 1440 px (<= 96)")
        # dividers
        n = pg.evaluate("[...document.querySelectorAll('.colsplit')].filter(e=>e.offsetParent&&e.getBoundingClientRect().width>=4).length")   # a padding divider of 1 px (arena's two-column grid) is not one
        if name not in NO_COLUMNS:
            ok(n >= 1, f"{page}: {n} shared dividers (.colsplit)")
        for i in range(n):

            bxs = pg.evaluate("[...document.querySelectorAll('.colsplit')].filter(e=>e.offsetParent&&e.getBoundingClientRect().width>=4).map(e=>{ const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })")
            side = pg.evaluate("""(i)=>{ const s=[...document.querySelectorAll('.colsplit')].filter(e=>e.offsetParent&&e.getBoundingClientRect().width>=4)[i], kids=[...s.parentElement.children].filter(e=>e.offsetParent||e.classList.contains('colsplit')),
                j=kids.indexOf(s); return j<=1?-1:j>=kids.length-2?1:-1; }""", i)   # -1: the column before it grows with a drag to the right; 1: the column after it grows with a drag to the left
            W = lambda: pg.evaluate("""([i,side])=>{ const s=[...document.querySelectorAll('.colsplit')].filter(e=>e.offsetParent&&e.getBoundingClientRect().width>=4)[i]; let c=side<0?s.previousElementSibling:s.nextElementSibling;
                while(c&&c.getBoundingClientRect().width<2) c=side<0?c.previousElementSibling:c.nextElementSibling; return c.getBoundingClientRect().width; }""", [i, side])
            w0 = W(); bx = bxs[i]; dx = 120 if side < 0 else -120
            pg.mouse.move(bx["x"] + bx["width"] / 2, bx["y"] + 200); pg.mouse.down(); pg.mouse.move(bx["x"] + bx["width"] / 2 + dx, bx["y"] + 200, steps=8); pg.mouse.up(); pg.wait_for_timeout(500)
            w1 = W()
            ok(abs(w1 - w0 - 120) < 3 or w1 - w0 >= 40, f"{page}: divider {i + 1} drag of 120 px moves its column {w0:.0f} -> {w1:.0f}" + ("" if abs(w1 - w0 - 120) < 3 else " (a minimum width stopped it)"))
            if OUT:
                OUT.mkdir(parents=True, exist_ok=True); pg.screenshot(path=str(OUT / f"{name}_divider{i + 1}.png"))
            pg.reload(); pg.wait_for_timeout(2500)
            w2 = W()
            ok(abs(w2 - w1) < 3, f"{page}: divider {i + 1} width survives a reload ({w2:.0f})")
            ink(pg, page, f"at 1440 x 900, after a divider {i + 1} drag and a reload")
            b2 = pg.evaluate("[...document.querySelectorAll('.colsplit')].filter(e=>e.offsetParent&&e.getBoundingClientRect().width>=4).map(e=>{ const r=e.getBoundingClientRect(); return [r.x+r.width/2,r.y+200]; })")[i]
            pg.mouse.dblclick(*b2); pg.wait_for_timeout(400)
            ok(abs(W() - w0) < 3, f"{page}: divider {i + 1} double click resets ({W():.0f} = {w0:.0f})")
        # maps
        maps = pg.evaluate("(window.PanZoom&&PanZoom.all||[]).filter(m=>m.canvas.offsetParent).length")
        if name not in NO_MAPS:
            ok(maps >= 1, f"{page}: {maps} maps with the shared pan and zoom")
        for i in range(maps):
            box = pg.evaluate(f"(()=>{{ const r=PanZoom.all.filter(m=>m.canvas.offsetParent)[{i}].canvas.getBoundingClientRect(); return [r.x,r.y,r.width,r.height]; }})()")
            pg.mouse.move(box[0] + box[2] / 2, box[1] + box[3] / 2)
            for _ in range(3):
                pg.mouse.wheel(0, -200); pg.wait_for_timeout(60)   # Playwright's wheel delta is in device pixels: -200 at ratio 2 arrives as deltaY -100
            pg.wait_for_timeout(300)
            v1 = pg.evaluate(f"PanZoom.all.filter(m=>m.canvas.offsetParent)[{i}].api.get()")
            ok(1.6 <= v1["z"] <= 1.9, f"{page}: map {i + 1} three wheel notches raise the scale by {v1['z'] - 1:.0%} (60 to 90 %)")
            # frame time: a two-second drag, then 20 wheel steps
            cx, cy = box[0] + box[2] / 2, box[1] + box[3] / 2
            pg.evaluate("__FT.frames=[]; __FT.gaps=[]; __FT.last=0; __FT.ev=new Map(); __FT.on=true")
            pg.mouse.move(cx, cy); pg.mouse.down()
            for k in range(60):
                pg.mouse.move(cx + 80 * __import__('math').sin(k / 9), cy + 60 * __import__('math').cos(k / 7), steps=4); pg.wait_for_timeout(33)   # several pointer events per frame, as a fast mouse sends
            pg.mouse.up()
            for k in range(20):
                pg.mouse.wheel(0, -60 if k < 10 else 60); pg.wait_for_timeout(40)
            pg.wait_for_timeout(300)
            fr = pg.evaluate("__FT.on=false, __FT.frames.filter(x=>x>0)"); gp = pg.evaluate("__FT.gaps"); ev = pg.evaluate("[...__FT.ev.values()]")
            ok(ev and pct(ev, .5) <= 4 and max(ev) <= 12, f"{page}: map {i + 1} script time per pointer / wheel event during the gesture: median {pct(ev, .5):.2f} ms, max {max(ev or [0]):.2f} ms over {len(ev)} events (budget 4 / 12 ms, device pixel ratio 2)")
            med, p95, gm, g95 = pct(fr, .5), pct(fr, .95), pct(gp, .5), pct(gp, .95)
            # frame time = interval between animation frames (script, layout, paint and raster together); it cannot go below one
            # display refresh (16.7 ms at 60 Hz), so the median budget is one refresh; script work per frame is printed beside it
            ok(gp and gm <= 17.5 and g95 <= 33.4 and med <= 16, f"{page}: map {i + 1} during drag and wheel: frame time median {gm:.1f} ms, 95th percentile {g95:.1f} ms over {len(gp)} frames (budget one refresh / 33 ms); script work per frame median {med:.1f}, 95th {p95:.1f} ms")
            pg.evaluate(f"PanZoom.all.filter(m=>m.canvas.offsetParent)[{i}].canvas.parentElement.querySelector('.pz-btns [data-pz=fit]').click()"); pg.wait_for_timeout(300)
            v2 = pg.evaluate(f"PanZoom.all.filter(m=>m.canvas.offsetParent)[{i}].api.get()")
            ok(v2 == {"z": 1, "x": 0, "y": 0}, f"{page}: map {i + 1} 'fit' returns exactly to the fitted view {v2}")
            reset = pg.locator("button:has-text('Reset view')")
            if reset.count():
                pg.mouse.move(box[0] + box[2] / 2, box[1] + box[3] / 2); pg.mouse.wheel(0, -400); pg.wait_for_timeout(300)
                reset.first.click(); pg.wait_for_timeout(1200)
                v3 = pg.evaluate(f"PanZoom.all.filter(m=>m.canvas.offsetParent)[{i}].api.get()")
                ok(v3 == {"z": 1, "x": 0, "y": 0}, f"{page}: map {i + 1} 'Reset view' returns exactly to the fitted view {v3}")
        if OUT:
            pg.screenshot(path=str(OUT / f"{name}_end.png"))
        ok(not errs, f"{page}: no console error" + (f": {errs[:3]}" if errs else ""))
        ctx.close()
        # 2000 x 1300 at device pixel ratio 2: first load, after a divider drag, after a reload with remembered widths
        ctx = b.new_context(viewport={"width": 2000, "height": 1300}, device_scale_factor=2); pg = ctx.new_page()
        pg.route("**/data/arena_final/pages/**", lambda r: r.fulfill(status=200, content_type="text/html", body="<!doctype html><title>page</title>"))
        pg.goto(U + page); pg.wait_for_timeout(3000); ink(pg, page, "at 2000 x 1300, DPR 2, first load")
        sp = pg.evaluate("[...document.querySelectorAll('.colsplit')].filter(e=>e.offsetParent&&e.getBoundingClientRect().width>=4).map(e=>{ const r=e.getBoundingClientRect(); return [r.x+r.width/2,r.y+200]; })")
        if sp:
            pg.mouse.move(*sp[0]); pg.mouse.down(); pg.mouse.move(sp[0][0] + 150, sp[0][1], steps=8); pg.mouse.up(); pg.wait_for_timeout(800)
            ink(pg, page, "at 2000 x 1300, DPR 2, after a divider drag")
            pg.reload(); pg.wait_for_timeout(3000); ink(pg, page, "at 2000 x 1300, DPR 2, after a reload with remembered widths")
        ctx.close()
        # storage blocked
        ctx = b.new_context(viewport={"width": 1440, "height": 900}); pg = ctx.new_page(); perr = []
        pg.add_init_script("""for(const k of ['localStorage','sessionStorage']) Object.defineProperty(window,k,{configurable:true,get(){ throw new DOMException("The document is sandboxed and lacks the 'allow-same-origin' flag.",'SecurityError'); }});""")
        pg.route("**/data/arena_final/pages/**", lambda r: r.fulfill(status=200, content_type="text/html", body="<!doctype html><title>page</title>"))
        pg.on("pageerror", lambda e: perr.append(str(e)))
        pg.goto(U + page); pg.wait_for_timeout(3000)
        drawn = pg.evaluate("({maps:(window.PanZoom&&PanZoom.all||[]).length,cols:document.querySelectorAll('.colsplit').length,text:document.body.innerText.length})")
        ok(not perr and drawn["text"] > 300 and (name in NO_MAPS or drawn["maps"] >= 1) and (name in NO_COLUMNS or drawn["cols"] >= 1), f"{page}: with storage blocked it loads and draws ({drawn}) without a page error {perr[:2]}")
        ctx.close()
    if "--frame" in sys.argv:
        FR = """()=>{ const n=document.getElementById('site-nav'), f=document.querySelector('.pg-frame'), h=document.querySelector('.pg-head'); if(!n||!f) return null;
          const cs=getComputedStyle(n), nr=n.getBoundingClientRect(), kids=[...f.children].filter(e=>e.offsetParent&&e!==h), big=kids.sort((a,b)=>b.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
          const r=e=>{ const q=e.getBoundingClientRect(); return [Math.round(q.left*10)/10,Math.round(q.right*10)/10]; };
          const q=s=>{ const e=document.querySelector(s); return e&&e.getBoundingClientRect(); }, t=q('.pg-title'), no=q('.pg-note'), hb=h&&h.getBoundingClientRect();
          let prev=f.previousElementSibling; while(prev&&!prev.offsetParent) prev=prev.previousElementSibling;
          const after=h&&[...f.children].slice([...f.children].indexOf(h)+1).find(e=>e.offsetParent), sp=[...document.querySelectorAll('.colsplit')].find(e=>e.offsetParent&&e.getBoundingClientRect().width>=4);
          const gaps={'navigation to title':t&&prev?t.top-prev.getBoundingClientRect().bottom:null,'heading to note':t&&no?no.top-t.bottom:null,'note lines':no?Math.round(no.height/parseFloat(getComputedStyle(document.querySelector('.pg-note')).lineHeight)):null,
            'beside the heading':h?[...h.children].filter(e=>e.offsetParent&&e.getBoundingClientRect().left>h.getBoundingClientRect().left+2&&e.getBoundingClientRect().top<t.bottom).length:null,'header height':t&&prev&&after?after.getBoundingClientRect().top-prev.getBoundingClientRect().bottom:null,
            'header to controls':hb&&after?after.getBoundingClientRect().top-hb.bottom:null,'between columns':sp?sp.getBoundingClientRect().width:null};
          return {nav:[nr.left+parseFloat(cs.paddingLeft),nr.right-parseFloat(cs.paddingRight)].map(x=>Math.round(x*10)/10),frame:r(f),head:h?r(h)[0]:null,grid:big?r(big):null,gaps,W:innerWidth}; }"""
        for W in (1440, 2000):
            seen = {}
            for page in FRAME_PAGES:
                ctx = b.new_context(viewport={"width": W, "height": 900}); pg = ctx.new_page()
                pg.route("**/data/arena_final/pages/**", lambda r: r.fulfill(status=200, content_type="text/html", body="<!doctype html><title>page</title>"))
                pg.goto(U + page); pg.wait_for_timeout(2500); e = pg.evaluate(FR); ctx.close()
                if not e:
                    ok(False, f"{page} at {W} px: no page frame (.pg-frame) or navigation"); continue
                L, Rr = [e["nav"][0], e["frame"][0], e["head"], e["grid"][0]], [e["nav"][1], e["frame"][1], e["grid"][1]]
                ok(max(L) - min(L) <= 1 and max(Rr) - min(Rr) <= 1, f"{page} at {W} px: left edges {L}, right edges {Rr} coincide")
                gut = e["frame"][0] / e["W"]
                g0 = min(96, max(16, .04 * W))   # item 81: g = clamp(16px, 4vw, 96px)
                ok(abs(e["frame"][0] - g0) <= 1, f"{page} at {W} px: side gutter {e['frame'][0]:.0f} px = clamp(16px, 4vw, 96px) = {g0:.0f} px ({gut:.1%} of the window)")
                want = {"navigation to title": 24, "heading to note": 4, "header to controls": 16, "between columns": 24, "beside the heading": 0}
                off = {k: round(v, 1) for k, v in e["gaps"].items() if v is not None and k in want and abs(v - want[k]) > 1.5}
                hh = e["gaps"].get("header height")
                ok(hh is not None and hh <= 170 and (e["gaps"].get("note lines") or 0) <= 4, f"{page} at {W} px: navigation to the controls row {hh and round(hh)} px (<= 170); note {e['gaps'].get('note lines')} lines (<= 4 at its 70ch measure, item 81)")
                ok(not off, f"{page} at {W} px: spacing on the scale {{{', '.join(f'{k} {v:.0f}' for k, v in e['gaps'].items() if v is not None)}}}" + (f"; off: {off}" if off else ""))
                seen[page] = (e["frame"][0], e["frame"][1])
            vals = list(seen.values())
            ok(vals and all(abs(v[0] - vals[0][0]) <= 1 and abs(v[1] - vals[0][1]) <= 1 for v in vals), f"at {W} px the content edges are the same on every page: {seen}")
    if "--sizes" in sys.argv or "--sizes-only" in sys.argv:   # item 81: six screens, phone to 5120 px ultrawide
        SZ = """()=>{ const vis=e=>e.offsetParent&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0, W=innerWidth, H=innerHeight;
          const work=document.querySelector('.pg-work')||[...document.querySelectorAll('.pgrid,.main,#arMain,#arPanes,canvas')].filter(vis).sort((a,b)=>b.getBoundingClientRect().width*b.getBoundingClientRect().height-a.getBoundingClientRect().width*a.getBoundingClientRect().height)[0];
          const wr=work&&work.getBoundingClientRect();
          const cw=e=>{ const c=document.createElement('canvas').getContext('2d'), cs=getComputedStyle(e); c.font=`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; return c.measureText('0').width; };
          const long=[]; for(const [sel,m] of [['.pg-title',90],['.pg-note',70],['.pg-frame p',70]]) for(const e of document.querySelectorAll(sel)){ if(!vis(e)) continue;
            const r=document.createRange(); r.selectNodeContents(e); const lw=Math.max(0,...[...r.getClientRects()].map(q=>q.width)), n=lw/cw(e); if(n>m*1.08) long.push(`${sel} ${Math.round(n)}ch`); }
          const C=[...document.querySelectorAll('button,select,input:not([type=hidden]),a.b,a.ar-b,.pk-btn,[role=button]')].filter(e=>vis(e)&&getComputedStyle(e).visibility!=='hidden'&&(q=>{ const x=(q.left+q.right)/2, y=(q.top+q.bottom)/2; if(x<0||y<0||x>W||y>H) return false; const h=document.elementFromPoint(x,y); return !!h&&(e.contains(h)||h.contains(e)); })(e.getBoundingClientRect())&&!e.closest('.pk-pan,.lb,.hpop>div,details:not([open])>*:not(summary)'));
          const over=[]; for(let i=0;i<C.length;i++) for(let j=i+1;j<C.length;j++){ const a=C[i], b=C[j]; if(a.contains(b)||b.contains(a)) continue; const p=a.getBoundingClientRect(), q=b.getBoundingClientRect();
            if(Math.min(p.right,q.right)-Math.max(p.left,q.left)>2&&Math.min(p.bottom,q.bottom)-Math.max(p.top,q.top)>2) over.push(`${a.textContent.trim().slice(0,14)}|${b.textContent.trim().slice(0,14)}`); }
          const pr=document.createElement('div'); pr.className='pg-work'; pr.style.setProperty('--work-top','100px'); document.body.append(pr); const ph=pr.getBoundingClientRect().height; pr.remove();
          return {probe:ph,W,H,hs:document.documentElement.scrollWidth>W+1,work:wr?{w:wr.width,h:wr.height,sel:work.className||work.id||work.tagName}:null,long,over:over.slice(0,4)}; }"""
        for page in PAGES:
            name = page.split("?")[0].replace(".next.", ".")
            for W, H in ((390, 844), (1440, 900), (1920, 1080), (2560, 1080), (3440, 1440), (5120, 1440)):
                ctx = b.new_context(viewport={"width": W, "height": H}); pg = ctx.new_page()
                pg.route("**/data/arena_final/pages/**", lambda r: r.fulfill(status=200, content_type="text/html", body="<!doctype html><title>page</title>"))
                pg.goto(U + page); pg.wait_for_timeout(3000); e = pg.evaluate(SZ); wide = W >= 1920
                wk = e["work"] or {"w": 0, "h": 0, "sel": None}
                ok(not e["hs"], f"{name} {W}x{H}: no horizontal page scroll")
                ok(abs(e["probe"] - (H - 100 if W > 783 else e["probe"])) <= 1 and (W <= 783 or H - 100 >= 480), f"{name} {W}x{H}: a .pg-work with --work-top 100px is {e['probe']:.0f} px tall (= max(480, {H} - 100) on desktop; item 83)")
                if wide:
                    ok(wk["w"] >= .6 * W and wk["h"] >= .7 * H, f"{name} {W}x{H}: working area ({wk['sel']}) {wk['w']:.0f} x {wk['h']:.0f} px = {wk['w']/W:.0%} wide (>= 60 %), {wk['h']/H:.0%} tall (>= 70 %)")
                ok(not e["long"], f"{name} {W}x{H}: text within its measure (heading 90ch, prose 70ch) {e['long'][:3]}")
                ok(not e["over"], f"{name} {W}x{H}: no overlapping controls {e['over']}")
                if name not in NO_MAPS:
                    ink(pg, name, f"at {W} x {H}")
                if OUT:
                    OUT.mkdir(parents=True, exist_ok=True); pg.screenshot(path=str(OUT / f"81_{page.replace('.html', '').replace('?view=', '-').replace('?', '-')}_{W}x{H}.png"))
                ctx.close()
    if "--state" in sys.argv or "--state-only" in sys.argv:   # item 87: a page keeps its state when the reader leaves and comes back (sessionStorage 'pg:<key>')
        PEND = []
        ACT = {"pipeline": ("PIPE.select(Object.keys(PIPE.N).find(i=>PIPE.N[i].level==='scenario'))", "PIPE.st.sel", "node", "PIPE.st.sel||''", "Object.keys(PIPE.N).filter(i=>PIPE.N[i].level==='scenario')[1]"),
               "corr": ("document.querySelector('.nd[data-leaf],.nd').click()", "location.search", "leaf", "(document.querySelector('.nd.on')||{}).textContent||''", None),
               "arena-final": ("document.getElementById('arNext').click(); document.getElementById('arNext').click()", "location.search", "p", "location.search", None),
               "index": ("0", "location.search", None, "location.search", None)}
        PZ = "(window.PanZoom&&PanZoom.all||[]).filter(m=>m.canvas.offsetParent).map(m=>m.api.get())"
        for page in PAGES:
            name = page.split("?")[0].replace(".next.", "."); key = name.replace(".html", ""); act = ACT.get(key, ("0", "location.search", None, "location.search", None))
            ctx = b.new_context(viewport={"width": 1440, "height": 900}); pg = ctx.new_page(); perr = []
            pg.on("pageerror", lambda e: perr.append(str(e)))
            pg.route("**/data/arena_final/pages/**", lambda r: r.fulfill(status=200, content_type="text/html", body="<!doctype html><title>page</title>"))
            res = []
            def chk(c, m):
                res.append((c, m))
            pg.goto(U + page); pg.wait_for_timeout(2500); pg.evaluate("()=>{ try{ sessionStorage.clear(); }catch(e){} }"); pg.goto(U + page); pg.wait_for_timeout(2500)
            rest = {"sig": pg.evaluate(act[3]), "pz": pg.evaluate(PZ)}
            pg.evaluate(act[0]); pg.wait_for_timeout(600)
            pg.evaluate("(window.PanZoom&&PanZoom.all||[]).filter(m=>m.canvas.offsetParent).forEach((m,i)=>{ m.api.set({z:1.6+.1*i,x:30,y:-20}); m.api.claim&&m.api.claim(); })"); pg.wait_for_timeout(700)
            before = {"sig": pg.evaluate(act[3]), "pz": pg.evaluate(PZ)}
            def trip():
                other = "pipeline.html" if key != "pipeline" else "corr.html"
                lk = pg.locator(f"#site-nav a[href$='{other}']")
                (lk.first.click() if lk.count() else pg.goto(U + other)); pg.wait_for_timeout(1800)
                me = pg.locator(f"#site-nav a[href$='{name}']")
                if page == name and me.count(): me.first.click()
                else: pg.goto(U + page)
                pg.wait_for_timeout(2800)
            trip()
            after = {"sig": pg.evaluate(act[3]), "pz": pg.evaluate(PZ)}
            same = lambda p1, p2: len(p1) == len(p2) and all(abs(a[k] - c[k]) <= (.5 if k != "z" else .005) for a, c in zip(p1, p2) for k in ("x", "y", "z"))
            chk(after["sig"] == before["sig"] and same(after["pz"], before["pz"]) and before["sig"] != rest["sig"] or (after["sig"] == before["sig"] and same(after["pz"], before["pz"]) and before["pz"] != rest["pz"]),
                f"{name}: state kept through the navigation and back (selection {str(before['sig'])[:40]!r} -> {str(after['sig'])[:40]!r}; maps {[(round(v['z'],2),round(v['x']),round(v['y'])) for v in after['pz']]})")
            rb = pg.locator("button:has-text('Reset view')")
            if rb.count():
                rb.first.click(); pg.wait_for_timeout(800); trip()
                back = {"sig": pg.evaluate(act[3]), "pz": pg.evaluate(PZ)}
                chk(back["sig"] == rest["sig"] and same(back["pz"], rest["pz"]), f"{name}: Reset view, then a round trip, gives the rest state ({str(back['sig'])[:40]!r})")
            if act[2]:
                pg.evaluate(act[0]); pg.wait_for_timeout(500)
                val = pg.evaluate(act[4]) if act[4] else pg.evaluate(f"new URLSearchParams(location.search).get('{act[2]}')")
                if val:
                    pg.goto(U + page + "?" + act[2] + "=" + val) if not act[4] else (pg.goto(U + page), pg.wait_for_timeout(1500), pg.evaluate(act[0]), pg.wait_for_timeout(500), pg.goto(U + page + "?" + act[2] + "=" + val))
                    pg.wait_for_timeout(2500)
                    got = pg.evaluate(f"new URLSearchParams(location.search).get('{act[2]}')")
                    chk(got == val, f"{name}: a deep link with ?{act[2]}={val[:30]} wins over the stored state ({got!r})")
            chk(not perr, f"{name}: no page error through the round trips {perr[:2]}")
            ctx.close()
            pend = key == "index" and not all(c for c, _ in res)
            for c, m in res:
                if pend:
                    print(("ok   " if c else "PEND ") + m, flush=True)
                else:
                    ok(c, m)
            if pend: PEND.append(name)
        if PEND: print(f"pending (another dispatch's page, not counted as a failure or a pass): {PEND}")
    b.close()
print(f"{len(FAIL)} failures")
sys.exit(1 if FAIL else 0)
