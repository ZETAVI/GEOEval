# Tasks

## P0: Align and control

- [x] Re-read Issue #156, current main/Project/parallel work and the accepted
      product/Identity owners.
- [x] Confirm public terminal-customer registration and Basic Auth removal with
      the product owner.
- [x] Refresh Alibaba CAPTCHA/RAM/privacy primary-source evidence and verify the
      production egress.
- [x] Record architecture findings, failure/recovery, fixed ownership, base and
      worktree exit.
- [x] Publish the Decision checkpoint and move #156 to implementation.

## I1: Public surface and disclosure

- [x] Remove Basic Auth from the application Nginx owner; add exact auth IP
      throttles and safe response headers without changing callback routes.
- [x] Omit Swagger and Foundation HTTP controllers in production and return 404
      for the production Web Foundation probe.
- [x] Add a public privacy/security notice and link it before CAPTCHA/SMS.
- [x] Add focused deployment, public-surface and Web tests.

## I2: Aggregate cost control

- [x] Add one singleton transactionally locked Challenge budget state and
      initialize it from current retained Challenge facts.
- [x] Add required production day/month caps, an early exhausted check,
      authoritative transactional enforcement and bounded 80% warning telemetry.
- [x] Prove concurrent exact cap, day/month rollover, stop behavior and redaction.

## I3: Verify and integrate

- [x] Generate Prisma/OpenAPI where affected; run focused tests, backend/Web
      suites, types, formatting, builds and framework validation.
- [x] Perform architecture review and fixed-diff code review; reconcile current
      Identity/deployment owners and the active Change.
- [ ] Open the main-direct PR, pass Required Checks and merge the accepted
      revision.

## R1: Provider account and production release

- [ ] Switch scene `18hnihr4` to formal/default policy and wait for propagation.
- [ ] Add `acs:SourceIp=8.138.100.3` to both runtime actions and prove
      server-allowed/outside-denied behavior.
- [ ] Rotate the runtime AccessKey under action-time confirmation; install the
      replacement and revoke the superseded key.
- [ ] Back up Nginx/environment/database, deploy one immutable release under both
      locks and validate syntax before removing Basic Auth.
- [ ] Verify anonymous homepage, protected API denial, privacy notice, formal
      CAPTCHA/SMS/user-entered OTP/Session, role landing, callback rejection,
      payment fact stability, budget observation, service health and logs.
- [ ] Reconcile and archive this Change, close #156, move Project to Done and
      remove the clean branch/worktree.
