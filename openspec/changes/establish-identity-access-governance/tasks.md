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
- [ ] Split the current all-purpose Identity service into cohesive Account,
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
- [ ] Implement first-administrator Bootstrap replay/conflict behavior without
      an automated recovery command; expose no Bootstrap or recovery HTTP route
      and create no real administrator.
- [x] Generate OpenAPI/client contracts for accounts, governance, audit,
      logout-all, and authenticated principal responses.
- [ ] Replace the post-login Media Supply special case with fixed `/brands`,
      `/admin`, `/operations`, and `/agent` role entry.
- [ ] Build the administrator `账号与访问` workspace with list/search/filter,
      create, role/status/revoke-all, confirmation/reason, audit, and explicit
      stale/self/last-admin/error states.
- [ ] Build honest operations/agent shells and shared unauthenticated,
      access-denied, inactive, revoked, expired, loading, and retry states without
      implementing future business modules.

## Stage 4 — Verify, reconcile, and review

- [ ] Test public registration, pre-provisioned internal login, inactive login,
      customer/internal conflicts, complete role allow/deny matrix, and forged
      route/body/Cookie attempts.
- [ ] Test current logout, self logout-all, administrator revoke-all, multiple
      sessions, idle/absolute expiry, permission-change invalidation, revocation
      reasons, cleanup, and new authentication after change.
- [ ] Test Bootstrap first run/replay/conflicts and prove no recovery/public HTTP
      entry and no secret/plaintext Token in output or audit; verify the normal
      second-administrator readiness path through Governance.
- [ ] Force stale revision, self-operation, last-administrator, concurrent
      demotion, session-revoke failure, and audit failure; prove each transaction
      is all-or-nothing.
- [ ] Test the complete route classification and CSRF header/Origin/content-type
      matrix, including login and logout boundaries.
- [ ] Rehearse migration and application rollback in the explicit isolated
      database; prove shared PostgreSQL/Redis remain unchanged.
- [ ] Inspect real browser desktop and narrow states for each role, administrator
      account governance, allowed/denied access, session expiry/revocation, and
      dangerous-action confirmation.
- [ ] Run focused tests, typecheck, full backend/Web tests, build, formatting,
      framework validation, migration status, OpenAPI drift check, and fixed-diff
      code/architecture review.
- [ ] Reconcile accepted behavior into a new current Identity and Access spec,
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
  backend regression is 33 files / 173 tests; typecheck, production build,
  generated contracts, formatting, Diff check, and framework validation pass.
- Still open: remaining internal service split, Bootstrap, role shells,
  administrator UI, complete failure/security/browser/rollback evidence,
  reconciliation, PR review, and integration.
