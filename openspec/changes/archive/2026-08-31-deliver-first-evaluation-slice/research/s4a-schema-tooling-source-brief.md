# Source Brief: S4a Schema and Migration Tooling

- Status: Verified local evidence for the S4a implementation
- Accessed: 2026-08-27
- Affected change: `deliver-first-evaluation-slice`, S4a semantic contract
- Installed versions: Zod 4.4.3, Prisma ORM 7.9.1, PostgreSQL 18.6

## Recommendation

Use the already installed Zod 4 first-party JSON Schema conversion for the
provider-facing structural contract, and keep cross-field semantic acceptance
as a separately versioned GEO validator. Store one semantic contract version on
the accepted interpretation and retain the exact resolved JSON Schema in its
linked AI attempt request. Do not add a second content hash that duplicates that
execution snapshot.

Use one reviewed data-bearing SQL migration for the deterministic local S4a
boundary: add nullable columns, backfill compatibility data, assert the
backfill, set the new columns required, relax legacy columns, and add PostgreSQL
checks. A second one-statement migration gives the automatically truncated
PostgreSQL constraint a stable short name; it adds no data or runtime mechanism.
Do not add a migration library or PostgreSQL extension. Reconsider a
multi-deployment expand-and-contract rollout before production because current
authorization and evidence cover one local application version only.

Confidence is high for the implemented local S4a boundary. The exact Zod 4.4.3
conversion, empty-database replay, representative S3 backfill, catalog
constraints, full tests, and build have been exercised locally.

## Decision Constraints

- One Zod-defined structural shape must feed parsing, TypeScript inference, and
  provider-facing JSON Schema without adding a second handwritten schema.
- Cross-field rules that JSON Schema conversion cannot faithfully represent must
  still reject business acceptance.
- Historical reads must select the intended structural and semantic meaning by
  one contract version; exact execution evidence remains in the AI attempt.
- Existing deterministic interpretations must not be deleted or silently
  reclassified as complete modern evidence.
- PostgreSQL constraints and backfill must replay from an empty database and
  over representative existing S3 rows.
- No global package, new runtime dependency, extension, real provider call, or
  production rollout is justified for this decision.

## Evidence

| Claim | Primary source | Version/date | Design implication |
| --- | --- | --- | --- |
| Zod 4 provides first-party `z.toJSONSchema()` and supports JSON Schema Draft 2020-12 or Draft 7 targets. | [Zod JSON Schema](https://zod.dev/json-schema), [Zod 4 tagged documentation](https://github.com/colinhacks/zod/blob/v4.0.1/packages/docs/content/json-schema.mdx) | Zod 4; accessed 2026-08-27 | Generate the structural output contract from the installed Zod schema rather than maintaining handwritten JSON Schema. |
| Several Zod features, including transforms, custom values, dates, maps, and sets, are not representable and throw by default. | [Zod JSON Schema: unrepresentable types](https://zod.dev/json-schema#unrepresentable) | Zod 4; accessed 2026-08-27 | Keep the provider-facing structural schema JSON-representable and apply cross-field semantic refinements in a second GEO validation step. Conversion must fail rather than degrade an unsupported field to an unconstrained object. |
| Prisma Migrate migration SQL is customizable and supports imperative data migration alongside declarative schema changes. | [Prisma Migrate overview](https://docs.prisma.io/docs/orm/v7/prisma-migrate), [Customizing migrations](https://docs.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations) | Prisma 7 documentation; accessed 2026-08-27 | Generate a draft migration, review and edit its SQL, and keep the data backfill plus constraints in migration history. |
| Prisma documents expand-and-contract for evolving stored data and shows backfill before old-field removal. | [Prisma data migration guide](https://www.prisma.io/docs/guides/database/data-migration) | Accessed 2026-08-27 | Preserve legacy columns during S4a, backfill the new canonical payload, switch application reads and writes, and defer physical removal. |
| PostgreSQL CHECK constraints continue to enforce writes even though Prisma Client models do not express the constraint predicate. | [Prisma PostgreSQL CHECK constraints](https://www.prisma.io/docs/orm/v6/more/troubleshooting/check-constraints) | Official Prisma documentation; accessed 2026-08-27 | Add named checks in reviewed SQL, cover them with database tests, and do not assume `schema.prisma` alone recreates the invariant. |

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| Zod structural schema plus separate semantic validator and one stored contract version | Adopt | Uses installed capabilities, keeps one field definition, and makes the JSON Schema limit explicit without duplicating the exact attempt snapshot. |
| Persist a JSON Schema hash beside every accepted interpretation | Reject | The linked attempt already stores the exact resolved schema, and a hash cannot select or restore the compatible semantic reader. |
| Use `unrepresentable: "any"` for unsupported Zod fields | Reject | It can silently weaken the model-facing structure and make the accepted contract overstate enforcement. |
| Add a second JSON Schema or OpenAPI schema library | Reject for S4a | No current feature requires another source of truth or dependency. |
| Drop legacy semantic columns in the first S4a migration | Reject | It exceeds the additive authorization and removes the compatibility/rollback seam before new reads are proven. |
| Production-style multi-release dual-write rollout now | Defer | It is appropriate for live rolling deployments, but S4a is deterministic local work with no production service or concurrent old application version. |

## Local Validation and Remaining Unknowns

- The installed Zod 4.4.3 contract generated Draft 2020-12 JSON Schema and its
  focused structural and semantic suite passed.
- All nine migrations replayed on a named empty temporary database. A separate
  database built through the seven pre-S4a migrations retained one of one
  representative S3 interpretations, including its old summary and explicit
  compatibility discriminator.
- PostgreSQL catalog inspection found both final CHECK constraints in the main,
  empty-replay, and compatibility-backfill databases. That inspection exposed
  and corrected PostgreSQL's 63-byte identifier truncation.
- Full project type checking, all 43 backend tests, the generated OpenAPI path,
  backend compilation, API-client checking, and the Next.js build passed.
- A production rollout would need representative production volume, lock-time,
  backup, rollback, and old/new application coexistence evidence; none is claimed
  by this brief.

## Reuse and Refresh Boundary

- Reusable while the project remains on Zod 4, Prisma ORM 7, PostgreSQL, one
  deterministic local application version, and the accepted S4a contract shape.
- Refresh when Zod's JSON Schema converter or schema nodes change, Prisma major
  version or migration engine changes, the application needs a rolling
  production migration, or the output contract adds a type that JSON Schema
  cannot represent.
