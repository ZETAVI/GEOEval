# Proposed Implementation Plan: Foundation and First Evaluation Slice

- Change: [`define-application-architecture`](proposal.md)
- Status: Proposed; preparation only
- Product implementation authorized: No
- Decision owners: Product owner and architecture owner
- Plan owner: Architecture owner

## Outcome

Turn the confirmed architecture and first evaluation contract into two bounded
delivery programs:

1. prove the application foundation without building product screens; and
2. deliver the terminal customer's first real evaluation-to-report journey in
   small integrated increments.

This plan names prerequisites, ownership, parallel seams, integration gates, and
evidence. It does not authorize dependency installation, external paid calls,
production resources, or business-feature implementation.

## Stable Inputs

- [Approved product definition](../../specs/product-definition/spec.md)
- [Confirmed architecture design](design.md)
- [Architecture decision brief](decision-brief.md)
- [Foundation compatibility candidate](research/foundation-compatibility.md)
- [First-slice external evidence and controlled matrix](research/first-slice-external-evidence.md)
- [Operational and quality baseline](research/operational-quality-baseline.md)

Exact tables, DTO fields, framework helpers, provider payloads, prompt text,
retry counts, timeouts, visual composition, and production products remain with
their owning implementation or evidence step. They cannot redefine the stable
inputs above.

## Activation Gates

| Gate | Required before it opens | Allows | Does not allow |
| --- | --- | --- | --- |
| P0: preparation | confirmed architecture baseline | version and image audit, route-sheet and fixture preparation, issue/work-package refinement, no-secret config templates | dependency installation, image pulls, provider calls, product code |
| F0: foundation execution | explicit approval of the compatibility set, intended file scope, dependency/image downloads, and evidence matrix | project-local manifests, lockfile, disposable services, non-product spike code and tests | real provider calls, production resources, product feature claims |
| E0: controlled external execution | route sheet, intended commercial accounts, injected secrets, approved budget, non-sensitive fixtures, evidence-retention location | bounded provider, parser, synthesis, and telemetry-isolation calls | production traffic, open-ended load testing, unbounded cost, credentials in source |
| S0: first-slice implementation | foundation spike passed; first-slice public contracts reconciled; provider-neutral core approved; provider-specific consumption follows the controlled-evidence gate | identity, brand, evaluation, notification, report, and deterministic adapter increments | later optimization, commerce, fulfilment, settlement, or commercial-release claims |
| R0: first-slice acceptance | integrated deterministic flow plus every required controlled provider route and browser/recovery evidence | call the slice complete and begin the next approved slice | call the whole commercial release complete |

### Confirmed sequencing

F0 and E0 execute as disjoint parallel lanes after their separate approvals:
the foundation uses deterministic fake adapters and disposable infrastructure,
while controlled external validation uses a small independent harness and real
accounts. Both must pass before provider-specific first-slice integration and R0.

This saves external-account lead time without letting a fake adapter prove a
provider claim or allowing account availability to redefine the application
foundation. The product owner confirmed this sequencing on 2026-08-25. Each
lane still requires its own execution authorization; approval of one lane does
not authorize the other.

## Work Package Ownership Rules

- One reconciler owns root manifests, the pnpm lockfile, shared build and lint
  policy, application bootstraps, public OpenAPI output, migration order, design
  primitives, and release evidence at any one time.
- A capability writer changes only its owner module, owner-local tests, and an
  already approved public contract. Cross-module contract changes return to the
  contract reconciler before parallel work resumes.
- Provider-evidence work never writes business implementation. Product work uses
  deterministic adapters until the relevant real adapter has passed E0.
- Separate worktrees begin only after their file ownership and public inputs are
  fixed. No two work packages write the same migration, generated contract,
  shared configuration, or canonical design owner concurrently.
- Every package ends at an evidence gate, not at “code finished.”

## Program F: Bounded Foundation Spike

### F1. Workspace and reproducibility seam

