# Matching a reference site, and checking an interactive page's logic

Two situations that `web.md` and `interactive.md` do not cover: the user points at an existing site and wants our page to look like part of it, and a page whose controls compute a result.

> Source: the model-router and auto-rater pages of the 2026-11 work trial. Matching the reference took seven user corrections that one measured pass would have avoided ("前端设计，模仿还不会吗", "别再让我一点点找不同了").

## 1. Matching a reference site

**Principle (user ruling):** design elements as close to the reference as possible; only the layout adapts to our functions. Brand assets are the user's to supply: do not copy a logo, wordmark or icon file on your own, and keep any "independent prototype" notice.

1. **Measure before writing CSS.** Open the reference in the browser and read computed styles for every element class we also have: sidebar (both states: expanded and collapsed), top bar, wordmark, headline, pills and tags, buttons, inputs, cards, tables. Record font family, size, weight, line height, colours, radius, border, padding, gaps, widths. Write them into one table; the CSS is derived from the table. Eyeballing a screenshot produced a sidebar that was "still different" after two rounds.
2. **Inventory the elements, then diff.** List every element of the reference's shell. For each: present on our page, same measured values, same states (hover, active, collapsed). The list is the acceptance checklist.
3. **Ask for the viewport instead of inferring it.** A user screenshot has an unknown zoom and device pixel ratio. A 67% browser zoom was misread as a wide viewport and led to a wrong claim about the sidebar's width. Ask for window size and zoom, or test at several.
4. **Side-by-side before showing.** Screenshot the reference and our page at the same viewport, place them next to each other, and have an independent reviewer list every difference. The user should not be the diff tool.
5. **Change only what the reference owns.** Shell, type, colours, component styles follow the reference. Our own controls and their layout stay as they are unless the user asks. An unrequested change to a control card had to be reverted ("其他的没让你变呀").
6. **Vertical rhythm is part of the match.** Check where the first screen ends at the user's window height (here: the recommended result must be visible without scrolling) and make spacing adapt below a height threshold instead of fixing it for one screen.
7. **Assets must be on disk before they are used.** An image pasted into the conversation is not a file. Confirm the path exists; if it does not, say so and ask, and mark anything redrawn from a description as a redraw.

## 2. Logic of an interactive page

A control that computes a result is a function; test it like one.

- **Test every control at its extremes, alone.** Each weight at 0 and at 100% with the others at 0, each filter at its tightest and off. The expected result at an extreme is usually obvious without a spec: "cost only" must return the cheapest option. It returned another one, because a default quality floor stayed active when the quality weight was zero.
- **Look for hidden defaults.** List every default that constrains the result. For each, decide what happens when the user's setting makes it meaningless, and keep a value the user set explicitly.
- **State the rule on the page.** The conditions line next to the result says which limits were applied, so a surprising result explains itself.
- **Keep these extreme cases as the page's regression checks** and rerun them after every restyle; styling passes changed behaviour once.
