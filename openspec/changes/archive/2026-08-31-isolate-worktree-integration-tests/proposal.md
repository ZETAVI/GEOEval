# Change: Isolate Worktree Integration Tests

- Status: Completed, reconciled, and verified through Draft PR #24
- Class: Standard maintenance bug fix
- Owner: GitHub Issue #15

## Why

Six backend integration suites replace the process environment with a local-
defaults object. A caller-provided `DATABASE_URL` is therefore discarded, and
the evaluation-process suite also hardcodes the shared Redis target before
obliterating its queue. One Worktree can consequently read or clear another
Worktree's test state even when the command supplies isolated resources.

## Scope

- In: one test-only configuration helper; explicit PostgreSQL and Redis target
  allowlisting; migration of the six affected integration suites and every
  evaluation-process Redis path; a focused regression test; the current
  Worktree resource-isolation rule; and before/after shared-state evidence.
- Out: production runtime configuration, Provider execution, S6 behavior,
  container topology, global package installation, automatic database
  allocation, and deletion or reset of shared local resources.

## Impact

Integration tests continue to use the existing local defaults when run by one
owner without explicit targets. When a Worktree supplies `DATABASE_URL` and
`REDIS_URL`, every database client, Worker runtime, and queue cleanup path uses
those targets. Test composition forces deterministic AI execution and disabled
AI telemetry instead of inheriting Provider or credential configuration.

## Control State

- Branch: `codex/issue-15-worktree-test-isolation`
- Base and merge destination: protected `main@2a42279`
- Project: Issue #15, `In Progress`, `P0`
- Documentation impact: `update` the Worktree lifecycle and current project-
  governance contract; archive this change after acceptance and merge.
- Exit: focused red/green evidence, isolated full verification, unchanged shared
  PostgreSQL/Redis evidence, Draft PR review, and `ready-for-integration`.

## Approval Boundary

Local project dependencies, one Issue-specific database, and one currently
unused Redis logical database are authorized for verification. Shared defaults
may be inspected but not reset, flushed, migrated, or cleaned. Merge, deletion
of the isolated resources, and Worktree cleanup remain separate lifecycle
actions.

## Final Disposition

- Current truth: the test Helper and six integration suites own executable
  behavior; `docs/process/human-agent-collaboration.md` and the project-
  governance spec own the stable Worktree rule.
- Evidence: focused red/green, 15-file Backend regression, Web tests, types,
  build, framework checks, stable shared-resource hashes, PR #24 CI, and matching
  local/remote Diff hashes.
- Review: fixed-revision code review found no remaining must-fix; partial
  resource overrides and hostile environment inheritance are regression-tested.
- Release: `release:skip`; this changes test safety and project governance, not
  customer or production behavior.
- Residual: the pre-existing `pg@9` nested-query deprecation warning remains a
  separate maintenance concern.
- Exit: branch is `ready-for-integration`; after merge, close Issue #15, move its
  Project item to `Done`, clean the Issue-specific database and Redis DB13, and
  remove the Worktree only after a clean merged-state check.
