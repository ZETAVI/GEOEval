# Source Brief: Foundation Compatibility Candidate

- Change: [`define-application-architecture`](../proposal.md)
- Access date: 2026-08-25
- Evidence state: Current official and registry audit complete; installation,
  build, runtime, and lockfile evidence pending explicit authorization
- Research owner: Architecture owner

## Recommendation

Use one current-GA trial set for the bounded foundation spike: Node.js 24 LTS,
pnpm 11, Next.js 16 with React 19, NestJS 11, Prisma 7, BullMQ 6,
PostgreSQL 18, and Redis 8.2 Extended. Pin exact package versions and a lockfile
only when the spike starts. The candidate becomes the project baseline only when
the whole set installs, builds, migrates, starts through the approved process
entrypoints, and passes the spike evidence matrix together.

Do not adopt Prisma 8 while its official documentation describes it as a release
candidate. Do not select individual dependencies merely because each package
supports Node.js 24 in isolation; the combined web, backend, ORM, queue, compiler,
and production-build behavior is the actual decision boundary.

## Candidate Set

| Component | Candidate observed on 2026-08-25 | Decision state |
| --- | --- | --- |
| Node.js | latest 24.x LTS patch; official release page showed 24.19.0 | candidate; local machine has 24.12.0 and needs an authorized update or pinned container before exact reproduction |
| pnpm | 11.23.0 through Corepack | candidate; local machine has 11.9.0 |
| TypeScript | 7.0.2 | trial candidate; new compiler major must pass Next, Nest, Prisma generation, decorator, build, and test-tool checks before acceptance |
| Next.js / React | Next.js 16.3.2; React and React DOM 19.2.8 | candidate; use App Router and prove standalone production output without adding a custom server |
| NestJS | core/common/platform 11.2.1 line; Swagger 11.4.7; Terminus 11.1.1; Config 4.0.4 | candidate; API and standalone worker must consume the same owner modules from one backend build |
| Prisma / PostgreSQL driver | Prisma and Client 7.9.1; adapter-pg 7.9.1; pg 8.23.0 | candidate; Prisma 7 requires the PostgreSQL driver adapter and ESM configuration |
| BullMQ | 6.2.0 with the Redis backend | candidate; business idempotency remains outside queue retention and job identity |
| PostgreSQL | 18.6 current supported minor | candidate for disposable integration and staging; production product remains an operational choice |
| Redis | 8.2.8 Extended line | candidate because the 8.2 line has extended support; validate BullMQ behavior rather than relying on server availability alone |

Exact transitive packages, linting, testing, generated-client, telemetry, and
container-image versions are selected inside the spike and recorded by the
lockfile and evidence output, not guessed in this brief.

## Current Local Readiness

| Check | Observed state | Consequence |
| --- | --- | --- |
| Checkout | `codex/design-evaluation-provider-adapters` at `5899a035cbc2d1be14f3c57667729587a230e31d`, clean at the start of the 2026-08-25 P0 refresh | Continue preparation in this worktree; do not switch, reset, merge, or overwrite outside an approved integration step. |
| Application manifests | No `package.json`, pnpm workspace, lockfile, or compose file exists; `.env.example` and a local ignored `.env` now exist | The spike must create the first application skeleton deliberately; there is no legacy dependency contract to preserve. Never treat the local credential file as implementation authorization. |
| Node and package manager | Node 24.12.0, Corepack 0.34.5, pnpm 11.9.0; fnm also retains Node 24.11.1 | Suitable major line, but not the proposed exact patch set; do not claim reproducibility yet. |
| Container runtime | Docker CLI 29.4.0 can reach the OrbStack daemon outside the restricted tool sandbox | Use project-named disposable PostgreSQL and Redis services without touching unrelated containers. |
| Local images | Redis 7 and 7.4 images exist; no PostgreSQL or candidate Redis 8.2 image was found | The spike still requires separately authorized image downloads. |
| Candidate image manifests | Docker Hub exposed `postgres:18.6-bookworm` at manifest digest `sha256:1c59e2c3c818eaa0f0628f695b36e7c9e362d6b219b36a54a32df645cbd7e1af` and `redis:8.2.8` at `sha256:2f7462b9e93e0a7ae2edf3a0a0babc8a4d29f8bfc50849b906b7caaef925edc1` on 2026-08-25 | Recheck and explicitly pin the accepted digest at F0 start because tags and manifests can change; this read-only audit did not download image layers. |
| Provider configuration | The local ignored `.env` has the eight canonical Ark, Model Studio, Qianfan, TokenHub, and Langfuse references, is mode `0600`, and is not tracked; no value was printed during readiness checks | Values exposed in conversation must still be rotated before E0. Account, region, route, quota, budget, and secure evidence location remain required. |

