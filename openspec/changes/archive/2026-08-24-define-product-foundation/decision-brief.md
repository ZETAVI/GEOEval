# Decision Brief: GEOEval Product Foundation

- Confirmation status: Confirmed
- Decision owner: Product owner
- Confirmed: 2026-08-24
- Change: [`define-product-foundation`](proposal.md)

This is the review and approval entry for the product foundation. It does not
replace the canonical [product direction](../../../../docs/product/vision.md),
[shared language](../../../../docs/product/glossary.md),
[current observable requirements](../../../specs/product-definition/spec.md), or
[decision history and remaining gates](decision-backlog.md).

## Documentation Layers

| Layer | Owner | How later work uses it |
| --- | --- | --- |
| Product direction | [`docs/product/vision.md`](../../../../docs/product/vision.md) | Start here for the user, problem, value chain, role boundaries, first commercial release, and non-goals |
| Shared language | [`docs/product/glossary.md`](../../../../docs/product/glossary.md) | Use these meanings in product design, architecture, tasks, code, and tests instead of inventing nearby terms |
| Current behavior | [`openspec/specs/product-definition/spec.md`](../../../specs/product-definition/spec.md) | Use these accepted scenarios and boundaries as the product contract for later design, implementation, and verification |
| Decision history and gates | [`decision-backlog.md`](decision-backlog.md) | Understand why a material choice was made and which launch, validation, product-design, or architecture gate still owns later work |
| Research input | [`meeting-synthesis.md`](meeting-synthesis.md) and linked transcripts | Trace historical discussion when needed, but never treat it as a competing requirement source |
| Approval entry | This brief | Confirm the whole foundation without maintaining another full copy; archive it with the change after reconciliation |

## Outcome

Give a small-business owner or storefront manager who does not understand GEO a
simple path from seeing the business's current evidence across five generative-
answer platforms to completing one real, customer-reviewed optimization and
media-publication action with visible delivery results.

The product performs and evidences work under company control. It does not
guarantee that an AI platform will mention the customer, improve the AI
recommendation index, or rank the customer higher.

## Scope

### In the first commercial release

- A simple public entry, terminal-customer registration, optional first-brand
  completion, multiple independent brands, and one current brand context.
- A bounded free evaluation using four generated questions across the fixed five
  platforms, an understandable visual report, original answer evidence, and
  concise plus internal optimization guidance.
- One current customer-editable core article, customer confirmation, random or
  precise paid publishing, online recharge and points, operations fulfilment,
  progressive publication results, and bounded manual exception handling.
- Required supporting paths for operations users, administrators, and agents,
  including media maintenance, point adjustment, recharge invoicing, agent
  attribution, commission, and manually reviewed withdrawal.
- Role-specific navigation, homes, authority, notifications, error outcomes,
  responsive scope, and an observable frontend-quality requirement.

### Outside the first commercial release

- Scheduled or continuous monitoring, automatic re-evaluation, or causal
  improvement claims.
- Medium- or large-enterprise organizations, departments, teams, or complex
  collaboration permissions.
- Customer self-service paid-order cancellation, refund, media replacement,
  delivery acceptance, or online exception negotiation.
- Agent operation of customer-owned brand, evaluation, article, point, media,
  or order actions merely through attribution.
- Customer choice of evaluation platform, model, writer Skill, article style,
  length, template, or platform-specific variants.
- Automated external-media publication, tax-system integration, multi-person
  catalog approval, rich public cases, and brand-profile or article rollback.

## Material Decisions

