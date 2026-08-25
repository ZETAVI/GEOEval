# Source Brief: Application Stack Options

- Change: [`define-application-architecture`](../proposal.md)
- Access date: 2026-08-24
- Evidence state: Primary-source comparison, architecture confirmation, and F0
  foundation validation complete
- Research owner: Architecture owner

## Recommendation

Use a **TypeScript modular-monolith workspace** with two source applications and
three independently executable processes:

- **Next.js App Router** for the public site and all signed-in role experiences;
- one **NestJS backend application** containing the business modules and two
  thin entrypoints: an HTTP API process and a standalone worker process for AI,
  event delivery, and other long-running work.

Use **PostgreSQL** as the one authoritative transactional datastore,
**Prisma ORM's current generally available major** for ordinary type-safe data
access and versioned SQL migrations, and explicit PostgreSQL SQL inside the same
transaction where locking, ledger, outbox, or reporting behavior requires it.
Use **BullMQ with Redis** as the first job-delivery mechanism, while keeping
business lifecycle state, retry identity, idempotency, and results in PostgreSQL.
Use **server-sent events (SSE)** for browser progress and notification hints,
and make every screen recover its truth from the API after reconnecting.

This recommendation is deliberately modern without making framework novelty an
architecture goal. It gives GEOEval one main implementation language and one
backend domain model while preserving separate scaling and failure boundaries
for the web experience, synchronous business API, and long-running AI workers.
It also keeps the confirmed paid-order and point-debit invariant inside one
database transaction rather than introducing a distributed transaction.

The current primary-source baseline is Next.js 16 and Prisma 7. Prisma 8 is
currently a release candidate, so it is not the implementation baseline. Exact
versions must be rechecked, compatibility-tested, and pinned in the workspace
lockfile when the foundation is created; architecture documentation does not use
an unbounded `latest` dependency.

## Decision constraints

The stack must support the approved architecture rather than redefine it:

1. one code-level owner for each business capability and no role- or page-owned
   duplicate business state;
2. one local transaction for the paid publishing order, point debit, and
   reliable post-commit fact;
3. durable, resumable, duplicate-safe AI and fulfilment work that outlives a
   browser request;
4. provider-specific adapters with retained raw evidence and a shared execution
   envelope;
5. a responsive, visually distinctive customer experience plus efficient
   supporting-role work areas;
6. server-side role, resource, lifecycle, action, and sensitive-view checks;
7. container-based self-hosting without requiring Kubernetes, microservices, or
   a serverless platform for the first commercial release;
8. one team-operable toolchain and a credible path to later isolated Python or
   provider services only when a proved capability requires one.

## Bounded option comparison

| Option | Strengths for GEOEval | Material costs and risks | Assessment |
| --- | --- | --- | --- |
| **A. Next.js + NestJS API and worker, all TypeScript** | One language and contract toolchain; explicit backend module boundaries; API and workers share domain rules; API and worker processes scale independently; PostgreSQL transaction can enforce money and paid-promise invariants | Three processes instead of one; requires disciplined contract generation and prevents Next.js from becoming a second backend | **Recommended. Best balance of delivery speed, cohesion, and operational clarity.** |
| **B. Next.js full stack plus a Node worker** | Smallest initial scaffold; excellent for a simple content site or narrow SaaS; fewer application processes | Route handlers, server actions, browser composition, domain authorization, transactions, and worker orchestration become easy to mix; supporting-role APIs and long-running flows create pressure on the web deployment; later extraction would touch many boundaries | Viable for a much smaller product, but too coupled for GEOEval's complete paid and operational lifecycle. |
| **C. Next.js + FastAPI + Celery, TypeScript and Python** | Strong Python AI and document-processing ecosystem; mature distributed task model; convenient if core local inference or Python-only libraries become central | Two languages, schema systems, package managers, test stacks, tracing setups, and runtime images from day one; business and authorization contracts cross a language boundary; no current approved requirement earns that cost | Keep as an extension path, not the initial foundation. Add an isolated Python capability only after a real dependency proves the need. |

The comparison is intentionally limited to complete combinations that could
deliver the approved product. A broad framework benchmark would add activity
without changing the decision.

## Proposed foundation by layer

