# Tasks

## Stage 1 — Audit, align, and propose

- [x] Refresh `main`, Issue #50, Project Status/Priority/Assignee, open PRs,
      active Changes, branches, Worktrees, and completed Media Supply/test
      dependencies.
- [x] Read the latest Product Vision, Glossary, Product Definition, Architecture
      Overview, core workflow, change tracking, collaboration topology, Identity
      code/schema/tests, authenticated controller inventory, and Web role route.
- [x] Verify the current opaque Token, digest, seven-day expiry, current-account
      lookup, single-session logout, temporary Guard composition, and unsupported
      supporting-role route from executable sources.
- [x] Reuse current NIST/OWASP primary-source evidence for opaque browser
      sessions, Cookie scope, timeout, revocation, and CSRF; record its refresh
      boundary.
- [x] Confirm fixed single roles, no customer/internal conversion, controlled
      internal-role changes, complete Session invalidation, and administrator
      self-governance restrictions.
- [x] Define the one-owner Identity bounded context, narrow principal/access
      contract, account/session/governance/audit data, transaction, frontend
      shells, migration, rollback, and verification boundaries.
- [x] Complete the pre-implementation architecture review and record the one
      remaining recovery finding.
- [x] Product owner confirms that the first release has no separate Recovery
      Secret or automated break-glass CLI; use normal second-administrator
      readiness and route a true sole-admin lockout to a separately authorized
      incident/follow-up rather than extending Bootstrap.
- [x] Record the approved parallel boundary with Issue #57: #50 owns Identity,
      Access, role entry, and shared generated-contract writes while #57 remains
      in product discussion, owns GEO Optimization/article semantics, and must
      rebase/regenerate before touching shared integration surfaces.

## Stage 2 — Implement Account, Session, and Access foundation

- [x] Allocate an explicit Issue-owned PostgreSQL database and Redis target for
      later integration tests; prove neither shared default is selected before
      any cleanup or migration rehearsal.
- [x] Add additive Account status/revision, Session lifecycle, governance-control,
      and Identity-audit schema/migration with compatible rollback behavior.
- [x] Split the current all-purpose Identity service into cohesive Account,
      Authentication, Session, Access, Governance, Audit, and Bootstrap
      responsibilities without creating another deployable service.
- [x] Preserve opaque credential/digest handling and implement server-owned
      idle/absolute expiry, current logout, self logout-all, administrator
      revoke-all, revocation reasons, and bounded cleanup.
- [x] Add the Challenge-delivery port plus shared expiry, single-use, supersession,
      failure-attempt and request-rate policies; keep deterministic delivery
      local/test only and do not call real SMS.
- [x] Implement host-only production Cookie serialization and the shared JSON
      custom-header/exact-Origin CSRF boundary.
- [x] Add the fail-closed access guard, public/fixed-role metadata, current-
      principal accessor, and consistent 401/403/409 errors.
- [x] Migrate Identity, Brand, Store Location, Evaluation, Notification, Media
      Catalog, and Media Admin controllers through a complete route inventory;
      remove old Guards/request types only after equivalent behavior is proven.

## Stage 3 — Implement administrator governance and role shells

- [x] Implement account search/filter/pagination, internal-account creation,
      activation/deactivation, internal-role changes, administrator revoke-all,
      expected revision, required reason, and audit queries.
- [x] Enforce no customer/internal conversion, immutable mobile, no account
      deletion, no administrator self-governance, and no last-administrator loss
      inside the locked Governance transaction.
- [x] Implement first-administrator Bootstrap replay/conflict behavior without
      an automated recovery command; expose no Bootstrap or recovery HTTP route
      and create no real administrator.
- [x] Generate OpenAPI/client contracts for accounts, governance, audit,
      logout-all, and authenticated principal responses.
- [x] Replace the post-login Media Supply special case with fixed `/brands`,
      `/admin`, `/operations`, and `/agent` role entry.
- [x] Build the administrator `账号与访问` workspace with list/search/filter,
      create, role/status/revoke-all, confirmation/reason, audit, and explicit
      stale/self/last-admin/error states.
- [x] Build honest operations/agent shells and shared unauthenticated,
      access-denied, inactive, revoked, expired, loading, and retry states without
      implementing future business modules.

## Stage 4 — Verify, reconcile, and review

- [x] Test public registration, pre-provisioned internal login, inactive login,
      customer/internal conflicts, complete role allow/deny matrix, and forged
      route/body/Cookie attempts.
