# Change: Simplify the Media Platform sales model

- Status: Reconciled and ready for Final PR review
- Class: Architectural
- Owning Issue: [#37](https://github.com/ZETAVI/GEOEval/issues/37)
- Pull request: [#38](https://github.com/ZETAVI/GEOEval/pull/38)
- Decision owner: Product owner

## Why

Browser review proved that the separate platform-data status and Listing sales
status do not represent two first-release business concepts. One platform is one
priced sales unit, and stopping orders means disabling that platform. Keeping a
one-to-one Listing would preserve an unearned lifecycle and expose duplicate
status, mutation, transition, and revision concepts.

## Outcome

Make the platform the single owner of enabled or disabled state, whole-point
price, and optimistic-concurrency revision. New platforms default to disabled;
enabling requires a valid price; disabling immediately stops new orders.

## Scope

- migrate current Listing price, availability, and revision into the platform;
- remove the Listing table, enum, repository method, endpoint, DTO, generated
  client helper, Web editor, and transition policy;
- merge price and enable/disable controls into the platform editor;
- retain resources, sources, customer-safe projections, quote checks, audits,
  and role boundaries;
- preserve old Listing audit entries as historical evidence;
- reconcile current specification, glossary, architecture overview, and ADR.

## Non-goals

- multiple offers, packages, schedules, regional pricing, resource allocation,
  order charging, production deployment, or #34 data import;
- merging resource or supply-source ownership into the platform;
- rewriting historical audit entries.

## Rollback

Before production activation, revert the migration and code as one release
unit. After migration against durable data, restore the Listing table from the
platform price, status, and revision before reverting application code; never
drop the new platform fields before that backfill is verified.

## Reconciliation result

The accepted behavior is owned by the current Media Supply specification,
product glossary, architecture overview, ADR 0002, Prisma schema and migration,
generated OpenAPI client, tests, and administrator Web workspace. No accepted
behavior remains only in this Change.
