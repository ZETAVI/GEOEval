---
name: requirement-grill
description: Clarifies consequential product or engineering requests by resolving ambiguity, scope, non-goals, tradeoffs, decision ownership, and observable acceptance boundaries. Use before design or implementation when multiple interpretations could materially change the outcome. Do not use for trivial edits or when the user explicitly asks to skip clarification.
---

# Requirement Grill

Turn an underspecified request into a compact, decision-ready brief. Challenge consequential ambiguity without converting every task into a workshop.

## When to Grill

Grill when at least one of these is true:

- Different interpretations would change architecture, user behavior, data, cost, security, or delivery scope.
- The request contains a solution but not the underlying outcome.
- Success, non-goals, or the decision owner is unclear.
- An assumption would be expensive or difficult to reverse.

Skip the grill for trivial, reversible work with an obvious acceptance boundary. If implementation can safely proceed with a local assumption, state it instead of asking.

## Workflow

### 1. Read Current Truth

Inspect the named issue, product spec, glossary, current behavior, module contract, and relevant decision records. Do not ask for information already present in the project.

### 2. Build a Decision Map

Map dependencies and separate:

- verified facts already supported by project evidence;
- facts the agent still needs to verify;
- product meaning, risk, cost, and tradeoff decisions owned by a human;
- bounded assumptions parked until their dependency becomes relevant;
- prerequisites between decisions, including which downstream choices would be
  invalidated by an upstream answer.

Use [question patterns](references/question-patterns.md) when the ambiguity is difficult to isolate.

### 3. Select the Bounded Decision Frontier

The frontier contains only decisions whose prerequisites are stable enough to
answer now. From it, select one to three root questions with the highest impact
or greatest risk of downstream rework. Wait on dependent questions whose inputs
are not mature; do not ask the user to speculate through the whole decision
tree.

Verify discoverable facts through project sources, current official sources, or
available tools. Research only enough to support the current frontier. Do not
delegate a searchable fact to the user, and do not use factual research to make
a human-owned value choice. Tools or research may help; no particular subagent
or dispatch pattern is required.

### 4. Ask the Smallest Useful Round

Ask one to three root questions at a time. Use this compact format for each:

1. **Number and short title**
2. **Choice or explicit question**
3. **Why it matters and what it blocks**
4. **Recommended answer and main tradeoff**

If evidence is insufficient for a responsible recommendation, say so and name
the missing evidence instead of manufacturing a default. Avoid leading the user
toward a preferred implementation.

Push back respectfully when the stated solution conflicts with the outcome, duplicates an existing capability, or transfers hidden risk.

### 5. Converge to the Next Safe Gate

Stop when the next stage can proceed safely with stable:

- outcome and primary user;
- scope and non-goals;
- important constraints and assumptions;
- acceptance boundaries;
- unresolved decisions and their owners.

Do not require every project preference to be settled at once. Preserve
unresolved but non-blocking items as explicit assumptions or later frontier
items.

### 6. Confirm Material Decisions

Before standard or architectural design or implementation, use [the decision
brief asset](assets/decision-brief.md) to restate material decisions and obtain
explicit confirmation. Keep it short enough to review in one sitting and link to
the authoritative issue or change record rather than creating a competing
requirements document.

For trivial, reversible work with an obvious boundary, state bounded assumptions
and proceed without a formal confirmation round.

## Guardrails

- Do not design the full solution while requirements are still moving.
- Do not hide an agent decision inside an assumption when a human owns the tradeoff.
- Do not preserve transcripts or private reasoning; record decisions and rationale only.
- Do not treat every preference as a requirement.
- Do not let an agent substitute its own values for human-owned product meaning,
  risk tolerance, cost, or tradeoffs.
- If the user requests immediate execution, identify any material risk, state bounded assumptions, and continue only when the action remains reversible and in scope.
