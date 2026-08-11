# Change: Define the GEOEval Product Foundation

- Status: Proposed
- Class: Standard
- Decision owner: Product owner
- Implementation authorized: No

## Why

GEOEval has historical discussion and broad GEO ideas, but no approved product definition. Beginning architecture or implementation now would force agents to choose the primary user, product boundary, evaluation meaning, and value proposition implicitly.

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

This change will update `docs/product/vision.md`, `docs/product/glossary.md`, and capability specs. It will enable—but not itself decide—the first architecture and implementation change.

## Source inputs

- [`GEO-Eval-Prompts.md`](../../../GEO-Eval-Prompts.md)
- Future meeting records and research briefs linked from the product discovery plan

## Approval boundary

The product owner must approve product meaning, primary user, outcome, MVP boundary, and material tradeoffs. Agents may research, structure alternatives, and expose contradictions but must not silently finalize these decisions.
