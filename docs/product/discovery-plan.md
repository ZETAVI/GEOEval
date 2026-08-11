# Product Discovery Plan

## Purpose

Define a product foundation strong enough to guide an MVP without prematurely designing the application. Each stage should produce decisions, non-goals, and observable boundaries—not a transcript.

## Stage 1: Product identity

Resolve:

- What kind of product are we building?
- Who is the primary user in the first release?
- What decision or workflow is difficult today?
- Why is this problem valuable to solve now?
- What is explicitly outside the first product boundary?

Output: an approved problem statement, primary user, desired outcome, and non-goals in `vision.md`.

## Stage 2: User and workflow model

Map:

- primary and supporting actors;
- current workflow and failure points;
- triggers, inputs, decisions, and actions;
- trust, collaboration, and ownership boundaries;
- the smallest end-to-end journey that creates value.

Output: agreed user journeys and a capability map. Do not translate capabilities into services yet.

## Stage 3: Evaluation semantics

Define:

- what is being evaluated;
- which evidence is observed directly;
- what is inferred or scored;
- how confidence, coverage, and uncertainty are communicated;
- what makes a result actionable;
- how results can be compared over time without misleading users.

Output: accepted product requirements and scenarios under `openspec/specs/` after approval.

## Stage 4: MVP boundary

Choose one narrow vertical slice by answering:

- Which user can complete which valuable job?
- What must the product show, explain, or enable?
- Which edge cases and operational limits must work?
- What is deferred without blocking the core outcome?
- What evidence will prove the slice is useful and correct?

Output: an approved first-delivery change, acceptance boundaries, and release slices.

## Stage 5: Architecture entry

Only after the preceding decisions are stable enough:

- research external technologies from official sources;
- define capability ownership and data boundaries;
- compare the smallest viable architecture options;
- record durable tradeoffs in ADRs;
- create an implementation plan with task-appropriate verification.

## Discussion rule

Use `$requirement-grill` in short rounds. Ask one to three root questions, record decisions in the active change, and stop when the next stage is safe to enter. Do not force every open preference to resolve at once.

## Source inputs

- [Historical prompts and framework discussion](../../GEO-Eval-Prompts.md)
- Future meeting notes or research should be linked here as inputs, then promoted selectively into canonical product documents.
