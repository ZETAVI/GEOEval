# Identity and Access aggregate verification

Date: 2026-09-05

## Scope and isolation

- Verified revision: `329d710` on
  `codex/issue-50-identity-access-governance`.
- Current Final-PR comparison base:
  `origin/main@ddadf77d5077e6bf7a1e1cdd33a28171b89e0be8`.
- PostgreSQL target:
  `geoeval_issue50_release_verify_ddadf77_20260904`, created empty only for the
  authoritative post-main-sync pass.
- Redis target: DB 4, confirmed empty before this pass. Shared DB 0 was not
  selected.
- No provider call, real SMS, real account, production database, deployment, or
  activation was used.

## Aggregate results

| Claim | Evidence | Result |
| --- | --- | --- |
| All database changes deploy from empty | `pnpm db:migrate` against the dedicated database | 22/22 migrations applied |
| Migration owner remains current | Earlier 22-migration `prisma migrate status` result, reused because neither the later fixes nor `main@ddadf77` change Prisma schema or migrations | Schema up to date |
| Complete backend behavior is preserved | `DATABASE_URL=<dedicated> REDIS_URL=.../4 pnpm test` | 41 files / 228 tests passed |
| Complete Web behavior is preserved | `pnpm --filter @geoeval/web test` | 11 files / 58 tests passed |
| Workspace contracts typecheck | `pnpm typecheck` | Backend, generated client, and Web passed |
| Production artifacts compile | `pnpm build` | Prisma/OpenAPI generation, backend, client, and 12 Web routes passed |
| Checked source formatting is current | `pnpm format:check` | Passed |
| Project governance and links remain valid | `python3 scripts/validate_project_framework.py` | 17 cataloged Skills and local links passed |
| Generated HTTP contracts are current | Build-time OpenAPI/client regeneration followed by scoped `git diff --exit-code` | No drift |
| Patch is mechanically clean | `git diff --check` | Passed |

PostgreSQL emitted the existing `pg` concurrent-query deprecation warning in
tests, and controlled telemetry tests emitted their expected failure logs. The
test process exited zero; neither output identifies an Issue #50 acceptance
failure.

## Independent final-review remediation

Three independent read-only reviews covered security/architecture, runtime/Web,
and workflow/evidence boundaries. Their material findings were fixed before the
final aggregate pass:

- Account deactivation and authentication completion now serialize on the
  Account row and reload status before Session creation. A deterministic
  PostgreSQL concurrency test proves that deactivation cannot leave a live
  Session behind.
- A missing singleton Governance control row now fails closed with
  `GOVERNANCE_CONTROL_UNAVAILABLE`; the integration rollback test proves no
  Account or audit mutation commits.
- Repeated query parameters are rejected as HTTP 400 instead of escaping into
  Prisma or returning 500.
- All four role sidebars expose current logout and confirmed self logout-all
  through one shared component and generated client request.
- All four Media editor mutation/refresh failure branches route a 401 through
  the shared Session boundary rather than a local form error.
- Unused Identity application-service exports were removed, preserving the
  metadata/current-principal seam.

Focused independent verification passed 2 backend files / 16 tests and the
complete Web 11-file / 58-test suite. The current aggregate run supersedes the
earlier 219/56 and 221/58 counts.

## Evidence continuity

- Focused Identity tests distinguish role, Session lifecycle, Governance
  concurrency/rollback, Bootstrap, route policy, CSRF, cleanup, malformed
  requests, and authentication/deactivation serialization. The aggregate run
  repeats those suites together rather than replacing their narrower proof.
- Existing browser evidence covers all four role homes, administrator account
  governance, cross-role denial, Session expired/revoked/inactive states,
  dangerous-dialog behavior, and 390x844 responsive layouts. After the final
  logout-all change, a real 390x844 customer render showed both exit controls
  fully visible with `clientWidth=scrollWidth=390`; administrator and supporting
  roles reuse the same component and styles, while automated Web tests verify
  the entry on the shared render boundary.
- The latest `main` adds M4 handoff reconciliation and the accepted Issue #35
  parser correction. The merge changes neither Identity implementation nor the
  final Web repairs; the complete 228-test backend pass includes the new parser
  cases, and Architecture Overview retains both owners.
- The current -> `main@ddadf77` -> current application rehearsal is the Final-PR
  compatibility proof. It remains explicitly bounded to pre-activation rollback
  and does not authorize old code after new Account/Session security semantics
  become active.

## Cleanup

The aggregate test process left three synthetic Accounts, three Sessions, one
Identity audit, and one Redis DB 4 key in its dedicated targets. The complete
temporary PostgreSQL database was dropped and the pre-confirmed-empty Redis DB 4
was flushed. The rollback database/worktree/Cookie files and Redis DB 5 were
also removed. Final selectors returned zero matching databases, zero DB 4/5
keys, no process on port 3319, and three unchanged keys in shared Redis DB 0.

## Verdict

Aggregate verification is `passed`. The fixed implementation is ready for a
Final PR and human review. This result does not authorize merge, deployment,
production migration, real SMS, Bootstrap execution, or activation.
