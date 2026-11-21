---
name: frontend-pipeline
description: "Route frontend artifacts built from scratch: websites and landing pages, designed PDF reports/posters/infographics, interactive apps and dashboards, slides, p5.js generative art, visual art posters, starmap explorers (data maps, lineage, dependency topologies, knowledge graphs, star maps), and GitHub README showcases. Select type and effort, route to design skills, and manage verification. For general PDF reading, merging, or form filling, use pdf."
---

# frontend-pipeline

Use this as the routing entry point for frontend work. Identify the artifact type, choose the effort tier, announce the plan, then load the corresponding `references/{type}.md` for execution. Detailed workflows live in those references.

## Single entry point

Start frontend tasks here. Complete internal copies of the underlying skills for aesthetic direction, design systems, themes, complex artifact construction, and browser verification live in `skills/`. Routing through this skill makes type, tier, and cost explicit before work begins. Independent skill selection can misclassify the effort and inflate costs. Bundling the skills removes dependence on external installations.

To invoke a subskill, read `skills/<name>/SKILL.md` and follow its original workflow. The subskills are full copies of the originals. Their nesting is intended to keep them internal to this skill without registering them separately in the harness or changing their frontmatter.

> The full internal skill inventory appears at the end of this file.

## Routing workflow

### Step 1 · Choose one of four types

| Type | Description | Typical requests |
|---|---|---|
| `web` | Publicly accessible static web page | Landing page, marketing page, portfolio, brand site, event page |
| `pdf` | Noninteractive fixed layout delivered as a PDF or image | Report, white paper, poster, infographic (HTML → PDF) |
| `interactive` | Stateful app with component interactions and multiple views | Dashboard, admin interface, wizard, interactive demo |
| `slides` | A slide presentation in 16:9 with one concept per slide and page navigation | Deck, pitch, technical talk, presentation of results |

**Correct for conflicting cues.** State, login, or dashboard indicates `interactive`. PDF, print, or A4 indicates `pdf`. Slide navigation, a talk, or slides indicates `slides`.

**Art branches.** Two types of art use a specialist subskill's complete workflow within their artifact type, in place of the standard design chain (fd-pro → uux):

- Generative or algorithmic art (p5.js, flow fields, particles, noise, "make art with code") belongs to `interactive`. Use the `algorithmic-art` branch in `references/interactive.md`.
- A purely visual art poster (gallery or magazine quality, 90% visuals and 10% text, outside the data-report category) belongs to `pdf`. Use the `canvas-design` branch in `references/pdf.md`.

**Relationship explorer branch.** If the main artifact is an explorable entity–relationship graph, choose `interactive` and follow the full `starmap` workflow, including layout metrics and verification. Read `skills/starmap/SKILL.md`. Signals include data maps, lineage, dependency or architecture topologies, knowledge graphs, embedding star maps, "make it an app instead of a web page," and "starmap." Statistical charts, dashboards, and static reports use their ordinary routes.

### Step 2 · Choose a tier (default: simple + verification)

| Tier | When | Verification (standards in `references/verification.md`) |
|---|---|---|
| Simple, no verification | The user explicitly asks for something quick, a draft, or no tests. | None |
| **Simple + verification (default)** | Default tier | Standard verification |
| Complex + verification | The structure is complex or the user signals high quality: `production`, client-facing, for investors, polished, `premium`, or senior-level. | High-quality verification |

### Step 2.5 · Identify the reader and read the governing design principles (required for all four types)

Before designing or building, write one sentence identifying the reader. Read `~/.claude/skills/design-principles/SKILL.md`. **For every human-facing artifact, read its five opening principles:** make it intuitive, control the proportion of text, avoid repetition, write naturally, and keep a clear focal point. Before delivery, check each against the five corresponding checks in `references/verification.md`. Use the design-principles routing table for further detail. Only a purely internal debugging page may skip this step.

The user made the reading mandatory on 2026-11-04. Previously it applied only to audiences outside the team, and delegations skipped it. Several rounds of rework repeated rules already written down.

