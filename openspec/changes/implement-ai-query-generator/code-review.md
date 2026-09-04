# Code Review: AI Evaluation Query Generator
<!-- Reopened on 2026-09-04 after the real-chain location acceptance failed. -->

## Review contract

- Baseline: `main@82f70564889698d501129b5188f4046a1a20dfa9`
- Reviewed implementation revision: `71063ff9cf569144be5b016af15083d9fa5f9aba`
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
- Prompt `2.4.0+2.1.0` and model contract `@4` keep location and flagship demand
  as the open-question backbone, translate characteristics into user needs, and
  prefer a recognizable natural brand name without adding a rejection rule.
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
- All 20 migrations replayed on isolated database
  `geoeval_issue_26_final_verify`; the final suite used that database and an
  isolated Redis logical database rather than the retained real-call evidence.
- Deterministic browser journey showed prepare, leave/return, four-question
  review, and evaluation start with no browser console errors.
- The unchanged S6 Provider source brief remains applicable. A read-only model
  list probe on 2026-09-04 returned HTTP 200 from both configured accounts and
  confirmed that Model Studio exposes `qwen3.8-flash` and TokenHub exposes
  `hy3`; no content generation was performed.

## Real-model evidence

- Browser selection verified Amap location lineage for Interaction Pie,
  广东星宇律师事务所, and Gram&Gram·酸种披萨; no run used the false `天河路`
  fixture.
- A complete browser preparation froze Prompt `2.4.0+2.1.0`, returned four
  visible questions, and created no 4×5 evaluation run.
- Real Qwen calls over all three verified Query projections succeeded on their
  first calls. The final contract `@4` replay selected `互动派` and retained all
  four question roles in 14.6 seconds.
- The restaurant projection succeeded through the Hy3 fallback in 49.4
  seconds. See [real-query-review.md](real-query-review.md).

## Remaining gates

- Publish the reviewed revision, notify #32 / PR #35 of the new stable head,
  and pass required CI on the final Prompt revision.
- Query quality is accepted and current specs and architecture are reconciled.
  Archive this Change before the final integration gate.
- Explicit integration authorization remains pending.
- A representative 4 x 5 evaluation belongs to #39 and requires separate
  authorization after Query acceptance.

## Result

`ready for integration after required CI`
