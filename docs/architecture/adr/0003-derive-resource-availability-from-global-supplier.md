# ADR 0003: Derive Resource Availability from a Global Supplier

- Status: Accepted
- Date: 2026-09-02

## Context

The first administrator implementation named the partner record
`MediaSupplySource`, stored three resource states, and checked partner status as
another eligibility condition. The name did not express whether the record was
platform-local or globally reusable, and no single contract explained whether a
resource disabled by its partner should be rewritten or restored later.

The confirmed first-release rules are simpler: a supplier can support resources
across platforms; one resource has one current supplier and its own enabled or
disabled state; supplier downtime must temporarily block use without erasing
that resource state.

## Decision

- Replace `MediaSupplySource` with globally reusable `MediaSupplier` and enforce
  normalized-name uniqueness.
- Store one supplier reference on each resource.
- Store only `ACTIVE` or `INACTIVE` as the resource's own status.
- Derive effective status as `ACTIVE`, `SUPPLIER_INACTIVE`, or
  `RESOURCE_INACTIVE`; resource inactivity takes precedence.
- Do not store effective status or association counters.
- Use owner revisions for suppliers and resources. Batch resource status changes
  are one atomic command with an expected revision per resource.
- Require explicit inactivity, no blocking durable reference, and a matching
  revision before deletion. Never cascade deletion. The last inactive supplier
  may be explicitly removed with its inactive resource in one rechecked
  transaction.

## Consequences

- Supplier recovery automatically restores only resources whose own state is active.
- Customer examples and new fulfilment candidates use the same effective-status
  policy; inactive records remain visible to administrators.
- Platform sale state remains an independent administrator decision.
- Future order/publication owners must add their durable references to the
  centralized deletion gate before activation.
- Procurement cost is stored and transported as an integer RMB-yuan value, and
  geography is represented only by platform region scope rather than category.

## Alternatives considered

- Persist effective status and rewrite resources when supplier status changes:
  rejected because it duplicates source facts, creates fan-out writes, and
  cannot safely distinguish resource-owned from supplier-caused inactivity.
- Keep suppliers nested under a platform: rejected because the same commercial
  partner is already reusable across platform resources.
- Cascade delete resources with a supplier: rejected because temporary
  availability is not authority to destroy operational or historical facts.

## Revisit when

- one resource needs multiple simultaneously valid suppliers or supplier offers;
- fulfilment selection requires contract, capacity, schedule, or price ownership
  beyond the current supplier/resource boundary;
- a durable order or publication schema introduces new deletion blockers.