- [x] Test current logout, self logout-all, administrator revoke-all, multiple
      sessions, idle/absolute expiry, permission-change invalidation, revocation
      reasons, cleanup, and new authentication after change.
- [x] Test Bootstrap first run/replay/conflicts and prove no recovery/public HTTP
      entry and no secret/plaintext Token in output or audit; verify the normal
      second-administrator readiness path through Governance.
- [x] Force stale revision, self-operation, last-administrator, concurrent
      demotion, session-revoke failure, and audit failure; prove each transaction
      is all-or-nothing.
- [x] Test the complete route classification and CSRF header/Origin/content-type
      matrix, including login and logout boundaries.
- [x] Rehearse migration and application rollback in the explicit isolated
      database; prove shared PostgreSQL/Redis remain unchanged.
- [x] Inspect real browser desktop and narrow states for each role, administrator
      account governance, allowed/denied access, session expiry/revocation, and
      dangerous-action confirmation.
- [x] Run focused tests, typecheck, full backend/Web tests, build, formatting,
      framework validation, migration status, OpenAPI drift check, and fixed-diff
      code/architecture review.
- [x] Reconcile accepted behavior into a new current Identity and Access spec,
      Architecture Overview, Product Definition Evolution marker, generated
      contracts, runbook, and ADR if still warranted; remove obsolete Guard and
      routing explanations.
- [ ] Open a reviewable implementation PR with the correct Partial or Final
      Issue relationship, evidence, residual release gates, and explicit
      worktree exit; do not merge without separate authorization.

## Backend foundation checkpoint — 2026-09-04

- Isolated targets: PostgreSQL database `geoeval_issue50` and Redis database
  `10`; the default `geoeval` database and Redis database `0` are not test
  targets.
- Migration at this checkpoint: all 20 migrations replayed from an empty
  Issue-owned database;
  additive Session defaults preserve old-writer insertion after migration.
- Verification: 32 backend test files / 165 tests passed, root typecheck passed,
  production build passed, generated OpenAPI/client contracts are current,
  formatting and project-framework validation passed.
- Route proof: [authenticated route access inventory](verification/route-access-inventory.md).
- Still open at this checkpoint: Challenge delivery/rate lifecycle, bounded
  cleanup, Bootstrap,
  role shells and administrator UI, complete failure/concurrency matrix,
  browser inspection, rollback rehearsal, reconciliation, and PR review.

## Challenge and cleanup checkpoint — 2026-09-04

- Added one delivery port with a deterministic local/test adapter. Identity,
  not the adapter, owns Challenge digest, expiry, single-use, supersession,
  attempt limit, and per-mobile request policy.
- Added PostgreSQL-serialized 60-second resend and five-per-15-minute defaults,
  five-minute expiry, five failed attempts, and explicit supersession of an
  earlier usable Challenge. Redis, IP address, and device identity are not
  authority for this policy.
- Added `identity:cleanup` with configurable 30-day Session and 24-hour
  Challenge/rate-state retention, at most 500 deletes per record kind per run,
  terminal-predicate rechecks, and no Governance-audit deletion.
- Migration: all 21 migrations replayed from an empty temporary database; the
  Challenge table, rate-limit table, and new column were inspected before the
  temporary database was removed.
- Verification: Challenge/cleanup/config/HTTP focused tests passed; complete
  backend regression is 33 files / 175 tests; typecheck, production build,
  generated contracts, formatting, Diff check, and framework validation pass.
- Still open at this checkpoint: remaining internal service split, Bootstrap,
  role shells,
  administrator UI, complete failure/security/browser/rollback evidence,
  reconciliation, PR review, and integration.

## Bootstrap checkpoint — 2026-09-04

- Added an offline-only Bootstrap application service and CLI. The command
  requires explicit database, mobile, non-secret key ID, digest-only deployment
  verifier, and protected standard-input secret; it has no local database
  default and no HTTP route.
- The singleton Governance control row serializes first creation and replay.
  First execution atomically creates one active administrator, control state,
  and one Bootstrap audit; an exact replay returns `UNCHANGED`; different
  target, key, verifier, existing administrator, or owned mobile rejects without
  mutation.
- The CLI was exercised on a disposable 21-migration database with a public
  fixture secret: first execution returned `CREATED`, matching replay returned
  `UNCHANGED`, and database inspection showed one administrator, one audit,
  a 64-character digest, and no plaintext fixture secret. The database was then
  removed.
