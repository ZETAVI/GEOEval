# Tasks

## S0 Activation

- [x] Record product-owner authorization for deterministic S1-S5 and explicit
      S6/external-service non-goals.
- [x] Create the isolated implementation branch and bounded change record.

## S1 Customer Entry and Brand

- [x] Add additive Identity and Access plus Brand Knowledge persistence models
      and a reviewed migration.
- [x] Implement mobile-challenge, session, logout, account inspection, and
      deterministic non-production challenge delivery.
- [x] Implement account-scoped brand create, edit, list, and current-brand
      selection with readiness and fingerprint rules.
- [x] Publish authenticated OpenAPI contracts and regenerate the Web client.
- [x] Replace the F0 root page with the public entry, passwordless entry flow,
      optional first-brand step, and responsive My brands service home while
      keeping the F0 page explicitly isolated.

## Verification and Reconciliation

- [x] Verify challenge lifecycle, role boundary, session revocation, resource
      authorization, readiness/fingerprint semantics, and migration replay.
- [x] Verify generated-contract drift, backend and Web builds, and the desktop
      plus mobile browser journey including the no-brand path.
- [x] Run architecture review on ownership, dependency direction, security,
      data integrity, and F0 isolation; resolve every must-fix finding.
- [x] Promote accepted S1 behavior to an owner-local current spec and update the
      current architecture status.
- [x] Record product-owner acceptance and create a verified branch checkpoint
      before continuing to S2. Integration into the destination branch remains
      a separate, explicit branch-exit action.

## Local verification evidence

- Clean migration replay applied all three migrations and confirmed the
  account-plus-current-brand ownership foreign key; the temporary replay
  database was removed afterward.
- Six test files and sixteen tests passed, including the real HTTP module graph,
  cookie session, credentialed CORS, cross-account denial, fingerprint rules,
  and the existing Outbox foundation behavior.
- Production builds passed for Backend, generated OpenAPI client, and Web.
- Browser verification completed the public entry, deterministic login,
  intentional no-brand state, two brand creations, current-brand switching, and
  desktop plus 390 px responsive layouts with no browser console errors.
- Architecture review found no unresolved must-fix item. It added the composite
  ownership foreign key and explicit Nest runtime injection after controlled
  runtime evidence exposed those gaps.
- Product-owner review accepted the S1 journey and page structure. Decorative
  English labels were removed; final visual language and typography were
  explicitly deferred without reopening the interaction contract.

## S2 Evaluation Definition and Start

- [x] Add GEO Intelligence persistence for immutable definitions, four
      questions, runs, twenty sample identities, and the reliable start fact.
- [x] Expose a Brand Knowledge evaluation-purpose view without repository
      sharing or duplicate brand ownership.
- [x] Implement idempotent deterministic question preparation with no refresh
      operation and move the shared objectivity profile to its production owner.
- [x] Implement transactional official start with stale-definition, one-active-
      run, one-run-per-definition, and duplicate-start invariants.
- [x] Publish authenticated OpenAPI contracts and a current-brand diagnosis page
      that reviews the fixed questions and starts the run.

## S2 Verification and Reconciliation

- [x] Verify immutable snapshots, idempotent preparation, changed-fingerprint
      definitions, cross-account denial, duplicate start, one active run, twenty
      unique samples, and atomic outbox creation.
- [x] Verify schema replay, generated contracts, builds, and the browser journey
      from current brand to evaluating state.
- [x] Run architecture review and promote accepted S2 behavior to its owner-local
      current spec before the S2 checkpoint.
- [x] Create the verified S2 branch checkpoint before continuing to S3;
      destination-branch integration remains a separate explicit action.

## S2 Local verification evidence

- Seven backend test files and twenty-four tests passed, including concurrent
  definition preparation, immutable snapshots, stale definitions, cross-account
  denial, duplicate start, one active run, one used definition, twenty samples,
  and atomic product-outbox creation.
- Production builds passed for Backend, the generated OpenAPI client, and Web;
  the diagnosis route is part of the static Web build.
- Browser verification completed current-brand preparation, four-question and
  five-platform review, official start, and the evaluating state with no browser
  console error. It exposed one concurrent-preparation defect that was fixed and
  covered with a regression test.
- Clean migration replay applied the complete migration chain, confirmed all
  five S2 tables and the definition, active-run, and completed-opportunity
  identity indexes, then removed the temporary database.
- Architecture review found no unresolved must-fix item. It removed internal
  fingerprints and execution identities from customer contracts and added a
  database constraint tying every sample to one run and question from the same
  definition.

## S3 Resumable Evidence Boundary

- [x] Obtain product-owner confirmation of the proposed S3 boundary and its
      explicit S4-S6 non-goals.
- [x] Confirm the PostgreSQL, transaction-Outbox, BullMQ small-work planner, and
      scheduled-reconciliation framework recorded in the S3 decision brief.
- [x] Add an additive persistence model for the initial execution cycle,
      append-only AI attempts, one accepted canonical answer per sample, one
      accepted per-sample interpretation, exhausted stage failures, and the
      internal ready-for-synthesis stage.
- [x] Implement AI Execution's deterministic attempt boundary without allowing
      it to mutate GEO Intelligence state.
- [x] Implement product-outbox relay plus the evaluation-specific process
      planner, small intent handlers, and scheduled reconciliation so duplicate
      delivery and restart resume from durable owner state rather than rerunning
      accepted stages.
- [x] Implement GEO-owned evidence and interpretation acceptance with local
      schema and semantic validation and the seventeen-of-twenty decision.
- [x] Expose only concise durable progress through the authenticated diagnosis
      purpose view; retain the existing evaluating presentation until S4.

## S3 Verification and Reconciliation

- [x] Verify deterministic 20/20, 17/20, and 16/20 outcomes, valid no-mention
      acceptance, acquisition exhaustion, interpretation exhaustion, and
      accepted-attempt linkage.
- [x] Verify duplicate outbox and queue delivery, concurrent processing,
      worker interruption and restart, and telemetry-failure isolation without
      duplicate canonical evidence.
- [x] Verify migration replay, generated contracts, backend and Web builds, and
      the customer-visible progress/status boundary without internal leakage.
- [x] Run architecture review and reconcile accepted S3 behavior into one
      owner-local current specification before the S3 checkpoint.
- [x] Create the verified S3 branch checkpoint before continuing to S4;
      destination-branch integration remains a separate explicit action.

## S3 Local Verification Evidence

- Deterministic integration coverage verifies 20/20, 17/20, and 16/20
  outcomes, valid no-mention acceptance, acquisition and interpretation
  exhaustion, retry separation, accepted-attempt integrity, duplicate delivery,
  concurrent processing, telemetry isolation, Worker restart recovery, and the
  complete Worker module graph.
- A clean temporary database replayed all seven migrations and confirmed the
  five composite foreign-key constraints that keep accepted evidence tied to
  the correct sample, cycle, and successful attempt; the temporary database
  was then removed.
- Generated contracts, repository checks, builds, and the framework validator
  passed. The authenticated browser journey advanced from zero to twenty
  processed samples without refresh or console errors and exposed no internal
  retry, queue, prompt, route, source, or trace data.
- Architecture review removed the Worker's dependency on API-only identity and
  presentation modules, removed GEO's query into AI Execution's private
  attempt store, and left no unresolved must-fix item. Real providers, overall
  synthesis, report behavior, and production activation remain later gates.
