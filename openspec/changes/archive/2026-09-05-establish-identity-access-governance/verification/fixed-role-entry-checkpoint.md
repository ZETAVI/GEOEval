# Fixed role-entry checkpoint

Date: 2026-09-04

## Scope

This checkpoint removes the temporary post-login Media Supply special case and
establishes one fixed home for each single-role account:

| Role | Fixed home |
| --- | --- |
| `TERMINAL_CUSTOMER` | `/brands` after the existing first-brand check |
| `ADMINISTRATOR` | `/admin` |
| `OPERATIONS` | `/operations` |
| `AGENT` | `/agent` |

The administrator home exposes the already available Media Supply module and
marks account governance as foundation-ready but not yet interactive. Operations
and agent homes are capability shells only. They do not implement later order,
invoice, customer attribution, commission, or withdrawal capabilities.

## Automated evidence

- `pnpm --filter @geoeval/web test`: 6 files / 27 tests passed.
- `pnpm typecheck`: all workspace typechecks passed.
- `pnpm format:check`: all matched files passed Prettier validation.
- `DATABASE_URL=<issue-50-db> REDIS_URL=<issue-50-redis> pnpm test`: 35 files /
  187 tests passed against `geoeval_issue50` and Redis database `10`.
- `pnpm build`: Prisma generation, OpenAPI/client generation, backend build,
  API-client typecheck, and the production Web build passed. The route manifest
  contains `/admin`, `/operations`, and `/agent` alongside existing routes.
- `git diff --check`: passed.
- `python3 scripts/validate_project_framework.py`: passed for 17 cataloged Skills
  and local Markdown links.

An initial plain `pnpm test` result was discarded because its local defaults
selected the intentionally unmigrated shared `geoeval` database. That database
was not migrated or modified. The recorded passing result explicitly selected
the Issue-owned targets.

## Browser evidence

The API ran on port `3310` against `geoeval_issue50` and Redis database `10`; the
Web application ran on port `3210` against that API. Three fixed-ID synthetic
accounts were inserted only for this browser check:

- administrator `...0001` / `+8613900050001`;
- operations `...0002` / `+8613900050002`;
- agent `...0003` / `+8613900050003`.

Observed behavior:

1. The administrator completed the real deterministic Challenge/login flow and
   arrived at `/admin` rather than `/admin/media`.
2. The same administrator received the fixed-role 403 state at `/operations`,
   with a return link to `/admin`.
3. The operations account completed login and arrived at `/operations` without
   fabricated order data.
4. The agent account completed login and arrived at `/agent` without fabricated
   customer or earnings data.
5. The agent received the existing Media Supply 403 state at `/admin/media`, with
   a return link to `/agent`.
6. Browser warning/error logs were empty. DOM measurements showed all three role
   cards inside the desktop viewport and no page-level horizontal overflow.

After inspection, the local API and Web processes were stopped. Exact-ID/mobile
cleanup deleted all three synthetic Accounts, Sessions, Challenges, and rate
records; post-cleanup counts were zero.

## Deliberately still open

This checkpoint does not claim the broader role-shell task complete. It still
needs shared inactive, revoked, expired, and unauthenticated behavior exercised
across role homes. The administrator account-and-access workspace and dangerous
governance-action states remain a separate small implementation package.
