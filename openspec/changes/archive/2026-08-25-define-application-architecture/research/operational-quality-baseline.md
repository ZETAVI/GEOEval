# Source Brief: Minimum Operational and Quality Baseline

- Change: [`define-application-architecture`](../proposal.md)
- Access date: 2026-08-25
- Evidence state: Official-source audit and architecture confirmation complete;
  foundation-spike runtime evidence pending
- Research owner: Architecture owner

## Recommendation

The product owner confirmed one small but complete engineering baseline covering
environment separation, explicit migrations, recoverable authoritative data,
validated secrets, health and shutdown, duplicate-safe background work,
correlated observability, reproducible builds, and layered verification.
Implementation authorization still requires the remaining evidence gates. Keep
the baseline vendor-neutral and outcome-based; exact hosting, monitoring, backup
product, resource sizes, retention values, and test-tool configuration remain
later operational choices.

The foundation spike must prove the selected stack can enforce this baseline.
Configuration, a passing build, an HTTP 200, or a backup file existing by itself
is not sufficient evidence.

## Decision Constraints

- One versioned release set of immutable web and backend artifacts is promoted
  through environments; secrets and environment-specific values are injected
  where their runtime boundary permits rather than producing an untracked code
  variant.
- Development migration generation and production migration application are
  separate operations. Production does not run development reset, push, or
  shadow-database workflows, and application startup is not the migration
  authority.
- PostgreSQL owner records and required object evidence have a tested recovery
  path. A scheduled backup without a successful restore rehearsal does not pass
  the commercial gate.
- BullMQ delivery and worker restart are treated as potentially duplicating work;
  business idempotency remains in PostgreSQL owner records rather than depending
  on a Redis job's continued presence.
- Liveness, readiness, graceful shutdown, worker progress, outbox lag, and queue
  lag are distinguishable. External AI availability is observed but does not
  make an otherwise healthy API process fail readiness.
- Logs, metrics, traces, and AI telemetry carry stable correlation identities,
  exclude credentials and uncontrolled sensitive payloads, and cannot block a
  committed business result.
- Verification follows the architecture layers and includes real integration,
  browser, migration, recovery, and controlled-provider evidence where the claim
  crosses those boundaries.

## Evidence

| Claim | Primary source | Version/date | Design implication |
| --- | --- | --- | --- |
| Next.js recommends a reverse proxy for self-hosting; server-only and `NEXT_PUBLIC_` variables have different exposure and build behavior; multi-instance deployments require explicit cache, encryption-key, and deployment-version coordination. | [Next.js self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting) | Updated 2026-03-25; accessed 2026-08-25 | Keep one promoted artifact, prevent secrets from entering browser bundles, begin with one web instance unless scaling evidence earns shared-cache coordination, and verify reverse-proxy behavior in the foundation spike. |
| Prisma separates development migration generation from production application; `migrate deploy` applies pending migrations, while the shadow database belongs to development workflows. Prisma also documents expand-and-contract for compatible production change. | [Prisma migrate commands](https://docs.prisma.io/docs/cli/migrate), [shadow database](https://docs.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/shadow-database), and [expand-and-contract guide](https://docs.prisma.io/docs/guides/database/data-migration) | Accessed 2026-08-25; exact GA version to be pinned by spike | Use one reviewed migration history, one explicit release migrator, a disposable development shadow database, and compatibility migrations for risky changes; never use development reset or push against production. |
| PostgreSQL continuous archiving combines base backups and WAL to support point-in-time recovery, but database recovery does not restore separately managed configuration files. | [PostgreSQL continuous archiving and PITR](https://www.postgresql.org/docs/current/continuous-archiving.html) | Current documentation; accessed 2026-08-25 | Back up authoritative data and required configuration/assets through named owners, define a restore procedure, and prove restoration before commercial release rather than treating backup creation as recovery evidence. |
| BullMQ recommends idempotent jobs and documents that delivery can be at least once in the worst case; unique job identifiers cease to deduplicate after removed jobs disappear. | [BullMQ idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs), [BullMQ overview](https://docs.bullmq.io/), and [job auto-removal](https://docs.bullmq.io/guide/queues/auto-removal-of-jobs) | Accessed 2026-08-25 | Redis job identity is a delivery optimization, not the permanent business idempotency key. Consumers recheck durable owner state, and retention or cleanup cannot make a duplicate business effect possible. |
| NestJS health checks support multiple indicators and explicitly recommend shutdown hooks. | [NestJS health checks](https://docs.nestjs.com/recipes/terminus) | Accessed 2026-08-25 | Expose purpose-specific liveness and readiness, enable graceful shutdown for API and worker entrypoints, and prove behavior under dependency loss and termination. |
| OpenTelemetry defines common semantic conventions and trace/log correlation fields, while event guidance calls out sensitive or expensive attributes. | [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/), [logs data model](https://opentelemetry.io/docs/specs/otel/logs/data-model/), and [event conventions](https://opentelemetry.io/docs/specs/semconv/general/events/) | Accessed 2026-08-25; individual conventions have their own stability levels | Use stable application correlation identities and structured fields, treat experimental conventions selectively, and apply an explicit allowlist or masking policy before export. |

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| One bounded baseline plus a foundation spike | Adopt | Protects hard-to-reverse operational boundaries while allowing exact tools and values to follow runtime evidence. |
| Select every hosting, CI, monitoring, backup, and security product now | Reject | Creates procurement and configuration commitments before the first application artifact or measured workload exists. |
| Defer migrations, recovery, secrets, and integration verification until feature completion | Reject | Makes the first real data and provider work the point at which foundational risks are discovered. |
| Require production-scale high availability, Kubernetes, and multi-region recovery for the first slice | Reject | The product needs verified recovery and clear scaling seams, not speculative distributed operations before load evidence. |

## Unknowns and Validation

- Exact Node.js, Next.js, NestJS, Prisma, BullMQ, PostgreSQL, and build-tool
  versions require one current-GA compatibility set and a checked lockfile.
- Exact hosting, managed PostgreSQL, Redis, object storage, secret store,
  observability destination, backup retention, RPO, and RTO remain operational
  decisions before commercial release, not prerequisites for repository
  scaffolding.
- Controlled provider accounts still must prove real access, response semantics,
  search evidence, latency, failure behavior, quality, and cost. Those calls are
  a separate authorized evidence lane.
- The foundation spike must demonstrate build and startup, explicit migration,
  rollback-safe compatibility, outbox relay and duplicate delivery, worker
  recovery, SSE reconnect, generated-contract drift detection, health and
  graceful shutdown, telemetry failure isolation, and a small restore rehearsal
  using disposable data. The S3-compatible adapter is proven with the later
  material-owning slice because the first evaluation slice has no file workflow.