| Layer | Proposed baseline | Ownership and guardrail |
| --- | --- | --- |
| Workspace | pnpm workspace; current supported Node.js LTS; strict TypeScript | Keep deployables and stable shared contracts together without publishing internal packages or adding Turborepo until build evidence earns it. |
| Web experience | Next.js App Router; React; Tailwind CSS; a small project-owned component system initially accelerated by shadcn/ui primitives | Next.js owns routing, rendering, layouts, accessibility, responsive presentation, and limited web composition. It does not own domain state, money rules, provider jobs, or a second authorization model. |
| Business application | NestJS modular monolith; REST/JSON and generated OpenAPI contract | Application use cases coordinate owner modules. Public contracts express business intent; controllers do not reach into foreign repositories. GraphQL is not required for the known journeys. |
| Background execution | Separate NestJS standalone entrypoint; BullMQ workers; Redis transport | Worker and API reuse the same owner modules and technical ports. Queue state is delivery state, never the evaluation, order, notification, or financial source of truth. |
| Transactional data | PostgreSQL; Prisma current GA; reviewed SQL migrations; explicit SQL escape hatch | PostgreSQL owns authoritative records, immutable snapshots, whole-point ledgers, outbox facts, and transactional assertions. Prisma is a productivity layer, not a substitute for database invariants. |
| Files and large evidence | S3-compatible object-storage port | Brand materials and large retained assets use stable application identities and metadata. The production provider remains an operational selection; local development may use a compatible local service. |
| Browser updates | SSE from the business API, with durable notification and progress reads | SSE is an optimization. Reconnect or a missed event triggers a normal API refresh, so realtime delivery cannot become business truth. WebSocket infrastructure is not justified initially. |
| External AI | Provider adapters behind the approved AI Execution envelope | SDKs and compatible protocols remain replaceable details. Business owners retain raw evidence, validated interpretation, lifecycle, and correlation identity. |
| Observability | Structured logs and metrics; OpenTelemetry server traces; Langfuse-compatible AI trace adapter evaluated separately | Trace export follows committed business work and is failure-isolated. Browser tracing remains deliberately limited because current OpenTelemetry browser instrumentation is still experimental. |
| Deployment | Container images for web, API, and worker behind one reverse proxy; PostgreSQL, Redis, and object storage operated as explicit dependencies | Start with one environment-sized deployment and scale processes independently only from evidence. Do not adopt Kubernetes, a service mesh, or per-module services in the first release. |

## Maintainability and delivery-efficiency refinement

The optimized foundation uses **capability modules with explicit internal
layers**, contained within two source applications and three runtime processes.
The source and deployment shape controls operating complexity; maintainability
comes primarily from responsibility layers, dependency direction, intermediate
contracts, and testable ports rather than from minimizing file or package count.

### Repository shape

The foundation spike should start from this bounded shape and change it only
when the spike produces contrary evidence:

```text
apps/
  web/                         Next.js experience
  backend/                     one NestJS modular-monolith source application
    src/
      bootstrap/
        api.ts                 HTTP and SSE entrypoint
        worker.ts              standalone background entrypoint
      orchestration/           material cross-module coordinators and processes
      modules/
        <capability>/
          public/              small owner facade and purpose contracts
          domain/              rules, states, policies, value objects
          application/         owner use cases and outbound ports
          adapters/            HTTP/job/event and persistence/provider adapters
      platform/                transaction, messaging, AI, assets, security,
                               audit and observability mechanics
    prisma/
      schema.prisma            datasource and generator
      models/                  schema files grouped by owning capability
      migrations/              one ordered migration history
packages/
  api-client/                  generated from the backend OpenAPI contract
  config/                      shared build, lint, and TypeScript policy only
  testkit/                     technical fixtures and integration harnesses
```

This is not a promise that every directory is created on day one. A package is
admitted only when it has the stable purpose above and an actual consumer. There
is no general `common`, `utils`, `shared`, `types`, `domain`, `services`, or
premature `ui` package. Business types and rules remain with their owning
backend module. Design tokens, primitives, and feature components remain inside
the one web application until a second real frontend consumer earns extraction.

The repository-level pnpm workspace is not coupled to Nest CLI monorepo mode.
Nest's official guidance says standard and monorepo modes have the same runtime
features and can be changed later. Keeping one standard backend application with
two small bootstraps avoids creating separate backend libraries and avoids
monorepo-specific compiler configuration before it provides measured value.

