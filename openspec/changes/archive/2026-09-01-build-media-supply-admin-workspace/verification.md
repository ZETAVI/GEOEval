# Verification: Media Supply administrator workspace

- Diff base: `origin/main@af72ba5f261925525b897c9124c28f5fb574c111`
- Environment: local Codex worktree, Node 24.12.0, pnpm 11.9.0,
  project-named PostgreSQL/Redis containers, deterministic local Identity
- External activity: no Provider call, production data, deployment, #34 import,
  Logo publication, order, payment, or external publication

## Evidence matrix

| Claim                                                                                                             | Evidence                                                                                                                               | Result                 | Notes                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Administrator login reaches the Media Supply workspace without entering the customer Brand flow                   | `apps/web/test/post-login-route.spec.ts`; real login for fictional administrator `...3701`                                             | Passed                 | Browser navigated from the existing challenge flow to `/admin/media` and loaded the administrator shell.                                                                                                                              |
| Terminal customers, operations, and agents do not gain administrator maintenance authority                        | Existing `media-supply-http.integration.spec.ts`; post-login role tests; direct browser visit as fictional terminal customer `...3702` | Passed                 | Browser rendered the role-specific 403 page. Existing backend matrix rejects customer, operations, and agent before mutation.                                                                                                         |
| Existing #33 administrator DTOs are the single generated request contract                                         | `pnpm openapi:generate`; generated `apps/backend/openapi.json` and `packages/api-client/src/schema.d.ts`; API-client typecheck         | Passed                 | Controller annotations expose existing DTOs only; no route, field, validation, schema, or lifecycle meaning changed.                                                                                                                  |
| The real local development API can resolve the existing RoleGuard                                                 | metadata probe before repair; `role.guard.spec.ts`; repaired `tsx watch` API smoke                                                     | Passed                 | The pre-fix runtime had no `design:paramtypes` or `self:paramtypes`; explicit `@Inject(Reflector)` restored protected endpoints without changing role rules.                                                                          |
| Platform, Listing, resource, source, and audit concerns remain separate but usable as one workflow                | Browser create/edit flow against local API and PostgreSQL                                                                              | Passed                 | Created one clearly fictional platform, established a Listing, created an internal source and masked resource, inspected audit, then paused the resource and deactivated the source.                                                  |
| Listing state and price—not resource/source count—control sale state                                              | Existing Media Supply integration tests plus browser result                                                                            | Passed                 | The platform stayed on shelf at 850 points after its only resource was paused and its source deactivated.                                                                                                                             |
| Existing Listing updates cannot silently overwrite a concurrent change                                            | `buildListingMutation` unit test; two-browser-page runtime flow                                                                        | Passed                 | Both pages opened revision 1; the second saved revision 2, the stale page received 409 and a refresh action, then refreshed/reconfirmed before revision 3 succeeded.                                                                  |
| Validation, loading, empty, success, authorization, conflict, backend-failure, and recovery states are actionable | Browser DOM/visual inspection and focused Web tests                                                                                    | Passed                 | Required platform/category/reason and on-shelf price errors were field-local; filtered-empty recovered by clearing filters; an observed backend 500 retained a retry action and succeeded after repair.                               |
| Default values and internal/customer field boundaries match the current contract                                  | `media-admin-ui.spec.tsx`; browser resource/source flow; existing customer-safe HTTP projection test                                   | Passed                 | Platform defaults domestic/active; resource defaults first-publish/active/hidden/medium; source defaults active; procurement cost stayed nullable RMB fen and internal values did not enter customer projection.                      |
| The administrator UI is responsive and visually coherent                                                          | In-app browser desktop inspection and effective 520px narrow viewport inspection                                                       | Passed with limitation | No page horizontal overflow (`scrollWidth === innerWidth`); dense regions stacked and ordinary actions remained reachable. The in-app viewport controller enforced a 520px minimum, so an exact 390px live viewport was not observed. |
| Repository checks and deployable artifacts remain valid                                                           | Focused Web tests, focused Media Supply integration tests, `pnpm check`, `pnpm build`, framework validator                             | Passed                 | See command evidence below.                                                                                                                                                                                                           |
| Accepted behavior is promoted to current truth and the active Change is retired                                   | `openspec/specs/media-supply/spec.md`, archived Change, framework validator                                                            | Passed                 | Product-definition's existing Media Supply extraction remains valid for unrelated capabilities; no architecture owner changed.                                                                                                        |

## Fixed-diff reviews

- **Intent:** `ready`. The administrator entry, platform/Listing/resource/source
  maintenance, audit, expected revision, feedback states, and responsive
  boundary match #37 without adding customer catalog, order, package, import,
  Provider, or production scope.
- **Engineering:** `ready`. Media Supply and Identity retain domain and role
  authority; Web depends only on generated REST contracts; the explicit
  `Reflector` injection repairs local runtime composition without changing
  permission meaning; no Schema or migration changed.
- **Evidence and continuity:** `ready`. Focused tests, full checks, build,
  migration, local browser behavior, responsive visual inspection, current-spec
  promotion, evolution-marker review, and Change archival are present. Remote
  Required Checks remain a PR gate rather than local completion evidence.

## Command evidence

- `pnpm --filter @geoeval/web test`: 3 files, 16 tests passed after the fixed
  diff review corrections.
- `pnpm --filter @geoeval/backend exec vitest run
test/media-supply-http.integration.spec.ts test/media-supply.integration.spec.ts`:
  2 files, 8 tests passed.
- `pnpm check`: formatting and all workspace typechecks passed; 23 Backend test
  files and 119 tests passed at the reconciled fixed diff.
- `pnpm build`: Prisma generation, OpenAPI/client generation, Backend compile,
  API-client typecheck, and Next production build passed; `/admin/media` was
  included in the generated route table.
- `python3 scripts/validate_project_framework.py`: passed before implementation,
  after current-spec reconciliation, and after Change archival.
- Local migration: all fourteen migrations applied successfully to the local
  development database. No migration or Schema file changed in #37.

## Residual and skipped evidence

- Remote Required Checks remain pending until the Final pull request is pushed.
- Production data, production deployment, real catalog import, real Logo assets,
  payment, fulfilment, and external publication were not run and are not
  authorized by #37.
- Exact 390px browser rendering remains unobserved because the selected in-app
  browser applied a 520px minimum; the responsive CSS breakpoint and 520px
  runtime result are present, but this is not recorded as exact 390px evidence.
- Pre-existing `pg@8` nested-query deprecation warnings and controlled telemetry
  failure fixtures appeared in the full test output without failing any test.
