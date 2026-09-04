# Architecture Review: AI Evaluation Query Generator
<!-- Reopened on 2026-09-04 after the real-chain location acceptance failed. -->

## Review contract

- Baseline: `main@82f70564889698d501129b5188f4046a1a20dfa9`
- Owning Issue: [#26](https://github.com/ZETAVI/GEOEval/issues/26)
- Reviewed design: [design.md](design.md)
- Confirmed product boundary: [decision-brief.md](decision-brief.md)
- Review scope: Snapshot v3 Query projection, durable preparation, AI Execution boundary, model contract, migration, recovery, and cross-Issue ownership.

## Change map

- Brand Knowledge owns editable Brand facts, verified Store Location, industry reference data, fingerprint, and the complete Snapshot v3.
- GEO Intelligence owns the narrow Query projection, preparation lifecycle, final four-question projection, immutable Definition, and customer-visible state.
- AI Execution owns Provider-neutral execution and append-oriented Query attempt evidence.
- Background Work owns Outbox relay, BullMQ delivery, and reconciliation; neither Redis nor telemetry is business truth.
- Web consumes only the public preparation/Definition contract.

## Findings resolved in this revision

1. **must-fix — old v2/legacy Query input**
   The pre-M4 branch consumed a compatibility text projection and fixed two characteristics. The revision now consumes `evaluationBrandQueryContext(...)` over Snapshot v3 and exposes only city, terminal region, typed Query locality, flagship offer, recommendation subject, and the complete peer set.

2. **must-fix — model interface wider than its responsibility**
   The old model contract duplicated candidates, selected text, fixed kinds, and an unused explanation. Contract v2 now returns one target name and four final strings; program code supplies kinds and ordinals.

3. **must-fix — crossed synthesis ownership**
   Old commit `c9c8c85` changed overall synthesis/report behavior owned by #41. It was dropped during Rebase and is absent from the current diff.

4. **must-fix — premature current-truth reconciliation**
   The old branch archived the Change and described Query as accepted before M4 quality review. That commit was dropped; the Change is active and current specs remain accepted truth until final reconciliation.

5. **must-fix — moving-base and migration order**
   The branch was rebased to the current protected main. The unmerged Query migration now follows the current main sequence and has passed clean isolated replay plus a second no-pending deploy.

6. **must-fix — main-owned module composition**
   Rebase resolution preserves Snapshot v3, Media Supply, current Identity/Store Location registration, #44 telemetry behavior, and current governance. Generated Prisma/OpenAPI clients are regenerated from source.

7. **must-fix — deterministic fallback ambiguity**
   Deterministic question output remains only inside the test adapter. Real Agent exhaustion becomes `PLEASE_RETRY`; the customer path does not silently return a template Definition.

## Architectural quality assessment

- Cohesion: `EvaluationQuestionPreparation` and its repository own one complete lifecycle; no partial state leaks into Web or AI Execution.
- Dependency direction: Query consumes one GEO projection and does not cross into Brand or Amap persistence.
- Data integrity: unique Brand/fingerprint preparation, sequence/attempt identity, accepted-attempt links, and conditional transitions protect concurrent and late outcomes.
- Failure ownership: Provider and telemetry failures stay in AI Execution; retry sequencing and Definition acceptance stay in GEO; delivery recovery stays in Background Work.
- Reuse: Product Outbox, BullMQ, Provider adapters, attempt envelope, and telemetry seams are reused for their existing semantics.
- Proportionality: no new workflow framework, generic Agent abstraction, candidate store, scoring layer, Critic/Judge, or ADR is required.

## Residual risks and follow-ups

- `should-fix`: PR #35 for #32 is stacked on the old #26 history. Notify its owner after the new #26 head is published; do not modify #32 from this Worktree.
- `consider`: Provider entitlement, model identifier, latency, and cost can drift. Recheck the route immediately before real calls; none of these facts changes the durable business contract.

The earlier current-truth and Prompt-quality findings are resolved. The current
evaluation-definition spec and architecture overview now describe the accepted
AI Query behavior. Real Amap/browser and Provider evidence covers the three
representative inputs, with a final Qwen target-name replay and Hy3 fallback.

## Result

`ready`

The architecture and current truth are ready for integration. Required CI,
explicit Merge authorization, final 4×5, and production remain separate gates.
