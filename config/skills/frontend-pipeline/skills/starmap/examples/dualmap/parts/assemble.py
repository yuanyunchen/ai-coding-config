"""Assemble the dualmap page from the shared parts (T02.05.06, item 53) into the staged files of deliverables/dualmap:
  dualmap.next.js  = base.js with graph2.js in place of the marker /*@@GRAPH2@@*/
  dualmap.next.css = base.css + graph2.css
  index.next.html  = index.html
then check that the script parses (Chrome, Playwright). Run from the repository root:
  dual/out/pipe/venv/bin/python dual/site/dualmap_parts/assemble.py
Owners: base.* and index.html (the Continuous space page and the shared frame): T02.05.06.03/S01; graph2.* (the concept graph:
Network and Details): T02.05.06/S04. Each track edits only its own part."""
import sys
from pathlib import Path

P = Path(__file__).resolve().parent
R = P.parents[2] / "deliverables/dualmap"
base, g2 = (P / "base.js").read_text(), (P / "graph2.js").read_text()
assert base.count("/*@@GRAPH2@@*/") == 1, "base.js must hold the marker /*@@GRAPH2@@*/ exactly once"
js = base.replace("/*@@GRAPH2@@*/", g2)
(R / "dualmap.next.js").write_text(js)
(R / "dualmap.next.css").write_text((P / "base.css").read_text() + (P / "graph2.css").read_text())
(R / "index.next.html").write_text((P / "index.html").read_text())
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless=True)
    r = b.new_page().evaluate("s=>{ try{ new Function(s); return 'ok'; }catch(e){ return String(e); } }", js); b.close()
print("assembled", len(js), "bytes; syntax:", r); sys.exit(0 if r == "ok" else 1)
