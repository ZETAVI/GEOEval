# Change: Activate Brand Knowledge Reference Data

- Status: Approved for deterministic implementation
- Class: Architectural implementation
- Owning Issue: [#27](https://github.com/ZETAVI/GEOEval/issues/27)
- Parent outcome: [#26 AI Evaluation Query Generator](https://github.com/ZETAVI/GEOEval/issues/26)
- Decision owners: Product owner and architecture owner
- Product-owner approval: 2026-09-01
- Implementation authorization: Yes; no Provider call, production change, or merge

## Why

`main@a1d3d57` contains the approved `industry-catalog@1.0.0` product
definition, but Brand runtime still accepts arbitrary industry and region text.
Readiness checks only for non-empty values, the evaluation fingerprint hashes
display strings, and the immutable snapshot has no stable industry or region
identity. A label correction or representation migration can therefore appear
to be a new brand revision, while an invalid parent-child combination can be
treated as evaluation-ready.

Query Generator #26 has an approved design but intentionally does not own this
problem. It must consume one stable evaluation-purpose projection after Brand
Knowledge activates and merges its reference-data boundary.

## Desired outcome

Brand registration and editing use controlled, dependent industry and region
selection backed by stable identities. Brand Knowledge validates and persists
the current selection, decides evaluation readiness, preserves fingerprint and
free-evaluation continuity, and freezes the exact display and source meaning
used by each future Definition. Industry and administrative regions remain two
separate sources with different semantics and maintenance lifecycles.

## Scope

- Move the exact approved industry nodes from the product document to one
  executable Brand-owned source, with a generated human-readable reference.
- Add a maintained mainland-China administrative-region snapshot from a
  researched authoritative source and a region-specific selection projection.
- Add Brand-owned reference-data queries and controlled Brand mutations used by
  both registration and brand editing.
- Replace free-text industry and region inputs with responsive dependent
  selectors and a conditional fused `Other` product-or-service control.
- Persist the complete two-level industry and three-level region identity path,
  validate readiness, compute a semantic
  fingerprint, and expose one evaluation-purpose projection to GEO
  Intelligence.
- Preserve old Definition, Run, report, and free-opportunity meaning through a
  preflighted development-data migration and versioned snapshot reader.
- Resolve the industry catalog's `move-on-activation` marker and the relevant
  product-definition `split-on-activation` scenarios during reconciliation.

## Non-goals

- Reopening or redefining completed industry-definition Issue #10.
- Editing #26's Prompt, generation lifecycle, provider routes, or active Change.
- A universal Catalog Engine, shared catalog database, or framework that makes
  industry and region pretend to have the same domain semantics.
- Business-district selection, address search, geocoding, map coordinates,
  village-level data, or free-text location fallback.
- AI or web-search enrichment of customer facts, external Provider calls,
  production deployment, or destructive database cleanup.
- Coverage of Hong Kong, Macao, or Taiwan without a separately confirmed source
  and product boundary.

## Impact

- **Brand Knowledge:** becomes the executable owner of current industry and
  administrative-region selection, validation, readiness, fingerprint meaning,
  and the evaluation-purpose projection.
- **GEO Intelligence:** keeps Definition, Query, Run, and report ownership. It
  receives a frozen projection and never imports the reference sources or reads
  Brand tables directly.
- **Public API and Web:** gain read-only reference-data queries and structured
  Brand selection. Registration and editing reuse one controlled field group.
- **Data:** Brand persistence changes from display text to the complete stable
  selection path. The development migration accepts only empty or uniquely
  convertible data and stops on an unexpected value; no customer-facing legacy
  compatibility state is introduced. Existing immutable snapshots stay readable.
- **Operations:** region data updates are explicit offline releases with source
  manifest, integrity checks, and a human-reviewed diff; runtime never depends
  on a government or third-party endpoint.

## Confirmed boundary

- Industry and region are independent executable sources; sharing a form does
  not justify a generic catalog abstraction.
- Stable industry and official region identities participate in the evaluation
  fingerprint. Display labels, ordering, source/catalog version, presentation
  groups, and non-semantic recommendation-subject maintenance do not.
- A deterministic exact migration cannot create a new Definition or free
  evaluation opportunity. An unexpected legacy value is never guessed; the
  development migration stops before writes so the data can be resolved and
  replayed without a long-lived product migration workflow.
- Existing Definition and Run snapshots remain immutable and readable. A new
  snapshot schema applies only to newly prepared Definitions.
- #26 consumes only the accepted Brand evaluation-purpose projection after this
  change merges and its branch rebases.

## Confirmed decisions

1. First-release geography is mainland China. Hong Kong, Macao, and Taiwan are
   outside the current product boundary.
2. Industry always uses two dependent controls. Region always uses province,
   city, and terminal-region controls. Dongguan, Zhongshan, Danzhou, and
   Jiayuguan remain city-level choices and expose their official township,
   town, or street children in the third control.
3. Municipalities repeat the municipality in the city control; province-direct
   county-level divisions use a presentation group in the city control. The
   third control still contains the official selectable terminal division.
4. Brand persists and validates the complete selected path:
   `primaryIndustryId`, `secondaryIndustryId`, `provinceRegionId`,
   `cityRegionId`, and `terminalRegionId`.
5. Every secondary `Other` option displays as `其他`. Selecting it turns the
   secondary field into one fused select-and-input control for a customer-
   entered concrete product/service phrase of 2-60 normalized characters.
   Exact generic values `其他` and `其它` are not valid evaluation context.
6. The normalized MCA snapshot records source and publication version. Ordinary
   product development and release do not require a separate legal-approval
   gate; source terms are revisited only if distribution or use materially changes.
7. The development migration handles an empty database or unique exact
   conversions. Any unexpected, ambiguous, or colliding record aborts before
   writes and is resolved as development data; the product does not add legacy
   review UI, unresolved fingerprints, or customer migration workflow.

## Documentation impact

- `move` and `generate`: exact industry nodes move to the Brand executable
  source; `docs/product/industry-catalog.md` retains product rules and links to
  a generated reference instead of hand-maintaining the full list.
- `add`: accepted Brand Knowledge behavior moves to
  `openspec/specs/brand-knowledge/spec.md` during reconciliation.
- `update`: product definition keeps index-level brand-profile meaning and links
  to the owner-local spec; architecture overview records the Brand-to-GEO seam.
- `add`: this active design, delta, source brief, decision brief, and tasks;
  archive them only after accepted behavior is implemented and reconciled.

## Control state

- Workspace: the current isolated Codex worktree for #27; recover its location
  from live workspace state rather than a machine-local path
- Branch: `codex/issue-27-brand-knowledge-reference-data`
- Base: `main@a1d3d57660df8cc21f1426fe9f05f33a36d1b3b3`
- Writer: the primary Codex agent; research sub-agents are read-only
- Merge destination: protected `main` through a later verified pull request
- Current phase: Implement; no Provider call or production change
- Exit: implement and verify here, merge
  through the #27 PR, then remove the branch/worktree only after #26 rebases

## Approval boundary

The product owner confirmed the decisions above on 2026-09-01. Deterministic
schema, runtime, generated-contract, frontend, migration, and verification work
may proceed. Provider calls, production changes, and PR merge retain their
separate gates.
