# dualmap page parts

The page `deliverables/dualmap/index.html?view=map|graph` is assembled from these parts. Each track edits only its own:

| part | content | owner |
|---|---|---|
| `base.js`, `base.css`, `index.html` | the shell, the shared frame and header helpers (`pageHeader`, pickers, mode switch, `engineZoom`), the Continuous space page | T02.05.06.03/S01 |
| `graph2.js`, `graph2.css` | the concept graph: Network and Details (`graphV2()`, inserted at the marker `/*@@GRAPH2@@*/` in base.js) | T02.05.06/S04 |
| (later) `deliverables/dualmap/fullnet.js` | the Full network, `window.DualModes.fullnet = { mount(el, ctx), unmount() }` | T02.05.06.03/S02 |

**Assemble** (writes the staged files `dualmap.next.js`, `dualmap.next.css` and `index.next.html`, then checks that the script parses):

```
dual/out/pipe/venv/bin/python dual/site/dualmap_parts/assemble.py
```

**Data** for the concept graph: `dual/stats/.venv/bin/python dual/site/graph_v2.py` writes `deliverables/dualmap/data/graph_v2.next/` (staged).

**Checks**, all before a swap:
- the concept graph's page checks: `dual/out/pipe/venv/bin/python <S04 dir>/checks.py <out dir> --staged`;
- the other tracks' checks;
- `dual/out/pipe/venv/bin/python dual/site/interaction_check.py <staging url> --pages ... --frame ...`, on a staging copy of the site with the `.next` files in place;
- `python3 dual/site/cluster_audit_check.py`.

**Swap:**
1. Take the lock with `mkdir deliverables/dualmap/.swap.lock`.
2. Assemble from the parts as last published.
3. Run all the checks above.
4. Copy each live file to `.prev`, then move the `.next` files in. Data and renderer go together.
5. Append one line to `data/build.json`.
6. Remove the lock.
