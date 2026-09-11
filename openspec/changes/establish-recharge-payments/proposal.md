# Change: Establish reliable recharge and WeChat web payment

- Status: A0/B0/C1 and N1–N4 are implemented and verified in their bounded slices. The owner authorized integration of [#83](https://github.com/ZETAVI/GEOEval/pull/83), [#84](https://github.com/ZETAVI/GEOEval/pull/84), [#85](https://github.com/ZETAVI/GEOEval/pull/85) and [#86](https://github.com/ZETAVI/GEOEval/pull/86); those PRs own live merge/head/check evidence. H5, operational acceptance and real activation remain unfinished. The whole Change remains active.
- Issue: [#77](https://github.com/ZETAVI/GEOEval/issues/77)
- Owner: ZETAVI
- Lane/class: product delivery / architectural; Critical money boundary

## Why

Customers need a reliable account-recharge path before paying points for publishing. Finance continues merchant qualification and assets under #75. Credential-free engineering has now established the Native order, payment recovery, atomic funded credit, customer journey and durable customer notification. Controlled verification does not establish real merchant or funds readiness.

## Confirmed direction

- PC Native comes first, followed by mobile external-browser H5. JSAPI remains outside this pair.
- Customers choose amount/method locally, use the selected cashier and return to local order management. Cashier presentation is replaceable; a future provider requires its own official interface and merchant evidence.
- Local commands commit synchronously; channel work and accepted payment receipts are processed asynchronously. Receipt acceptance commits before ACK; ACK does not wait for atomic local settlement. Customer reads and notification delivery never own payment truth.
- Publishing Commerce owns points, reservations and the narrow transaction binding used by Recharge; its independently assembled points capability needs no standalone wallet service. Publication Delivery owns fulfilment and return eligibility.
- Recharge uses whole-renminbi amounts, ten funded points per yuan, four customer states and explicit publishing reconfirmation. Returns, cancellation, QR expiry and client completion cannot manufacture payment facts.
- Official interface rules and discriminating evidence precede dependent integration. Security, concurrency, compatible recovery and financial consistency remain mandatory.

## Scope

In: Recharge lifecycle and ports; bounded Commerce points extraction; durable authenticated notification acceptance and active query/close; once-only funded credit; PC Native and external-browser H5; operational reconciliation and recovery needed for activation.

Out: changing publication fulfilment/point-return semantics; treating point returns as cash refunds; JSAPI, Alipay implementation, aggregate acquiring, commissions, tax integration, a general payment platform or new service deployment. Real money and production enablement retain named-environment and financial controls.

## Current owners and reconciliation

- [Recharge](../../specs/recharge/spec.md) owns accepted customer orders, Native recovery, worker lifecycle, explicit activation and post-settlement delivery obligations; executable ports and schema own exact interfaces and constraints.
- [Publishing Commerce](../../specs/publishing-commerce/spec.md) owns PointAccount/PointChange, origin allocation, purchase and atomic recharge/return writes. [Publication Delivery](../../specs/publication-delivery/spec.md) owns fulfilment and return eligibility.
- [Notification](../../specs/notification/spec.md) owns materialized customer notices, read state and account-safe navigation. Identity remains the session/role/CSRF authority.
- [Product definition](../../specs/product-definition/spec.md) owns product meaning and future invoice rules; [ADR 0005](../../../docs/architecture/adr/0005-atomic-publishing-purchase.md) owns the existing purchase transaction rationale.

Documentation impact: update existing owners and retire obsolete execution summaries in place. The detailed design retains historical slice boundaries explicitly; exact implementation is not duplicated into a new design document. Archive the Change only when its remaining acceptance and workspace exit are complete.

## Acceptance

- [x] Module, money and browser boundaries are explicit; the points extraction is adequate and has been consumed without a broad rewrite.
- [x] Official signature/AES vectors, protocol tamper cases, database constraints, concurrent idempotency, durable receipt/dispatch recovery and atomic credit have bounded evidence.
- [x] Customer API, order history, Native QR and explicit publishing return have controlled HTTP/browser evidence.
- [x] Resident worker process recovery and durable account-safe customer notices have focused, process and browser evidence.
- [ ] H5 implementation and named iOS/Android external-browser journeys.
- [ ] Operational lookup, reconciliation, safe recovery, maintained amount/support policies and real-environment configuration.
- [ ] Required merchant products, financial test controls, real-channel/funds verification and separately authorized production activation.

## Coordination and workspace

The [integration decision](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5628184476) authorizes the four Partial PRs and supersedes earlier merge-permission limits. The user canceled manual-experience preparation after confirming their own verification; its untracked drafts are retained as local artifacts and are not product source. No real-money or production authority follows from this decision.

Earlier implementation and shared-writer windows remain evidenced by their PRs and the [N4 decision](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5611948972). That window has been returned. Future shared schema, public-contract or accounting writes require a fresh occupancy check; no other task worktree is modified by this integration.

Workspace exit: retain the #77 workspace and local research/recovery evidence. PRs and the Issue own live merge, branch and cleanup state. The Change remains open for its unfinished acceptance rather than serving as a second mutable merge ledger.

Remaining design, evidence and sequence: [design](design.md), [review](architecture-review.md), [source brief](source-brief.md), [verification](verification.md), [tasks](tasks.md).
