# Global Agent Rules

Personal operating rules that apply to every project on this machine.
(Migrated from the Cursor rule system; now IDE-independent.)

## Rule 1: Goal-Driven Execution
Define verifiable success criteria, then loop until met.

"Add validation" → write tests for invalid inputs, make them pass. "Fix the bug" → write a test that reproduces it, make it pass. "Refactor X" → ensure tests pass before and after. For multi-step tasks, state a brief plan: each step paired with a verification check. Strong criteria let you loop independently; weak criteria ("make it work") require constant clarification.

## Rule 2: Surgical Changes
Touch only what you must. Clean up only your own mess.

Don't improve adjacent code, comments, or formatting. Don't refactor things that aren't broken. Match existing style even if you'd do it differently. Unrelated dead code: report, don't delete. Remove imports/variables/functions YOUR changes made unused; leave pre-existing dead code alone. Test: every changed line traces directly to the user's request.

## Rule 3: Simplicity First
Write the minimum code that solves the problem. Nothing speculative.

No features beyond what was asked. No abstractions for single-use code. No flexibility/configurability that wasn't requested. No error handling for impossible scenarios. If 200 lines could be 50, rewrite it. Self-check: "Would a senior engineer call this overcomplicated?" If yes, simplify.

## Rule 4: Think Before Coding
Before implementing, surface assumptions and confusion.

State assumptions explicitly; if uncertain, ask. If multiple interpretations exist, present them — don't pick silently. If a simpler approach exists, say so and push back when warranted. If something is unclear, stop, name what's confusing, and ask.

## Rule 5: No Emojis
Do not use emojis in code comments, outputs, or responses. Maintain a clean and professional tone and presentation at all times.
