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

| Decision                         | Choice                                                                                                                                                                                                                                                                                                                          | Rationale                                                                                                                                                                | Owner                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Source and runtime shape         | One TypeScript pnpm workspace; Next.js web plus one NestJS backend source application built once and run through API and worker entrypoints                                                                                                                                                                                     | Keeps one backend business model while isolating long-running work and web rendering operationally                                                                       | Product owner and architecture owner |
| Internal layered architecture    | Capability modules use inbound adapters, owner application use cases, framework-independent domain rules, outbound ports, and infrastructure adapters; material cross-module journeys use a bounded orchestration layer                                                                                                         | Provides clear intermediate responsibilities and replaceable external boundaries without splitting the modular monolith                                                  | Product owner and architecture owner |
| Abstraction threshold            | Require full layering for lifecycle, money, history, authorization, AI, external-effect, or cross-module behavior; allow simple owner-local modules to collapse empty layers while preserving dependency direction                                                                                                              | Prevents both controller/repository business logic and ceremonial pass-through abstractions                                                                              | Product owner and architecture owner |
| Business and data authority      | Capability-owned NestJS modules over one PostgreSQL datastore; owner-private repositories; Prisma current GA for ordinary access with explicit SQL for material database behavior                                                                                                                                               | Supports local transactions, snapshots, ledgers, and maintainable ownership without distributed consistency                                                              | Product owner and architecture owner |
| Background and browser delivery  | Outbox-backed Redis/BullMQ delivery with business idempotency; SSE as a recoverable hint over durable API state                                                                                                                                                                                                                 | Makes long work resumable without treating queues or connections as business truth                                                                                       | Architecture owner                   |
| AI execution envelope            | Every consequential AI purpose carries immutable owner input, purpose and version identity, bounded attempts, complete provider evidence, schema plus owner semantic validation, usage and cost evidence, and a purpose-specific regression set; only the business owner accepts the result                                     | Reuses traceable technical mechanics without turning an Agent or observability tool into the owner of samples, reports, content, or commercial state                     | Product owner and architecture owner |
| Provider adapter boundary        | Versioned route policy and capability descriptors select one-attempt provider/protocol adapters; lossless normalization adds comparable indexes while retaining complete provider evidence; fallback stays outside adapters                                                                                                     | Preserves provider-specific evidence without leaking provider branches into business use cases                                                                           | Product owner and architecture owner |
| DeepSeek service routes          | TokenHub service policy recognizes only bare platform IDs, while customer-visible evaluation is fixed to `deepseek-v4-flash`; Alibaba parser fallback uses Model Studio alias `deepseek-v4-flash`; official-direct, vendor-endpoint, and unapproved snapshot routes are excluded                                                | Enforces the confirmed cloud-platform service route and consumer-aligned sampling choice without letting a similar model name silently change provenance or behavior     | Product owner and architecture owner |
| Evaluation model posture         | Customer-visible sampling uses the consumer-aligned set `deepseek-v4-flash`, Doubao Seed 2.0 Lite, `qwen3.7-flash`, ERNIE 4.5 Turbo, and `hy3`; stronger models remain purpose-specific candidates                                                                                                                              | Reproduces the ordinary default/free product posture instead of optimizing the benchmark with flagship models                                                            | Product owner and architecture owner |
| Web contract                     | REST/OpenAPI is authoritative at the transport boundary; the web consumes a generated client and never backend entities, repositories, or Prisma types                                                                                                                                                                          | Eliminates handwritten duplicate contracts and prevents Next.js from becoming a second backend                                                                           | Architecture owner                   |
| Frontend layering                | Route shell and page composition depend on feature use cases, presentation/API mapping, and an internal design system; features do not import one another's internals                                                                                                                                                           | Keeps role experiences coherent and prevents page components or a global store from becoming the frontend business layer                                                 | Architecture owner                   |
| Read composition                 | Use purpose-specific query services or projections for complex reports, role homes, and operational pools; keep all writes with owner application/domain rules                                                                                                                                                                  | Avoids loading write aggregates for every view without introducing full CQRS                                                                                             | Architecture owner                   |
| Shared-code boundary             | Admit only the generated API client, multi-application engineering configuration, and technical test fixtures; keep the design system inside the single web application and prohibit generic common, utils, shared-types, domain, or services packages                                                                          | Keeps reuse semantic, avoids premature UI extraction, and prevents a hidden coupled core                                                                                 | Architecture owner                   |
| Schema and migrations            | Prisma model files may be grouped by owning capability, but the product keeps one datasource and one ordered migration history with one reconciler per change                                                                                                                                                                   | Improves review and parallel work without creating conflicting migration authorities                                                                                     | Architecture owner                   |
| Delivery efficiency              | Fast host watch loop over containerized dependencies, explicit fast and full verification levels, deterministic AI fixtures, and one pinned backend artifact for API and worker                                                                                                                                                 | Shortens normal feedback while preserving integration and release evidence                                                                                               | Architecture owner                   |
| First implementation slice       | Deliver terminal-customer identity and brand entry through one fixed-question, five-platform evaluation, durable background processing, complete eligible report, and notification; an unchanged failed run retries within the same run from retained evidence, while changed evaluation facts require a new definition and run | Proves the product's first real value and its most consequential snapshot, AI, long-process, authorization, failure, and presentation boundaries before dependent slices | Product owner and architecture owner |
| Operational and quality baseline | Separate environments; immutable release artifacts; explicit migrations; tested recovery; validated secrets; health and graceful shutdown; duplicate-safe background work; failure-isolated observability; layered verification; and an eight-part foundation spike                                                             | Makes implementation and release claims depend on operational evidence without selecting every production vendor or scaling mechanism upfront                            | Product owner and architecture owner |

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

