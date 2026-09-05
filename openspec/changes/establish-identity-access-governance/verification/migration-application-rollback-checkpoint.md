# Identity migration and application rollback checkpoint

Date: 2026-09-05

## Objective and isolation

The rehearsal proves that the additive Identity schema can be deployed from an
empty database, can serve the latest application on `main` before Issue #50,
and can return to the Issue implementation without losing Session or dependent
Query-route compatibility.

- Current application: Issue #50 branch at `329d710`.
- Rollback application: `main@ddadf77d5077e6bf7a1e1cdd33a28171b89e0be8`.
- PostgreSQL: dedicated database
  `geoeval_issue50_main_rollback_ddadf77_20260905`, created empty and removed at
  exit.
- Redis: DB 5, selected only after confirming it was empty; shared DB 0 had
  three keys and was not selected.
- Runtime: local API port 3319 and exact local Origin 3219.
- Rollback source/build: detached `/private/tmp` worktree at the exact `main`
  revision, with the frozen lock file and project-local dependencies.

This is a pre-activation compatibility rehearsal, not authorization for an
unconditional rollback after the new account and Session semantics are active.
The old application does not enforce every new status, idle-expiry, or
revocation distinction. A post-activation rollback therefore needs its own
human-approved Session invalidation and operational plan before old code starts.

## Authoritative rehearsal sequence

1. Create the empty dedicated PostgreSQL database and replay all 22 current
   migrations successfully.
2. Build and start the current backend against the isolated database. Complete
   a real deterministic Challenge and Session through HTTP, then create one
   deliberately incomplete synthetic Brand.
3. Confirm the current-created Cookie reads `/identity/me` with HTTP 200.
4. Stop current, build and start `main@ddadf77` against the same migrated
   database. It reads the current-created Cookie with HTTP 200. Its Query
   definition route reaches the expected business validation and returns HTTP
   400 with the missing-profile-fields message rather than a schema or access
   failure.
5. The rollback application completes another Challenge and Session through
   HTTP. This exercises its legacy writer, which does not supply Issue #50
   Session lifecycle fields; its Cookie reads `/identity/me` with HTTP 200.
6. Stop rollback, restore current against the same database. Both the current-
   created and rollback-created Cookies read `/identity/me` with HTTP 200, and
   the same incomplete Query request still returns the expected HTTP 400.
7. Inspect the database: two Accounts, two Sessions, and one Brand exist; both
   Sessions have a 64-character digest, non-null last-seen and idle-expiry
   values, idle expiry no later than absolute expiry, and no revocation. Redis
   DB 5 remains empty.
8. Stop current and remove both dedicated databases used by final verification,
   Redis DB 4/5 test state, the detached worktree, project-local dependencies,
   Cookie jars, response files, and synthetic identifiers.

## Cleanup proof

Final selectors found zero remaining databases named
`geoeval_issue50_main_rollback_ddadf77_20260905` or
`geoeval_issue50_release_verify_ddadf77_20260904`. Redis DB 4 and DB 5 both
reported zero keys while shared DB 0 remained at three keys. The temporary
worktree and every explicit Cookie/response file were absent, and port 3319
refused connections. No production or external database, Redis, account, or
credential was used.

## Historical supporting proof

An earlier two-pass rehearsal used the original Issue merge base `82f7056`, 21
migrations, local port 3315, PostgreSQL-only dedicated databases, and Redis DB
1. It additionally proved normalized shared `geoeval` schema/data dump hashes
and shared Redis DB 0 key counts were identical before and after the run. That
evidence remains useful for the additive defaults and shared-state isolation,
but it is historical: the authoritative Final-PR compatibility target is now
`main@ddadf77` and the 22-migration sequence above.

## Architecture review

Verdict: ready for this checkpoint.

- Additive database defaults, not compatibility branches in current code, let
  the rollback writer operate on the migrated schema.
- Both application directions and both Cookie writers were exercised. Merely
  compiling rollback code or inserting legacy-shaped SQL would not prove the
  runtime read boundary.
- The current shared Query route was also exercised on both sides, separating
  expected incomplete-profile rejection from migration or authentication
  failure.
- Compatibility is intentionally bounded to pre-activation rollback. The proof
  does not claim that old code preserves all security semantics introduced by
  this Change after users begin relying on them.
- The rollback sample is the exact latest `main` revision, not a recreated mock
  or the now-stale original merge base.
- Removal was exact: only named dedicated databases, isolated Redis DBs, one
  detached temporary worktree, and explicit local credential files were
  deleted.

## Remaining Issue-level work

The implementation and local evidence are complete. Opening the Final PR,
recording the GitHub review relationship/state, archiving the active Change,
and human PR review remain; merge, deployment, migration, Bootstrap, and
activation require separate authorization.
