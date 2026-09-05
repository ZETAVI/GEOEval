# Role Session-state checkpoint

Date: 2026-09-04

## Scope and contract

This checkpoint completes the fixed-role shell and Session interruption task.
Identity remains the sole authentication authority and returns four bounded 401
codes from `/identity/me`:

| Server code               | Web state                            | Recovery                                        |
| ------------------------- | ------------------------------------ | ----------------------------------------------- |
| `AUTHENTICATION_REQUIRED` | No known current login               | Complete login                                  |
| `ACCOUNT_INACTIVE`        | Known Session account is inactive    | Contact an administrator or use another account |
| `SESSION_REVOKED`         | Known Session was ended              | Complete a new login                            |
| `SESSION_EXPIRED`         | Idle or absolute expiry was exceeded | Complete a new login                            |

Missing, unknown, and already-cleaned credentials deliberately share
`AUTHENTICATION_REQUIRED`. For a retained known Session, inactive account state
takes precedence over revocation, and revocation takes precedence over expiry.
No client state grants access: every protected API keeps the shared backend
access guard and fixed-role metadata.

The Web module reads only `/identity/me` before selecting a role shell. It is
used by `/brands`, `/admin`, `/operations`, `/agent`, administrator account
governance, and administrator Media Supply. The `/brands` home no longer starts
its customer API read in parallel with identity verification. Operations and
Agent remain honest capability-owned empty shells; this checkpoint adds no
order, invoice, attribution, commission, withdrawal, or other future business
behavior.

## Evidence matrix

| Claim                                                 | Evidence                                                                    | Result | Notes                                                                                                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lifecycle facts remain server-owned                   | Identity Session service and PostgreSQL unique-digest lookup                | Passed | Repository returns the retained lifecycle record; application layer classifies current account status, revocation, and both expiries                 |
| Unknown credentials disclose no retained-state detail | Focused Identity integration test                                           | Passed | Missing and random credentials both return `AUTHENTICATION_REQUIRED`                                                                                 |
| Error codes are a generated public contract           | `/identity/me` OpenAPI 401 schema and generated API-client union            | Passed | Web mapping is exhaustive against the generated four-code union                                                                                      |
| Wrong-role shell stops before business data           | Web resolver test and `/brands` load sequence                               | Passed | Resolver made one `/identity/me` request; customer data starts only after a terminal-customer result                                                 |
| Shared presentation covers the complete matrix        | Web state mapping and static-render tests                                   | Passed | Loading, wrong-role, unauthenticated, inactive, revoked, expired, and temporary retry are distinct                                                   |
| Operations and Agent do not fabricate capability data | Existing shell tests plus real operations browser session                   | Passed | Only capability boundaries and explicit future states were shown                                                                                     |
| Runtime HTTP preserves the code                       | `GET /identity/me` without Cookie                                           | Passed | Returned HTTP 401 with `AUTHENTICATION_REQUIRED` and no account detail                                                                               |
| Browser presents each server state honestly           | Real local Challenge/login and retained Session mutations                   | Passed | Observed operations ready, operations-at-agent denial, absolute expiry, administrator-style revocation, inactive account, and final signed-out state |
| Temporary failures remain retryable                   | Browser request from an initially untrusted local Origin                    | Passed | CORS failure rendered `Failed to fetch` with `重新加载`; it was not misclassified as logout                                                          |
| Browser console remains clean                         | In-app browser log inspection after the matrix                              | Passed | Development info/HMR entries only; no warnings or errors                                                                                             |
| Fixture lifecycle is isolated                         | Fixed mobile `+8613900500050`, exact account ID, before/delete/after counts | Passed | Before: 1 account, 4 Sessions, 4 Challenges, 1 rate row, 0 audits; after: all five selectors returned zero                                           |

## Automated verification at checkpoint

- Focused Identity integration: 1 file / 14 tests passed after restoring the
  repository migrations in the project-local development database.
- Full backend regression: 35 files / 189 tests passed. Existing controlled
  telemetry-failure warnings and `pg` deprecation warnings remained non-failing.
- Web regression: 10 files / 52 tests passed.
- All workspace typechecks passed.
- Full repository formatting, `git diff --check`, and project-framework
  validation passed.
- Production build passed, including Prisma generation, OpenAPI/API-client
  regeneration, backend/client compilation, and all 12 Web routes.

The initial focused backend command accidentally expanded to the whole suite and
was discarded when sandbox networking blocked local Redis. The correctly scoped
retry then exposed an unmigrated project-local database; `pnpm infra:up` and
`pnpm db:migrate` applied the two already-owned Identity migrations before the
recorded passing run. No production or external environment was contacted.

## Architecture review

Verdict: ready for this checkpoint.

- Cohesion is preserved: PostgreSQL owns stored lifecycle facts, Identity
  classifies authentication failure, OpenAPI projects the public code union, and
  the Web owns only presentation and recovery navigation.
- The repository no longer erases every known failure into `undefined`, but the
  public boundary still collapses unknown credentials to one generic result.
- One shared Web module replaces four independent redirect/error
  implementations. It does not become a second authorization engine and has no
  dependency on Prisma, Nest request internals, or future role capabilities.
- Existing role homes and administrator modules adopt the shared boundary at the
  seam exposed by this Change; unrelated customer submodules are not rewritten.
- Session cleanup intentionally changes a sufficiently old retained credential
  from a specific lifecycle result to generic authentication-required. That is
  consistent with bounded 30-day security-correlation retention and does not
  affect authorization.

## Remaining Issue-level work

This checkpoint does not complete Issue #50. Stage 4 still requires the broader
HTTP security/CSRF and role matrix, forced governance rollback and concurrency
evidence, migration rollback rehearsal, reconciliation into current design,
fixed-diff review, pull-request review, and integration.