### Layered backend model

Capability ownership and internal layering solve different problems and are both
required:

| Layer | Owns | Must not own |
| --- | --- | --- |
| Inbound interface adapters | HTTP controllers, SSE endpoints, queue consumers, event handlers, request parsing, transport authentication context, and mapping to an application command or query | Business decisions, direct ORM access, cross-module sequencing, or provider SDK calls |
| Owner application layer | One capability's commands, queries, authorization intent, idempotency boundary, transaction request, domain invocation, and outbound ports | HTTP response formatting, vendor SDK types, another module's rules, or a generic workflow for unrelated capabilities |
| Domain layer | Business state transitions, invariants, policies, entities or aggregates where useful, value objects, and domain facts | NestJS decorators, Prisma records, BullMQ jobs, environment variables, provider responses, or presentation text |
| Outbound ports | The small behavior the application needs from persistence, time, identity, AI execution, assets, event delivery, or another stable boundary | Vendor configuration or a mirror of an entire SDK/repository API |
| Infrastructure adapters | Prisma repositories, PostgreSQL transaction implementation, BullMQ/outbox relay, AI-provider adapters, S3 storage, email, telemetry export, and technical mapping | Product meaning, lifecycle decisions, customer wording, or writes to an unowned business record |

The dependency direction is inbound adapter → application use case → domain and
ports; infrastructure implements ports and points back inward. Domain code stays
framework-independent. An HTTP DTO, BullMQ payload, Prisma record, provider
response, and customer view are separate representations connected by explicit
mappers where their semantics differ.

### Application orchestration as a bounded middle layer

Material journeys that span owners use a purpose-named coordinator in
`orchestration/`, such as starting an evaluation or submitting a paid publishing
order. This layer may:

- authenticate the actor, authorize entry into the whole use case, and establish
  correlation and idempotency; each owner still enforces its resource,
  lifecycle, action, and purpose-view boundary;
- obtain versioned purpose views from owner modules;
- open the approved transaction or long-running process boundary;
- call owner-provided commands in the required order;
- translate a committed owner fact into an outbox or process trigger;
- map owner outcomes into one application result.

It does **not** own brand, evaluation, wallet, order, fulfilment, or notification
records; contain their validation rules; query their private repositories; or
become a general `BusinessService`, workflow engine, or service locator. An L2
transaction coordinator may establish a narrow unit-of-work scope defined as an
application port; owner application operations use repositories bound to that
scope, while domain objects never receive a Prisma transaction or infrastructure
handle. Each owner performs its own assertions and writes. An L4 process
coordinator resumes from owner state rather than maintaining a second lifecycle.

This is the principal intermediate layer between role-facing delivery and
capability owners. It makes cross-module behavior visible and testable without
merging the modules that participate in it.

### Module and import rules

Each backend capability exposes a narrow `public` application surface containing
business commands, queries, result contracts, and purpose-specific read views.
Its domain rules, repositories, ORM access, provider adapters, controllers, and
job handlers remain private. A cross-module use case calls the owner operation;
it never imports the other module's repository or Prisma model.

Initial enforcement should use ordinary TypeScript paths and a small set of
linted restricted-import rules. Do not introduce a custom architecture compiler
or one npm package per domain. The full layer model is required for modules with
material lifecycle, money, history, authorization, AI interpretation, external
effects, or cross-module invariants. A simple reference-data or owner-local CRUD
module may combine domain and application code when it has no independent rule;
it may not reverse the dependency direction or put business logic in controllers
and repositories. Empty layers and one-method interfaces are not a quality goal.

The web application imports no backend module. It consumes the generated
`api-client` and its presentation-safe contracts. Backend entities, Prisma
types, internal enums, and database identifiers are not shared with the browser.
The OpenAPI document is the transport-contract source; generated code is never
hand-edited, and CI detects contract-generation drift.

Cross-module imports resolve only through the target module's `public` surface.
The public surface contains use-case intent and purpose views, not internal
entities or a broad service object. A shared abstraction is promoted to
`platform/` only when it represents stable technical semantics with several
consumers, such as transaction context, business clock, identifier generation,
outbox delivery, or audit correlation. Generic base repositories, base services,
untyped event payloads, and flag-driven utility functions are prohibited. The
platform layer does not own business configuration, role policy, state-machine
rules, user wording, or defaults that properly belong to a capability.

