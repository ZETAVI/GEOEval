# Design: Discoverable guarded actions and aligned forms

## Vocabulary

The resource itself remains `ACTIVE` or `INACTIVE`; the supplier remains
`ACTIVE` or `INACTIVE`. The derived administrator projection is:

- `ACTIVE` → `可用`;
- `RESOURCE_INACTIVE` → `停用`;
- `SUPPLIER_INACTIVE` → `因供应商停用`.

This preserves the source-of-inactivity distinction required for supplier
restoration without presenting “manual” as a separate workflow or status.

## Delete interaction

Deletion eligibility is still computed from the loaded owner projection and
rechecked by the backend transaction:

- platform: inactive and zero resources;
- resource: inactive;
- supplier: inactive and zero resources.

Every detail surface shows the delete action. A blocked action is disabled and
is paired with the exact prerequisite. An eligible action opens one owner-local
confirmation dialog. The dialog requires a reason, states that deletion cannot
be undone, and for the last resource may offer the existing atomic cleanup of
an inactive unreferenced supplier. Native browser prompt/confirm is removed.

## Component boundary

- `DeleteConfirmDialog` owns delete confirmation presentation and reason input;
  callers still own the specific API command and refresh behavior.
- `FieldHeading` owns only the visual relationship between one field label and
  its concise hint. It does not own validation, values, or field schemas.
- `RecordActions` styling groups record actions but does not introduce a generic
  command registry.

These are owner-local components with three stable consumers. Business
eligibility remains in Media Supply projections/repository, not CSS or a
general UI framework.
