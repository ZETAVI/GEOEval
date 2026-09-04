# Code Review: AI Evaluation Query Generator

## Review contract

- Baseline: `main@82f70564889698d501129b5188f4046a1a20dfa9`
- Reviewed revision: `0fed3e9af1069af38824436e8866b443aa597f77`
- Owning Issue: [#26](https://github.com/ZETAVI/GEOEval/issues/26)
- Approved intent: [decision-brief.md](decision-brief.md)
- Reviewed scope: Snapshot v3 Query projection, Prompt and model contract,
  preparation lifecycle, AI Execution integration, migration, generated HTTP
  contract, and diagnosis-page states.

## Findings

No blocking or should-fix finding remains in the reviewed diff.

The implementation matches the approved boundary:

- Query receives one narrow immutable projection rather than Brand persistence,
  exact address, coordinates, Amap evidence, or live reference data.
- The model returns one natural target name and four final strings; GEO assigns
  business kinds and ordinals and performs only the agreed name-boundary checks.
- Preparation, attempts, retries, stale-sequence protection, and Definition
  acceptance have one durable owner and reuse Product Outbox, BullMQ, and AI
  Execution instead of adding another workflow framework.
- Exhaustion becomes the customer state `PLEASE_RETRY`; deterministic output is
  limited to the test adapter and is not a customer fallback.
- Web exposes only preparing, ready, and retry states plus the four read-only
  questions. Provider, Prompt, route, attempt, and queue details remain internal.
- Default Langfuse telemetry remains metadata-only. Query input and output are
  emitted only in the existing local-diagnostic mode and pass through the
  established masking projection.
- Overall synthesis and report behavior owned by #41 are absent from this diff.

## Evidence reviewed

- Focused Query contract tests: 10 passing tests across two files.
- Durable preparation integration: 4 passing tests.
- Evaluation, process, and API integrations: 32 passing tests.
- Full backend suite: 33 files and 168 tests passed.
- Web suite: 5 files and 23 tests passed.
- Workspace typecheck, formatting, framework validation, diff check, and full
  build passed.
- All migrations replayed on isolated database `geoeval_issue_26`; a second
  deploy reported no pending migration.
- Deterministic browser journey showed prepare, leave/return, four-question
  review, and evaluation start with no browser console errors.
- The unchanged S6 Provider source brief remains applicable. A read-only model
  list probe on 2026-09-04 returned HTTP 200 from both configured accounts and
  confirmed that Model Studio exposes `qwen3.8-flash` and TokenHub exposes
  `hy3`; no content generation was performed.

## Post-review real-model evidence

- The bounded Query-only batch accepted Prompt 2.3.0 after observed-output
  iterations across restaurant, enterprise-service, and consumer-electronics
  stores. One Qwen timeout recovered through its same route; one Hy3 fallback
  output also passed the model and product review. See
  [real-query-review.md](real-query-review.md).

## Remaining gates

- The rebased branch is published and #32 / PR #35 have received the stable-base
  handoff. Required CI must pass again on the final Prompt revision.
- Accepted current specs and architecture remain unchanged until Query quality
  is accepted; reconciliation and Change archival are intentionally pending.
- A representative 4 x 5 evaluation belongs to #39 and requires separate
  authorization after Query acceptance.

## Result

`ready for reconciliation after final revision verification`
