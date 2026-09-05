# Administrator account-governance checkpoint

Date: 2026-09-04

## Scope and claims

This checkpoint completes the administrator `账号与访问` workspace behavior:

- create one active, pre-provisioned internal account with a fixed role;
- activate or deactivate an account;
- change only among the three internal roles;
- administratively revoke all target Sessions;
- require the displayed account revision, an explicit reason, and target-aware
  confirmation for every dangerous target action;
- show target-owned governance audits and explicit conflict/safety states;
- keep self-governance, mobile editing, physical deletion, impersonation, custom
  permissions, and customer/internal role conversion unavailable.

The server remains the sole owner of authorization, transition validity,
last-administrator safety, Session revocation, transaction atomicity, actor/time,
and accepted audit content.

## Evidence matrix

| Claim                                                     | Evidence                                                                                                      | Result | Notes                                                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Typed commands preserve endpoint and request boundaries   | Web contract tests for POST/PATCH/DELETE paths, encoded IDs, CSRF header, request body, and expected revision | Passed | Four narrow client functions; no generic mutation API                                                                            |
| UI requires reason and target-aware confirmation          | Dialog rendering tests plus desktop browser form inspection                                                   | Passed | Submit remains disabled until 3–320 character reason and exact mobile suffix are present                                         |
| Fixed-role and self-governance boundaries are honest      | Browser selected the current administrator and a terminal customer                                            | Passed | Self actions absent; customer role change absent; zero-Session revoke disabled                                                   |
| Role change is atomic with Session revocation and audit   | Local HTTP 200 plus PostgreSQL account/session/audit inspection                                               | Passed | `OPERATIONS → AGENT`, revision `1 → 2`, Session reason `ROLE_CHANGED`, one bounded before/after audit                            |
| Deactivate/reactivate preserves lifecycle semantics       | Two local HTTP 200 responses plus PostgreSQL inspection                                                       | Passed | revisions `1 → 2 → 3`; old Session remained revoked as `ACCOUNT_DEACTIVATED` after activation                                    |
| Administrator revoke-all does not rewrite identity facts  | Local HTTP 200 plus PostgreSQL inspection                                                                     | Passed | customer revision remained `1`; Session reason `ADMIN_REVOKE_ALL`; before/after identity state equal                             |
| Rejected commands do not claim success                    | Stale revision 409, duplicate mobile 409, self-governance 403, audit inspection                               | Passed | codes were `STALE_REVISION`, `ACCOUNT_ALREADY_EXISTS`, and `SELF_GOVERNANCE_FORBIDDEN`; only six accepted command audits existed |
| Current administrator remains usable after self rejection | PostgreSQL active-Session count after rejected self revoke                                                    | Passed | one actor Session remained active                                                                                                |
| Last-administrator/concurrent state is represented        | Focused error-presentation tests plus unchanged backend concurrent-demotion integration test                  | Passed | UI maps `LAST_ADMINISTRATOR_FORBIDDEN`; backend serialization evidence is reused from the current 187-test baseline              |
| Modal interaction has a real focus boundary               | Browser DOM, accessibility tree, focus inspection, and Escape                                                 | Passed | one open native dialog; background absent from AX tree; initial focus on command field; Escape removed modal                     |
| UI reads committed results                                | Browser account search/detail/audit readback after local HTTP commands                                        | Passed | role revision 2 with two audits; active status revision 3 with three audits; revoke audit visible                                |
| Fixture lifecycle is isolated and recoverable             | Explicit Issue database, fixed mobile/ID selectors, delete counts, zero-count queries                         | Passed | no default/prod mutation; temporary Cookie and response files removed                                                            |

## Automated verification

- `pnpm --filter @geoeval/web test`: 9 files / 38 tests passed.
- `pnpm typecheck`: all workspace typechecks passed.
- `pnpm format:check`: passed.
- `pnpm build`: Prisma/OpenAPI/client generation, backend build, API-client
  typecheck, and production Web build passed.
- `git diff --check`: passed.
- `python3 scripts/validate_project_framework.py`: passed.

The existing backend baseline remains applicable: 35 files / 187 tests passed on
`geoeval_issue50` and Redis database `10`. This checkpoint changes no backend
source, schema, runtime configuration, or backend test dependency.

## Runtime boundary

Browser automation inspected and completed every step before final mutation but
did not click final create/deactivate controls because those Computer Use actions
require a separate risk confirmation. The equivalent typed requests were sent
through the same running local HTTP API with an isolated synthetic administrator,
then the browser re-read committed account, Session, and audit outcomes. This is
not production activation evidence.

## Remaining Issue-level work

This checkpoint does not complete Issue #50. Shared role-home behavior for
unauthenticated, inactive, revoked, and expired Sessions; the full Stage 4
security/concurrency matrix; migration rollback rehearsal; current-design
reconciliation; and PR review remain open.
