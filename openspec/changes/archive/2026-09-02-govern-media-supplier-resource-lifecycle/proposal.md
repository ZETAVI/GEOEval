# Change: Govern media suppliers and resource lifecycle

## Why

The administrator review of Issue #37 confirmed that the current
`MediaSupplySource` shape is neither merely a platform-local note nor a complete
shared supplier. Resources also have three stored states while supplier
availability is checked independently, which makes the administrator infer an
unstated effective state. Deletion currently lacks revision guards and explicit
inactive prerequisites. These gaps are reachable once the first supplier is
reused across platforms or an administrator maintains many resources at once.

## Outcome

Make `MediaSupplier` a global administrator-owned entity. Each media resource
has exactly one current supplier, a two-state manual status, its own revision,
and an effective availability derived from the resource and supplier states.
Provide guarded deletion and atomic batch resource activation/deactivation.

## Scope

- Rename and migrate supply sources to globally unique media suppliers.
- Store procurement cost as a non-negative integer RMB-yuan value.
- Remove `OVERSEAS_MEDIA`; use `regionScope` as the only domestic/overseas fact.
- Add resource and supplier optimistic-concurrency revisions.
- Derive resource effective availability without persisting it.
- Keep inactive suppliers/resources visible to administrators while excluding
  them from customer examples and new fulfilment candidates.
- Add supplier association counts/details and owner-local navigation.
- Add explicit deletion prerequisites and optional atomic cleanup of an
  unreferenced inactive supplier after resource deletion.
- Add one all-or-nothing batch resource status command.

## Non-goals

- Supplier user accounts, supplier login, contracts, quotations, commissions,
  multiple current suppliers per resource, or automated supplier selection.
- Cascading platform/supplier/resource deletion.
- Mutating historical order or publication snapshots.
- Importing the Issue #34 workbook or deploying to production.

## Approved decisions

1. Platform status is independent of supplier and resource availability.
2. A supplier is global and reusable across platforms; one resource has one
   current supplier in the first release.
3. Stored resource status is only `ACTIVE` or `INACTIVE`. Effective status is
   `ACTIVE`, `MANUAL_INACTIVE`, or `SUPPLIER_INACTIVE`, with manual inactivity
   taking precedence.
4. Supplier restoration automatically restores only manually active resources.
5. Deletion always requires explicit inactivity, no durable business reference,
   the displayed revision, and no cascade.
6. Batch status changes are one atomic command with an expected revision for
   every selected resource.

## Ownership

This remains part of Issue #37 and PR #38. Media Supply owns the persisted
supplier/resource lifecycle, derived availability policy, and administrator
contract. Identity remains the role authority. Future order/publication modules
own durable order references and historical snapshots.
