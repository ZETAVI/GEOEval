# Administrator account read-model checkpoint

Date: 2026-09-04

## Scope

This checkpoint exposes the already implemented administrator account and audit
read models without exposing governance mutations. It adds:

- generated-contract-backed account and governance-audit reads;
- `/admin/accounts` search, fixed-role/status filtering, cursor pagination, and
  account selection;
- current revision, active Session count, last-authenticated and creation facts;
- target-owned governance audit history with bounded pagination;
- explicit loading, empty, retry, and non-administrator denial states;
- one administrator sidebar shared by overview, account, and Media Supply homes.

The page is visibly marked `只读视图`. It contains no account creation, role or
status change, Session revocation, confirmation, or reason form.

## Automated evidence

- `pnpm --filter @geoeval/web test`: 7 files / 30 tests passed. Coverage includes
  protected-loading markup, encoded query filters/cursors, audit target ownership,
  and bounded label/identifier presentation.
- `pnpm typecheck`: all workspace typechecks passed.
- `pnpm format:check`: all matched files passed Prettier validation.
- `pnpm build`: Prisma/OpenAPI/client generation, backend build, API-client
  typecheck, and the production Web build passed; `/admin/accounts` appears in
  the route manifest.
- `git diff --check`: passed.
- `python3 scripts/validate_project_framework.py`: passed.

The immediately preceding full backend run remains discriminating evidence:
35 files / 187 tests passed against `geoeval_issue50` and Redis database `10`.
This read-model checkpoint changes no backend source, schema, configuration, or
backend test target.

## Browser evidence

The API ran on port `3310` against `geoeval_issue50`; the Web application ran on
port `3210`. The fixture added 23 fixed-prefix synthetic accounts and two
target-owned audit rows. One pre-existing Issue integration-test account/audit
was deliberately retained and not treated as this checkpoint's fixture.

Observed behavior:

1. The synthetic administrator completed the deterministic Challenge/login flow,
   opened account management from the administrator overview, and saw only the
   read-model controls.
2. Cursor pagination returned 20 rows on the first page and 4 on the second page,
   including the one pre-existing Issue test account in the combined result.
3. Mobile search `60002` plus the agent role filter returned exactly the intended
   account and loaded its `CREATE_INTERNAL_ACCOUNT` audit with actor, time, and
   reason.
4. A narrow browser viewport collapsed filters and the account/detail layout to
   one column without page-level horizontal overflow.
5. A logged-in agent visiting `/admin/accounts` received the administrator-only
   denial state and a return link to `/agent`; protected account or audit data was
   not rendered.
6. Browser warning/error logs were empty.

After inspection, both local processes were stopped. Cleanup by the exact UUID
and mobile prefixes removed 23 Accounts, two Audits, two Sessions, two Challenges,
and two rate-limit rows. All matching post-cleanup counts were zero.

## Deliberately still open

The administrator workspace task remains unchecked. Create, role/status change,
and revoke-all need a separate mutation checkpoint with required reason,
dangerous-action confirmation, optimistic concurrency, self-governance and
last-administrator behavior, and browser evidence for every terminal outcome.
