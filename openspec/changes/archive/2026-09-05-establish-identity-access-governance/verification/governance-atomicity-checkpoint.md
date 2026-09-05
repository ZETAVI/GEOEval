# Identity governance atomicity checkpoint

Date: 2026-09-04

## Scope

This checkpoint closes the Governance rejection and atomicity matrix for stale
revision, self-operation, sole-administrator safety, crossed concurrent
demotion, Session-revocation failure, and audit-insertion failure. It changes no
allowed governance transition and adds no approval workflow.

One error precedence is clarified from the already approved policy:

1. A sole active administrator attempting self-demotion or self-deactivation
   receives `LAST_ADMINISTRATOR_FORBIDDEN`, which identifies the required first
   action: establish another active administrator.
2. With another active administrator present, the same self-target receives
   `SELF_GOVERNANCE_FORBIDDEN`; the other administrator must perform the change.
3. Ordinary self logout and logout-all remain separate permitted commands.

## Evidence matrix

| Scenario                                                                    | Result                         | Account/Session/Audit evidence                                                                              |
| --------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Stale revision                                                              | `STALE_REVISION`               | No accepted audit; target state unchanged                                                                   |
| Self-governance with another administrator                                  | `SELF_GOVERNANCE_FORBIDDEN`    | No accepted audit or target change                                                                          |
| Sole administrator self-deactivation                                        | `LAST_ADMINISTRATOR_FORBIDDEN` | Active revision-1 administrator and its Session remain unchanged; no audit                                  |
| Two administrators concurrently demote each other                           | One success, one rejection     | One active administrator, one active operations account, one revoked Session, one active Session, one audit |
| Session revocation forced to fail after role update                         | PostgreSQL error               | Role/status/revision return to operations/active/1; Session remains unrevoked; no audit                     |
| Governance audit insertion forced to fail after deactivation and revocation | PostgreSQL error               | Account returns to operations/active/1; Session and reason return to null; no audit                         |

## Failure injection and cleanup

Two test-only PostgreSQL triggers raise on narrowly selected writes:

- first transition from unrevoked to revoked Session;
- audit insertion whose test reason is `FORCE_AUDIT_FAILURE`.

The functions and triggers use static names and SQL, are removed before each
installation, and are removed in `finally` even when the assertion fails. They
are not migrations or runtime code and cannot ship with application startup.

## Verification

- `identity-governance.integration.spec.ts`: 9/9 passed.
- Backend typecheck passed.
- Focused Prettier and `git diff --check` passed.

## Architecture review

Verdict: ready for this checkpoint.

- The error-precedence change remains inside the locked Governance transaction;
  it does not move last-administrator authority to the controller or Web.
- Reusing `requireAnotherActiveAdministrator` preserves one invariant owner.
- Failure injection tests the real PostgreSQL transaction rather than a mocked
  repository and leaves production code free of fault-injection switches.
- The crossed-demotion test proves both the committed and rejected sides,
  including Session and audit effects, rather than only counting remaining
  administrators.

## Remaining Issue-level work

Issue #50 is not complete. Full route/CSRF validation, isolated migration and
application rollback, complete desktop/narrow browser inspection, aggregate
verification and fixed-diff review, design reconciliation, PR review, and
integration remain open.