- Focused Bootstrap/CLI/config/authentication/governance tests pass, including
  concurrent first-admin attempts and creation of the recommended second
  administrator through ordinary Governance. Complete regression is 35 files /
  187 tests; typecheck, build, formatting, Diff, and framework checks pass.
- No real administrator, real secret, recovery command, production database,
  deployment, or activation was used. Remaining work is frontend role entry and
  governance UI, expanded non-Bootstrap verification, reconciliation, PR, and
  integration.

## Fixed role-entry checkpoint — 2026-09-04

- Replaced the administrator-only Media Supply redirect and unsupported internal
  roles with fixed `/brands`, `/admin`, `/operations`, and `/agent` entry.
- Added an administrator overview plus honest operations and agent shells. The
  shells expose only established Identity and access boundaries, mark future
  business capabilities unavailable, and do not invent counts, orders,
  customers, commissions, or settlement data.
- Reused each account's fixed role home for cross-role denial and the existing
  Media Supply denial path; no client-side role switch or merged-role behavior
  was introduced.
- Browser proof used three synthetic accounts only in `geoeval_issue50`: each
  internal role completed the real Challenge/login flow and arrived at its fixed
  home; an administrator was denied `/operations`, and an agent was denied
  `/admin/media` with a return link to `/agent`. Browser warning/error logs were
  empty and the desktop layout had no horizontal overflow.
- The three synthetic accounts, their Sessions, Challenges, and per-mobile rate
  state were deleted after the browser check and all cleanup counts were verified
  as zero. Shared defaults, real accounts, and production state were untouched.
- Verification: Web regression is 6 files / 27 tests; complete backend regression
  on the Issue-owned PostgreSQL/Redis targets is 35 files / 187 tests; typecheck,
  formatting, production build, generated OpenAPI/client drift check, Diff check,
  and project-framework validation pass.
- Still open at this checkpoint: administrator account-and-access UI, the shared
  inactive/revoked/expired state matrix, expanded security/concurrency evidence,
  rollback rehearsal, reconciliation, PR review, and integration.

## Administrator account read-model checkpoint — 2026-09-04

- Added generated-client-backed administrator reads for paginated account
  summaries and target-owned governance audits. No governance mutation client or
  UI action is part of this checkpoint.
- Added `/admin/accounts` with mobile search, fixed-role and status filters,
  cursor pagination, account identity/session facts, target-owned audit history,
  explicit loading/empty/retry states, and an always-visible read-only boundary.
- Moved the administrator sidebar out of Media Supply ownership and reused one
  navigation source across `/admin`, `/admin/accounts`, and `/admin/media`.
- Browser proof used 23 fixed-prefix synthetic accounts and two audits only in
  `geoeval_issue50`: first/next pagination returned 20 and 4 rows including one
  pre-existing Issue test account; combined search/role filtering returned the
  intended agent and its audit; an agent was denied the administrator route; and
  the narrow layout had no horizontal overflow. Browser warning/error logs were
  empty.
- All fixed-prefix synthetic Accounts, Audits, Sessions, Challenges, and rate
  records were removed after inspection and verified as zero. The pre-existing
  Issue test account/audit, shared defaults, and production state were untouched.
- Verification: Web regression is 7 files / 30 tests; typecheck, formatting,
  production build, generated OpenAPI/client drift check, Diff check, and
  project-framework validation pass. The immediately preceding 35-file / 187-test
  backend result remains applicable because this checkpoint changes no backend
  implementation, schema, configuration, or test target.
- Still open: all administrator governance writes and their confirmation,
  reason, stale/self/last-administrator/error states; the broader role/session
  state matrix; rollback rehearsal; reconciliation; PR review; and integration.

## Administrator governance workspace checkpoint — 2026-09-04

- Added four generated-contract-backed command functions for internal-account
  creation, status change, internal-role change, and administrator revoke-all.
  `ApiRequestError` now retains the bounded server error code needed for explicit
  UI states.
- Creation and dangerous target actions use separate typed dialogs. Every role,
  status, or revoke-all command carries the displayed revision, a 3–320 character
  reason, and a target-aware mobile-suffix confirmation. Customer/internal role
  conversion is not offered; self-governance actions are not rendered.
- Dangerous actions use the native modal dialog lifecycle. Background content is
  removed from the accessibility focus boundary, the first command field receives
  focus, Escape cancels while idle, and controls cannot close during submission.
