# Data reports: comparison convention, cards, charts, structure

How to organise a report whose substance is experiments and numbers: many methods compared, several populations, charts on every screen. The rules here add to `data-honesty.md` (what makes a number honest) and `visual-encoding.md` (how prominent an element is). They do not repeat them.

> Source: the auto-rater work trial, 2026-11-19 to 2026-11-20. The first report was rebuilt from scratch after roughly forty user corrections; nearly all of them fall under the eight rules below. The user's words are quoted where they set the rule. Worked example: [`../assets/example-data-report/`](../assets/example-data-report/README.md).

## The eight rules

| # | Rule | Check before the user sees it |
|---|---|---|
| 1 | One comparison convention, fixed before the experiments | Can every number on the page be ranked against every other number of the same measure? |
| 2 | One card = one question = one population = one chart | Can the card's question be said in five words, and does every mark on it answer that question? |
| 3 | The chart's form follows the one thing to emphasise | Does the emphasised difference fill the plot? Are the floor and the ceiling drawn? |
| 4 | Values prominent, differences quiet, at most one emphasised number per chart | Squint: is exactly one thing loud? |
| 5 | Nothing on a chart the reader has to ask about | Read every label aloud to an outsider; any "what is that?" is a defect |
| 6 | Mechanism first, then comparison, then ablation, one method per block | Is each method's figure the first thing in its block? |
| 7 | A topic lives in exactly one part | Search the page for the topic word: does it appear in one part only? |
| 8 | Every number in the text is generated from the data file the chart reads | Is there a hand-typed number anywhere in the source? |

## 1. One comparison convention

The costliest failure of the project. Numbers for different methods were measured on different populations (17 models, 30 models, 25 models with enough votes, a development split), so no reader could tell which method was better. User: "怎么口径这么混乱？不能统一吗？我怎么知道哪个方案好？" and later, when a better number appeared, "别告诉我又不是一个口径".

- **Fix the convention in a file before the first experiment**: population, task scope, reference (what counts as truth), the measures always reported together. Everything else is an amendment to that file, dated, with its reason.
- **A method is not quoted until it has run fully under the main convention.** A promising number on a subset is a reason to run the full convention, never a row in the comparison.
- **A partial-range number is always shown beside the main system on the same range.** Never a subset number alone next to full-range numbers.
- **Report the measures together.** Here: pair accuracy, Elo distance, rank distance. One measure alone invited the wrong reading three times.
- **Every chart of a measure carries its floor and its ceiling**: the chance level (50% for a pairwise call) and the limit set by the data itself (here: real votes against the online board). A distance of 15.8 means nothing until the reader sees that the data's own limit is 9.7.
- **Different questions may use different populations, one per card, named on the card.** User: "每个问题口径选合适的". What is forbidden is two populations on one axis.

## 2. Selection honesty

Read with `data-honesty.md` §4 whenever the report picks a winner.

- **A configuration picked after looking at a set is not evaluated on that set.** State "picked after seeing these" on the headline, and report the same number on rows not seen when it was picked. Here the headline system read best on the 17 models it was picked on (15.8 Elo) and no better than the earlier system on 10 held-out models (17.5 against 16.6). The report was more optimistic than the evidence until that row was added.
- **Label post-test results as post-test** everywhere they appear, with a short form after the first full statement.
- **A null result needs a positive control before it is reported.** Nine denoising methods gave no gain; the user asked whether that was plausible ("还不如 random？合理吗？"). The answer that settled it was planted noise: flip 10% of votes, show the damage, show the method removing it. Without the control a null result is indistinguishable from a broken method.
- **An oddity the reader sees at a glance is a bug report.** A curve that did not move in its first 100 steps was first explained away; checking it found a defective variant and a baseline that secretly carried a prior, which changed the headline from "104 vs 973" to "104 vs about 360". Investigate the pipeline before writing an explanation.
- **Development readings that failed on test go in their own table** ("what did not replicate"), not in a footnote.

## 3. Cards

Anatomy, top to bottom:

1. **Number and topic** (five words at most). The topic comes first; the user rejected conclusion-length headings ("标题太长", "先说 topic，然后才是结论").
2. **One conclusion sentence** (sixteen words at most), written from the data.
3. **The chart.** One. Two panels only for two measures of the same thing.
4. **How to read**, one line, only where the form is not obvious.
5. **Small print: "Data … Model …"**: which rows, which reference, which system. This is where the convention is visible on every card.

