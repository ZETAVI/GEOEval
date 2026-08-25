# Change: Define the GEOEval Application Architecture

- Status: Foundation validated; controlled external evidence pending
- Class: Architectural
- Decision owners: Product owner and architecture owner
- Implementation authorized: No

## Why

The product foundation is approved and spans customer accounts, brands,
evaluation, content, media, paid orders, points, fulfilment, invoicing, agents,
commission, withdrawals, notifications, and governance. Starting page-by-page or
choosing a framework before these capabilities have explicit ownership would
create duplicated state, role-driven modules, and fragile cross-module writes.

## Desired outcome

Approve the smallest coherent application foundation that can deliver the first
commercial journey while keeping capability ownership, data authority,
lifecycles, permissions, dependency direction, external integrations, failure
boundaries, and parallel implementation seams understandable and verifiable.

## Scope

- Map business capabilities required by the approved product specification.
- Assign every cross-project durable concept one owning capability, and assign
  slice-specific records and mutations before their implementing slice rather
  than designing the whole product's storage upfront.
- Define important lifecycle, snapshot, ledger, consistency, and concurrency
  boundaries without prematurely fixing database tables or APIs.
- Define cross-project role and permission boundaries and the shared error,
  notification, logging, sensitive-data, and observability responsibilities;
  refine slice-specific behavior before implementation.
- Identify external provider, payment, storage, media, and realtime boundaries;
  require current primary-source plus controlled runtime evidence for the first
  slice and retain the same gate for each later contract before its selection.
- Compare the smallest viable application and deployment architecture only after
  the capability and evidence boundaries are stable.
- Establish disjoint ownership and integration gates for later parallel product-
  design, research, implementation, and verification work.

## Non-goals

- Reopening the approved target user, commercial journey, evaluation meaning,
  role ownership, first-release boundary, or product non-goals.
- Designing final pages, components, visual language, or interaction details.
- Writing application code, schemas, migrations, APIs, prompts, or deployment
  configuration during architecture discussion.
- Selecting frameworks, databases, model providers, payment channels,
  observability tools, or infrastructure from familiarity or configuration
  presence alone.
- Filling in launch-owned media, pricing, commission, support, banking, or other
  operating values.

## Current sources

- [Approved product vision](../../../docs/product/vision.md)
- [Accepted product glossary](../../../docs/product/glossary.md)
- [Current product specification](../../specs/product-definition/spec.md)
- [Current architecture overview](../../../docs/architecture/overview.md)
- [Archived product-foundation confirmation](../archive/2026-08-24-define-product-foundation/decision-brief.md)

## Working artifacts

- [Architecture exploration](design.md)
- [Decision backlog](decision-backlog.md)
- [First-slice external evidence](research/first-slice-external-evidence.md)
- [Controlled provider validation preparation](research/provider-validation-preparation.md)
- [E0 provider entitlement evidence](research/provider-entitlement-evidence.md)
- [E0 provider search and fidelity evidence](research/provider-search-fidelity-evidence.md)
- [Shared evaluation objectivity instruction](research/provider-instruction-evidence.md)
- [Application-stack options](research/application-stack-options.md)
- [Operational and quality baseline evidence](research/operational-quality-baseline.md)
- [Foundation compatibility candidate](research/foundation-compatibility.md)
- [F0 foundation spike evidence](research/foundation-spike-evidence.md)
- [Architecture decision brief](decision-brief.md)
- [Proposed implementation plan](implementation-plan.md)
- [Tasks](tasks.md)

## Approval boundary

The product owner approves any product-facing tradeoff. The architecture owner
proposes capability ownership, dependency direction, consistency, security,
operational, and technology decisions. Consequential architecture, external
cost, sensitive-data, rollback, and implementation boundaries require explicit
human confirmation before implementation authorization.
