# Tasks

## Alignment and architecture

- [x] Confirm no current Issue, PR or active Change owns the independent
      browser-control-plane integration; establish Issue #169 and Project state.
- [x] Fix ownership among GEO Intelligence, AI Execution, Background Work and
      the external control plane.
- [x] Review idempotency, interruption, partial success, security and rollback
      boundaries before implementation.

## Minimal vertical slice

- [x] Add validated Worker sampling configuration with the existing provider
      path as the default.
- [x] Add the browser-sampling gateway port and HTTP adapter with masked errors.
- [x] Persist recoverable platform batch identity, idempotency key and safe
      progress counters.
- [x] Add durable submit/poll work without holding a Worker during collection.
- [x] Project captured and failed items into the existing per-sample
      attempt/evidence/exhaustion lifecycle.
- [x] Reconcile unfinished batches after process or Redis interruption.

## Verification

- [x] Test submit idempotency, partial success, captured-late, echo rejection,
      auth/verification failure, dependency unavailability and restart recovery.
- [x] Test that logs and persisted remote metadata exclude credentials, prompts,
      answers and private browser state outside canonical evidence.
- [ ] Run a controlled two-platform/one-question HTTP slice against a stub
      control plane.
- [x] Run the existing evaluation integration suite, backend typecheck/build and
      project framework validator.
- [ ] Run an authorized five-platform/four-question gate through the independent
      control plane; report Doubao partial failure honestly if it remains.

## Reconciliation and delivery

- [x] Complete code and architecture review; record verification evidence.
- [ ] Reconcile accepted behavior into `evaluation-evidence` and retain the
      Product Definition evolution marker.
- [ ] Open a protected-main PR as `Part of #169` until every Issue acceptance
      criterion is demonstrated.
- [ ] Record branch/worktree exit state without deploying or merging production.
