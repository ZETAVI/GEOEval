# Source Brief: Foundation Compatibility Candidate

- Change: [`define-application-architecture`](../proposal.md)
- Access date: 2026-08-25
- Evidence state: F0 installation, build, runtime, migration, recovery, and
  lockfile evidence passed; E0 entitlement passed while later provider probes
  and product implementation remain separate
- Research owner: Architecture owner

## Recommendation

Accept the executed current-GA set for the application foundation: Node.js 24 LTS,
pnpm 11, TypeScript 5.9, Next.js 16 with React 19, NestJS 11, Prisma 7, BullMQ 6,
PostgreSQL 18, and Redis 8.2 Extended. Exact application packages, container
digests, Node/pnpm declarations, and the lockfile are now pinned. The set passed
installation, generation, typecheck, build, migration, API/worker runtime,
idempotency, browser recovery, graceful shutdown, and backup/restore evidence.

Do not adopt Prisma 8 while its official documentation describes it as a release
candidate. Do not select individual dependencies merely because each package
supports Node.js 24 in isolation; the combined web, backend, ORM, queue, compiler,
and production-build behavior is the actual decision boundary.

## Candidate Set

| Component                  | Candidate observed on 2026-08-25                                                | Decision state                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Node.js                    | 24.12.0 declared by `.node-version`; Node 24 is the accepted LTS line           | accepted for the local foundation; advance to a current 24.x patch through a verified dependency change before production      |
| pnpm                       | 11.9.0 pinned through `packageManager`                                           | accepted; the checked lockfile reproduces through this declared package manager                                                 |
| TypeScript                 | 5.9.3                                                                          | accepted after the 7.0.2 trial was rejected because `openapi-typescript@7.13.0` declares only TypeScript 5.x support            |
| Next.js / React            | Next.js 16.3.2; React and React DOM 19.2.8                                     | accepted; App Router and standalone production output passed without a custom server                                            |
| NestJS                     | core/common/platform 11.2.2; Swagger 11.4.7                                    | accepted; API and standalone worker started from the same backend build                                                         |
| Prisma / PostgreSQL driver | Prisma and Client 7.9.1; adapter-pg 7.9.1; pg 8.23.0                           | accepted; generation, reviewed migration, transaction, and restore evidence passed                                              |
| BullMQ                     | 6.2.1 with Redis                                                               | accepted; business idempotency remains in PostgreSQL rather than queue retention or job identity                                 |
| PostgreSQL                 | 18.6                                                                          | accepted for local integration; the production product and resource shape remain an operational decision                        |
| Redis                      | 8.2.8 Extended line                                                            | accepted for local delivery after restart, reconciliation, and duplicate-delivery evidence                                      |

Exact transitive packages, linting, testing, generated-client, telemetry, and
container-image versions are selected inside the spike and recorded by the
lockfile and evidence output, not guessed in this brief.

## Current Local Readiness

| Check                     | Observed state                                                                                                                                                                                                                                        | Consequence                                                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkout                  | `codex/foundation-spike`, created from the confirmed provider-adapter design HEAD                                                                                                                       | Keep F0 isolated until reviewed; no merge or push is implied.                                                                                                                                |
| Application manifests     | Root manifests, workspace packages, lockfile, Compose services, migrations, generated contract, API/worker bootstraps, tests, and recovery scripts exist                                                                                                     | These files are the accepted application foundation; F0-only records, routes, and page remain non-product probes.                                                                           |
| Node and package manager  | Node 24.12.0, Corepack 0.34.5, pnpm 11.9.0; exact project declarations and checked lockfile                                                                                                                       | Reproduced in F0; update the Node 24 patch before production through the normal verified dependency path.                                                                                    |
| Container runtime         | Docker CLI 29.4.0 can reach the OrbStack daemon outside the restricted tool sandbox                                                                                                                                                                   | Use project-named disposable PostgreSQL and Redis services without touching unrelated containers.                                                                                             |
| Local images              | Compose pulled PostgreSQL 18.6 and Redis 8.2.8 through OrbStack using the pinned manifests                                                                                                                           | Project services are reproducible without installing another Docker runtime or relying on unrelated local images.                                                                           |
| Candidate image manifests | `compose.yaml` pins `postgres:18.6-bookworm` at `sha256:1c59e2c3c818eaa0f0628f695b36e7c9e362d6b219b36a54a32df645cbd7e1af` and `redis:8.2.8` at `sha256:2f7462b9e93e0a7ae2edf3a0a0babc8a4d29f8bfc50849b906b7caaef925edc1` | Accepted for F0; future updates must recheck manifests and rerun the affected evidence.                                                                                                      |
| Provider configuration    | The local ignored `.env` has the eight canonical Ark, Model Studio, Qianfan, TokenHub, and Langfuse references, is mode `0600`, and is not tracked; the product owner confirmed rotation, and the four approved endpoint families authenticated successfully | Entitlement passed without exposing values; account ownership, search behavior, quota, later budget, terms, and production data handling remain required.                                     |

