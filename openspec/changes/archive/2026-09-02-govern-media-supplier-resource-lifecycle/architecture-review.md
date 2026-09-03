# Architecture Review

- Result: `ready`
- Reviewed boundary: Media Supply persistence, domain policy, repository/API,
  generated client, administrator Web workspace, migration, and future durable
  reference seam
- Decision owner: product owner confirmations recorded in this Change

## Findings resolved before implementation

1. Persisting effective resource status would duplicate supplier availability
   and require unsafe fan-out updates. The design stores source facts once and
   derives the effective result.
2. Automatic cascades would turn a temporary availability change into data
   destruction. All three owners require explicit inactivity and reference
   checks; there is no cascade.
3. Client-side multi-update calls could partially succeed. The batch command is
   one repository transaction with a revision per selected resource.
4. Stored association counters could drift. Counts and lists remain query
   projections backed by resource ownership and indexes.
5. A generic workflow/status abstraction is not earned. The owner-local domain
   function and focused commands are the smallest reusable seams.

## Integrity gates

- Supplier/resource revisions are positive and enforced on write.
- Supplier normalized name is unique.
- Yuan cost is integer and non-negative; migration refuses lossy conversion.
- Customer and fulfilment projections require both manual and supplier active.
- Supplier restoration cannot override a manual resource deactivation.
- Destructive commands recheck state, revision, and references inside the same
  transaction and write audit records for each deleted owner.

## Residual risk

The current codebase has no durable order/publication foreign key to these
entities. This change establishes the deletion gate but cannot verify a schema
that does not yet exist. The future order/publication owner must add its blocking
reference to this gate before activation. Production migration, import, and
merge remain outside this implementation authority.
