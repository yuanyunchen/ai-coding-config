---
name: explainer
description: "Build a single-page HTML codebase tour (modules, main flow, change guide) or work report (progress, findings, decisions). Use for requests to explain or tour a codebase, make an architecture explainer, work or progress report, or handoff. Default to low effort with no tests. For slide presentations use frontend-pipeline, for Feishu documents use feishu-task-management, and for relationship explorers use frontend-pipeline's starmap branch."
---

# explainer — Single-page HTML explanations

Explain a codebase or report on a piece of work in one self-contained HTML file. Use no external dependencies, make all content readable without JavaScript, and support light and dark themes. Use `design-principles` for the standards. This skill supplies the two outlines, the page template with SVG components, the ASCII conventions, and the checking script.

## Routing

| Task | Read or use |
|---|---|
| Explain a codebase, module, system, or rule package. | [`references/codebase.md`](references/codebase.md) |
| Report progress, investigation findings, delivery details, or a handoff. | [`references/report.md`](references/report.md) |
| Draw a formula chain or step-by-step derivation in monospace. | [`references/ascii.md`](references/ascii.md). Read this whenever drawing ASCII, at every tier. |
| Draft the page and its SVG components. | Copy [`assets/template.html`](assets/template.html). |
| Prototype a high-density hero diagram. | `~/.claude/skills/design-principles/assets/diagrams/` (medium and high tiers) |
| Apply writing, color, diagram, and data rules. | `~/.claude/skills/design-principles/SKILL.md` (core summary). Follow its routing table when more detail is needed. |

## Workflow

1. **Choose an outline:** `codebase` or `report`. For a mixed brief, decide what the reader most wants to take away. Understanding the system calls for codebase. Understanding progress and decisions calls for report.
2. **Choose the reader.** Identify the audience for yourself. Omit that planning note from the page.
3. **Choose a tier** from the table below and announce it in one sentence: "This explainer: {outline} · {tier}."
4. **Gather source material.** For a codebase, read its entry point, files on the main execution path, configuration, and tests. Record real `file:line` locations and one actual use case. For a report, gather facts and numbers and assign every number a confidence grade (A/B/C/D). Read only what the artifact needs.
5. **Draft.** For medium and high tiers, give the user an outline of key points and a list of diagrams, and obtain approval before writing (user decision, 2026-11-04). Copy the template and fill it using the selected outline. Start diagrams from the template's SVG components. Copy an example SVG and adjust coordinates and text rather than hand-writing the styles.
6. **Check and deliver.** Complete the six checks below and deliver. The low tier uses reading alone, without tools.

## Tiers (low by default)

| Tier | When | Load | Size limit | Checks |
|---|---|---|---|---|
| **Low (default)** | The user did not request verification. | This file, the relevant outline, design-principles `SKILL.md`, and the template. Add `ascii.md` for ASCII. | ≤2 hand-drawn SVGs (overview and main flow). Use ≤4 module sections and combine remaining modules in one table. Use tables, lists, or ASCII for other structures. | Apply only the six reading checks. **Do not run scripts, take screenshots, or open a browser.** |
| Medium | The user says "verify" or "check," or the audience includes people outside the team. | Low tier plus design-principles `diagrams.md` and the hero prototypes. | ≤4 SVGs. Use the complete outline. | Run `scripts/check.py`. Use `webapp-testing` to take and personally inspect one desktop screenshot at 1440 and one mobile screenshot at 390. ≤2 rounds of fixes. |
| High | External-facing, formal, or explicitly requested to be "polished." | Medium tier plus all design-principles references. Consult `accessibility.md`, `typography.md`, `cognitive-principles.md`, and `critique-protocol.md` in `~/.claude/skills/frontend-pipeline/skills/ui-ux-design-pro/references/` as read-only guidance. | No fixed limit. Follow content needs. | Medium checks, the entire design-principles `verification.md`, and ≥4 adversarial review tracks. ≤4 rounds. |

Raise the tier only for a user request or a change in the audience. A general desire to improve the work does not justify escalation.

## Diagram rules (all tiers)

- Draw inside the light `.diagram` canvas, which stays light even in dark mode. **Use only the template's SVG component classes** inside the diagram: `.n.up/.main/.focus/.risk/.ok/.neutral`, `.edge`, and `.lane`. Keep page tokens out of the diagram.
- Use a `viewBox` width of 960 and diagram text ≥13. The narrowest SVG display width is 820px, where 13 renders at about 11px.
- A rounded capsule (`.n.data`) represents a data object. Square corners represent a module or process. Add a `.legend` to every diagram explaining the color meanings.
- Label edges carrying data or formulas. For flows that show only sequence (such as swimlane steps), one legend entry, "arrow = next step," can replace individual labels.

## Six checks (required at low tier too, by reading)

1. **First screen.** The header, three questions or entry points, and initially expanded first section contain no code fragments, strings of parameters, unexplained abbreviations or proper names, or self-references such as "this article" or "this round." Put raw identifiers such as repository, branch, and table names in the header's `.ids`.
2. **Conclusion first.** Each h2 is a conclusion or noun phrase, and the first body sentence states a judgment. The `.why` line explains why to read the section and what question it answers. It is separate from the body.
3. **Explain diagrams and tables.** Give each diagram a one-sentence reading cue in `figcaption` and 3–5 sentences of interpretation in the body. Avoid restating the labels. For a data chart, cover the key number, its explanation, and its decision impact. One sentence stating the conclusion before a table is sufficient.
4. **Consistent color meanings.** Use only semantic colors in diagrams and callouts. Give every diagram a legend. Wherever amber appears, state whose confirmation is pending.
5. **Honest numbers.** Trace every number to a source. Label inferred and unconfirmed values. Use the same value throughout the page.
6. **Accessible detail.** Put code locations, commands, and logs moved off the first screen in `<details>`. Preserve all of them.

## Output

- **Location.** Use the current workspace's `deliverables/` if present. Otherwise write to the session scratchpad and give the user the full path. Write to the repository being explained only if the user asks.
- **Single file.** Inline CSS and SVG, encode bitmaps as base64, and use 0 external references.
- **Publishing.** Default to local delivery. Publish as an Artifact only when the user asks to share or specifies it is for other people. Load artifact-design first. The template already follows its light/dark token and `<title>` conventions.
- **More than ~30 relationship nodes, with the relationships themselves central.** Include a simplified overview on the main page, build a separate explorer using frontend-pipeline's starmap branch, and link the two.

## Boundaries

- For aesthetic experimentation, marketing pages, dashboards, and slides, use frontend-pipeline.
- For a native Feishu document, use feishu-task-management.
- The page helps a person understand the material in one reading. Maintain code comments and READMEs in their own right.
