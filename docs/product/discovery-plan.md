# Product Discovery Plan

- Status: Completed on 2026-08-24
- Approved result: [Product vision](vision.md), [shared language](glossary.md),
  and [current product specification](../../openspec/specs/product-definition/spec.md)
- Next phase completed: [Application architecture entry](../../openspec/changes/archive/2026-08-25-define-application-architecture/proposal.md)

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
- start a payment-readiness workstream covering merchant application, current
  official-interface research, commercial and account prerequisites, test
  facilities, and delivery lead time;
- validate every proposed evaluation-provider route with current official
  documentation and controlled account calls, including explicit model versions,
  web-search behavior, citations, limits, cost, error semantics, and usage data;
- select an observability approach only after defining product-record ownership,
  per-call trace fields, sensitive-payload handling, access, and retention;
- create a dependency-aware implementation plan that fixes module boundaries and
  interfaces before assigning parallel work, separates independently owned
  workstreams, and gives each task an owner, prerequisite, acceptance boundary,
  integration point, and task-appropriate verification.

## Discussion rule

Use `$requirement-grill` in short rounds. Ask one to three root questions, record decisions in the active change, and stop when the next stage is safe to enter. Do not force every open preference to resolve at once.

## Source inputs

- [Historical prompts and framework discussion](../../GEO-Eval-Prompts.md)
- [Product-definition meeting transcripts](research/meeting-transcripts/README.md)
- [Archived cross-meeting synthesis](../../openspec/changes/archive/2026-08-24-define-product-foundation/meeting-synthesis.md)
- Future meeting notes or research should be linked here as inputs, then promoted selectively into canonical product documents.
