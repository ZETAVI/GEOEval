# Media Supply delta

## ADDED Requirements

### Requirement: Global supplier ownership

The system SHALL maintain each media supplier once across all platforms, SHALL
enforce normalized supplier-name uniqueness, and SHALL derive association counts
and lists from current resources.

### Requirement: Derived resource availability

The system SHALL store only manual resource status and supplier status, SHALL
derive effective availability from both, and SHALL exclude non-effective
resources from customer examples and new fulfilment candidates.

### Requirement: Guarded cleanup and batch maintenance

The system SHALL require inactivity, no blocking reference, and an expected
revision before deletion. Batch resource status changes SHALL be atomic and
SHALL reject the entire request when any selected revision is stale.

## MODIFIED Requirements

### Requirement: Administrator maintenance

Administrators SHALL manage platforms/resources and global suppliers as separate
workspace areas. Inactive records and their associations remain visible to
administrators. Resource cost SHALL use non-negative integer RMB yuan.

### Requirement: Classification

Media category SHALL not encode geography. Domestic/overseas filtering SHALL use
the platform region scope exclusively.

## REMOVED Requirements

- `MediaSupplySource` as a local or ambiguous source concept.
- `PAUSED` and `ARCHIVED` resource states.
- `OVERSEAS_MEDIA` category membership.
- RMB-fen procurement cost transport and storage.