### Frontend layers

The single Next.js application also uses layers rather than a page-sized folder
tree or a generic component pool:

| Frontend layer | Responsibility | Boundary |
| --- | --- | --- |
| App shell and routes | Public versus signed-in shells, role navigation, layouts, route loading/error boundaries, and page assembly | Does not contain business mutations or duplicate feature logic |
| Page and flow composition | Arrange several features for one customer or supporting-role journey and coordinate page-local presentation state | Calls feature interfaces rather than reaching into generated transport or another feature's internals |
| Feature layer | One user intention such as selecting a brand, starting an evaluation, viewing progress, or reading a report; owns its query/mutation hooks, validation, mapping, and feature components | Does not own backend truth or become a cross-product global store |
| Presentation model and API gateway | Wrap the generated client, translate transport DTOs into feature-oriented view models, and normalize user-safe error outcomes | Does not reproduce backend domain rules or expose raw provider/Prisma types |
| Design system and UI primitives | Tokens, typography, spacing, interaction states, accessible primitives, charts, motion rules, and role-consistent visual language | Does not know brands, evaluations, points, orders, or permissions |

Routes depend on page composition, pages depend on features, and features depend
on their gateway and the design system. Feature internals do not import one
another; repeated multi-feature behavior is promoted only after its meaning is
stable. Server state stays with the query boundary, short-lived form state stays
with the feature, and a global client store is introduced only for a proved
cross-route interaction need such as the current-brand experience context.

### Selective read composition

Write behavior always passes through owner application and domain rules. Complex
reports, role homes, operational pools, and statistics may use purpose-specific
query services or rebuildable read projections so that every screen does not
hydrate several write aggregates. This is a selective read/write separation,
not full CQRS: it adds a read model only when composition, performance, or
role-specific field control earns it, and the read side never accepts writes. A
composed query uses owner-provided purpose queries or a projection built from
published facts; it does not bypass module ownership by joining arbitrary
private write tables. A materially consistent read across owners requires an
explicit contract rather than a hidden dashboard query.

### Database and migration workflow

Prisma's multi-file schema is generally available and may group models by the
same owning capabilities used in the code. GEOEval still keeps one datasource,
one generated client boundary, and one ordered migration history. Splitting
schema files is for ownership and review clarity; it does not create one
database, migration stream, or PostgreSQL namespace per module.

Every model, invariant, and migration has one owner. A change that touches
several owners has one migration reconciler. Generated SQL is reviewed before it
is accepted; production migration remains a CI/release action with backup and
rollback evidence. Cross-module foreign keys are allowed when they protect a
real invariant, but no foreign repository write is allowed merely because the
tables share a database.

### Local development and CI feedback

The normal local loop should run Next.js and the two backend entrypoints on the
host with watch mode while containers provide PostgreSQL, Redis, and compatible
object storage. A full container topology remains available for integration and
release rehearsal. This keeps ordinary code feedback fast without letting the
local path diverge from production dependencies.

The workspace should eventually expose two human-facing command levels after
they have been implemented and verified:

- a fast check for formatting, lint, type checking, module-boundary rules, and
  affected unit tests;
- a full verification for database and queue integration, generated-contract
  drift, application builds, migrations, browser flows, and the selected
  architecture spike evidence.

Framework-native fast compilers may be used only with an independent type-check
gate. Nest documents faster SWC builds but also additional monorepo configuration;
the foundation spike should compare the standard backend build and SWC without
assuming that a compiler benchmark outweighs configuration clarity. No project
command is added to `AGENTS.md` until it has actually passed in this repository.

External AI-provider tests are not part of every pull request. Deterministic
retained fixtures protect parsing, synthesis, scoring, formatting, and failure
behavior in ordinary CI; controlled provider calls run through an authorized,
cost-visible validation lane.

Tests follow the same layers:

- pure domain tests protect invariants and state transitions without NestJS or a
  database;
- application tests call use cases through port fakes and verify authorization,
  idempotency, orchestration, and failure mapping;
