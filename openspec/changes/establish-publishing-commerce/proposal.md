# Change: 建立发布方案、积分账户与购买订单基础

- Owner: [Issue #65](https://github.com/ZETAVI/GEOEval/issues/65)
- Lane/class: product delivery / architectural
- Baseline: accepted `main@5fb4400`, including #57 correction PR #71
- State: proposal ready for owner architecture approval; no Commerce runtime yet

## Why

The accepted customer journey now reaches a confirmed Core Article. Media Supply
already owns priced platforms, but customers cannot select a publishing service,
review points, submit a purchase or see an order. This change connects that next
bounded outcome without waiting for #39 evaluation-quality work.

## Scope

In: administrator-maintained random packages; customer-safe package/platform
selection; saved unpaid selection and server quote; account-scoped points and
append-only adjustments; atomic purchase of an exact confirmed article revision;
immutable commercial snapshot; pending-order list/detail. Administrator grants
provide the bounded local validation path, not simulated online recharge.

Out: real payment/recharge, refunds, invoices, attribution/commission, operations
claiming or fulfilment, article variants, real Writer/material preparation,
notifications without a consumer, production deployment or commercial activation.
The overall commercial-release boundary remains unchanged.

## Accepted context and proposed delta

Reuse [product meaning](../../../docs/product/glossary.md), the two publishing
choices and points rules in [Product Definition](../../specs/product-definition/spec.md),
[GEO Optimization](../../specs/geo-optimization/spec.md), and
[Media Supply](../../specs/media-supply/spec.md).

The [delta spec](specs/publishing-commerce/spec.md) defines this stage's observable
behavior. The [design](design.md) fixes the transaction participants, source
references versus necessary snapshots, idempotency, data constraints, migration
and recovery. Owner approval is required before persistent Commerce implementation;
the existing direction to continue authorizes this proposal, not production money.

## Documentation and workspace control

- Add only this temporary Change now. Do not promote proposed behavior to current
  specs or duplicate the glossary. Use the existing [architecture overview](../../../docs/architecture/overview.md)
  and current owner-local specs during implementation reconciliation.
- Execute Product Definition's `split-on-activation` marker for activated purchase
  and point-account behavior when implemented; retain payment, returns, commission
  and fulfilment scenarios with their unactivated owners. No duplicate current rules.
- Extend the existing GEO Optimization handoff and Media Supply quote/deletion
  contracts in place. A short ADR will record the accepted cross-module atomic
  purchase decision after approval; no speculative framework document.
- Workspace: current #57 worktree reused cleanly; branch
  `codex/issue-65-publishing-commerce`, main-direct from `5fb4400`. This task is the
  single writer for its Change and later approved schema/composition/client changes.
- #39 stays independent. Recheck shared schema, generated client, composition and
  styles against main before each implementation slice. Use dedicated test data.
- Exit for this package: reviewable proposal PR and Issue `Review / Decision`;
  retain this branch for the same outcome. No extra worktree or integration branch.
