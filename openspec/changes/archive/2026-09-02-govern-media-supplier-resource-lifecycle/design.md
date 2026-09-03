# Design: Supplier-owned availability and guarded cleanup

## Aggregate boundaries

- `MediaPlatform` owns customer display facts, classification, point price,
  enablement, and revision. It is not automatically changed by resource or
  supplier state.
- `MediaSupplier` owns a unique normalized name, contact facts, availability,
  notes, and revision. Association counts and lists are queried, not stored.
- `MediaResource` owns its platform, exactly one current supplier, publication
  facts, manual status, quality assessment, integer-yuan procurement cost, and
  revision.

## Availability policy

The database stores only manual resource status and supplier status:

| Resource | Supplier | Effective result |
| --- | --- | --- |
| `INACTIVE` | either | `MANUAL_INACTIVE` |
| `ACTIVE` | `INACTIVE` | `SUPPLIER_INACTIVE` |
| `ACTIVE` | `ACTIVE` | `ACTIVE` |

The result is computed by one domain function and returned in administrator
resource projections. It is never persisted or batch-rewritten. Customer
examples and new fulfilment candidates require effective `ACTIVE`. An inactive
record remains visible to administrators. Historical order/publication records
remain the responsibility of their owning snapshot or foreign key.

## Concurrency and commands

Supplier/resource update and deletion require `expectedRevision`. A mutation
increments the owner revision. Batch status update accepts a non-empty list of
`resourceId + expectedRevision` and one target status; the repository locks and
validates every selected resource before updating any of them. One conflict
rolls back the whole batch.

## Deletion

- Platform: `INACTIVE`, zero resources, displayed revision, and no durable
  business reference. No resource cascade.
- Resource: manually `INACTIVE`, displayed revision, and no durable business
  reference. `SUPPLIER_INACTIVE` alone is insufficient.
- Supplier: `INACTIVE`, zero resources, displayed revision, and no durable
  business reference. No resource cascade.

Resource deletion may request `deleteUnreferencedSupplier`. In the same
transaction the repository rechecks both revisions, deletes the resource, then
deletes the supplier only if it is inactive and now unreferenced. Both actions
are audited. An active or still-referenced supplier remains unchanged.

The current schema has no order/publication reference to these owners. The
repository still centralizes the deletion precondition so a future durable
reference is added to this single decision point rather than to the Web.

## Migration

1. Fail if supplier names collide after deterministic normalization.
2. Rename supplier table, enum, columns, indexes, and foreign key while
   preserving identifiers and rows; backfill normalized names and revision 1.
3. Map resource `PAUSED` and `ARCHIVED` to `INACTIVE`, replace the enum, and add
   revision 1.
4. Fail if any stored procurement cost is not divisible by 100; convert valid
   fen values to integer yuan before dropping the old column.
5. Delete the redundant `OVERSEAS_MEDIA` category membership, then replace the
   category enum. `regionScope` remains unchanged.
6. Add positive-revision and non-negative-yuan checks.

Rollback must restore old names and multiply yuan by 100 before recreating the
old cost column. It cannot reconstruct whether an `INACTIVE` resource was
formerly `PAUSED` or `ARCHIVED`; a production rollback would therefore require
a pre-migration state snapshot and explicit approval.

## Interface and reuse

REST nouns change from `/sources` to `/suppliers`; stale names are removed from
OpenAPI and the generated client. Web uses owner-local editor frames, mutation
feedback, list cards, and selection action bar. It does not introduce a generic
form/table framework. Backend keeps Controller -> Service -> Repository/Domain
dependency direction; the effective-status function is the only shared policy.
