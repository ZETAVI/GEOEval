# Design: Platform-owned price and availability

## Ownership

`MediaPlatform` owns display facts, classification, enabled or disabled state,
point price, and revision. `MediaResource` continues to own concrete publishing
references, and `MediaSupplySource` continues to own partner contacts and
internal source availability.

## Contract

The existing platform create and patch routes accept price and status. Platform
patches require the displayed `expectedRevision`; a stale request returns a
conflict and the Web offers an explicit refresh before resubmission. Customer
catalog and quote reads require `ACTIVE` plus a positive point price.

## Data migration

Rename the reversible platform status `ARCHIVED` value to `INACTIVE`, add
`point_price` and `revision`, and backfill them from the optional Listing. A
platform remains active only when its prior platform state was active and its
Listing was on shelf. Platforms without a Listing and every other Listing state
become inactive. Drop the Listing table and enum only after the backfill.

Database checks keep the revision positive, the optional price positive, and an
active platform priced. Existing audit JSON is append-only and remains readable.

## Interface alternatives

1. A Web-only derived status would minimize migration work but leave two domain
   owners and two mutation paths behind one label.
2. A platform-owned state and price removes the unearned seam while preserving
   the independent resource and source seams.

Option 2 is selected because it is the smallest interface matching confirmed
first-release variability.
