# Architecture Review: Evaluation Query Roles and Report Evidence

- Review base: `origin/main@a522e8d4e9d53cd52b8b8c01eff8b335192f5bf1`
- Owning Issue: [#112](https://github.com/ZETAVI/GEOEval/issues/112)
- Result: `ready`

## Review contract

The review covers only the approved #112 delta: per-answer other-brand query
roles, deterministic competitor projection, sample-level composition provenance
and stable model-facing order. Corrective retry, Worker locks, target-index
semantics, external facts and frontend redesign remain explicit non-goals.

## Boundary review

Responsibilities remain cohesive:

- Sample Parser interprets how one answer uses each concrete non-focus brand for
  its supplied open query and preserves separate sentiment/content.
- Brand-name Resolver still groups identities only; it neither approves nor
  rejects competitor occurrences.
- GEO Intelligence program logic projects compact output into existing semantic
  roles, orders candidates, calculates metrics and restores references.
- Report Composer organizes accepted target content and deterministic facts but
  no longer reconstructs content-point pairs that its consumers discard.
- The immutable original answer remains the canonical reviewable evidence.

The selected seams are existing compact model contracts. No new Agent, service,
database record or public API is introduced. Both new model-facing shapes
project into current stored contracts, so historical payloads remain readable
and rollback does not require data repair.

## Data, failure and evolution

- Query role is not persisted as a duplicate fact; its accepted meaning is the
  existing canonical `otherBrands.role` and position.
- Composition sample references are validated locally and restored to current
  evidence references with `observationId: null`.
- Database iteration order is removed from the model contract through explicit
  question/platform sorting.
- Existing stage retry and immutable acceptance boundaries remain unchanged;
  #112 does not use retry to hide contract instability.
- Accepted design will be reconciled into the Evaluation Report spec and Product
  Glossary before the Change is archived. No ADR is required because the
  decision is local to the existing parser/composer owner and is evident from
  its contracts.

## Findings

No material blocking findings. One residual is explicit and accepted: the
current target-brand mention/index semantics remain unchanged even if an open
answer uses the focus brand only contextually. Expanding #112 to that product
decision would alter the approved recommendation index and is not required to
fix the verified competitor/report failures.

## Verdict

`ready`. The design is the smallest coherent change: it removes an unused
point-level model obligation, adds the missing per-answer business distinction
at its owning parser boundary, reuses existing persistence, and preserves
historical reports.