Rules:

- **Nothing from another question on the card.** Other populations, other variants, development values go to the full report. User, three times: "一个图只说一个问题", "别混", "这一页想说什么？全混在一起".
- **The headline comparison of a part uses the best method only.** Alternatives are compared in their own later card on the same setting, so the numbers carry over. User: "这些和真实的对比分析这里都用最好的策略，然后后面策略对比分析的时候再分开".
- **When the same chart exists for many objects, use a selector on one card**, default = the object the reader should see first, instead of a grid of small charts.
- **Protected qualifiers.** Mark the sentences that carry honesty (sampling, post-test, held-out) so that no word budget or later edit can cut them.

## 4. Charts

- **Choose the form from the emphasis, then the range from the form.**
  - Small differences between values far from zero: dot rows on a zoomed axis, not bars from zero. Bars were called "不够直接".
  - Convergence or collapse: a line on a **linear** x-axis, cut where nothing more happens (here 0 to 1,000), with the limit as a horizontal line it meets.
  - A claim about shape ("early collapse") must be visible in the plot. If the reader cannot see it ("我还是没看到前期收敛效应"), the range is wrong or the claim is.
- **One axis per measure across the whole report.** The same quantity keeps the same scale, direction and colour on every card. Two baselines at most on an axis.
- **Baselines that are not the point are removed**, not greyed. A reference nobody decides against is noise.
- **Prominence.** Values at full weight; differences at the same weight or weaker; one emphasised number per chart at most. User: "diff 不要太突出，和 value 同一突出程度甚至稍微弱一点", then "数值还是突出，有点突兀".
- **Labels in the reader's words.** No internal codes (M1, C-launch), no parameters without an explanation (K = 16), no method jargon as a series name ("Glicko-style", "refit whole board"), no range suffix that adds nothing ("of 66–85"). Either explain it in the how-to-read line or delete it.
- **Series end labels instead of legends; four lines at most; the emphasised series is the only coloured one.**
- **Navigation, chips and frames stay quiet.** A black table of contents was the loudest thing on the page.

## 5. Structure

Order that survived: **0 summary (four tiles) · 1 task and measures · 2 result (which method; distance to the truth; accuracy by position) · 3 inside each method · 4 what limits it · 5 using it · 6 other uses · 7 closing (what did not replicate; limits)**.

- **Result before methods, methods before analyses by angle.** User: "先说范式等，然后展开介绍，然后分角度".
- **Take the top-level categories from the user.** The first structure grouped by pipeline stage; the user meant model paradigms ("范式是模型范式呀"). Confirm the categories of the main comparison in the user's own terms before building.
- **Each method block**: two plain lines (what it sees, how it is trained or prompted, cost) → mechanism figure → comparison → its own ablations. Ablations of one method stay adjacent.
- **One topic, one part.** Noise appeared in three places; it now lives only in part 4.
- **Slice the headline by where it matters to the reader** (here: board places 1–10, 11–20, …). The user had to ask for it; an average hid that the system compresses the top of the board.
- **Each part opens with its question and one sentence linking it to the previous part.**
- **Freeze the old report when the structure changes.** Build the new one beside it; the user asked for exactly that.

## 6. Build

- **Single source, two outputs** (core and full) from one builder; modules are one file per card or block, each `render(ctx) -> html`.
- **Text numbers come from the data files** through the same accessor the charts use. Two hand-typed numbers were wrong in one day ("+3.3" for a CSV value of +3.2; "best of ten" for twelve configurations).
- **The build enforces the rules**: word budgets for the core, every card has its small-print line, no external reference, a failing module becomes a visible placeholder and the build exits non-zero.
- **A stand-in is marked on the page** (masthead and each card that uses it) when the final data is not there yet, and the switch to the real data is one variable.

## 7. Review

- **The lead looks at the rendered cards before the user does.** A subagent's "verified" is not a viewing; a broken card was synced unseen once.
- **Four independent reviewers, read-only**: content, visual, structure, sceptic (`verification.md` §4). Findings over four rounds here: 22 of 52 open → 1 of 22 → 0 of 13 → pass. Reviewers get the rendered page and the data files, not the builder's code and not the lead's conclusions.
- **Consistency is checked on the rendered text**: one agent converts the page to plain text and lists every number with its card; contradictions between cards are found there, not in the source.
- **View at the widths the reader uses** (1280 and 390 here) and in the PDF.
