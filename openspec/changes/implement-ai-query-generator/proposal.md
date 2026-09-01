# Change: Implement the AI Evaluation Query Generator

- Status: Approved and in implementation on the accepted Brand Knowledge
  reference-data baseline
- Class: Architectural implementation
- Owning Issue: [#26](https://github.com/ZETAVI/GEOEval/issues/26)
- Decision owners: Product owner and architecture owner
- Architecture direction: Confirmed by the product owner on 2026-09-01
- Implementation authorization: The isolated Query instruction, model-output
  contract, deterministic projector, and fixtures are complete as #26a. Brand
  Knowledge reference data merged through #27 / PR #31, so durable preparation
  and deterministic API/Web integration may proceed. Real calls remain a
  separate explicit gate.

## Why

The accepted evaluation journey currently creates its four questions from a
deterministic text template. That implementation proved definition ownership,
immutable snapshots, and the four-by-five execution path, but it cannot produce
the natural, brand-specific questions needed for a useful real evaluation.

Replacing the template with an external model is not a local adapter swap. The
request can take seconds, fail after the browser leaves, or be delivered twice;
a synchronous call could therefore duplicate cost or lose the preparation
state. This change introduces the smallest durable preparation lifecycle that
preserves the accepted one-definition-per-brand-revision behavior.

## Desired outcome

One Agent uses the current evaluation-ready brand snapshot to produce several
candidate angles and select one coherent four-question set. The customer sees
only the final four read-only questions, expressed in natural Chinese close to
how ordinary people ask for information or recommendations. The generation can
resume after delivery or process failure without creating another question set
for the same brand revision.

## Scope

- Replace customer-path template generation with one versioned structured
  Query Agent call that proposes candidate angles and selects the final four
  questions together.
- Preserve the accepted question roles: one brand-specific current-state
  question, one industry-recommendation question, and two recommendation
  questions shaped by the brand's two characteristics.
- Consume the accepted Brand Knowledge evaluation-purpose projection, which
  owns both the approved industry selection and the
  province-city-terminal-region selection while exposing stable identities and
  display meaning to Query generation.
- Persist an idempotent preparation state before any provider call and reuse the
  existing Product Outbox, BullMQ worker, provider adapters, structured-output
  transport, and telemetry boundary.
- Use Qwen3.8 Flash as the primary generation route with one same-route retry,
  then Hy3 as the provider-distinct fallback; Query generation does not use web
  search.
- Show concise `preparing`, `ready`, and `please retry` behavior in the existing
  diagnosis page without exposing candidates, prompts, models, attempts, traces,
  or internal errors.
- Validate the Agent first with controlled Query-only profiles, including the
  explicitly authorized 互动派科技股份有限公司 profile. After product review of
  the four questions, run one authorized four-by-five evaluation through the
  existing S6 pipeline.

## Non-goals

- Customer editing, refreshing, choosing, or scoring individual questions.
- A second Critic Agent, programmatic style scorer, unconstrained alias
  expansion, keyword quality rules, or other subjective semantic gate. Program
  checks the structural contract plus one metric-protecting invariant: the
  brand-directed question contains a natural target name validated as the full
  company/store name or a continuous substring, while the three open questions
  contain neither that target name nor the full name.
- Query-Agent web search, automatic enrichment of brand facts, or factual brand
  investigation.
- Changes to five-platform sampling meaning, parser or overall-synthesis
  semantics, report metrics, optimization writing, publishing, payments, or
  production release.
- Silent fallback to the deterministic template in a real customer path.

## Impact

- **Brand Knowledge:** is the accepted upstream owner of executable industry
  data, authoritative administrative-region data, both dependent selectors,
  persistence, readiness, fingerprint continuity, and the evaluation-purpose
  projection.
- **GEO Intelligence:** owns question-preparation state, Prompt meaning,
  structured-output acceptance, and the immutable accepted definition.
- **AI Execution:** gains a question-generation purpose and durable technical
  attempts while retaining provider, route, envelope, and ambiguity ownership.
- **Background Work:** dispatches one additional GEO-owned product event through
  the existing Outbox/BullMQ runtime; no new queue framework is introduced.
- **Public API and Web:** preparation becomes an asynchronous stateful contract
  before the existing definition review and official-start behavior.
- **Data:** additive preparation and question-generation attempt persistence.
  Brand industry persistence changes are outside this change.

## Control State

- Documentation: this active change owns uncertain Query-generation design.
  Accepted behavior will be reconciled into the evaluation-definition current
  spec and architecture overview. #27 already reconciled the product catalog's
  `move-on-activation` and region-source maintenance boundary.
- Workspace: `codex/issue-26-query-generator` at
  `main@3f8d815486755082f6334f4adac9480d982155d1` after the accepted #27
  integration, owned by the primary Codex agent, merge destination protected
  `main`, exit after verified PR merge and branch cleanup.
- Verification boundary: deterministic lifecycle and recovery evidence,
  migration replay, generated contracts, builds, browser behavior, one
  controlled real Query-only review, and only then one separately authorized
  four-by-five evaluation. Neither step proves production capacity or release.