**Owner:** foundation reconciler
**Depends on:** F0 authorization
**Owns:** root manifests, pnpm workspace, Corepack package-manager pin, Node
version declaration, application package skeletons, shared config package, and
lockfile

Required evidence:

- the exact candidate set installs project-locally from a clean state;
- web and backend build from the checked lockfile;
- the backend build starts through API and worker bootstraps;
- no global package or system package is installed;
- a failed TypeScript 7 compatibility check stops the spike and records the
  exact incompatibility instead of silently changing the version.

### F2. Contract and process seam

**Owner:** backend contract reconciler
**Depends on:** F1 workspace contract
**Owns:** minimal NestJS API and standalone worker, health/readiness, graceful
shutdown, one OpenAPI source, generated-client pipeline, and startup config
schema

Required evidence:

- API and worker use the same backend modules and artifact;
- generated client reproduction detects drift;
- a missing required secret fails only the process that needs it;
- the built web output contains no server-secret fixture;
- termination changes readiness before process exit.

### F3. Persistence and reliable-work seam

**Owner:** data and background reconciler
**Depends on:** F1 plus the approved transaction/outbox port
**Owns:** disposable PostgreSQL and Redis services, Prisma configuration and one
migration history, transaction port, test owner record, outbox relay, BullMQ
consumer, durable idempotency, and reconciliation probe

Required evidence:

- development shadow state is separate and the production-style migration
  command applies reviewed SQL to a fresh database;
- owner write and outbox fact commit or roll back together;
- duplicate delivery and worker restart create one business effect;
- Redis job removal cannot make the same business identity apply twice;
- outbox backlog is discoverable and resumable.

### F4. Web recovery and diagnostics seam

**Owner:** web and observability reconciler
**Depends on:** F2 public progress contract and F3 durable test state
**Owns:** minimal Next.js shell, generated client consumption, SSE hint and
reconnect refresh, structured correlation, telemetry test adapter, and failure
isolation

Required evidence:

- a missed SSE message is recovered by a normal durable-state read;
- exporter failure does not fail the business commit or customer read;
- one request, outbox fact, job, and browser refresh share approved correlation
  identities without exposing sensitive data;
- standalone web output starts behind the local reverse-proxy test boundary.

### F5. Recovery and spike close

**Owner:** verification reconciler
**Depends on:** F1-F4
**Owns:** spike evidence ledger, disposable backup/restore rehearsal, architecture
findings, verified command list, and removal or retention decision for spike-only
code

Required evidence:

- restored first-slice-shaped owner records satisfy the tested invariants;
- every one of the eight foundation claims is passed, failed, or explicitly
  blocked with reproducible evidence;
- only successfully executed application commands are promoted to `AGENTS.md`;
- the candidate version set is accepted, revised from a named incompatibility,
  or rejected as a whole.

F2 and F3 may proceed in parallel only after F1 fixes root configuration and
their shared transaction/OpenAPI seams. F4 starts from their fixed public test
contracts. F5 is the single integration and evidence owner.

## Program E: Controlled External Evidence

### E1. Route and secret-readiness sheet

**Owner:** account and integration owner
**Depends on:** intended commercial accounts
**Output:** one non-secret record per route containing account owner, region,
protocol, model/service ID, search setting, quota/budget, terms, data boundary,
and credential-reference name

### E2. Deterministic fixture and expected-result set

**Owner:** GEO evaluation owner
**Depends on:** confirmed report semantics
**Output:** non-sensitive sampling, rank/table, no-mention, alias, sentiment,
sparse/conflicting synthesis, retry, and telemetry-failure fixtures with
human-reviewed expected outcomes

### E3. Bounded route execution

**Owner:** provider evidence runner
**Depends on:** E0 approval plus E1-E2
**Output:** retained request/response envelope references, route identity,
search/source evidence, latency, usage, reconciled cost, error classification,
and pass/fail result for each controlled matrix row

