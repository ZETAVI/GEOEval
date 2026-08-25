# Decision Brief: GEOEval Application Architecture Foundation

## Outcome

Give the team one maintainable, efficient application foundation that can
deliver the real evaluation-to-report slice and later commercial journeys
without duplicating business truth, splitting into premature services, or
making ordinary development depend on heavy architecture ceremony.

## Scope

- In: capability-owned modular monolith, application and process shape,
  datastore authority, background and realtime boundaries, cross-application
  contract, repository-sharing rules, migration ownership, and foundation
  evidence gate.
- Out: exact package patch versions, final tables and APIs, final hosting and
  storage vendors, provider activation, production resource sizing, page design,
  and business-feature implementation.

## Decisions

| Decision | Choice | Rationale | Owner |
| --- | --- | --- | --- |
| Source and runtime shape | One TypeScript pnpm workspace; Next.js web plus one NestJS backend source application built once and run through API and worker entrypoints | Keeps one backend business model while isolating long-running work and web rendering operationally | Product owner and architecture owner |
| Internal layered architecture | Capability modules use inbound adapters, owner application use cases, framework-independent domain rules, outbound ports, and infrastructure adapters; material cross-module journeys use a bounded orchestration layer | Provides clear intermediate responsibilities and replaceable external boundaries without splitting the modular monolith | Product owner and architecture owner |
| Abstraction threshold | Require full layering for lifecycle, money, history, authorization, AI, external-effect, or cross-module behavior; allow simple owner-local modules to collapse empty layers while preserving dependency direction | Prevents both controller/repository business logic and ceremonial pass-through abstractions | Product owner and architecture owner |
| Business and data authority | Capability-owned NestJS modules over one PostgreSQL datastore; owner-private repositories; Prisma current GA for ordinary access with explicit SQL for material database behavior | Supports local transactions, snapshots, ledgers, and maintainable ownership without distributed consistency | Product owner and architecture owner |
| Background and browser delivery | Outbox-backed Redis/BullMQ delivery with business idempotency; SSE as a recoverable hint over durable API state | Makes long work resumable without treating queues or connections as business truth | Architecture owner |
| AI execution envelope | Every consequential AI purpose carries immutable owner input, purpose and version identity, bounded attempts, complete provider evidence, schema plus owner semantic validation, usage and cost evidence, and a purpose-specific regression set; only the business owner accepts the result | Reuses traceable technical mechanics without turning an Agent or observability tool into the owner of samples, reports, content, or commercial state | Product owner and architecture owner |
| Web contract | REST/OpenAPI is authoritative at the transport boundary; the web consumes a generated client and never backend entities, repositories, or Prisma types | Eliminates handwritten duplicate contracts and prevents Next.js from becoming a second backend | Architecture owner |
| Frontend layering | Route shell and page composition depend on feature use cases, presentation/API mapping, and an internal design system; features do not import one another's internals | Keeps role experiences coherent and prevents page components or a global store from becoming the frontend business layer | Architecture owner |
| Read composition | Use purpose-specific query services or projections for complex reports, role homes, and operational pools; keep all writes with owner application/domain rules | Avoids loading write aggregates for every view without introducing full CQRS | Architecture owner |
| Shared-code boundary | Admit only the generated API client, multi-application engineering configuration, and technical test fixtures; keep the design system inside the single web application and prohibit generic common, utils, shared-types, domain, or services packages | Keeps reuse semantic, avoids premature UI extraction, and prevents a hidden coupled core | Architecture owner |
| Schema and migrations | Prisma model files may be grouped by owning capability, but the product keeps one datasource and one ordered migration history with one reconciler per change | Improves review and parallel work without creating conflicting migration authorities | Architecture owner |
| Delivery efficiency | Fast host watch loop over containerized dependencies, explicit fast and full verification levels, deterministic AI fixtures, and one pinned backend artifact for API and worker | Shortens normal feedback while preserving integration and release evidence | Architecture owner |
| First implementation slice | Deliver terminal-customer identity and brand entry through one fixed-question, five-platform evaluation, durable background processing, complete eligible report, and notification; an unchanged failed run retries within the same run from retained evidence, while changed evaluation facts require a new definition and run | Proves the product's first real value and its most consequential snapshot, AI, long-process, authorization, failure, and presentation boundaries before dependent slices | Product owner and architecture owner |
| Operational and quality baseline | Separate environments; immutable release artifacts; explicit migrations; tested recovery; validated secrets; health and graceful shutdown; duplicate-safe background work; failure-isolated observability; layered verification; and an eight-part foundation spike | Makes implementation and release claims depend on operational evidence without selecting every production vendor or scaling mechanism upfront | Product owner and architecture owner |

