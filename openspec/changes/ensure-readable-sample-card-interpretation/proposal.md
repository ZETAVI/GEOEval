# Change: Ensure Readable Sample Card Interpretation

- Status: Approved implementation from real-run defect evidence
- Class: Standard Bug fix
- Owning Issue: [#32](https://github.com/ZETAVI/GEOEval/issues/32)
- Parent result: [#39](https://github.com/ZETAVI/GEOEval/issues/39)
- Stacked base: `codex/issue-26-query-generator`
- Prior boundary: [`simplify-sample-parser-projection`](../archive/2026-09-01-simplify-sample-parser-projection/proposal.md)

## Why

The authorized run `69c8e518-cddb-41c9-a2f9-e31981ae5b44` returned a structurally
valid non-mention parser proposal whose customer card interpretation was only
`}}}`. The model output passed the non-empty string contract, was persisted, and
was returned by the report projection. This is a parser-output quality and
model-to-domain projection defect, not a character-encoding defect.

## Desired outcome

The Parser Prompt and structured-output description make concise, formal,
customer-readable prose the normal model behavior. The existing deterministic
projector preserves readable model prose and replaces only an obviously
unreadable structural fragment with a statement derived from already accepted
mention and open-position facts. A valid non-mention can therefore be accepted
without another Provider call while the hard evidence boundaries remain
unchanged.

## Scope

- Clarify the shared and family-specific Parser instructions for customer card
  prose and add the same meaning to the provider-facing schema description.
- Version the Prompt profiles and provider-facing model contract.
- Normalize only card text that contains no letter or numeral before canonical
  validation and persistence.
- Replay the protected failure shape and prove persistence and report projection
  use the normalized value without a parser retry.
- Reconcile the accepted rule into the evaluation-evidence spec and existing
  architecture overview.

## Non-goals

- Change target-mention, open-position, evidence, scoring, or 17/20 semantics.
- Inspect or rewrite readable prose with heuristics, a Critic Agent, human
  review, resampling, or another retry.
- Change overall synthesis or brand grouping (#41), Brand or Query ownership
  (#40/#26), Worker concurrency, report visuals, public APIs, migrations, real
  routes, or production configuration.
- Rewrite accepted historical interpretations in place.

## Impact and rollback

GEO Intelligence keeps the existing model-to-domain projector as the only new
behavior owner. The canonical stored contract remains `1.0.0`; no migration is
required, and reports continue to project accepted card text without a second
presentation rule. Rollback restores the prior Prompt/model versions and removes
the narrow projection fallback; previously accepted records remain readable.
