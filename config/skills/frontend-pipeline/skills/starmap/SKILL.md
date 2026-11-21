---
name: starmap
description: "Build a full-screen relationship explorer for data maps, lineage, dependency/architecture topologies, knowledge graphs, embedding star maps, system maps, and entity browsers. Use for 'starmap', 'node graph', 'interactive visualization', 'make it an app, not a web page', 'a striking dark graph', or requests to explain relationships among tables, services, or entities, even without naming a graph. Excludes statistical charts, dashboards, and static reports."
---

# Starmap interactive data visualization

Turn entities and relationships into an explorable app. Use a full-screen canvas with no page scrolling, clickable nodes and relationships with detail drawers, inertial dragging, a zoom floor, a minimap, and automatic framing. The visual style combines a deep-space background, ice-blue glow, and glass panels.

The constants, algorithms, and content rules were tuned in actual use. Follow them to avoid repeated revisions over interactions that feel too sensitive, panels that are too long, or an entity whose purpose remains unclear.

## Decide whether a starmap fits

Use a starmap when relationships carry the information: lineage, dependencies, call topologies, knowledge graphs, or embedding spaces. The reader needs to move from one node to a neighbor to understand the system.

Use these alternatives when appropriate:

- For trends, distributions, or comparisons, use a chart (for example a bar, line, or scatter plot).
- For a collection of unrelated records, use a table.
- When the reader cares about a single path, use a flowchart.
- Above 300 nodes, one canvas becomes too crowded. Aggregate first, provide two levels with drill-down, or give the same structure three views: a selective network (a few hundred nodes chosen by closure), the full network in sub-layers, and lists by level. `examples/dualmap/` does the last for 4,893 nodes.

When uncertain, ask: **Would the diagram still make sense if all the edges disappeared?** If yes, choose a different format.

**Relationship to `frontend-pipeline`.** Route general frontend artifacts (landing pages, dashboards, slides, designed PDFs, generative art) through `frontend-pipeline`. Use this skill specifically for entity–relationship explorers. The main artifact must be an **explorable relationship graph**. For other forms, return to `frontend-pipeline`, even if the artifact is dark, interactive, or described as "data visualization."

## Workflow

### 1. Define the form and inventory the content

Answer three questions before writing code:

- **What is a node?** How many types are there, and what shape represents each? Encode type with shape as well as color.
- **What is an edge?** What meanings does it support, and how many grades of evidence distinguish them?
- **What belongs in the panel?** List each part using the fixed structure in `references/content.md`, and collect missing data. **This decision determines whether the graph is worth revisiting.** A beautiful graph with poorly defined panel content rarely gets a second look.

Produce JSON shaped like `{nodes: {id: {...}}, links: [{s, t, ...}]}`.

### 2. Measure layout before writing the renderer

Before opening a browser, use the script to measure layout quality:

```bash
python3 ~/.claude/skills/frontend-pipeline/skills/starmap/scripts/check_layout.py data.json \
  --label-fields raw_name,name --label-px 11 --ignore "a>b,c>d"
```

Check four values: **back edges must be 0**, aspect ratio 2.0–3.0, edge-length standard deviation < mean × 0.45, and minimum label clearance > 0. If the layout misses a target, adjust `xgap`/`ygap` first. If this stalls, read the section on label width as a hard constraint in `references/layout.md`. Label width is usually the underlying bottleneck.

### 3. Wire up the app

**Start from `assets/example.html`.** This verified, runnable implementation wires together two entity types, four grades of evidence, ring composition, freshness dots, and three label levels. Adapting it is much faster than starting from scratch. Use `assets/shell.template.html` only when you need a bare skeleton.

Fill in just six domain-specific hooks: `drawNode` / `tooltip` / `inspectNode` / `inspectLink` / `linkStyle` / `labelBox`. Leave the camera, layout, drag springs, render loop, minimap, hit testing, keyboard, and drawer to the engine.

See the comments at the end of `assets/starmap.js` for the complete hook inventory.

### 4. Build a single file

```bash
python3 ~/.claude/skills/frontend-pipeline/skills/starmap/scripts/build_page.py \
  --shell app.html --data data.json --out dist/index.html
```

