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

## S4 Overall Synthesis and Current Report Alignment

- [x] Confirm that S4 delivers one current report end to end, including
      persistence, authenticated contracts, and functionally complete Web
      behavior while deferring final visual refinement.
- [x] Confirm deterministic metric ownership and retain the average normalized
      position score for the recommendation index while using median raw rank
      only for the separate typical-position display.
- [x] Clarify the full semantic-analysis chain: per-sample parsing extracts
      brands, positions, descriptions, characteristics, card interpretation,
      and evidence anchors; program logic calculates statistics; overall
      synthesis organizes report meaning and guidance.
- [x] Confirm a restrained S4 competitor presentation derived only from open
      questions and the non-destructive Agent-intent plus deterministic-renderer
      highlight boundary.
- [x] Confirm the shared-core plus brand-directed/open-discovery parser profile
      model, the current report hierarchy baseline, and that the limited brand
      snapshot does not support first-release factual-accuracy grading.
- [x] Confirm search-enabled, evidence-linked other-brand grouping in the
      overall synthesizer and contextual direct-question order that never enters
      recommendation statistics.
- [x] Confirm practical consumer-brand grouping, including obvious subordinate
      brand lines, and non-blocking degradation when relationship resolution is
      unavailable or inconclusive.
- [x] Finalize and approve the typed per-sample and overall-synthesis output
      contracts.
- [x] Complete the proportional S4 module architecture card and implementation
      split.
- [x] Re-review the card against current S3 code and resolve Prompt ownership,
      duplicate semantic storage, run-scoped synthesis-attempt integrity,
      terminal synthesis exhaustion, and unconsumed-Outbox risks in the proposed
      design.
- [x] Obtain explicit product-owner approval of the refined architecture
      direction before beginning detailed S4 work on 2026-08-27.

## S4 Implementation Plan

- [x] Complete the S4a implementation preflight: exact Prisma model delta,
      foreign-key and uniqueness constraints, canonical-field map, additive
      backfill/deprecation path, Zod output contract, GEO-to-AI port, Prompt
      assembly inputs, and focused verification matrix.
- [x] Verify from current primary sources that installed Zod 4 can generate the
      structural JSON Schema and that Prisma 7 supports reviewed custom SQL and
      data backfill migrations; record conversion, CHECK-constraint, and refresh
      boundaries in the S4a source brief.
- [x] Run the S4a preflight architecture review over ownership, dependency
      direction, canonical data, compatibility, failure isolation, and
      proportionality; leave no unresolved must-fix design finding. Exact Zod
      conversion and migration replay remain implementation evidence.
- [x] Obtain explicit approval of the simplified S4a implementation preflight on
      2026-08-27. Keep one semantic contract version on accepted interpretations;
      linked AI attempts own exact Prompt and output-schema execution evidence.
- [x] Research and select the smallest maintained Markdown sanitization and
      annotation dependencies from current primary sources before changing Web
      rendering.
- [x] S4a: add GEO-owned versioned parser instruction assets, replace the generic
      interpretation fixture payload with the two-profile semantic contract,
      migrate legacy semantic columns without dual-writing, and add GEO
      validation plus deterministic parser fixtures without changing accepted
      S3 evidence. Verified with 11 focused contract tests, seven evaluation
      process tests, a representative one-of-one S3 backfill, clean nine-migration
      replay, final PostgreSQL constraint inspection, all 43 backend tests, and
      the complete project build on 2026-08-27.
- [x] Complete the S4b exact implementation preflight for deterministic
      metrics and post-group counts, run-scoped synthesis attempts, overall
      semantic output, immutable public-report and protected-guidance ownership,
      ready-run Outbox recovery, atomic acceptance, and terminal exhaustion.
- [x] Re-review the S4b preflight against current S3 and S4a executable seams;
      remove the non-actionable synthesis-input hash/table direction, preserve
      cycle/run composite integrity, and leave no unresolved must-fix ownership,
      consistency, or proportionality finding.
- [x] Obtain explicit product-owner confirmation of the S4b persistence and
      recovery preflight on 2026-08-27, retaining hashes when they are the more
      direct mechanism while avoiding defensive duplication and using clearer
      human-facing overall-analysis terminology.
- [x] S4b: add pure deterministic aggregate functions, run-scoped synthesis
      attempts and fixtures, ready-run Outbox plus reconciliation, practical
      brand grouping, immutable report and protected internal-guidance
      persistence, atomic report acceptance, and terminal synthesis exhaustion.
