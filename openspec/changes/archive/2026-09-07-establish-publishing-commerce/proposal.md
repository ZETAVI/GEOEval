# Archived change: 建立发布方案、积分账户与购买订单基础

- Owner: [Issue #65](https://github.com/ZETAVI/GEOEval/issues/65)
- Lane/class: product delivery / architectural
- Baseline: accepted `main@5fb4400`, including #57 correction PR #71
- State: accepted bounded business outcome; archived for the authorized Final
  PR #72 integration. PR/Issue own the live checks and post-integration closeout.

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

Reuse [product meaning](../../../../docs/product/glossary.md), the two publishing
choices and points rules in [Product Definition](../../../specs/product-definition/spec.md),
[GEO Optimization](../../../specs/geo-optimization/spec.md), and
[Media Supply](../../../specs/media-supply/spec.md).

The [delta spec](specs/publishing-commerce/spec.md) defines this stage's observable
behavior. The [design](design.md) fixes the transaction participants, source
references versus necessary snapshots, idempotency, data constraints, migration
and recovery. On 2026-09-06 the owner explicitly approved atomic purchase,
article/price reconfirmation, granted-only administration for this stage and the
normal administrator-to-customer purchase journey. Real recharge/payment follows
this stage. This permits scoped implementation and isolated validation, not
production money, deployment or activation.

## Documentation and workspace control

- Implemented behavior is reconciled into the existing
  [architecture overview](../../../../docs/architecture/overview.md) and current
  owner-local specs, effective on merge. This archive preserves decision history,
  not a second current owner or future capability backlog.
- Execute Product Definition's `split-on-activation` marker for activated purchase
  and point-account behavior when implemented; retain payment, returns, commission
  and fulfilment scenarios with their unactivated owners. No duplicate current rules.
- Extend the existing GEO Optimization handoff and Media Supply quote/deletion
  contracts in place. [ADR 0005](../../../../docs/architecture/adr/0005-atomic-publishing-purchase.md)
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
- Final acceptance: human testing accepted the business path; cross-role visual
  redesign remains an independently owned follow-up, not commercial UX acceptance.
  Two stale capability descriptions were corrected without changing transactions,
  permissions, layout or API. The owner authorized orderly integration on
  2026-09-07; merge and post-integration evidence remain in PR #72.
- Exit: retain this exact checkout and branch as the isolated human-review
  runtime/recovery baseline until the owner finishes that review or authorizes
  its replacement. Do not reset the review database, rebuild under the running
  Web process, or modify independent worktrees. Post-merge state is owned by the
  PR checkpoint; no production activation or speculative implementation branch.