- adapter contract tests exercise Prisma/PostgreSQL, BullMQ/Redis, object
  storage, provider envelopes, and generated OpenAPI behavior;
- module integration tests prove public owner contracts and transaction or
  outbox boundaries;
- browser tests prove the real role journey, responsive presentation, recovery,
  and accessibility.

This test pyramid is a maintainability mechanism: failures identify the layer
that broke instead of forcing every rule through a slow end-to-end environment.

### Runtime artifact and configuration rules

Build the backend once and run its API or worker entrypoint from the same pinned
artifact. This prevents API and worker dependency drift while allowing separate
replica counts, resource limits, health checks, and restarts. The Next.js web
remains a separate artifact because its caching, rendering, and release behavior
is different.

Configuration is parsed and validated once at process startup and passed inward
through technical adapters. Business modules do not read environment variables,
SDK globals, or process state. Secrets, provider routes, queue names, timeouts,
and observability endpoints have one configuration owner and never become
frontend build-time values unless they are explicitly public.

### Initial request and work paths

```text
Browser
  -> reverse proxy
      -> Next.js web experience
      -> NestJS REST API and SSE
             -> PostgreSQL transaction and outbox
             -> Redis/BullMQ delivery hint
                    -> NestJS worker
                           -> AI, storage, payment, and later external adapters
                           -> PostgreSQL owner records
                           -> post-commit notification and projection work
```

The reverse proxy should present a coherent same-site product boundary. Session
and account authority belong to Identity and Access in the business application,
using secure HTTP-only browser credentials; the exact authentication and SMS
provider library remains a slice decision. Next.js may perform server-side reads
or a narrow presentation composition, but it must not create a parallel session,
role, business-write, or database-access authority.

## Why the recommended components fit

### Next.js is the experience framework, not the whole product architecture

Current Next.js documentation supports App Router, TypeScript, Node.js and Docker
deployment with the complete feature set, streaming, server and client
components, and standalone output. That fits a public product entry plus
responsive role-specific signed-in experiences. Self-hosted streaming requires
the reverse proxy not to buffer responses, and multi-instance caching requires
coordination; the foundation spike must test the actual proxy rather than infer
support from configuration.

The product nevertheless contains durable AI work, money, operational claiming,
notifications, and several role-specific business APIs. Keeping those in a
NestJS business application makes their ownership and test boundaries clearer
than using Next.js route files as the primary domain container.

### NestJS provides one modular backend with two runtime shapes

NestJS modules can group cohesive providers and expose deliberate imports and
exports. Its standalone application context supports non-HTTP jobs while reusing
the same modules, and its official integrations cover OpenAPI, BullMQ, and SSE.
This lets API and worker execution share business rules without becoming one
process or duplicating the domain in a separate job project.

The first deployment remains a modular monolith. Nest modules are logical
ownership boundaries, not network services, and framework dependency injection
does not justify an interface or event for every local class.

### PostgreSQL remains the authority; Prisma remains replaceable

PostgreSQL provides row-level locking, transactions, constraints, and JSONB
support needed by the known consistency and evidence boundaries. Prisma 7 is the
current generally available line and supplies type-safe ordinary access plus a
customizable SQL migration history. Prisma documents raw and typed SQL escape
hatches, including raw operations inside a transaction. Consequential ledger,
locking, outbox, or aggregate queries must be reviewed from their SQL behavior
and can use explicit SQL when the generated API is not sufficiently clear.

This avoids two opposite mistakes: hand-writing every simple query, or pretending
that an ORM alone enforces financial and lifecycle invariants.

The shared database must not become shared write ownership. Owner modules keep
their repositories private; a material coordinator passes one transaction
context through owner-provided business operations, and those owners perform
their own assertions and writes. Explicit SQL remains inside the owning module
or narrowly scoped transaction infrastructure rather than becoming a generic
cross-domain repository.

### BullMQ transports work; it does not own work meaning

BullMQ supplies Redis-backed distributed workers, retries, concurrency, worker
recovery, and explicit job identities. Its documentation also states that the
worst case is at-least-once delivery and recommends idempotent, simple jobs.
GEOEval therefore uses business identities and PostgreSQL invariants as the
duplicate-safety boundary. A queue retry is an execution attempt, not another
evaluation sample, article, debit, order, or notification.