- [x] S4c: expose the authenticated current-report contract and implement the
      complete functional diagnosis report, including format-preserving sample
      cards and fail-safe non-destructive highlighting.
- [x] Verify deterministic metrics, grouping and independent-sub-brand cases,
      duplicate delivery, restart recovery, atomic completion, authorization,
      private-field exclusion, preserved original answers, and 20/20 plus 17/20
      report paths before reconciling S4 into canonical specs.

## S4b Local Verification Evidence

- Applied the S4b migration to the project-local PostgreSQL database and replayed
  all ten migrations into a clean temporary local database. The replay confirmed
  the five S4b tables, seven reviewed composite foreign keys, the positive
  attempt-number check, and the new terminal run and cycle states; the temporary
  database was removed afterward.
- Eleven focused process integration tests passed for 20/20 and 17/20 report
  completion, parser and synthesis retry separation, primary retry plus fallback,
  terminal synthesis exhaustion without a partial report, duplicate delivery,
  missing-Outbox reconciliation, telemetry isolation, and Worker restart.
- All twelve backend test files and fifty-five tests passed. The complete build
  regenerated Prisma and OpenAPI artifacts and built Backend, the generated API
  client, and Web; formatting, diff, and project-framework checks also passed.
- Runtime verification exposed one missing Background Work subscription for the
  new GEO-owned synthesis event. The subscription was added without introducing
  a new workflow abstraction, and the focused plus full suites passed afterward.
  No real provider, paid model, external database, or production environment was
  used.

## S4c Local Verification Evidence

- Added one account-authorized current-report query over the newest started run,
  an explicit generated OpenAPI contract, and a customer projection containing
  the immutable public report plus four questions by five sample positions. A
  profile edit keeps the completed report current with a change marker; starting
  a newer run displaces it, and synthesis exhaustion produces no report.
- Focused projection and renderer tests cover repeated exact text, deterministic
  duplicate merging, unresolved and overlapping anchors, cross-node Markdown,
  headings, lists, tables, unsafe HTML and URLs, and inert remote images. The
  renderer sanitizes before adding only fixed project-owned marks and falls back
  to the complete unhighlighted answer when any range is not exact.
- HTTP and process integration tests cover signed-out denial, cross-account
  concealment, private-field exclusion, current-report behavior after profile
  edits, a newer active run, synthesis exhaustion, complete 20/20 reports, and
  17/20 reports with exactly three visible not-included positions.
- All thirteen backend test files and fifty-nine tests passed, together with the
  Web renderer's four focused tests. Formatting, generated Prisma and OpenAPI
  contracts, Backend and Web production builds, the project-framework validator,
  and `git diff --check` passed on 2026-08-27.
- An authenticated browser journey created a local brand, confirmed the fixed
  four-question definition, started the deterministic Worker path, and advanced
  from 0/20 to the complete report without refresh. Desktop and 390-pixel mobile
  review confirmed the report hierarchy, one expanded Markdown/table answer,
  twenty cards, zero horizontal overflow, user-facing platform labels, and no
  visible Prompt, semantic-payload, trace, source, model, or internal-guidance
  fields. This review fixed one desktop metric-overlap defect and one internal
  platform-key presentation defect.
- Final architecture review is `ready`: Brand Knowledge owns account-scoped
  authorization and current profile identity; GEO Intelligence owns current-
  report selection and public evidence projection; the Web owns sanitized
  presentation only. No generic workflow, chart, event, or highlighting
  framework was introduced. Final design-language polish, report history,
  notifications, customer retry actions, and real synthesis providers remain
  later gates.

## S4c Product-owner Review Follow-up

The product-owner review accepted the functional report. Its independently
valuable customer-presentation follow-up moved to GitHub Issue #13; those tasks
are no longer part of this archived S1-S5 Change.

## S5 Evaluation Continuity Alignment

- [x] Reconcile the accepted S4 report behavior into the owner-local current
      evaluation-report specification and update the architecture overview.
- [x] Identify the existing logical-sample/execution-cycle coupling that blocks
      a safe second retry cycle without overwriting attempts or exhaustion.
- [x] Verify from current primary sources that NestJS SSE can remain a disposable
      one-way refresh hint and that Redis Pub/Sub cannot own durable notification
      delivery; record the no-new-transport recommendation and refresh boundary.
- [x] Draft the bounded S5 decision brief covering retry identity, history
      ownership, durable notification ownership, realtime hints, initial role
      scope, and cross-brand navigation.
- [x] Obtain explicit product-owner confirmation of the S5 decision brief before
      changing schema or product behavior on 2026-08-27.
