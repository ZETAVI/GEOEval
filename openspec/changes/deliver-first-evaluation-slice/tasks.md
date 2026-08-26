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
