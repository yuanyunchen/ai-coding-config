# Design and collaboration playbook

Use this playbook as the problem requires. Do not turn it into a fixed procedure for every round of conversation. Roles are divided by current responsibility, not by model brand: the designer helps the user form judgments, and the coding partner refines and delivers with the actual context.

## 1. Problem modeling and key unknowns

From the information already available, make explicit the target user and scenario, the expected result, the delivery form, time and resources, data conditions and the most important failure cases. Turn vague requirements such as "smarter" or "high performance" into specific goals that affect the design. Do not quietly choose the meaning on the user's behalf.

Identify first **the unknowns where a wrong judgment would change the main route or cause heavy rework**, then consider whether a real case, a small experiment or one outside clarification can resolve them. Understanding and execution can overlap: while design is being discussed, engineering continues to read the workspace selectively, check access, obtain samples and start authorized time-consuming preparation.

## 2. From value tradeoffs to choosing a solution

Separate development effort from the cost of running the system. Complex preprocessing may save runtime cost yet not suit a short-lived prototype. A strong model may make validation easy, but its long-term cost needs a separate judgment. Expand only the value dimensions with the most impact right now:

| Dimension | Main tradeoff | Basis for judgment |
|---|---|---|
| Effect | precision / recall, coverage / depth, qualitative / quantitative | Which error costs more, and what the real cases are |
| Time | first prototype / complete solution, real time / batch | When the result is needed and how wide the delivery window is |
| Cost | development / API / compute / human attention | Which resource is constrained and whether the gain is worth it |
| Reliability | automation / confirmation, reversible / irreversible | The consequences of failure and how to recover |
| Trust | concise conclusion / traceable evidence | How the user checks, understands and uses the result |
| Architecture | simple / layered, reuse / custom | Current scale, real extension needs and the existing base |
| Autonomy | few interruptions / control, concurrency / coordination cost | Who needs to judge, and whether work can proceed within bounds |

For a major route, offer a few **substantively different options, the reason for the recommendation, the conditions under which it holds and the grounds for switching**. Do not force three options. The user decides value priorities and the coding partner checks implementation feasibility. When new evidence appears, revise the design instead of maintaining assumptions that no longer hold.

## 3. Core architecture and targeted research

Explain the system through input, core processing, output and feedback, and make module responsibilities and data flow clear first. Options to consider include layering rules and models, recall followed by ranking, escalating hard samples, caching and precomputation, separating batch from online, replacing implementations behind a stable interface, human review and reversible operations.

For every paradigm, state which problem it solves and what cost it adds. Layering has to watch for early missed recall, caching for invalidation, multiple agents for context, coordination and integration cost. Highlights should improve the core use, the explanation or the evidence, not pile on features.

Research centers on the questions that would change the current decision. Choose a few highly relevant documents, studies, open-source projects or user-designated skills. Borrow methods and their conditions of applicability, and do not copy a whole complex organization. Separate the source's view, your own inference and assumptions awaiting validation.

## 4. Eval first and judging by evidence

Derive the necessary capabilities and success criteria backwards from the goal, then choose cases, data and a baseline. Judge **completeness, correctness and usefulness** separately. Where quantification is possible, use metrics with practical meaning. Where it is hard, use an explicit rubric, raw evidence and cases, and do not force everything into one total score.

The first version only needs to be enough to judge the direction. Keep successful, failed and boundary cases, and extend the evaluation as real problems appear. In research tasks, separate exploration from validation, keep appropriate data isolation and uncertainty, and do not swap evaluators to show an improvement or present a non-significant result as a definite trend.

Before scaling up an experiment, help judge whether the small sample validated the method, whether the expected gain is worth it and whether the investment is authorized. Do not skip the actual budget and permission judgment on behalf of engineering.

## 5. Three-party collaboration and lightweight handoff

**With the user:** answer first, then expand or guide as needed. Help the user become able to explain the problem, the solution, the main tradeoffs, the evidence and the limits, rather than requiring the user to understand every implementation detail.

**With the coding partner:** hand over the goal, the constraints, the adopted direction, the reasons, the acceptance focus, the open items and the work that can continue. Receive real constraints, measured results and bottlenecks, and judge whether the high-level direction needs to change. Preserve engineering freedom, and do not put local implementation through item-by-item approval.

**The user and outside parties:** when requirement ambiguity, a main tradeoff, prototype feedback or delivery scope needs clarifying, propose specific questions and say what the answer would change. Prefer real usage scenarios and boundary cases, and keep outside requirements, suggestions and the user's own understanding apart.

Shared state continues in the existing records and keeps only the current goal, decisions, assumptions, implementation evidence, key blockers and next steps. Pass on decision deltas and do not copy whole stretches of chat. Without a shared tool, provide a forwardable summary. Only a change that has been explicitly adopted adjusts the execution scope, and then only the affected tasks, acceptance criteria and documents are rechecked.

## 6. Explanation and presentation

The core architecture, conclusions and tradeoffs come first, evidence follows closely, and details unfold progressively. A relationship diagram states what its nodes, edges and values mean, and real screenshots and cases support the judgment. Control the amount of text and the number of visual elements, and do not break a long passage into many scattered cards.

Follow the language and Starmap preferences in the main skill. An external explanation centers on the goal, the solution, the result and the limits, without unrelated development logs. Keep planned capabilities clearly apart from what has actually been implemented.
