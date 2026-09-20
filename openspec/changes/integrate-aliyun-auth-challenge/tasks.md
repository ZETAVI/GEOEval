# Tasks

## P0: Change control

- [x] Link Issue #64, classify the Change as architectural/critical and record
  the approved CAPTCHA/SMS architecture and external activation gates.
- [x] Create the isolated
  `codex/issue-64-sms-challenge-delivery` worktree from
  `main@5f3ec07` after the pre-integration linear rebases.
- [x] Fix current owners, shared-file boundary, documentation impact, rollback
  and smallest disconfirming evidence.

## I1: Identity-owned contracts

- [x] Add `HumanVerificationPort`, application policy and bounded result
  categories without Alibaba SDK types outside infrastructure.
- [x] Add deterministic and cryptographically secure
  `ChallengeCodeGenerator` implementations.
- [x] Extend `ChallengeDeliveryPort` with accepted/unknown semantics and one
  typed explicit-rejection boundary.
- [x] Refactor `requestChallenge` so stop/verification precede persistence and
  provider unknown preserves the persisted Challenge.
- [x] Prove the new contracts with focused service tests before adding real SDK
  composition.

## I2: Alibaba CAPTCHA

- [x] Pin the official CAPTCHA SDK and add one reusable adapter/client.
- [x] Map `VerifyResult`, replay/scene/parameter denials, credential/permission
  errors and invocation unavailability without leaking provider details.
- [x] Implement disabled/default local behavior and fail-closed production
  configuration with finite unavailable degradation.
- [x] Add the opaque field to DTO/OpenAPI/client and both direct/acquisition
  request paths.
- [x] Integrate the V3 invisible popup client without persisting or logging its
  opaque result.

## I3: Alibaba SMS

- [x] Pin the official domestic SMS SDK and create one reusable client with
  explicit timeout and no automatic retry.
- [x] Implement accepted, explicit rejection and submission-unknown mappings;
  keep SignName/TemplateCode configurable and code-only template parameters.
- [x] Select deterministic or Aliyun adapters explicitly in
  `IdentityModule`; production must reject deterministic, disabled or
  incomplete combinations.
- [x] Add stop-new-Challenge and bounded provider observation without exposing
  code, full mobile, CAPTCHA data or credentials.

## I4: Safeguards and evidence

- [ ] Confirm the production trusted-proxy topology before adding a local
  coarse-IP key; rely on Alibaba CAPTCHA risk/IP controls and the existing
  Origin/mobile boundaries until that source address is trustworthy.
- [x] Align the existing same-mobile window to 60 seconds and five/hour; emit
  bounded verification/delivery/latency telemetry and provide an operator stop
  path without creating a delivery ledger.
- [ ] Configure named-environment daily/monthly telemetry aggregation, cost
  alerts and stop thresholds before any paid activation.
- [x] Verify offline CAPTCHA pass/deny/replay/mismatch/unavailable budget, SMS
  accepted/rejected/unknown, configuration fail-closed, no retry, stop behavior
  and redaction.
- [x] Run focused tests, typecheck, generated-contract checks and the
  task-appropriate broader suite; record skipped environment-dependent checks.

## I5: Reconcile and deliver

- [x] Promote accepted behavior into the current Identity spec and operations
  runbook; generate OpenAPI/client owners and resolve any touched Evolution
  marker.
- [x] Run fixed-diff architecture and code review, then verify the final Change
  against Issue #64 acceptance.
- [ ] Open one main-direct PR with a Partial or Final relationship matching the
  actually completed external gates.
- [ ] Record RAM/signature/paid-test/formal-mode/production residual gates and
  the worktree exit state; archive this Change only when its accepted scope is
  reconciled.
