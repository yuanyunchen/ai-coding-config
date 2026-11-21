# Example: a five-page explorer over one dataset (dualmap)

A complete multi-page site built on the starmap visual system: a continuous map of 10,800 pages, a concept graph of 4,893 nodes in three views, a correspondence page, a routed-pipeline page and an arena. Use it when the job is larger than one canvas: several pages over shared data, a graph too dense for a single view, or several people publishing into one site. `assets/example.html` remains the starting point for a single-file graph.

## Run it

```bash
cd examples/dualmap/site && python3 -m http.server 8791
# Continuous space, synthetic data:   http://localhost:8791/index.html?data=fixture
# Concept graph (Network | Full network | Details):   http://localhost:8791/index.html?view=graph
```

| Page | Template | Runs here | Data shipped |
|---|---|---|---|
| Continuous space | `site/index.html` + `dualmap.js` | yes, with `?data=fixture` | `site/data/fixture/` from `tools/make_fixture.py`: every number made up, banner shown |
| Concept graph | same, `?view=graph`; Full network is `fullnet.js` | yes | `site/data/graph_v2/graph.json`: the real structure and aggregate statistics, with page ids, example pages and thumbnails removed by `tools/strip_graph.py` |
| Correspondence | `site/corr.html` + `corr.js` | code only | none: its data is page-level |
| Data pipeline | `site/pipeline.html` + `pipeline.js` | code only | none |
| Arena | `site/arena-final.html` + `arena-final.js` (first study's: `arena.html`) | code only | none: it shows generated pages and requests |

The source project's screenshots, requests and page ids are user data and are not in this folder. Without `data/pilot/cluster_audit.json` the concept graph logs one 404 and shows node panels without example pages. Do not add real page-level data to this example.

## What to take from it

| Need | File | What it does |
|---|---|---|
| One frame for every page | `site/page.css`, `site/nav.js` | gutter `clamp(16px,4vw,96px)`, no width cap, text measures 70ch / 90ch, breakpoints 783 / 1303 / 2400, `.pg-work` filling the viewport below the header (`PgFrame.fit`), "updated HH:MM" from the publish log |
| Header of a page | every `*.html` | `Page name: one sentence` as the heading, a note of at most two lines below, nothing beside it |
| Pan and zoom on any canvas | `site/panzoom.js` | one module for every map; `PanZoom.all` lets a check find them |
| Resizable columns | `site/columns.js`, `columns.css` | draggable dividers, remembered widths, double click resets |
| Hover card and viewer | `site/hovercard.js`, `hoverslot.js`, `lightbox.js` | one card for every page; four examples in a grid, the rest in the viewer |
| A graph too dense for one canvas | `parts/graph2.js`, `site/fullnet.js` | three views of one structure: Network (242 nodes chosen by closure: every shown rule with its elements and the regions it lands in), Full network (3,818 of 4,893 in sub-layers, names at near zoom, minimap), Details (every level as lists, key links only at rest) |
| A second team's view inside a host page | `site/fullnet.js` | `window.DualModes.fullnet = { mount(el, ctx), unmount(), reset(), getView(), setView() }`; the host calls the top-level object, never a stored instance |
| One file from two owners | `parts/` | `base.*` and `graph2.*` are assembled into `dualmap.js`; each owner edits only its part and assembles with the other part as it is live |
| A radial tree that plays a run | `site/pipeline.js` | levels as rings, a run grows one tree from the root; chosen path bright, candidates thin, the rest dashed |
| State kept across pages | every page script | `sessionStorage['pg:<key>']`, saved on change and on `pagehide`, restored when the URL carries no parameter of its own, cleared by Reset view, wrapped in try/catch |
| Acceptance by script | `tools/interaction_check.py` | Playwright: wheel zoom changes the scale, fit and Reset return exactly, frame time under drag, pages load with storage blocked, every canvas draws, header pattern, six screen sizes from 390x844 to 5120x1440, state round trip |

The numbers this site settled on after review (hit area, link density and opacity at rest, panel docking width) are in `references/interaction.md`, section "密图与多页面站点".
