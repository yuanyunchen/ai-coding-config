---
name: design-principles
description: "The user's general design standards for visual encoding, honest charts and numbers, diagram selection, readable writing, and verification. Load when the user asks to follow their design standards or says 'design standards', or when explainer or frontend-pipeline refers here. Use frontend-pipeline for aesthetic style and feishu-task-management for Feishu delivery."
---

# design-principles — General design standards

The user developed these standards for Feishu documents. This version removes Feishu-specific implementation details and applies to any artifact intended for people, including HTML pages, PDFs, slides, dashboards, and diagrams.

**This file summarizes the core rules.** For lightweight work, reading it is enough to begin. Use the routing table to go straight to details, examples, or checklists as needed. The Feishu source for each rule is listed in [`references/provenance.md`](references/provenance.md).

## Five governing principles

Check each before delivery. The 25 rules below expand on them.

> User decision, 2026-11-04, following the posthog-dashboard retrospective. Several rounds of rework repeated mistakes already covered by the rules. The principles needed to be visible at the top and individually testable.

| Principle | Check before delivery | Details |
|---|---|---|
| **Intuitive** | Five-second test: can someone identify the main point and conclusion at a glance? | Rule 23 |
| **Control the proportion of text. Keep the key points.** | Start each section with a figure, table, or card, then add prose. Limit the body to ≤3 points or ≤6 lines. | Rules 5–7 |
| **Avoid repetition** | Each fact appears once per page. Remove any element whose value is identical across all objects. | Rule 7 and writing.md §3 |
| **Write naturally** | Read three consecutive entries. Vary the sentence patterns and remove commentary about the presentation itself. | Rule 8 and writing.md §6 |
| **Make the focus clear and cohesive** | Give each screen one focal point. For every visual element, ask what the reader would lose by removing it. Remove elements that add nothing. | Rule 12 and visual-encoding.md §5 |

## Scope and precedence

- These standards govern information-bearing elements: body text, titles, numbers, charts, relationship diagrams, status markers, legends, and expandable sections.
- For layout aesthetics (style direction, font personality, motion, decoration), use the aesthetic subskills in frontend-pipeline. For Feishu document implementation, use feishu-task-management.
- These standards take precedence for information-bearing elements. Use frontend-pipeline's aesthetic palettes for layout and the semantic colors below for charts and status. Where the built-in dataviz skill conflicts, follow this skill's data honesty and semantic color conventions. Apply theme-factory themes only to layout backgrounds and fonts.

## Routing

| Task | Read |
|---|---|
| Write body text, titles, or the first screen. Reduce word count or remove formulaic AI language. | [`references/writing.md`](references/writing.md) |
| Set colors, type sizes, legends, status colors, or the visual prominence of controls. | [`references/visual-encoding.md`](references/visual-encoding.md). Use [`assets/demo-recall-metrics.html`](assets/demo-recall-metrics.html) to calibrate restraint. |
| Design person or entity cards, dashboard overviews, or detail drawers. | [`references/visual-encoding.md`](references/visual-encoding.md) §8 |
| Make statistical charts, present numbers, or explain data findings. | [`references/data-honesty.md`](references/data-honesty.md) |
| Build a data or experiment report: comparison convention, cards, chart form, section order, selection honesty. | [`references/data-report.md`](references/data-report.md). Worked example: [`assets/example-data-report/`](assets/example-data-report/README.md) |
| Choose a diagram type or draw relationship, process, architecture, or hero diagrams. | [`references/diagrams.md`](references/diagrams.md) |
| Check the deliverable or brief adversarial reviewers. | [`references/verification.md`](references/verification.md) |

## Core rules

### Writing (details in writing.md)

