# Change: Integrate Real Evaluation Providers

- Status: Approved for staged design and implementation; controlled paid-call
  manifests remain explicit execution gates
- Class: Architectural integration
- Decision owners: Product owner and architecture owner
- Product confirmation: 2026-08-28

## Why

The deterministic S1-S5 slice proves the customer journey, durable evaluation
lifecycle, semantic contracts, report calculation, retry, history, and
notification behavior. The next independently valuable outcome is to run that
same slice through the five accepted commercial model routes and the accepted
parser and overall-analysis routes without allowing provider behavior to become
business state or silently weaken the verified contracts.

## Scope

- In: a production-selectable real AI execution mode; five real evaluation
  sampling adapters; real per-sample interpretation and overall-analysis
  primary-retry-fallback routes; compact provider-facing semantic contracts and
  deterministic projection into the canonical domain contracts; provider
  response, search, source, usage, latency, error, and model-identity
  normalization; durable ambiguous-attempt recovery; non-blocking Langfuse
  export; and one complete fictional 4-by-5 browser evaluation.
- Out: query-generation Agent work, promotional writing, optimization workflow,
  media publication, commercial customer data, production deployment,
  open-ended load testing, model-ranking experiments, broad prompt
  experimentation, default web-backed entity resolution, final report visual
  polish, and changes to deterministic score ownership.

## Impact

AI Execution gains the real external boundary, route validation, provider
adapters, technical failure classification, and attempt telemetry. GEO
Intelligence keeps evaluation meaning, accepted evidence, parser and synthesis
domain contracts, model-output projection, retry/fallback policy,
deterministic metrics, and report ownership.
Background Work remains a delivery mechanism over durable owner state. The
Worker gains explicit deterministic versus real configuration; the Web and its
authenticated public contracts do not change in the first implementation
step.

The current boolean search observation is insufficient for providers that do
not expose whether a no-source response searched. The change therefore replaces
it with an internal three-state observation while preserving historical report
behavior. Existing attempt JSON becomes a versioned normalized-output plus
provider-evidence envelope without adding a second attempt store.

## Control State

- Documentation: add this proposed delta and source brief; after verification,
  update the current evaluation-evidence and evaluation-report specs plus the
  architecture overview, reconcile the old E0 runner so production mappings
  have one executable owner, execute the provider-related part of the product-
  definition evolution marker without mass-splitting unrelated requirements,
  and archive this change. Product meaning remains in `docs/product/` and is
  not copied here.
- Workspace: branch `codex/integrate-real-evaluation-providers`, based on local
  `main@aa48e96`; current agent is the single writer; merge destination is
  `main`; exit requires deterministic regression evidence, controlled provider
  evidence, one complete fictional browser journey, current-spec
  reconciliation, and explicit branch review. No push or deployment is implied.

## Approval Boundary

The product owner confirmed the staged S6 outcome and implementation direction.
Local code, project-local dependencies, local migrations, fictional fixtures,
and no-secret configuration work are authorized. Each paid batch must still
state an exact maximum call count, routes, fixtures, retry behavior, and stop
conditions before it runs. No batch may use commercial customer data, change a
provider account or quota, deploy production resources, or print credentials or
raw answers.