- Controlled HTTP checks against `geoeval_issue50` created two internal accounts,
  changed one role, deactivated/reactivated another, and revoked one customer's
  Sessions. Database inspection proved revision, revocation reason, six audit
  rows, and bounded before/after states; stale revision, duplicate mobile, and
  self-governance returned explicit 409/409/403 errors without accepted audits.
- Browser inspection proved the self and role-family restrictions, disabled
  zero-Session action, internal-only create options, reason/confirmation gates,
  modal focus/Escape behavior, and post-command account/audit readback. Browser
  warnings/errors were empty. Final mutations were submitted through the same
  local HTTP API rather than Computer Use, so no risky browser confirmation was
  bypassed.
- Both fixture sets and their Audits, Sessions, Challenges, rate state, temporary
  Cookie jars, and response files were removed. Exact database selectors and
  post-cleanup counts proved no matching fixture state remained; shared defaults,
  pre-existing Issue test records, and production state were untouched.
- Verification: Web regression is 9 files / 38 tests; typecheck, formatting,
  production build, generated contract drift, Diff, and project-framework checks
  pass. The existing 35-file / 187-test backend result and concurrent-last-admin
  integration evidence remain applicable because backend code/config/schema did
  not change in this checkpoint.

## Role Session-state checkpoint — 2026-09-04

- The shared role-session checkpoint now distinguishes unauthenticated,
  inactive, revoked, and expired server states, preserves wrong-role denial,
  and reserves retry for temporary failures across the fixed role homes and
  administrator modules. The `/brands` home now verifies the current role before
  requesting customer business data.
- Still open: the broader Stage 4 security/concurrency matrix, rollback
  rehearsal, design reconciliation, PR review, and integration.

## Identity HTTP security and lifecycle checkpoint — 2026-09-04

- Added an HTTP matrix for public customer signup, all three pre-provisioned
  internal roles, inactive-account login rejection, and representative
  any-role/customer-only/administrator-only resources across all four roles.
- Proved client-supplied role, status, revision, account ID, and actor fields do
  not redefine server-owned account or governance identity. Random opaque
  values, a stored digest used as if it were a credential, and the wrong Cookie
  name all remain generic authentication-required results.
- Proved current logout affects one Session, self logout-all affects all
  remaining Sessions, administrator revoke-all keeps identity revision stable,
  idle and absolute expiry share the bounded expiry result, role change revokes
  the next Session, and deactivation/reactivation never restores an old Session.
- Verified `USER_LOGOUT`, `USER_LOGOUT_ALL`, `ADMIN_REVOKE_ALL`,
  `ROLE_CHANGED`, and `ACCOUNT_DEACTIVATED` storage reasons, plus fresh
  authentication after role/status changes. The existing maintenance test
  remains the cleanup evidence.
- Focused verification: 2 HTTP integration files / 8 tests passed; backend
  typecheck, formatting, and Diff check passed. Full regression and build are
  repeated at the next aggregate verification checkpoint.
- Still open: forced governance transaction failure/concurrency, complete
  CSRF/route classification, isolated rollback rehearsal, full desktop/narrow
  browser pass, aggregate verification/review, reconciliation, PR, and
  integration.

## Governance atomicity checkpoint — 2026-09-04

- Kept the approved self-governance rule while making the sole-administrator
  response actionable: self-demotion/deactivation first reports that another
  active administrator is required; after one exists, the command remains
  forbidden as self-governance.
- Strengthened concurrent crossed-demotion evidence to prove exactly one target
  changes role, exactly one Session is revoked, exactly one Session stays active,
  one administrator remains, and only one audit commits.
- PostgreSQL test triggers forced Session-revocation failure after the Account
  update and forced audit-insert failure after the Account/Session updates. Both
  cases rolled Account, revision, Session, revocation reason, and audit back to
  the original state.
- Every trigger/function is static, test-namespaced, removed in `finally`, and
  pre-cleaned before installation. Focused Governance integration passed 9/9;
  backend typecheck, formatting, and Diff check passed.
- Still open: complete CSRF/route classification, isolated rollback rehearsal,
  full desktop/narrow browser pass, aggregate verification/review,
  reconciliation, PR, and integration.

## Route policy and CSRF checkpoint — 2026-09-04

- Added Nest metadata discovery across all 11 registered product controllers.
  Every route is checked against its Public, authenticated-any-role,
  terminal-customer, administrator, or explicit F0 CSRF-exemption family; an
  unregistered future controller now fails the inventory test.