The build inlines the CSS, engine, and base64-encoded fonts. **Deliver a single file** that someone can copy to another computer and open by double-clicking. It must run without an HTTP server or CDN.

Put the fonts in the directory passed to `--fonts`: `syne-latin.woff2` / `grotesk-latin.woff2` / `mono-latin.woff2`. Only the Latin subsets are needed. Without these fonts, the app falls back to the system font stack.

### 5. Verify in a real browser

Many preview environments throttle `requestAnimationFrame` to 0, so animations never run. Check motion in an actual browser. Work through each item below.

## Iterating on a view with the user

Visual feedback is short and easy to misread; five changes in one project were built and then withdrawn (a regular lattice, glowing chains, a spread outer ring, a left-to-right tree, a two-column header).

- Before changing anything, say in one sentence what you understood and what will look different. Build after that sentence, not before it.
- Keep a named baseline (the last version the user accepted). "Not what I wanted" means return to it and change one thing, not push further in the same direction.
- Change one dimension per round: which nodes are shown, where they sit, or how strongly they are drawn.
- Tell the user at every publish whether the page is in an interim or a finished state. A page that changes in front of them without that line reads as broken.
- Turn each complaint into an assertion in the check script the same day (see the checklist and `examples/dualmap/tools/interaction_check.py`), so the next round cannot bring it back.

## Acceptance checklist

**Visuals**

- [ ] All information remains intact with the glow turned off. The glow is decorative.
- [ ] One global accent color means "clickable/current." All other colors have explicit semantics.
- [ ] All identifiers, numbers, and enumerated values use a monospace font.
- [ ] Nodes show their **original identifiers** directly, including when Chinese aliases are available.
- [ ] Both grain and vignette layers are present.

**Layout**

