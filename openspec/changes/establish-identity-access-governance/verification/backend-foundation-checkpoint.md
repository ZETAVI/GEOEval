# Backend foundation verification checkpoint

- Date: 2026-09-04
- Branch: `codex/issue-50-identity-access-governance`
- Base: `main@82f70564889698d501129b5188f4046a1a20dfa9`
- Result: Partially verified; this is not Issue #50 completion evidence

| Claim | Evidence | Result | Scope and limitation |
| --- | --- | --- | --- |
| Issue #50 and #57 can progress without two writers for one capability | Both Issue comments define disjoint capability owners and sequential shared-file writers; Project status is #50 `In Progress`, #57 `Review / Decision` | Passed | #57 remains in product discussion and must rebase/regenerate before shared integration writes |
| Account/Session/governance schema can be created from the current baseline | `pnpm db:migrate` against empty `geoeval_issue50`; all 20 migrations applied | Passed | Local Issue-owned PostgreSQL only; no production migration |
| Existing Session rows receive role-family idle expiry and an old application writer can still insert after migration | Separate temporary database: apply first 19 migrations, seed customer/admin Sessions, apply Issue #50 SQL; observed customer `+24h`, administrator `+30m`, non-null `last_seen_at`; insert omitting new fields succeeded through database defaults | Passed | Synthetic representative rows; application downgrade behavior beyond the Session write is not yet rehearsed |
| Opaque credentials remain server-owned and current/self-all revocation, idle expiry, inactive-account rejection, and revocation reasons work | `identity.integration.spec.ts` | Passed | Bounded cleanup and Challenge rate/supersession policies remain open |
| Administrator commands enforce fixed-role, revision, self-action, last-admin, atomic revoke, and audit rules | `identity-governance.integration.spec.ts`, including two competing demotions | Passed | Bootstrap and forced audit/session failure rollback cases remain open |
| Every registered HTTP controller uses one fail-closed access contract and fixed role declarations | `role.guard.spec.ts`, `api.integration.spec.ts`, `media-supply-http.integration.spec.ts`, and [route inventory](route-access-inventory.md) | Passed | Browser-rendered role shells are not part of this checkpoint |
| JSON custom-header/exact-Origin CSRF boundary works for login and authenticated mutations | HTTP integration tests cover correct header/origin, missing application header, wrong Origin, and CORS preflight | Passed | No browser UI inspection yet |
| Refactor preserves affected backend behavior | `pnpm test`: 32 files, 165 tests passed | Passed | Local deterministic adapters only; no real SMS/provider call |
| Generated contracts compile across backend, client, and Web | `pnpm typecheck`; `pnpm build`; generated OpenAPI and client schema are in the diff | Passed | Administrator client methods and UI are still open |
| Repository formatting and framework contracts remain valid | `pnpm format:check`, `git diff --check`, `python3 scripts/validate_project_framework.py` | Passed | Fixed-diff code review is still required before PR review |
| Shared local defaults were not used as test targets | Default PostgreSQL reports 19 migrations and no Identity governance table; Issue database reports 20 and the table. Redis DB 0 and DB 10 were queried separately | Passed | Pre-existing Redis DB 0 contents were not modified or cleared |
| Whole Issue #50 accepted behavior is current truth | Open tasks include Challenge lifecycle, cleanup, Bootstrap, role shells/admin UI, browser/rollback/failure evidence, current-spec reconciliation, and PR review | Not run | The Change remains active; do not close Issue #50 or mark it `Review / Decision` |

The disposable `geoeval_issue50_migration` database contained synthetic rows
only and was dropped after the rehearsal. The reusable `geoeval_issue50`
database and Redis DB 10 remain the explicit Issue-owned integration targets.
