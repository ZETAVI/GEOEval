# Change: 建立发布方案、积分账户与购买订单基础

- Owner: [Issue #65](https://github.com/ZETAVI/GEOEval/issues/65)
- Lane/class: product delivery / architectural
- Baseline: accepted `main@5fb4400`, including #57 correction PR #71
- State: approved implementation and isolated end-to-end verification complete;
  fixed-diff self-review complete; final acceptance, integration decision and
  post-integration reconciliation remain

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
and recovery. On 2026-09-06 the owner explicitly approved atomic purchase,
article/price reconfirmation, granted-only administration for this stage and the
normal administrator-to-customer purchase journey. Real recharge/payment follows
this stage. This permits scoped implementation and isolated validation, not
production money, deployment or activation.

## Documentation and workspace control

- Keep this parent Change active until full acceptance. Reconcile implemented
  slices into the existing [architecture overview](../../../docs/architecture/overview.md)
  and current owner-local specs in their PR, effective on merge; do not promote
  unimplemented proposals or duplicate the glossary.
- Execute Product Definition's `split-on-activation` marker for activated purchase
  and point-account behavior when implemented; retain payment, returns, commission
  and fulfilment scenarios with their unactivated owners. No duplicate current rules.
- Extend the existing GEO Optimization handoff and Media Supply quote/deletion
  contracts in place. [ADR 0005](../../../docs/architecture/adr/0005-atomic-publishing-purchase.md)
  records the accepted cross-module atomic-purchase decision; no speculative
  framework document.
- Workspace: current #57 worktree reused cleanly; branch
  `codex/issue-65-publishing-commerce`, main-direct from `5fb4400`. This task is the
  single writer for its Change and later approved schema/composition/client changes.
- #39 stays independent. Recheck shared schema, generated client, composition and
  styles against main before each implementation slice. Use dedicated test data.
- Current bounded package now reaches atomic purchase and owned pending orders.
  Current specs own activated semantics; PR #72 owns the fixed revision, HTTP/
  concurrency, browser, narrow-width and migration/recovery evidence. The prior
  footer screenshot gap has been resolved in Chrome, and a discovered hidden
  purchase-context paragraph was fixed and visually rechecked.
- Exit: PR review/integration gate, not production activation. Retain this branch
  for the same outcome; archive this Change at final acceptance, then reconcile
  Issue/Project/workspace after an explicitly authorized integration. Do not use
  the Change as a backlog for payment or fulfilment. No extra worktree or stack.