- **Multiple pages delivered together** (dashboard, relationship graph, explainer page, README): also read the multi-page deliverables section in [`references/content-for-readers.md`](references/content-for-readers.md).
- **GitHub repository homepage or README showcase, or a static site published to GitHub Pages:** read [`references/github-repo-page.md`](references/github-repo-page.md).
- **The user names an existing site to match, or the page's controls compute a result** (weights, filters, a recommendation): read [`references/match-reference.md`](references/match-reference.md).
- **Establish content first for explanatory and document-style artifacts.** Present the key-point outline and diagram list in the user's language and obtain their approval before building the page. When delegating the page, the orchestrator obtains approval before dispatch (user decision, 2026-11-04).
- For layout aesthetics, use this skill's subskills. Route a single-page explanation, such as a codebase tour or a work report, to `explainer`.

**When delegating a frontend artifact,** tell the subagent in the prompt to read this skill and the governing principles in design-principles. Subagents do not load them on their own.

### Step 3 · Announce the route

Before execution, announce the route in one sentence: **"Using the {type} route at the {tier} tier, estimated at ~{Z} tokens and ~{N} min."** This catches tier mismatches before costs mount.

### Step 4 · Load the corresponding reference

Read `references/{type}.md` and execute the workflow for the selected tier.

## Complex tier: invoke the full subskills

For complex + verification work, **read the subskill's original `SKILL.md` and perform its entire workflow just as for a standalone invocation**. The summaries here cannot replace it. Read the documents required by the subskill as well as using its CLI. For example, the mandatory references in ui-ux-design-pro supply design judgment missing from the CLI token tables alone.

The standard complex-tier order is **the full `frontend-design-pro` workflow for layout and visual design, then the full `ui-ux-design-pro` workflow for design-system optimization and audit**.

## Reference index

- `references/web.md` — three web tiers
- `references/pdf.md` — three PDF tiers, including HTML → PDF and the `canvas-design` art-poster branch
- `references/interactive.md` — three interactive tiers, criteria for web-artifacts-builder, and the `algorithmic-art` generative-art branch
- `references/slides.md` — three slide tiers, led by theme-factory
- `references/verification.md` — standard and high-quality checklists and the verification loop
- `references/content-for-readers.md` — multi-page deliverables (writing and readability details now live in design-principles)
- `references/github-repo-page.md` — organizing the GitHub repository homepage (README) and publishing to GitHub Pages
- `references/match-reference.md` — matching a reference site element by element; testing an interactive page's controls at their extremes

## Verification

Use the internal `webapp-testing` skill (Playwright). **Each round runs through test → reflect → plan → execute. Repeat until there are no major issues before delivery**, within the applicable cap. Standard verification allows at most 3 rounds and can finish as soon as major issues are resolved. High-quality verification allows at most 5 rounds for thorough optimization, including large refactors if necessary. See `references/verification.md` for both checklists and loop details. Use standard verification for simple + verification, high-quality verification for complex + verification, and lightweight art-artifact verification for the art branches.

## Internal subskills (full copies in `skills/`)

- `frontend-design-pro` — aesthetic direction (11 styles)
- `ui-ux-design-pro` — data-driven design system (Bun CLI, CSV, and references). **`node_modules` is preinstalled and the CLI is ready to run.** It is portable JavaScript and needs no local `bun install`. The upstream version lacks the `scripts/*.py` files mentioned by its SKILL.md. Use the actual implementation in `cli/` (Bun).
- `theme-factory` — themes, palettes, typography
- `web-artifacts-builder` — complex React/Tailwind/shadcn artifacts, as needed only for the heavy interactive tier
- `webapp-testing` — Playwright verification
- `frontend-design` — general frontend design
- `algorithmic-art` — p5.js generative and algorithmic art, as needed for the interactive art branch, including `templates/viewer.html`
- `canvas-design` — static visual art posters exported to PNG/PDF, as needed for the PDF art branch, including the `canvas-fonts/` font library
- `starmap` — full-screen explorable entity–relationship star maps for the interactive graph branch. User-owned skill moved here from the top level on 2026-11-01.

> The copies match their respective originals and retain their frontmatter. Nesting supplies the intended discovery boundary without `disable-model-invocation`. Most top-level upstream copies have moved to `skills-disabled/`. Exceptions: the top-level `webapp-testing` is still in use and matches the internal copy, `ui-ux-design-pro` has no top-level version, and the user-owned `starmap` moved here on 2026-11-01.