No credential value was printed or recorded in this source brief during the
refresh.

## Primary Evidence

| Claim | Primary source or controlled read | Design implication |
| --- | --- | --- |
| Node.js 24 is LTS while Node.js 26 is Current; production should use an LTS line. | [Node.js releases](https://nodejs.org/en/about/previous-releases) | Pin the current Node 24 LTS patch rather than adopting the newer Current line. |
| Next.js 16 requires Node.js 20.9 or newer and supports full functionality as a Node.js server or Docker deployment. | [Next.js installation](https://nextjs.org/docs/app/getting-started/installation) and [deployment](https://nextjs.org/docs/app/getting-started/deploying) | Node 24 is eligible; prove normal and standalone production builds in the selected repository shape. |
| NestJS 11 requires Node.js 20 or newer and recommends the latest LTS. | [NestJS 11 migration guide](https://docs.nestjs.com/migration-guide) | Node 24 is the shared supported runtime line for Next, Nest, and Prisma. |
| Prisma 7 is current GA and Prisma 8 is RC; current Prisma supports Node 24 and requires a driver adapter for direct connections. | [Prisma overview](https://docs.prisma.io/docs/orm) and [system requirements](https://docs.prisma.io/docs/orm/reference/system-requirements) | Use Prisma 7 plus `@prisma/adapter-pg`; keep Prisma 8 outside the foundation until GA and a separate compatibility decision. |
| PostgreSQL 18.6 is a supported current minor and PostgreSQL recommends the current minor of a supported major. | [PostgreSQL versioning policy](https://www.postgresql.org/support/versioning/) | Use the current PostgreSQL 18 minor for the disposable candidate rather than starting a new product on an unsupported line. |
| Redis 8.2 is an Extended GA line with a longer support window. | [Redis Open Source version management](https://redis.io/docs/latest/operate/oss_and_stack/install/version-mgmt/) | Prefer the current 8.2 patch for the candidate and validate BullMQ 6 against it. |
| BullMQ uses Redis connections, supports current Redis client adapters, and may process delivery more than once under failure. | [BullMQ connections](https://docs.bullmq.io/guide/connections) and [idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs) | Exercise the Redis backend, duplicate delivery, connection loss, and durable owner idempotency in the spike. |
| Current package versions and engine/peer ranges were observed through read-only `npm view` calls. | npm registry reads on 2026-08-25 | Registry presence establishes a candidate package identity, not combined compatibility or runtime correctness. |
| Candidate PostgreSQL and Redis image tags and multi-platform manifest digests exist in the official Docker Hub repositories. | [PostgreSQL official image](https://hub.docker.com/_/postgres) and [Redis official image](https://hub.docker.com/_/redis); read-only registry audit on 2026-08-25 | Record the observed candidates now, but recheck and pin accepted digests only when F0 is authorized. |

## Rejected or Deferred Choices

| Choice | Decision | Reason |
| --- | --- | --- |
| Node.js 26 Current | Defer | It is newer than the current LTS line and provides no first-slice requirement that outweighs reduced ecosystem maturity. |
| Prisma 8 RC | Reject for foundation | Release-candidate status is unnecessary risk for the first production architecture. |
| Existing local Redis 7 image as the project baseline | Defer | It can support an isolated experiment, but it would not validate the selected current extended line. |
| BullMQ PostgreSQL backend | Reject for current spike | The confirmed stack deliberately keeps PostgreSQL as business authority and Redis as delivery transport; changing the backend would reopen the stack decision without a demonstrated need. |
| TypeScript 7 accepted without a spike | Reject | Package minimum ranges do not prove decorator, generator, build, lint, and test compatibility across the complete set. |

## Remaining Validation

- Obtain explicit approval before creating application manifests, downloading
  dependencies or container images, or running the foundation spike.
- Recheck the observed official container tags and pin their accepted image
  digests in the F0 evidence record rather than relying on floating tags.
- Prove the TypeScript 7 candidate. If it fails a real compatibility check, stop
  and record the narrow incompatibility before selecting a different supported
  compiler line.
- Keep controlled provider validation separate from dependency installation.
  It requires cost-visible commercial accounts and explicit secret injection.
