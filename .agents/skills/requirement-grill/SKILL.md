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

Separate what is known from what must be decided:

- desired outcome and affected users;
- current problem and evidence;
- in-scope and explicitly out-of-scope behavior;
- constraints, dependencies, and irreversible choices;
- observable acceptance and failure boundaries;
- owner of product or risk decisions.

Use [question patterns](references/question-patterns.md) when the ambiguity is difficult to isolate.

### 3. Ask the Smallest Useful Round

Ask one to three root questions at a time. Lead with decisions that could invalidate later work. For each question:

- explain why it matters;
- present concrete alternatives when known;
- state the default you would choose and its tradeoff;
- avoid leading the user toward a preferred implementation.

Push back respectfully when the stated solution conflicts with the outcome, duplicates an existing capability, or transfers hidden risk.

### 4. Converge

Stop when the following are stable enough for the next action:

- outcome and primary user;
- scope and non-goals;
- important constraints and assumptions;
- acceptance boundaries;
- unresolved decisions and their owners.

Do not keep grilling low-impact preferences. Preserve unresolved but non-blocking items as explicit assumptions.

### 5. Return a Decision Brief

Use [the decision brief asset](assets/decision-brief.md). Keep it short enough to review in one sitting. Link to the authoritative issue or change record; do not create a competing requirements document.

## Guardrails

- Do not design the full solution while requirements are still moving.
- Do not hide an agent decision inside an assumption when a human owns the tradeoff.
- Do not preserve transcripts or private reasoning; record decisions and rationale only.
- Do not treat every preference as a requirement.
- If the user requests immediate execution, identify any material risk, state bounded assumptions, and continue only when the action remains reversible and in scope.