| Decision | Agreed choice | Main rationale | Owner |
| --- | --- | --- | --- |
| Primary user and position | Serve small and medium business owners or storefront managers with a lightweight evidence-to-action GEO service | The target customer needs a direct, understandable service rather than enterprise analytics or a technical console | Product owner |
| Value and charging | The basic evaluation is free; customers pay when submitting managed media publication after reviewing the generated article | The evaluation exposes the problem, while paid value is real optimization and publication work | Product owner |
| Evaluation meaning | Four controlled questions run once across five fixed platforms; one overall index uses valid open-question mention and position evidence, and the report preserves complete sampled answers | A simple index remains explainable only when its evidence, exclusions, coverage, and limits are visible | Product owner |
| Brand and report lifecycle | Customer accounts may own several independent brands; each unchanged evaluation-input revision has one generated question set and one completed official evaluation opportunity; reports retain immutable snapshots and history | Brand editing stays simple without rewriting evidence or introducing customer-facing version management | Product owner |
| Optimization and publishing | Current brand information, prepared materials, and the latest completed optimization guidance produce one editable core article; a paid order fixes the article and random-package or precise-media commitment | The service connects diagnosis to a customer-controlled action and a fulfilment promise the company can evidence | Product owner |
| Role ownership | Customers own brand data and commercial decisions; operations fulfils orders; administrators govern accounts, points, catalog, commercial rules, and exceptions; agents acquire and assist attributed customers without customer mutation authority | Each role receives the information and actions needed for its responsibility without becoming another owner of the same data | Product owner |
| Commercial support | Points use a fixed ten-to-one conversion; recharge invoices attach to cash recharge orders; agent commission follows fulfilled customer-funded order consumption; withdrawal is manually reviewed and paid offline | The first release closes the real commercial loop while keeping rare finance and exception paths controlled and traceable | Product owner |
| Release acceptance | A real customer and all four roles complete the real provider, payment, publishing, result, invoice, attribution, commission, withdrawal, recovery, responsive, and frontend-quality paths without developer database edits | A connected prototype or isolated happy path is not the externally chargeable product | Product owner |

## Acceptance Boundaries

- A new contributor can identify the primary user, the complete commercial
  journey, the four role boundaries, the evaluation meaning, and explicit
  non-goals from the linked sources without returning to meeting transcripts.
- A real brand can complete the agreed five-platform evaluation and report,
  article confirmation, online recharge, paid publishing order, operations
  fulfilment, and accessible publication result.
- Applicable invoice, agent attribution, commission, withdrawal, notification,
  and manual exception paths produce their defined visible states and records.
- The customer can distinguish observed evidence, interpretation, recommendation,
  performed service, and non-guaranteed external AI outcomes.
- Included pages meet the agreed visual, hierarchy, readability, responsive,
  motion, and interaction-quality boundary; technical connectivity alone is not
  acceptance.

## Assumptions and Open Gates

These items do not reopen the product meaning above, but each must be resolved by
its owner before the affected design, implementation, or commercial release:

- **Launch operating input:** industry and regional choices, actual media catalog
  and prices, customer-service contacts, agent rate, withdrawal minimum and bank
  template, invoice workflow validation, writer Skills, notification retention,
  and publication-link feedback period.
- **Controlled evidence:** provider models and search routes, sample-parser and
  fallback quality, material preparation, merchant and payment readiness,
  writing-Skill integration, observability boundaries, and real paid-customer
  usefulness and willingness to pay.
- **Product and interaction design:** shared visual language, accessibility and
  motion rules, reusable forms, cards, tables, editor, upload, loading, error,
  confirmation, and responsive patterns, plus exact customer-facing placement
  of the current agent relationship.
- **Architecture:** module and data ownership, snapshots and lifecycle, state
  transitions, permissions, sensitive data, ledgers, concurrency, notifications,
  errors and logs, observability, external integrations, and rollback or
  operational recovery.

## Confirmation and Next Gate

- Confirmation: Confirmed
- Next action: Begin the next-stage module and ownership discussion in a separate
  change boundary, using the accepted product direction, glossary, and current
  specification as constraints.
- Confirmation required before: None for product-foundation reconciliation.
  Product-design, architecture, external-validation, implementation, and release
  decisions retain their own confirmation and evidence gates.
