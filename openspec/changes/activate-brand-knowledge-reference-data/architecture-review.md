# Architecture Review: Brand Knowledge Reference-Data Proposal

- Review scope: the proposal, design, delta specification, source brief,
  decision brief, and tasks in this active Change
- Current authority: `main@a1d3d57`, approved industry product definition, and
  #26 design checkpoint `33b2972` as read-only downstream context
- Review type: proposal architecture, not implementation or fixed-diff code

## Review contract

The proposed Change must make Brand Knowledge the sole executable owner of
controlled industry and administrative-region selection while preserving the
accepted Definition, Run, report, and free-opportunity meaning. It must not
move Query lifecycle into Brand, let GEO resolve reference data, copy the exact
catalog, invent a universal Catalog Engine, guess legacy mappings, or represent
commercial source reuse as cleared.

The durable design claims reconcile to executable assets, a Brand Knowledge
current spec, the evaluation-definition seam, generated contracts, and the
architecture overview. This active review and Change are not current truth.

## Affected slice

- Brand owns two separate immutable reference readers, selection validation,
  current persistence, readiness, semantic fingerprint, and evaluation-purpose
  projection.
- Web and registration consume generated Brand APIs and one controlled field
  group.
- GEO consumes the projection and a centralized legacy/new snapshot decoder;
  Definition, Query, Run, and report ownership remain unchanged.
- A migration maps exact representation changes across Brand, Definition, and
  Run keys while preserving immutable snapshot JSON and retaining unresolved
  legacy data.
- MCA is an offline update boundary only; source-license risk remains outside
  normal runtime.

## Findings and disposition

### Resolved must-fix: unresolved Brand could start a legacy Definition

- **Affected artifact:** migration and readiness design.
- **Consequence:** preserving an unmatched Brand's old fingerprint would let a
  caller start an unstarted legacy Definition even though the new Brand
  readiness rule considered the profile incomplete.
- **Remediation applied:** the proposal now assigns an evaluation-ineligible
  `unresolved` fingerprint domain to the current Brand. The old Definition is
  stale; existing Runs and reports continue from their frozen legacy snapshot.
- **Origin:** introduced risk in the initial proposal, resolved before review
  close.

### Resolved should-fix: special region display lacked a stable downstream identity

- **Affected artifact:** Brand-to-#26 projection.
- **Consequence:** a municipality repeat or direct-county group with only a
  label would not satisfy #26's stable province/city/terminal projection and
  could encourage GEO to reconstruct the grouping.
- **Remediation applied:** `cityContext` now has a stable namespaced projection
  ID and explicit `identityKind`; only official path IDs enter the fingerprint.
- **Origin:** introduced omission, resolved before review close.

### Resolved should-fix: `Other` actual recommendation meaning was implicit

- **Affected artifact:** industry projection.
- **Consequence:** a consumer could freeze the generic catalog help text rather
  than the customer's concrete product/service as the actual Query subject.
- **Remediation applied:** the projection explicitly uses normalized
  `otherProductOrService` as the actual recommendation subject for `Other` and
  keeps catalog text as validation/help metadata.
- **Origin:** introduced ambiguity, resolved before review close.

No other material ownership, dependency-direction, data-integrity, migration,
reuse, or documentation-lifecycle finding remains in this proposal revision.

## Review result

`ready with follow-up` for product-owner decision; `not authorized` for
implementation.

Required follow-up gates:

1. product owner confirms mainland scope, special-city township depth, and
   unmatched-data revision meaning;
2. product/legal owner accepts private-development use and preserves a hard
   commercial-release block until MCA reuse is clarified;
3. implementation proves the documented MCA interface can produce a complete
   source without hidden page endpoints;
4. migration replay and fixed fingerprint vectors prove the proposed
   continuity contract before any PR completion claim.

No ADR is required at proposal time. The ownership and interface are local to
the activated Brand capability and belong in the owner-local current spec after
acceptance. A later cross-change source licensing, multi-country identity, or
runtime-editing decision may justify its own durable record.

## Residual risk

- The current official API and publication were researched, but a complete
  importer has not been executed in this turn.
- Commercial reuse is explicitly unresolved.
- No database migration, OpenAPI contract, build, browser path, or runtime test
  exists yet; the review approves the proposal boundary only.