No credential value was printed or recorded in this source brief during the
refresh.

## Primary Evidence

| Claim                                                                                                                            | Primary source or controlled read                                                                                                                                 | Design implication                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Node.js 24 is LTS while Node.js 26 is Current; production should use an LTS line.                                                | [Node.js releases](https://nodejs.org/en/about/previous-releases)                                                                                                 | Pin the current Node 24 LTS patch rather than adopting the newer Current line.                                               |
| Next.js 16 requires Node.js 20.9 or newer and supports full functionality as a Node.js server or Docker deployment.              | [Next.js installation](https://nextjs.org/docs/app/getting-started/installation) and [deployment](https://nextjs.org/docs/app/getting-started/deploying)          | Node 24 is eligible; prove normal and standalone production builds in the selected repository shape.                         |
| NestJS 11 requires Node.js 20 or newer and recommends the latest LTS.                                                            | [NestJS 11 migration guide](https://docs.nestjs.com/migration-guide)                                                                                              | Node 24 is the shared supported runtime line for Next, Nest, and Prisma.                                                     |
| Prisma 7 is current GA and Prisma 8 is RC; current Prisma supports Node 24 and requires a driver adapter for direct connections. | [Prisma overview](https://docs.prisma.io/docs/orm) and [system requirements](https://docs.prisma.io/docs/orm/reference/system-requirements)                       | Use Prisma 7 plus `@prisma/adapter-pg`; keep Prisma 8 outside the foundation until GA and a separate compatibility decision. |
| PostgreSQL 18.6 is a supported current minor and PostgreSQL recommends the current minor of a supported major.                   | [PostgreSQL versioning policy](https://www.postgresql.org/support/versioning/)                                                                                    | Use the current PostgreSQL 18 minor for the disposable candidate rather than starting a new product on an unsupported line.  |
| Redis 8.2 is an Extended GA line with a longer support window.                                                                   | [Redis Open Source version management](https://redis.io/docs/latest/operate/oss_and_stack/install/version-mgmt/)                                                  | Prefer the current 8.2 patch for the candidate and validate BullMQ 6 against it.                                             |
| BullMQ uses Redis connections, supports current Redis client adapters, and may process delivery more than once under failure.    | [BullMQ connections](https://docs.bullmq.io/guide/connections) and [idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs)                             | Exercise the Redis backend, duplicate delivery, connection loss, and durable owner idempotency in the spike.                 |
| Current package versions and engine/peer ranges were observed through read-only `npm view` calls.                                | npm registry reads on 2026-08-25                                                                                                                                  | Registry presence establishes a candidate package identity, not combined compatibility or runtime correctness.               |
| Candidate PostgreSQL and Redis image tags and multi-platform manifest digests exist in the official Docker Hub repositories.     | [PostgreSQL official image](https://hub.docker.com/_/postgres) and [Redis official image](https://hub.docker.com/_/redis); read-only registry audit on 2026-08-25 | Record the observed candidates now, but recheck and pin accepted digests only when F0 is authorized.                         |

## Rejected or Deferred Choices

| Choice                                               | Decision                   | Reason                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js 26 Current                                   | Defer                      | It is newer than the current LTS line and provides no first-slice requirement that outweighs reduced ecosystem maturity.                                                                                                                                                                |
| Prisma 8 RC                                          | Reject for foundation      | Release-candidate status is unnecessary risk for the first production architecture.                                                                                                                                                                                                     |
| Existing local Redis 7 image as the project baseline | Defer                      | It can support an isolated experiment, but it would not validate the selected current extended line.                                                                                                                                                                                    |
| BullMQ PostgreSQL backend                            | Reject for current spike   | The confirmed stack deliberately keeps PostgreSQL as business authority and Redis as delivery transport; changing the backend would reopen the stack decision without a demonstrated need.                                                                                              |
| TypeScript 7.0.2                                     | Reject for the F0 baseline | The authorized installation exposed an unmet peer contract: `openapi-typescript@7.13.0` supports TypeScript `^5.x`. The project uses generated OpenAPI types as an architectural boundary, so an unsupported compiler pairing is not accepted merely because installation can continue. |

## Remaining Validation

- Re-run installation from the checked lockfile and the full F0 matrix when a
  foundational package, Node/pnpm declaration, or container digest changes.
- Select production runtime products, sizing, retention, and RPO/RTO only at
  their owning operational gate.
- Keep controlled provider validation separate from the application foundation.
  Its entitlement sub-gate passed with restricted raw evidence; later search,
  fidelity, resilience, quality, capacity, and cost probes still require
  cost-visible accounts and explicit authorization.