- [ ] 0 back edges, as few crossings as possible, and aspect ratio 2.0–3.0.
- [ ] No labels overlap in the overview and the automatic zoom factor k ≥ 0.55.
- [ ] Nodes settle into fixed positions after the entrance animation. Refresh twice and confirm the positions match.
- [ ] The fitted view uses the frame in both directions at 1440x900, 2560x1080, 3440x1440 and 5120x1440: on an ultrawide screen the graph spans the width and labels use the room, it does not sit in the middle third.
- [ ] In a dense view the links at rest are a quiet texture: about 1.5 per shown node (each node's strongest link toward each neighbouring level plus the strongest few percent), thin, opacity near 0.10 to 0.14 and at most about 0.3. Hover and selection light the full chain.
- [ ] Example pages or records shown for one node never repeat each other.

**Interaction**

- [ ] Double-click a node to zoom in. Double-click that node again to return to the overview.
- [ ] Double-click the background or press F to restore the overview. ESC backs out one level at a time.
- [ ] Dragging a node makes its neighbors follow in a wave moving outward from the center. On release they settle naturally without drifting away.
- [ ] The drawer width is adjustable by dragging, and automatic framing makes room for the open drawer.
- [ ] Click the minimap to recenter and double-click for the overview. A white rectangle marks the current viewport.
- [ ] Edges are clickable and have a dedicated relationship panel.
- [ ] A node responds only within its drawn mark plus about 4 px. A pointer on a link, or on a node's label, shows no card.
- [ ] Clicking a node, and clearing the selection, moves no other node and no frame (0 px). Text that changes with the selection sits in an area of fixed height.
- [ ] Three wheel notches change the scale on the live page, in every mode. A hidden canvas left in the layout swallows the wheel.
- [ ] The page keeps its state when the reader leaves and comes back (mode, pan and zoom, selection, filters); Reset view clears it; explicit URL parameters win.

**Content**

- [ ] The first screen of the panel gives an overview of **this entity**. Put system-level exposition elsewhere.
- [ ] The initial explanation of the entity's purpose **stands independently of its position in the chain** (final subsection of principle zero in `content.md`).
- [ ] Read the first screen to someone unfamiliar with the system. Nothing should require them to interrupt for clarification.
- [ ] After simplifying that far, those who need the details can still get what they came for.
- [ ] Content moved into expandable sections remains **fully accessible**, and references to it still work.
- [ ] Readers can understand the entity even if all percentages are removed.
- [ ] Data examples contain no IDs, hashes, or internal status codes.
- [ ] Nested fields such as JSON, maps, and event sequences are expanded into key lists.
- [ ] Give each section a visible boundary. Put detailed statistics in expandable sections.
- [ ] Include a "What was excluded" section and an observation timestamp.

## Design system quick reference

Full specification: `references/visual-system.md`.

```
Background  --void #060913        Main accent  --ice #8fc6ff (one global accent)
Panels      rgba(13,19,38,.72) + backdrop-filter:blur()  (both required)
Text        --starlight #e9eefb / --dim #9aa7c9 / --faint #5d6a8f
Semantics   --ember attention · --rose anomaly · --lime healthy · --violet second entity type
Type        Syne for headings · Space Grotesk for body copy · JetBrains Mono for all identifiers and numbers
```

Draw the canvas in two passes: `lighter` for edges, particles, and halos, then `source-over` for node bodies and text. **Keep text out of the additive pass.** Light underneath would blend into the letters and turn them into a gray-white blur.

Cache prerendered glow sprites. `shadowBlur` already drops frames with a few dozen nodes. A steep falloff in the gradient at `.16` gives the appearance of a light source rather than a ball of cotton.

## Tuned constants

Before changing these, read the symptom table in `references/interaction.md`.

| Constant | Value | Purpose |
|---|---|---|
| `panGain` | `1.25` | Pan gain. 1.0 feels sluggish and 1.5 starts to drift. |
| `zoomGain` | `.0042` | Continuous scroll-wheel zoom. Preserve continuous zoom rather than switching to discrete steps. |
| `clickDelay` | `240ms` | Single-click delay. A double-click within the window cancels it. |
| `hopWeight` | `[1,.46,.18,.062]` | Drag-follow amplitude by hop count. |
| `hopStiff` | `[1,.028,.019,.013]` | Follow stiffness. **Decay stiffness separately from amplitude.** |
| `damping` | `.68` | Spring damping. Values >.8 cause overshoot. |
| `minLegible` | `.55` | Lower bound for automatic framing. Prefer horizontal overflow to going below it. |
| `bow` | `.085` | Edge curvature. Reduce it for a tighter graph. |
| `xgap/ygap` | `202/200` | Column and row spacing in the layered layout. The longest label sets the lower bound. |

## Three common failure modes

**1. Substituting statistics for content.** A screen full of coverage percentages and counts can leave the reader unable to say what the entity is. Test whether it is understandable with all percentages removed. See `references/content.md`.

**2. Letting a force simulation converge in front of the user.** An animated force-directed opening can look impressive, but different layouts on each refresh prevent people from building spatial memory. Spatial memory is the graph's one advantage over a table. Compute the layout, fix the result, and move nodes only when the user drags them.

**3. Publishing an unchecked claim.** The dark palette, glow, and precise numbers lend a starmap authority, so every statement must be traceable. A field called `richText` was once described as a "rich-text description." Tests of 200 records found the key present in every one and empty in every one. **A key name alone cannot establish its meaning.**

## Directory

```
assets/
  starmap.css            Design tokens and all component styles (data independent)
  starmap.js             Camera, layout, drag springs, rendering, minimap, and interaction engine
  example.html           Verified and runnable complete implementation. Start here.
  shell.template.html    Bare skeleton, only for building from scratch
examples/
  dualmap/               Five-page explorer over one dataset: shared frame and modules, a 4,893-node graph in three
                         views, state kept across pages, a Playwright check. Read its README.md first.
scripts/
  build_page.py          Assemble a single HTML file with inline CSS, JS, and fonts
  check_layout.py        Measure layout quality and sweep parameters
references/
  visual-system.md       Color, typography, materials, glow rendering, and node anatomy
  interaction.md         Interaction contract, origins of constants, and symptom table
  layout.md              Layering algorithm, parameter tuning, and when to use force-directed layout
  content.md             Panel content and factual discipline
```

Read references as needed. Use `visual-system.md` for visual changes, `interaction.md` to tune how interactions feel, and `layout.md` for poorly arranged graphs. **Read `content.md` if you struggle to write the panels.** It is the reference most often skipped and the one with the greatest effect on the finished artifact.