For the first release, Redis is justified by reliable background delivery and
realtime assistance rather than by speculative application caching. If later
operational evidence shows that a PostgreSQL-backed queue meets the same
reliability and support needs with lower cost, transport replacement remains
possible because the business state is not stored in BullMQ.

## Explicitly deferred or rejected for the initial foundation

- microservices, per-domain databases, event sourcing, full CQRS, Kafka, a
  generic workflow engine, Kubernetes, and a service mesh;
- GraphQL, WebSockets, a search cluster, or a general application cache without
  a measured product need;
- business database access from the Next.js experience;
- serverless functions as the primary runtime for long AI and fulfilment work;
- Python as a second general backend before a Python-only product capability is
  demonstrated;
- Prisma 8 while it remains a release candidate, or any unpinned `latest`
  production dependency;
- self-hosting every observability product by default; privacy, retention,
  operating cost, and failure isolation must be compared first.

## Architecture review result

The scoped stack proposal is **ready with follow-up**. It preserves the existing
capability owners, dependency direction, one-database transaction boundary, and
separation between business truth and delivery mechanisms. It does not require
microservices or a second general backend language.

No must-fix boundary issue was found. The revised review corrects the earlier
overemphasis on structural minimalism: maintainability is now carried by
capability-local domain and application layers, explicit ports and adapters,
bounded cross-module orchestration, frontend feature and presentation layers,
and layer-matched tests. UI primitives still remain inside the single web
application because layering does not require a separately published package.
The review also makes owner authorization inside orchestration, an application-
level unit-of-work port, and owner-fed read composition explicit. The material
residual risks are an orchestration layer becoming a new business owner, ports
mirroring whole vendor APIs, layers degenerating into pass-through classes, the
shared database eroding owner-only writes, duplicate queue delivery, self-hosted Next.js
streaming or cache behavior, and adopting a framework or build mode without a
tested compatibility set. Restricted imports, private repositories, outbox and
business idempotency, the foundation spike, and the pinned-version gate are the
required follow-ups. Controlled provider evidence remains a separate approval
gate rather than a stack-review finding.

## Foundation spike and acceptance evidence

Before implementation authorization, a small throwaway or replaceable foundation
spike must disprove the main integration risks without building product screens:

1. build and run pinned Next.js, NestJS API, and NestJS worker processes from one
   pnpm workspace and container topology;
2. generate and consume one OpenAPI contract without allowing web code to import
   backend internals;
3. commit one representative PostgreSQL transaction containing owner assertions,
   an append-only whole-point posting, a paid-order record, and an outbox fact;
   prove rollback and duplicate submission behavior;
4. deliver an outbox-backed BullMQ job, stop and resume a worker, and show that
   duplicate delivery produces only one business effect;
5. stream one background progress update through the real reverse proxy, then
   reconnect and recover the same durable state without relying on the missed
   event;
6. preserve formatted external-answer evidence through storage and API output;
7. correlate API, worker, and provider attempts through OpenTelemetry-compatible
   identities while deliberately disabling telemetry export and proving that
   business state still commits;
8. rehearse a forward and rollback-safe development migration on disposable
   representative data, and record the production migration and backup gate.

Passing this spike establishes technical compatibility, not commercial or
provider readiness. The controlled five-platform account matrix in the separate
[external evidence brief](first-slice-external-evidence.md) remains required
before the first real evaluation slice is authorized.

## Primary evidence

