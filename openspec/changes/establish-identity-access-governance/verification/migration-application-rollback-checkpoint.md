# Identity migration and application rollback checkpoint

Date: 2026-09-04

## Objective and isolation

The rehearsal proves that the additive Identity schema can be deployed from an
empty database, can serve the application that existed before Issue #50, and can
return to the current application without losing Session compatibility.

- Current application: Issue #50 branch at the current checkpoint.
- Rollback application: merge base `82f70564889698d501129b5188f4046a1a20dfa9`.
- PostgreSQL: dedicated databases created only for this rehearsal and removed at
  exit.
- Redis: DB 1, selected only after confirming it was empty. DB 15 had 29 keys
  and was deliberately rejected; shared DB 0 had three keys.
- Runtime: local port 3315 and exact local Origin 3215.
- Old source/build: detached `/private/tmp` worktree with the original frozen
  lock file and project-local dependencies.

The newest `main` commit after the merge base changes only project governance
documentation, so the merge base is the correct pre-Issue application sample.

## Rehearsal sequence

1. Create an empty dedicated PostgreSQL database.
2. Run the current migration owner: all 21 migrations apply successfully and
   migration status is up to date.
3. Build and start the current backend against the isolated database; complete a
   real deterministic Challenge and Session through HTTP.
4. Stop current, build and start the pre-Change backend against the same migrated
   database. It reads the current-created Cookie with HTTP 200.
5. The pre-Change backend completes another Challenge/Session through HTTP. This
   exercises the old writer, which does not supply Issue #50 Session fields.
6. Inspect the two rows: both accounts are active revision 1; both Sessions have
   a 64-character digest, non-null last-seen and idle-expiry values, idle expiry
   no later than absolute expiry, and no revocation.
7. Stop old, restore current against the same database. Both current-created and
   old-created Cookies return HTTP 200; the old-created account projects active
   status and revision 1.
8. Stop the process and remove the database, worktree, dependencies, Cookie jars,
   and response files.

The complete current → old → current sequence succeeded twice. The second run is
the authoritative isolation proof described below.

## Shared-state proof

The initial PostgreSQL fingerprint attempt hashed raw PostgreSQL 18 dump output.
It was discarded because each dump contains a random `\restrict`/`\unrestrict`
token, so two unchanged dumps receive different hashes. Consecutive normalized
dumps proved that removing only those marker lines produces stable fingerprints.

The authoritative second rehearsal recorded normalized `pg_dump` SHA-256 before
and after:

| Shared target       | Before                                                             | After  | Result              |
| ------------------- | ------------------------------------------------------------------ | ------ | ------------------- |
| `geoeval` schema    | `d85eb9f96e8fcf68c337c8340e2629fade92caddac6a1b9949d9244e82597075` | same   | Unchanged           |
| `geoeval` data      | `ba4b8260365d354d26031acabae35286152cc2638ef1bcf2be608ab7d1fdd035` | same   | Unchanged           |
| Redis DB 0          | 3 keys                                                             | 3 keys | Unchanged           |
| Isolated Redis DB 1 | 0 keys                                                             | 0 keys | Unchanged and empty |

Final selectors found zero remaining rehearsal databases. The temporary worktree
and Cookie jars were absent, and port 3315 refused connections. No production or
external database, Redis, account, or credential was used.

## Architecture review

Verdict: ready for this checkpoint.

- Additive database defaults, not compatibility branches in current code, allow
  the old writer to operate on the migrated schema.
- Both application directions were exercised. Merely compiling old code or
  inserting legacy-shaped SQL would not have proven Cookie/read behavior.
- The rollback sample is the actual Issue merge base, not a recreated mock.
- Shared-state proof uses deterministic normalized artifacts and records the
  rejected raw-hash method, preserving evidence continuity.
- Removal is exact and recoverability is appropriate: only dedicated databases,
  a detached temporary worktree, and local temporary credential files were
  deleted.

## Remaining Issue-level work

Issue #50 is not complete. Complete desktop/narrow browser inspection, aggregate
verification and fixed-diff review, design reconciliation, PR review, and
integration remain open.
