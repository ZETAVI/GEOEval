# Tasks

## P0: Change control

- [x] Link Issue #64, classify the Change as architectural/critical and record
  the approved CAPTCHA/SMS architecture and external activation gates.
- [x] Create the isolated
  `codex/issue-64-sms-challenge-delivery` worktree from
  `main@6b09858b09e39976be7427c2901b45e1a1124c63`.
- [x] Fix current owners, shared-file boundary, documentation impact, rollback
  and smallest disconfirming evidence.

## I1: Identity-owned contracts

- [ ] Add `HumanVerificationPort`, application policy and bounded result
  categories without Alibaba SDK types outside infrastructure.
- [ ] Add deterministic and cryptographically secure
  `ChallengeCodeGenerator` implementations.
- [ ] Extend `ChallengeDeliveryPort` with accepted/unknown semantics and one
  typed explicit-rejection boundary.
- [ ] Refactor `requestChallenge` so stop/verification precede persistence and
  provider unknown preserves the persisted Challenge.
- [ ] Prove the new contracts with focused service tests before adding real SDK
  composition.

## I2: Alibaba CAPTCHA

- [ ] Pin the official CAPTCHA SDK and add one reusable adapter/client.
- [ ] Map `VerifyResult`, replay/scene/parameter denials, credential/permission
  errors and invocation unavailability without leaking provider details.
- [ ] Implement disabled/default local behavior and fail-closed production
  configuration with finite unavailable degradation.
- [ ] Add the opaque field to DTO/OpenAPI/client and both direct/acquisition
  request paths.
- [ ] Integrate the V3 invisible popup client without persisting or logging its
  opaque result.

## I3: Alibaba SMS

- [ ] Pin the official domestic SMS SDK and create one reusable client with
  explicit timeout and no automatic retry.
- [ ] Implement accepted, explicit rejection and submission-unknown mappings;
  keep SignName/TemplateCode configurable and code-only template parameters.
- [ ] Select deterministic or Aliyun adapters explicitly in
  `IdentityModule`; production must reject deterministic, disabled or
  incomplete combinations.
- [ ] Add stop-new-Challenge and bounded provider observation without exposing
  code, full mobile, CAPTCHA data or credentials.

## I4: Safeguards and evidence

- [ ] Align the existing same-mobile window to 60 seconds and five/hour; add a
  coarse trusted-entry/IP boundary without a device-fingerprint system.
- [ ] Add daily/monthly usage observation and an operator stop path before any
  paid activation; do not create a delivery ledger unless a real recovery need
  is demonstrated.
- [ ] Verify CAPTCHA pass/deny/replay/mismatch/unavailable budget, SMS
  accepted/rejected/unknown, configuration fail-closed, no retry, stop behavior
  and redaction.
- [ ] Run focused tests, typecheck, generated-contract checks and the
  task-appropriate broader suite; record skipped environment-dependent checks.

## I5: Reconcile and deliver

- [ ] Promote accepted behavior into the current Identity spec and operations
  runbook; generate OpenAPI/client owners and resolve any touched Evolution
  marker.
- [ ] Run fixed-diff architecture and code review, then verify the final Change
  against Issue #64 acceptance.
- [ ] Open one main-direct PR with a Partial or Final relationship matching the
  actually completed external gates.
- [ ] Record RAM/signature/paid-test/formal-mode/production residual gates and
  the worktree exit state; archive this Change only when its accepted scope is
  reconciled.