| Claim | Primary source | Current implication |
| --- | --- | --- |
| Next.js App Router supports a current TypeScript baseline and Node.js self-hosting; Node and Docker deployments retain the complete feature set. | [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [deployment](https://nextjs.org/docs/app/getting-started/deploying), [self-hosting](https://nextjs.org/docs/app/guides/self-hosting), and [standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) | Use a Node container rather than static export; test proxy streaming and multi-instance cache behavior. |
| NestJS supplies modular composition, standalone non-network application contexts, official BullMQ integration, SSE, and OpenAPI generation. | [NestJS modules](https://docs.nestjs.com/modules), [standalone applications](https://docs.nestjs.com/standalone-applications), [queues](https://docs.nestjs.com/techniques/queues), [SSE](https://docs.nestjs.com/techniques/server-sent-events), and [OpenAPI](https://docs.nestjs.com/openapi/introduction) | Reuse one backend domain model across API and separately executable workers. |
| PostgreSQL supports explicit row locking and JSON processing in the current supported documentation. | [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html) and [JSON functions](https://www.postgresql.org/docs/current/functions-json.html) | Keep strong owner invariants and flexible retained response fields in one authoritative datastore. |
| Prisma 7 is current GA while Prisma 8 is RC; Prisma Migrate produces editable SQL history and recommends automated production deployment; raw SQL can participate in transactions. | [Prisma ORM overview](https://www.prisma.io/docs/orm), [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate), [production migrations](https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-migrations-from-a-local-environment), and [raw queries](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries) | Pin the GA line, review generated SQL, deploy migrations through CI, and use explicit SQL for material database behavior when needed. |
| BullMQ is Redis-backed, supports retries and custom job identities, and can deliver at least once in the worst case. | [BullMQ overview](https://docs.bullmq.io/), [job IDs](https://docs.bullmq.io/guide/jobs/job-ids), [retries](https://docs.bullmq.io/guide/retrying-failing-jobs), [idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs), and [production connections](https://docs.bullmq.io/guide/going-to-production) | Treat jobs as duplicate-prone delivery and protect every consequential effect with business idempotency. |
| FastAPI recommends an external task system such as Celery for heavy work; Celery has stable distributed-worker and broker support. | [FastAPI background-task caveat](https://fastapi.tiangolo.com/tutorial/background-tasks/) and [Celery 5.6 introduction](https://docs.celeryq.dev/en/stable/getting-started/introduction.html) | The Python alternative is technically viable but does not outweigh its second-language cost for current requirements. |
| Tailwind has a maintained Next.js integration, and shadcn/ui supports Next.js and monorepo component ownership. | [Tailwind framework guides](https://tailwindcss.com/docs/installation/framework-guides) and [shadcn/ui Next.js setup](https://ui.shadcn.com/docs/installation/next) | Build a project-owned visual system from composable primitives rather than adopting a generic admin theme. |
| OpenTelemetry JavaScript server traces and metrics are stable, while browser instrumentation remains experimental. | [OpenTelemetry JavaScript status](https://opentelemetry.io/docs/languages/js/) | Establish server correlation first and keep browser instrumentation bounded. |
| pnpm has native workspace support and an explicit local workspace dependency protocol. | [pnpm workspaces](https://pnpm.io/workspaces) | A simple workspace is sufficient; no additional monorepo orchestrator is required initially. |
| Nest standard and monorepo modes have the same framework capabilities and can be changed later; monorepo SWC adds configuration beyond standard mode. | [NestJS workspaces](https://docs.nestjs.com/cli/monorepo) and [NestJS SWC](https://docs.nestjs.com/recipes/swc) | Use one standard backend source application and prove any faster compiler setup before adopting its extra configuration. |
| Prisma multi-file schemas are GA and official guidance recommends grouping model files by domain while retaining the migrations directory beside the main schema. | [Prisma schema location](https://www.prisma.io/docs/orm/prisma-schema/overview/location) | Group model definitions by owning capability without creating independent migration histories. |
| Next.js can transpile local workspace packages directly. | [Next.js `transpilePackages`](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages) | Keep the UI and generated client packages small and explicit; do not add a custom bundling layer initially. |

## Confirmation state

The product owner has stated that there is no incumbent language or framework
constraint, prefers a mature modern solution, and confirmed the recommended
direction on 2026-08-24. The confirmed material architecture choice is one
TypeScript workspace with a Next.js web application and one NestJS backend
application deployed through separate API and worker entrypoints, plus
PostgreSQL, Prisma current GA, Redis/BullMQ, SSE, and an S3-compatible storage
boundary.

On 2026-08-25, the product owner also confirmed the layered maintainability
refinement: capability-owned backend layers, bounded application orchestration,
ports and adapters, selective read composition, layered frontend features and
presentation mapping, and proportionate abstraction rather than ceremonial
layers.

Confirmation selects the foundation but does not prove it. Dependency
installation, provider activation, and product implementation still require the
architecture gate, pinned compatibility set, and authorized foundation spike.
