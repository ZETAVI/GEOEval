# Architecture Review: Approved Brand Knowledge Reference-Data Design

- Review scope: approved proposal, design, delta specification, source brief,
  decision brief, and tasks after the 2026-09-01 product discussion
- Current authority: `main@a1d3d57`, approved industry product definition, and
  #26 design checkpoint `33b2972` as read-only downstream context
- Review type: pre-implementation architecture gate

## Review contract

Brand Knowledge must own executable industry and mainland administrative-region
selection, complete path validation, readiness, semantic fingerprint, and the
evaluation-purpose projection. It must preserve Definition/Run opportunity
meaning without moving Query lifecycle into Brand, letting GEO resolve
reference data, copying the exact catalog, or inventing a generic Catalog Engine.

The approved customer interaction is two dependent industry controls and three
dependent region controls. The third region level may be a county/district or a
township/town/street. Municipalities repeat the municipality in the city
control; province-direct county-level divisions use a presentation group.

## Affected slice

- Brand owns two separate immutable reference readers, complete path
  validation, current persistence, readiness, semantic fingerprint, and one
  frozen evaluation-purpose projection.
- Registration and Brand editing reuse one generated API contract and one
  dependent field group.
- GEO consumes the projection and a centralized legacy/new snapshot decoder;
  Definition, Query, Run, and report ownership remain unchanged.
- A development migration accepts an empty database or unique exact conversions,
  moves related fingerprint keys together, and aborts before writes on an
  unexpected value or collision.
- MCA is an offline attributed update boundary only; runtime has no external
  region dependency.

## Review findings

### No must-fix findings

The revised design has one clear write and validation owner. Web submits the
complete customer-selected path, but Brand—not the client—decides whether every
parent-child relation is valid. The small deliberate redundancy improves
auditability without creating a second source of truth because labels and
membership remain reference-reader facts.

Removing the long-lived unresolved state is proportional to the confirmed
development-only data boundary. An unexpected record now stops migration before
writes rather than introducing legacy columns, customer review UI, or a mixed
fingerprint lifecycle. Exact Brand/Definition/Run key movement remains necessary
only when representative development history exists.

The 2-60-character `Other` phrase remains Brand data under a catalog `Other`
node. It does not create runtime categories or transfer industry ownership to
customer text.

### Consider: presentation city identity

- **Affected artifact:** region selection projection.
- **Consequence:** a province-direct grouping or repeated municipality is part
  of the visible three-control path but is not always a legal administrative
  node.
- **Control:** keep an explicit `identityKind`; persist the stable selection ID
  for form restoration and snapshots, but exclude presentation-only IDs from
  the semantic fingerprint. This is already in the design and requires focused
  fixtures.
- **Origin:** inherent official-tree/product-projection mismatch, not debt.

## Review result

`ready` for the approved deterministic implementation.

No ADR is required. The stable decisions belong in the executable Brand owner
and the current Brand Knowledge spec during reconciliation. Implementation must
still prove:

1. the documented source can produce the required mainland province-city-
   terminal projection, including municipalities, province-direct groupings,
   and the four no-county cities;
2. migration replay preserves exact Definition/Run opportunity identity and
   aborts before writes on unexpected data;
3. generated API, desktop/narrow-screen interaction, and the Brand-to-GEO
   projection agree with the accepted contracts;
4. accepted design is reconciled out of this Change before completion.

Provider calls, production changes, and PR merge remain separate gates.

## Post-implementation fixed-diff review

- Review base: `692a064`
- Scope: requirement fidelity, module ownership, data integrity, migration,
  generated contracts, Web interaction, and evidence continuity
- Result: `ready for Draft PR review`; no remaining must-fix or should-fix
  finding

Requirement fidelity remains intact: industry is two-level, mainland region is
three-control with official township terminals for the four confirmed cities,
Brand validates complete paths, `Other` remains bounded Brand data, and GEO
consumes only the versioned evaluation-purpose projection.

The review found and resolved four implementation-quality issues before this
result:

1. industry 13/199 counts moved from hard-coded runtime assumptions into the
   validated catalog manifest so a later approved supplement can update data and
   counts without weakening current `1.0.0` proof;
2. the region schema now requires 31 active mainland provinces while allowing
   retained `ABOLISHED` historical identities beyond that active set;
3. official region IDs, parents, levels, source release, special township
   parents, and presentation identities are checked without reconstructing a
   city from its ID string;
4. the fused `Other` control uses an accessible group with separately named
   select and input, and its generator scripts are covered by project formatting
   checks.

Evidence review found no completion-claim gap: the clean, exact, unexpected,
and collision migration paths were exercised in isolated databases; source and
generated artifacts reproduce byte-for-byte; `pnpm check`, Web tests, production
build, framework validation, and built-runtime browser checks pass. Browser
evidence confirms concise `其他`, no standalone extra field, complete 2-60 hint,
desktop/narrow layout, dependent reset, and the special-city third level. No
Provider or production operation was invoked.
