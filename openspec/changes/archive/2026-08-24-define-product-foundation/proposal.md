# Change: Define the GEOEval Product Foundation

- Status: Completed
- Class: Standard
- Decision owner: Product owner
- Product foundation approved: 2026-08-24
- Application implementation authorized: No

## Why

GEOEval had historical discussion and broad GEO ideas, but no approved product
definition. Beginning architecture or implementation at that point would have
forced agents to choose the primary user, product boundary, evaluation meaning,
and value proposition implicitly.

## Desired outcome

Establish an agreed product foundation that a later MVP and architecture can trace to: primary user, problem, desired outcome, product boundary, evaluation semantics, first valuable journey, and explicit non-goals.

## Scope

- Product identity and positioning
- Primary and supporting users
- Current user workflow and pain points
- First valuable end-to-end journey
- Evaluation objects, evidence, findings, recommendations, confidence, and actionability
- MVP capability boundary and observable acceptance
- Stable product language

## Non-goals

- Selecting frameworks, databases, models, vendors, APIs, or deployment platforms
- Designing services, schemas, UI components, or agent topology
- Estimating a detailed implementation plan before MVP scope is approved
- Treating every historical idea as a requirement
- Building product code

## Impact

This change updated `docs/product/vision.md`, `docs/product/glossary.md`, and the
product-definition specification. It enables—but does not itself decide—the
separate product-design, architecture, external-validation, and implementation
changes that follow.

## Source inputs

- [`GEO-Eval-Prompts.md`](../../../../GEO-Eval-Prompts.md)
- [Product-definition meeting transcripts](../../../../docs/product/research/meeting-transcripts/README.md)
- [Working cross-meeting synthesis](meeting-synthesis.md)
- Future meeting records and research briefs linked from the product discovery plan

## Approval boundary

The product owner confirmed the product meaning, primary user, outcome, first-
release boundary, and material tradeoffs on 2026-08-24. Application architecture
and implementation remain outside this completed change and require their own
approval boundaries.

The confirmed [product-foundation decision brief](decision-brief.md) records that
approval and links to the canonical product direction, shared language, current
behavior specification, and decision history rather than replacing them.