- Confirmed: the F0 compatibility set is pinned in the lockfile and passed the
  foundation matrix; TypeScript was explicitly revised from 7.0.2 to 5.9.3
  after an unmet `openapi-typescript` peer contract.
- Assumption: the initial operating environment can run separate web, API, and
  worker processes plus PostgreSQL, Redis, and compatible object storage; exact
  sizing and managed-versus-self-hosted choices remain operational decisions.
- Open: controlled five-platform accounts, model routes, quotas, latency, cost,
  and response evidence must pass the existing external validation matrix.
- Open: the provider route map, no-secret configuration references, adapter
  boundary, evidence semantics, and DeepSeek service-class constraints are
  confirmed; exact customer-visible model selection, account entitlement,
  behavior, cost, and quality still require controlled validation.
- Open: authentication/SMS, production object storage, observability destination,
  and hosting products are selected only when their owning slice or operational
  gate has current evidence.
- Confirmed: the current-GA compatibility set and bounded F0 matrix passed and
  were reconciled into the application foundation. Rotated credentials, account
  details, external-call budget, secure raw-evidence location, and E0
  authorization remain required before real calls.

## Confirmation and Next Gate

- Confirmation: Technology stack and deployment shape confirmed by the product
  owner on 2026-08-24; the layered module, orchestration, ports/adapters,
  frontend, read-composition, and abstraction-threshold model was confirmed on
  2026-08-25; the first evaluation-slice owner contracts, collaboration
  sequence, and bounded retry lifecycle were confirmed on 2026-08-25; the
  minimum operational and quality baseline was confirmed on 2026-08-25; the
  separately authorized parallel F0/E0 sequencing was confirmed on 2026-08-25;
  the provider-adapter, evidence-normalization, fallback, and DeepSeek cloud-
  platform route boundaries were confirmed on 2026-08-25; the consumer-aligned
  sampling set, separate stronger-purpose pool, and F0 project-local/Compose
  execution were confirmed on 2026-08-25.
- Next action: obtain explicit approval for the named E0 endpoints, minimal
  entitlement payloads, restricted evidence location, stop conditions, and
  CNY 5 entitlement sub-ceiling; then execute progressively. The complete E0
  CNY 100 ceiling remains unapproved.
- Confirmation required before: any real provider call, service activation,
  quota change, production-data use, or product implementation.
