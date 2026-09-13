# Architecture Review: Formal Evaluation Report Analysis

- Review base: `origin/main@1d347873ba8d42b68c45195cd896ae10cc10ef55`
- Owning Issue: #42
- Proposed runtime PR: #90
- Result: `ready with remaining gates`; the bounded implementation, migration,
  integration and API contract pass locally, while one formal real path and the
  #41 semantic review remain before Issue closure

## Intent

The accepted PR #62 candidate now replaces the old formal per-sample and
one-shot synthesis path inside the existing runtime owners. The implementation
must also expose persisted customer-safe progress and reuse accepted upstream
work after later-stage failure. It must not import the experiment as a second
runtime or expand into #43 frontend presentation.

## Engineering

Responsibilities remain cohesive:

- the Prompt owns semantic task and workflow;
- Zod schemas own output fields, types and bounds;
- GEO Intelligence-owned program logic persists interpretations and resolution,
  restores source records, computes statistics, projects progress and validates
  references/invariants;
- AI Execution-owned attempts remain the external-call evidence boundary.
- Background Work delivers purpose events and reconciles unfinished durable
  state without becoming progress or report authority.

The name-level interface remains smaller than record/group-ID alternatives.
Adding one accepted name-resolution record is justified because composition
retry must reuse it; deleting that record would force another external call or
make the queue the hidden owner. Extending the existing aggregate attempt store
with an explicit purpose is smaller and safer than creating another attempt
store. Public progress is a read projection over the same durable owner state.

The exact-anchor change separates two concerns. Full original answers remain
immutable evidence and semantic content points remain source-grounded. Exact
line/offset mapping is only presentation; treating its absence as an unavailable
sample would create unnecessary retries and reject useful customer evidence.
Unsupported brand attribution and invalid analysis references remain hard
failures.

## Evidence and residuals

The 42-call controlled run and PR #62 checks are reusable evidence for the
selected model, Prompt task boundaries and complete-text preparation. They are
not evidence for the new migration, runtime idempotency, Worker recovery, API
progress or report compatibility. Those dimensions must be verified on PR #90.

Explicit residuals:

1. two unrelated entities with the same exact parsed name cannot be separated;
2. separately named parent-brand lines need a product counting decision if they
   materially affect customer statistics.

Neither justifies a larger interface or blocks implementation unless a reachable
customer statistic changes.

## Verdict

`ready with remaining gates`. The additive migration, current-owner integration,
purpose-level idempotency and retry, historical parser readability,
customer-safe progress contract, focused tests, all 679 enabled backend tests,
workspace typecheck, build and project-framework validation pass locally. The PR
remains Draft until one formal real Worker/report path and the #41 semantic gate
are complete. #43 starts only after that public contract is merged.
