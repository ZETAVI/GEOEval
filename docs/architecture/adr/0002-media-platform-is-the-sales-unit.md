# ADR 0002: Media Platform Is the First-Release Sales Unit

- Status: Accepted
- Date: 2026-09-02
- Supersedes: The separate one-to-one platform Listing decision in the Media
  Supply foundation

## Context

The Media Supply foundation separated stable platform facts from a zero-or-one
sales Listing with its own Draft, on-shelf, paused, and off-shelf lifecycle. The
administrator workspace made the cost of that decision visible: one platform
had two status controls, two mutation paths, a transition table, and user-facing
language for a distinction that the first-release business does not make.

The confirmed first-release rule is that one media platform already is one
priced sales configuration. Stopping orders means disabling that platform. No
approved requirement currently needs multiple prices, schedules, territories,
packages, or independently sellable variants under one platform.

## Decision

Store first-release availability and whole-point price directly on
`MediaPlatform`:

- status is `INACTIVE` or `ACTIVE` and defaults to `INACTIVE`;
- an active platform must have a positive whole-number point price;
- changing a platform to inactive immediately makes it non-buyable while
  retaining its identity, resources, audit, and historical references;
- one platform revision protects all administrator platform edits from stale
  overwrite and is returned with synchronous quotes;
- the administrator API and Web form mutate the platform aggregate directly;
- concrete resources and internal suppliers keep their separate ownership
  because their visibility, fulfilment, procurement, and contact facts vary
  independently.

The migration preserves the existing Listing price and revision. Only a
previously active platform with an on-shelf Listing remains active; every other
combination becomes inactive. Historical Listing audit entries remain immutable
evidence and are not rewritten.

## Consequences

- Administrators see one status control: enable or disable.
- Draft, pause, off-shelf, allowed-transition projection, and the separate
  Listing endpoint and table disappear.
- The platform module remains the only owner of availability, price, optimistic
  concurrency, customer projection, and quote semantics.
- Disabling is reversible and does not delete platform or resource facts.
- The data migration removes the redundant Listing table after preserving the
  fields that remain meaningful.

## Alternatives considered

- Keep the separate Listing internally and derive one Web status: rejected
  because the unused lifecycle, duplicated contract, and transition ownership
  would remain and could drift behind a simpler presentation.
- Keep separate records but force a one-to-one Listing at platform creation:
  rejected because it adds a persistence and API boundary without independent
  variability or ownership.

## Revisit when

- one platform needs more than one independently priced offer, territory,
  schedule, service level, or customer-selectable variant;
- packages require an independently addressable sellable item rather than a
  composition of platform selections;
- a published Commerce contract proves that platform identity and the priced
  unit must change independently.