- Proved the public Challenge and Session writes require JSON content type,
  `x-geoeval-request: 1`, and the exact configured Origin. Missing/wrong values
  reject before Challenge consumption, Account creation, or Session creation.
- Proved safe authenticated reads need no CSRF headers, while current logout and
  self logout-all reject missing content type, header, or Origin without
  revoking a Session, then succeed with the complete boundary.
- Exact configured CORS preflight returns that Origin and credential support;
  an attacker-suffixed Origin receives no allow-origin header.
- Focused verification: route inventory + CSRF HTTP are 2 files / 6 tests;
  backend typecheck, formatting, and Diff check passed.
- Still open: isolated rollback rehearsal, full desktop/narrow browser pass,
  aggregate verification/review, reconciliation, PR, and integration.

## Migration and application rollback checkpoint — 2026-09-04

- Replayed all 21 migrations from empty dedicated databases and verified the
  current migration status as up to date.
- Built the application at pre-Change commit `82f7056` in a detached temporary
  worktree. Against the fully migrated schema, it read a Session created by the
  current application and created a legacy-shaped Session of its own; after
  restoring the current application, both credentials authenticated with active
  revision-1 account state.
- Database inspection proved both Session rows had 64-character digests,
  non-null last-seen/idle expiry defaults bounded by absolute expiry, and no
  revocation. Plaintext credentials were kept only in temporary Cookie jars and
  never printed.
- Shared `geoeval` schema/data fingerprints were identical before and after the
  authoritative rehearsal; shared Redis DB 0 stayed at three keys and isolated
  DB 1 stayed empty. Occupied Redis DB 15 was detected before use and never
  touched.
- Both temporary databases, the detached worktree and local dependencies, all
  Cookie/response files, and port 3315 processes were removed and absence was
  rechecked.
- Still open: full desktop/narrow browser pass, aggregate verification/review,
  reconciliation, PR, and integration.

## Complete browser acceptance checkpoint — 2026-09-04

- Reused unchanged desktop evidence for all role homes, administrator account
  governance, cross-role denial, and Session expired/revoked/inactive states;
  intervening commits changed only backend error precedence, tests, and evidence.
- On the latest branch, verified 390×844 Chrome layouts for customer brand empty
  state, administrator overview/account governance, operations, agent, and
  cross-role denial. Every page reported document width 390 with no horizontal
  overflow; the viewport override was reset to default at exit.
- The dangerous account dialog remained a single native modal, focused the
  reason textarea, kept confirmation disabled initially, fit the narrow viewport,
  and closed on Escape without submitting.
- Operations and Agent each showed three explicit future-capability cards and no
  fabricated counts or records. Browser warning/error logs were empty.
- A first fixture prefix omitted one zero and produced two unintended test
  customers; the Session was normally logged out and all six affected accounts,
  two Challenges, and two rate rows were immediately removed before restarting
  the authoritative pass with the correct prefix.
- Final correct-prefix cleanup removed four accounts, three Sessions, three
  Challenges, and three rate rows; account/Session/Challenge/rate/audit selectors
  all returned zero. API/Web processes and browser tabs were stopped.
- Still open: aggregate verification/fixed-diff review, reconciliation, PR, and
  integration.

## Aggregate review and reconciliation checkpoint — 2026-09-04

- Repeated the complete backend and Web regressions together on a fresh,
  dedicated PostgreSQL database and pre-confirmed-empty Redis DB 2: 39 backend
  files / 207 tests and 10 Web files / 52 tests passed. Typecheck, production
  build, formatting, framework validation, 21-migration status, generated-
  contract drift, and Diff checks passed.
- The fixed-diff code/architecture review resolved malformed Cookie/body 500s,
  embedded Media editor Session-state divergence, an unbounded audit-action API
  type, misleading post-activation rollback interpretation, and a stale test
  filename. No unresolved must-fix or should-fix finding remains.
- Promoted accepted behavior to the current `identity-and-access` spec, updated
  Architecture Overview and the Product Definition extraction index, recorded
  the server-authoritative decision in ADR 0004, and added one operations
  runbook for migration, Bootstrap, second-administrator readiness, cleanup,
  incidents, and release evidence.
- Removed the obsolete current Media Supply Guard explanation. The active Change
  remains only until the review PR is opened and its final task/relationship can
  be recorded before archival.
- No production database, real account, provider, SMS, Bootstrap, deployment,
  activation, or PR merge was used. The remaining Issue task is opening the
  reviewable final PR; integration remains a later human Gate.