1. **Define the reader first.** Write one sentence identifying the intended reader. Pass both checks: read the first screen to someone outside the audience without prompting "What does this mean?" Then check that someone who needs the material can still get what they came for after those cuts.
2. **Lead with the conclusion.** Open the whole piece and each section with the judgment, then give the evidence. Use a noun phrase or conclusion as a title. Avoid generic topic names like "Analysis of X."
3. **Give the reasoning enough depth.** If readers still have to ask "Why?" or "On what grounds?", follow the claim through the mechanism, the evidence or example, and the limits. Include the mechanism.
4. **Be specific.** Follow an abstract conclusion with a real example or real values. Prefer "3.9 billion rows" to "a large volume."
5. **Choose the format from the structure.** Compare the same fields across objects in a table. List independent items. Use a timeline or flowchart when sequence matters, and a diagram for structural relationships.
6. **Use two layers.** The first screen explains in natural language what the thing is, where it came from, what it contains, and whether it can be used. Put code, parameters, and full inventories in an expandable layer. Everything moved there must remain accessible.
7. **Reduce word count in order.** Remove repetition, move information into diagrams, collapse detail, then reduce precision where it cannot affect a judgment. Cut substantive content only as the last resort.
8. **Write naturally.** Remove metacommentary such as "this article," "as shown in the figure," or "one picture says it all." Read three consecutive paragraphs for repetitive sentence patterns. Preserve accuracy and specificity, and do not increase word count when revising for naturalness.

### Visual encoding (details in visual-encoding.md)

9. **One color, one meaning.** Keep each meaning consistent throughout the deliverable and explain it in the legend. Default meanings: upstream/input = indigo, main path/processing = cyan, focus/pending = amber, risk/negative = red, output/achievement = green, cross-cutting/neutral = gray with a dashed line.
10. **Give shapes meaning.** Use different shapes or fills for data objects and computations. Give a process a visibly different treatment from an object card.
11. **Type size.** Use ≤3 type-size levels per diagram. Judge legibility in **actual displayed pixels**. Body text and labels must display at ≥11px. For a scaled diagram, multiply the logical type size by the scale factor.
12. **Restraint.** Match the visual prominence of each element to its importance. Avoid multiple competing highlight blocks on a screen. Use accent colors sparingly.
13. **Reinforce color with another cue.** When red and green indicate negative and positive values, add ↑↓ or +/-. Pair status colors with text or icons.

### Data honesty (details in data-honesty.md)

14. Start the Y axis of a bar chart at 0. Include units in axis titles. Mark gaps in a trend and break the line at missing points. Do not interpolate or substitute 0.
15. At the first mention of a sampling estimate, explain how it was obtained. Report ratios only or label the figure "≈" or "upper bound" as appropriate. Show counterexamples when they exist and write out the calculation for derived values.
16. **Grade numerical confidence.** A = confirmed in the original source. B = read from a chart and awaiting verification. C = inferred, labeled "inferred." D = unconfirmed, labeled "pending confirmation" or omitted. Never invent an uncertain value.
17. **Explain a chart in three steps.** Add a paragraph to each data chart giving the key number, why it has that value, and what it means for the decision.

### Diagrams (details in diagrams.md)

18. Identify the structure before choosing a diagram. See diagrams.md for mappings from 12 types of signal to diagram types. Use a table when making a comparison.
19. **Keep the overview simple and the subdiagrams detailed.** Show only modules and their relationships in the overview. Split a diagram that tries to show every object, parameter, and event sequence together.
20. Label every edge with what passes along it or the formula it applies. For a purely sequential flow, the legend may say "arrow = next step." Draw the source for every input so no variable appears from nowhere.
21. Use horizontal and vertical connectors, routed around cards. Draw ≤8 edges individually. For 9–15 edges, select representative connections. Above 15, connect layers.
22. Follow every diagram with a natural-language explanation. Interpret it without repeating its text line by line.

### Verification (details in verification.md)

23. **Five-second test.** Can the reader identify the hierarchy, main direction of flow, and conclusion at a glance?
24. Inspect a rendered screenshot at the size the reader will see. A diagram that looks clear locally may become illegible when embedded.
25. For demanding work, assign ≥4 independent adversarial review tracks covering content, visuals, structure, and skeptical challenge. Reviewers report findings without editing files. Apply fixes to the single source, then review again.