- [x] Complete the exact S5 migration, REST/OpenAPI, Outbox event, notification
      record, SSE hint, Web interaction, rollback, and focused-test preflight.
- [x] Run architecture review over the proposed preflight and resolve every
      must-fix ownership, consistency, migration, and proportionality finding.
- [x] Obtain explicit product-owner confirmation of the reviewed exact preflight
      before S5 implementation.
- [x] Implement S5 only after the preflight is confirmed, then verify the
      deterministic retry, history, notification, and recovery paths before
      reconciling accepted behavior into current owners.

## S5 Preflight Architecture Review

- Status: `implemented, locally verified, product-reviewed, and checkpointed`;
  destination-branch integration remains a separate branch-exit action.
- The must-fix pre-existing boundary is the logical sample's ownership by its
  first execution cycle together with sample-wide attempt and exhaustion
  uniqueness. The reviewed migration moves logical positions to run ownership,
  makes attempts and exhaustion cycle scoped, and retains database-enforced
  run consistency rather than resetting or deleting history.
- The review removed two avoidable notification couplings: Web routes are not
  stored as durable data, and Outbox occurrence/correlation fields are not
  duplicated in the event payload. Notification owns a typed target projection,
  while the existing Outbox envelope owns creation time and correlation.
- Background Work uses an explicit two-destination router rather than a generic
  subscriber framework. Notification materialization is idempotent by source
  event and completes before its Outbox fact; SSE remains a replaceable hint over
  the durable inbox.
- History reuses immutable report owners and the existing safe projection. No
  copied report table, comparison model, second workflow authority, realtime
  subscription table, or new external dependency is introduced.
- Residual implementation checks are exact generated SQL/constraint inspection,
  representative S4 data upgrade, clean migration replay, and production-like
  SSE proxy validation. The first three are S5 implementation gates; proxy
  behavior remains an explicitly deferred release-environment gate.

## S5 Local Verification Evidence

- Replayed all eleven migrations into a clean temporary database and upgraded a
  restored representative S4 snapshot. The upgrade preserved two accounts, one
  brand, one definition, one run, one cycle, twenty logical samples, forty AI
  attempts, twenty answers, twenty interpretations, and one report; it left zero
  inconsistent attempt/run links and removed the obsolete sample-cycle column.
  Both dedicated verification databases and the container snapshot copy were
  removed; the host recovery snapshot remains at
  `/private/tmp/geoeval-s5-preflight-20260827.dump`.
- Focused integration coverage verifies concurrent duplicate retry, acquisition-
  only recovery, interpretation-only recovery, synthesis-only recovery, retained
  accepted evidence, one source-event notification under duplicate delivery,
  newest-current versus immutable history, account concealment, durable read
  state, invalid cursors, and SSE payload exclusion. A controller test verifies
  distinct revision emission and shutdown completion.
- The complete backend and Web suites, workspace type checks, generated Prisma
  and OpenAPI client, Backend and Web production builds, formatting, project-
  framework validation, Python compilation, and `git diff --check` pass in the
  local worktree.
- The authenticated browser journey created a complete brand, completed two
  deterministic evaluations around a relevant profile change, received the
  title/unread completion hint, opened and marked a notice read, entered the new
  definition from the still-current old report, and opened the prior immutable
  report from history. Runtime review also exposed and fixed explicit readiness
  injection, the stale start message, and the missing re-evaluation entry.
- Final architecture review is `ready`: logical positions are run-owned; cycles
  own bounded attempts and exhaustion; accepted evidence is never duplicated;
  history has no copied owner; Notification owns durable recipient state;
  Background Work uses an explicit two-destination router; and SSE owns no
  business truth. No new broker, generic event framework, workflow authority,
  or report-copy model was introduced. Production proxy behavior, notification
  retention/load, real providers, other-role events, and final visual polish
  remain explicitly unverified later gates.

## S5 Product Review and Checkpoint

- [x] Record product-owner acceptance of the locally verified S5 journey and
      evidence on 2026-08-28.
- [x] Create the verified S4-S5 branch checkpoint without merging, pushing,
      activating production transport, or enabling real providers.

## Final Reconciliation

- [x] Integrate accepted deterministic S1-S5 behavior into `main@aa48e96`.
- [x] Reconcile accepted behavior into owner-local current specs and the
      architecture overview.
- [x] Move report presentation follow-up to Issue #13.
- [x] Retire the historical Branch/Worktree through Issue #3.
- [x] Archive this Change without absorbing S6, Release, or later product work.