## Acceptance Boundaries

- The web cannot import backend implementation or access the business database.
- Domain rules cannot import NestJS, Prisma, BullMQ, provider SDKs, environment
  access, or presentation types.
- Inbound adapters cannot contain business decisions or call repositories
  directly; infrastructure adapters cannot decide product lifecycle or wording.
- A cross-module coordinator can own sequencing and a transaction/process
  boundary, but cannot become the owner of participating business records or
  rules.
- Composite-use-case authorization cannot replace each owner's resource,
  lifecycle, action, and purpose-view checks; a unit-of-work scope cannot leak a
  Prisma transaction into domain objects.
- A composed read uses owner purpose queries or projections from published
  facts; it cannot bypass ownership through arbitrary cross-module write-table
  joins.
- API and worker execute the same owner modules from the same pinned backend
  artifact without duplicating configuration or business rules.
- A module cannot write another module's records through a foreign repository;
  a material cross-module transaction calls owner-provided operations.
- Queue redelivery, SSE loss, and telemetry failure cannot create a second
  business effect or erase a committed business result.
- The foundation spike proves build, generated contract, transaction rollback,
  duplicate delivery, reconnect recovery, migration, and observability-isolation
  behavior before product implementation is authorized.
- The first release does not require microservices, Kubernetes, Kafka,
  WebSockets, GraphQL, a generic workflow engine, or a second general backend
  language.

## Assumptions and Open Questions

- Assumption: exact framework, Node.js, ORM, and build-tool versions are selected
  from a tested current-GA compatibility set and pinned in the lockfile at the
  foundation spike.
- Assumption: the initial operating environment can run separate web, API, and
  worker processes plus PostgreSQL, Redis, and compatible object storage; exact
  sizing and managed-versus-self-hosted choices remain operational decisions.
- Open: controlled five-platform accounts, model routes, quotas, latency, cost,
  and response evidence must pass the existing external validation matrix.
- Open: the provider route map and no-secret configuration references are
  recorded; the proposed capability-descriptor, one-attempt-adapter, lossless
  evidence, and fallback-policy boundaries require confirmation before they
  become implementation contracts.
- Open: authentication/SMS, production object storage, observability destination,
  and hosting products are selected only when their owning slice or operational
  gate has current evidence.
- Open: the current-GA compatibility candidate, local readiness audit, and
  foundation work packages are prepared; their execution approval,
  controlled-provider route sheets, injected credentials, and external-call
  budget remain required before their respective runs.

## Confirmation and Next Gate

- Confirmation: Technology stack and deployment shape confirmed by the product
  owner on 2026-08-24; the layered module, orchestration, ports/adapters,
  frontend, read-composition, and abstraction-threshold model was confirmed on
  2026-08-25; the first evaluation-slice owner contracts, collaboration
  sequence, and bounded retry lifecycle were confirmed on 2026-08-25; the
  minimum operational and quality baseline was confirmed on 2026-08-25; the
  separately authorized parallel F0/E0 sequencing was confirmed on 2026-08-25.
- Next action: confirm the provider-adapter and evidence boundary, rotate the
  exposed credentials, complete the non-secret route sheet, then obtain explicit
  execution authorization for the foundation spike and separately for cost-
  visible provider validation.
- Confirmation required before: dependency installation, foundation-spike
  execution, or product implementation; pass the remaining architecture gate.
