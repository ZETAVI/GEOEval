# Tasks

- [x] Record Issue #15 branch, Worktree, base, scope, verification boundary, and
      `In Progress` Project state.
- [x] Add a focused red test proving the previous integration-test composition
      discarded explicit PostgreSQL and Redis targets.
- [x] Add a test-only allowlisting helper that preserves only the explicit
      database and Redis targets while forcing test, deterministic-AI, and
      disabled-telemetry semantics.
- [x] Route all six backend integration suites through the helper.
- [x] Route both Worker runtimes, Worker-module composition, and destructive
      queue cleanup through the same resolved Redis target.
- [x] Record the one-owner default and per-Worktree resource-isolation rule in
      the current collaboration process.
- [x] Pass focused configuration tests and the complete backend suite against an
      Issue-specific database and Redis logical database.
- [x] Pass Web tests, type checks, production build, formatting, framework
      validation, and `git diff --check` after final reconciliation.
- [x] Prove the stable shared PostgreSQL content hash and Redis DB0 key-set hash
      are unchanged by a repeated isolated full backend run.
- [x] Reconcile the accepted rule into the current project-governance spec.
- [x] Complete PR #24 evidence and set the branch exit state to
      `ready-for-integration`.

## Local verification evidence

| Claim | Evidence | Result |
| --- | --- | --- |
| Previous composition discarded explicit resources | Initial focused run expected `postgresql://example/worktree_test` but received the shared local default | Red as expected before the helper fix |
| Explicit resources, hostile environment, partial overrides, local fallback, and Redis logical DB selection | `pnpm --filter @geoeval/backend exec vitest run test/integration-test-config.spec.ts test/runtime-config.spec.ts` | 2 files / 9 tests passed |
| Complete deterministic backend behavior uses the Issue resources | `DATABASE_URL=.../geoeval_issue15_test_20260831 REDIS_URL=redis://127.0.0.1:56379/13 pnpm test` | 15 files / 70 tests passed |
| Shared PostgreSQL remained unchanged | Stable filtered and sorted data-only dump hash before and after the repeated full run | `dfb1a8d6...3dc4` unchanged |
| Shared Redis DB0 remained unchanged | Sorted key-set hash before and after the repeated full run | `dcca1aa1...8c6` unchanged |
| Isolated resources were exercised | Issue database retained the final test records; Redis DB13 retained only its test queue metadata and stalled-check keys | Passed; no shared cleanup used |
| Web regression | `pnpm --filter @geoeval/web test` | 1 file / 4 tests passed |
| Static and build boundaries | `pnpm typecheck`; `pnpm build`; `pnpm format:check`; framework validator; `git diff --check` | Passed |

The backend run continues to emit the pre-existing `pg@9` nested-query
deprecation warning. It does not change this isolation result and remains
outside Issue #15.
