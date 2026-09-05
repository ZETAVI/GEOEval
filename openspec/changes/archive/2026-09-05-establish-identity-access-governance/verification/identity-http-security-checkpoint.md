# Identity HTTP security and lifecycle checkpoint

Date: 2026-09-04

## Scope

This checkpoint turns the previously distributed Identity evidence into two
focused HTTP suites without changing runtime behavior:

- account origin, fixed-role login, representative four-role authorization, and
  forged request boundaries;
- current logout, self logout-all, administrator revoke-all, expiry,
  role/status invalidation, and fresh authentication.

It reuses the approved Session, Account, Governance, CSRF, and cleanup
contracts. No new role, permission, business capability, token format, recovery
authority, or external dependency is introduced.

## Account and authorization matrix

| Scenario                                                                                      | Expected boundary                                                           | Result |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------ |
| New public mobile completes Challenge                                                         | Creates one `TERMINAL_CUSTOMER`                                             | Passed |
| Pre-provisioned operations/admin/agent completes Challenge                                    | Preserves its one fixed role                                                | Passed |
| Client adds role/status/account fields to Session body                                        | Extra fields cannot select or merge a role                                  | Passed |
| Inactive internal account completes a valid Challenge                                         | 401, no Session, account remains inactive                                   | Passed |
| `/identity/me` and `/media-catalog/categories`                                                | All four authenticated roles allowed                                        | Passed |
| `/brands` and `/notifications`                                                                | Customer allowed; all internal roles receive `ACCOUNT_ROLE_FORBIDDEN`       | Passed |
| `/admin/accounts` and `/admin/media/platforms`                                                | Administrator allowed; other three roles receive `ACCOUNT_ROLE_FORBIDDEN`   | Passed |
| Customer posts an administrator route                                                         | 403 and no target account write                                             | Passed |
| Administrator supplies a foreign actor/status/revision in create body                         | Controller derives actor from Session and accepts only command-owned fields | Passed |
| Random credential, stored digest as credential, or local request using production Cookie name | Generic `AUTHENTICATION_REQUIRED`                                           | Passed |

The successful forged-body check created an active revision-1 agent and its
audit named the authenticated administrator, not the client-supplied customer.
`clearCustomerData` removed all test rows before the next case and after the
suite.

## Session lifecycle matrix

| Scenario                                        | Stored/result evidence                                                                                     | Result |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| Current logout with two Sessions                | One `USER_LOGOUT`; other Session remains usable                                                            | Passed |
| Self logout-all with two remaining Sessions     | Two `USER_LOGOUT_ALL`; both return `SESSION_REVOKED`                                                       | Passed |
| Idle and absolute expiry                        | Both return `SESSION_EXPIRED`                                                                              | Passed |
| Administrator revoke-all of two target Sessions | Two `ADMIN_REVOKE_ALL`; identity revision remains 1                                                        | Passed |
| Internal role change after fresh login          | Session gets `ROLE_CHANGED`; account becomes agent revision 2                                              | Passed |
| Fresh login after role change                   | Same account authenticates with its new fixed role                                                         | Passed |
| Account deactivation                            | Old Session gets `ACCOUNT_DEACTIVATED`; retained request returns `ACCOUNT_INACTIVE`; new login is rejected | Passed |
| Reactivation                                    | Revision advances to 3; old Session remains `SESSION_REVOKED`; a new Session succeeds                      | Passed |
| Lifecycle cleanup                               | Existing bounded maintenance integration deletes only old terminal state and never governance audit        | Passed |

## Verification

- `identity-access-http.integration.spec.ts`: 4/4 passed.
- `identity-session-http.integration.spec.ts`: 4/4 passed.
- Backend typecheck passed.
- Focused source formatting and `git diff --check` passed.

The suites use the repository's deterministic local Challenge adapter, project
PostgreSQL/Redis, random local HTTP ports, and `clearCustomerData` isolation.
They make no Provider call and touch no production or external environment.

## Architecture review

Verdict: ready for this test-only checkpoint.

- The tests exercise public HTTP behavior and stored outcomes rather than
  duplicating repository algorithms.
- A narrow test fixture owns only Challenge/session establishment shared by the
  two new suites. It does not become application code or replace scenario-local
  assertions.
- Representative resource categories prove role semantics; the separate route
  inventory remains the one complete controller classification record. The next
  checkpoint must validate that inventory and the complete CSRF matrix rather
  than multiplying equivalent endpoint cases here.
- Actor, role, status, revision, time, and Cookie authority remain server-owned.

## Remaining Issue-level work

Issue #50 is not complete. Forced transaction rollback/concurrency, full route
and CSRF validation, isolated migration/application rollback, complete desktop
and narrow browser inspection, aggregate verification and fixed-diff review,
design reconciliation, PR review, and integration remain open.