### E4. Adapter and AI-policy consequence

**Owner:** AI execution contract reconciler
**Depends on:** E3
**Output:** accepted provider-specific mappings, rejected assumptions, retry and
fallback boundaries, semantic regression baseline, cost evidence, and any
durable architecture correction

No provider route is accepted from an HTTP status alone. E1 and E2 may proceed
in parallel with Program F preparation; E3 requires separate cost and secret
authorization.

## Program S: First Evaluation Slice

Program S begins only after the applicable activation gates. It uses the same
capability layers and owner operations confirmed in the design.

| Increment | Customer-visible or integration outcome | Primary owners | Prerequisites | Gate evidence |
| --- | --- | --- | --- | --- |
| S1. Entry and brand | terminal customer can enter, intentionally have no brand, create/select one brand, and save evaluation-relevant facts | Identity and Access; Brand Knowledge; web entry features | foundation public/auth/config seams | owner/resource authorization, normalized fingerprint, responsive browser flow |
| S2. Definition and start | customer sees one non-editable four-question definition and starts one run with twenty sample identities | GEO Intelligence; Brand Knowledge purpose view; background outbox | S1 purpose contract; query-generation deterministic adapter | snapshot immutability, one active run, one completed opportunity, duplicate-start contract tests |
| S3. Resumable evidence | deterministic provider attempts, canonical answers, failed positions, parsing, and synthesis progress survive worker restart | GEO Intelligence; AI Execution; Background Work | S2 run identity; Program F reliability | retained raw evidence, duplicate-safe acceptance, retry cycle, semantic validation, recovery tests |
| S4. Report and guidance | an eligible 17-20 sample run produces the complete reproducible report and concise/full guidance boundary | GEO Intelligence; report read composition; web report features | S3 accepted interpretations | formula reproduction, missing-card behavior, highlights preserve original, responsive/accessibility browser evidence |
| S5. Notification and recovery | customer can leave, receive completion or retry notification, reconnect, and retry only failed work | Notification Center; Background Work; web notification/report features | S3 terminal facts; S4 purpose view | durable notification, SSE recovery, same-run retry, changed-revision new-run behavior |
| S6. Real five-platform integration | the complete slice runs through every accepted commercial route with recorded model, search, evidence, latency, and cost | provider adapters; GEO Intelligence; AI Execution; verification owner | Program E accepted routes; S1-S5 deterministic acceptance | controlled-provider plus real browser journey and failure evidence |

S1 can begin independently of provider accounts after S0. S2-S5 use
deterministic adapters so business contracts and UI do not depend on paid calls.
S6 cannot begin or be claimed without Program E evidence.

## Integration and Reconciliation

Each increment must:

1. update the owner-local contract or executable source rather than create a
   version-copy document;
2. regenerate, never hand-edit, the web client when OpenAPI changes;
3. add a reviewed migration through the single migration reconciler;
4. pass fast, owner, public-contract, and affected integration evidence;
5. demonstrate the role-visible success and failure boundary in a browser when
   user behavior changes;
6. reconcile accepted durable decisions into current specs, architecture owners,
   tests, schemas, or ADRs before its active change closes.

## Explicit Non-Goals

- optimization article information, materials, writing, editing, or confirmation;
- media, recharge, points, paid order, fulfilment, invoice, agent, commission, or
  withdrawal implementation;
- final public marketing and case pages;
- production infrastructure, production data, Kubernetes, multi-region recovery,
  or multi-instance web scaling;
- selecting every prompt, timeout, retry count, quota, chart, animation, or
  provider model before its controlled evidence or owning implementation step.

## Plan Completion Boundary

This plan becomes activation-ready when:

- the exact compatibility candidate and download scope are approved;
- Program E route-sheet ownership and credential injection are assigned;
- architecture review finds no must-fix owner, dependency, data, security, or
  reconciliation issue; and
- every work package has one writer, disjoint files, prerequisites, and named
  verification evidence.
