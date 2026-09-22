# Tasks

## P0: Change control

- [x] Link Issue #64, classify the Change as architectural/critical and record
      the approved CAPTCHA/SMS architecture and external activation gates.
- [x] Create the isolated
      Issue #64 worktree for the delivery branch and reuse it for the disjoint
      `codex/issue-64-ram-policy` follow-up, then rebase it onto current
      `main@d099547` before final review.
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

- [x] Align the existing same-mobile window to 60 seconds and five/hour; emit
      bounded verification/delivery/latency telemetry and provide an operator stop
      path without creating a delivery ledger.
- [x] Verify offline CAPTCHA pass/deny/replay/mismatch/unavailable budget, SMS
      accepted/rejected/unknown, configuration fail-closed, no retry, stop behavior
      and redaction.
- [x] Complete one separately authorized local real-CAPTCHA, formal-template
      SMS, carrier-receipt, user-entered OTP and Session flow without repeating the
      paid send or recording authentication-capable values.
- [x] Inject the selected runtime credential through the protected deployment
      path and activate the real flow on the server Demo.
- [x] Run focused tests, typecheck, generated-contract checks and the
      task-appropriate broader suite; record skipped environment-dependent checks.

## I5: Reconcile and deliver

- [x] Promote accepted behavior into the current Identity spec and operations
      runbook; generate OpenAPI/client owners and resolve any touched Evolution
      marker.
- [x] Run fixed-diff architecture and code review, then verify the final Change
      against Issue #64 acceptance.
- [x] Merge PR #134 as a Partial relationship without closing Issue #64; use a
      separate main-direct PR for the minimum-permission evidence refresh.
- [x] Record RAM/signature/paid-test/formal-mode/production residual gates and
      the worktree exit state; archive this Change only when its accepted scope is
      reconciled.
- [x] Merge the server-Demo deployment configuration and deploy the accepted
      revision under both host locks without repeating payment tests.
- [x] Verify one user-entered OTP Session closure on the server Demo and
      reconcile the final runtime evidence.

## Residual public-release and account operations

- [ ] Confirm trusted-proxy/IP topology before adding any coarse local IP key or
      RAM `acs:SourceIp` restriction.
- [ ] Add named-environment daily/monthly aggregation and cost alerts before
      removing the protected-Demo gate.
- [ ] Observe ordinary target-traffic delivery outcomes without turning
      three-carrier sampling into a release prerequisite.
- [ ] Rotate or revoke local/older AccessKeys only under a separately confirmed
      Alibaba account operation.
- [ ] Switch CAPTCHA to formal mode, complete privacy review and remove Basic
      Auth only through a separately approved public-release transaction.

These residuals remain under Issue #64 and do not keep the implemented,
reconciled protected-Demo Change active.
