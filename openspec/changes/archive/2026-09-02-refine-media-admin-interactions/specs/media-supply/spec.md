# Media Supply delta

## MODIFIED Requirements

### Requirement: Global suppliers and derived resource availability

The administrator-facing derived states SHALL be `ACTIVE`,
`RESOURCE_INACTIVE`, and `SUPPLIER_INACTIVE`. The Web SHALL display these as
`可用`, `停用`, and `因供应商停用` without introducing a separate manual-state
workflow.

### Requirement: Administrator-owned maintenance and audit

The Web SHALL keep delete actions discoverable for platforms, resources, and
suppliers. When deletion is blocked, the action SHALL identify the required
inactive or zero-reference prerequisite. Eligible deletion SHALL require an
explicit confirmation and reason while the backend remains authoritative.

### Requirement: Role-specific administrator maintenance workspace

Record actions SHALL use a consistent visual hierarchy, batch actions SHALL be
grouped with their selection context, and paired form controls SHALL align their
input surfaces even when one field has a hint.
