# Change: Standardize the GEOEval Industry Catalog

- Status: Completed and reconciled
- Class: Standard
- Decision owner: Product owner
- Approval date: 2026-08-26
- Product implementation authorized: No

## Why

Primary and secondary industry are required evaluation inputs and directly shape
the open industry-recommendation question. The current product vision leaves the
exact catalog as an internal input and still says that the classification is
expected to reference Dianping merchant categories. That no longer represents
the approved product meaning: GEOEval serves local businesses, consumer brands,
software companies, manufacturers, professional firms, and other small and
medium customers, and the selection must describe the product or service for
which the brand wants to be found and recommended.

The product owner approved a GEOEval-owned two-level catalog after reviewing
official Chinese and international activity and product classifications. The
catalog now needs one durable owner, stable identifiers, explicit boundaries,
and versioning rules before application implementation relies on it.

## Desired outcome

Establish one approved, maintainable industry catalog that a non-expert customer
can use to identify the primary product or service focus of the current GEO
evaluation, while preserving enough semantic precision for realistic question
generation and immutable evaluation history.

## Scope

- Add the approved 13-primary, two-level industry catalog and its inclusion,
  exclusion, mixed-business, fallback, and maintenance rules.
- Define stable category identifiers, display names, search aliases,
  question-subject labels, catalog versions, and historical snapshot meaning.
- Require a specific product-or-service phrase when a customer selects an
  `Other` secondary category.
- Reconcile the approved behavior into the product vision, glossary, and
  current product-definition specification.
- Preserve a concise primary-source brief and refresh boundary for the external
  classifications used to check coverage.

## Non-goals

- Database, API, generated client, frontend selector, seed-data, or evaluation-
  agent implementation.
- A business-license, statistical-reporting, credential, or industry-compliance
  classification system.
- User-notice, user-agreement, privacy-policy, or regulated-industry agreement
  wording; those remain a later separately approved documentation task.
- Reproducing a complete Dianping or Meituan merchant-onboarding catalog.
- Exhaustively listing every economic activity or allowing a brand to enumerate
  every concurrent business line for one evaluation.

## Impact

- **Product meaning:** basic brand information and controlled evaluation-
  question generation.
- **Future capability consumers:** brand context, GEO Intelligence question
  generation, and evaluation input snapshots.
- **Persistent data:** no schema change in this change; future implementation
  must preserve stable category and catalog-version meaning.
- **External systems:** none. Official classifications are evidence and
  crosswalk inputs, not runtime dependencies.
- **Compliance:** choosing a category never establishes eligibility, licensing,
  credentials, or legal compliance.

## Documentation impact

- `add`: `docs/product/industry-catalog.md` as the sole current owner of the
  exact catalog, category boundaries, and maintenance contract.
- `update`: `docs/product/vision.md`, `docs/product/glossary.md`, and
  `openspec/specs/product-definition/spec.md` to reference that owner and state
  observable selection and snapshot behavior.
- `add`: this temporary change delta and source brief; archive them after
  reconciliation.
- `retain`: the product-definition `split-on-activation` evolution marker. This
  documentation-only standard does not activate a code module or owner-local
  executable specification; the first approved implementation change still
  owns that split decision.
- `add`: a `move-on-activation` marker to the catalog so its exact data moves
  once, rather than being copied, when a stable executable owner exists.

## Control state

- Workspace: `codex/standardize-industry-catalog` at base `7ec4cea`, isolated
  from the dirty `codex/provider-validation` and `codex/first-evaluation-slice`
  worktrees.
- Owner: primary Codex agent for this approved documentation outcome.
- Merge destination: the active product implementation line after its owner
  reviews the independent documentation commit.
- Current state: locally verified and archived after reconciliation into the
  current product owners; no runtime, merge, push, or deployment claim.
- Verification boundary: catalog structure, links, current-source
  reconciliation, project-framework validation, and architecture ownership
  review; no runtime claim.
- Exit: `ready-for-integration` after the verified documentation commit; retain
  the isolated worktree until the integration owner reviews or merges it.

## Approval boundary

The product owner approved all three decisions from the research report:

1. use the proposed 13 primary industries without promoting restaurant, beauty,
   pet, or automobile maintenance into separate primary industries;
2. require a concrete product-or-service phrase for `Other` before evaluation
   questions can be generated; and
3. keep compliance outside the industry catalog and address user-notice and
   agreement language separately later.
