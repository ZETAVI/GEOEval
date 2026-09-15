# Change: Establish reliable recharge and web payments

- Status: A0/B0/C1 and N1–N4 are implemented and verified in their bounded slices. The owner authorized integration of [#83](https://github.com/ZETAVI/GEOEval/pull/83), [#84](https://github.com/ZETAVI/GEOEval/pull/84), [#85](https://github.com/ZETAVI/GEOEval/pull/85) and [#86](https://github.com/ZETAVI/GEOEval/pull/86); those PRs own live merge/head/check evidence. H5, operational acceptance and real activation remain unfinished. The whole Change remains active.
- Issue: [#77](https://github.com/ZETAVI/GEOEval/issues/77)
- Owner: ZETAVI
- Lane/class: product delivery / architectural; Critical money boundary

## Why

Customers need a reliable account-recharge path before paying points for publishing. Finance continues merchant qualification and assets under #75. Credential-free engineering has now established the Native order, payment recovery, atomic funded credit, customer journey and durable customer notification. Controlled verification does not establish real merchant or funds readiness.

## Confirmed direction

- Latest owner decision (2026-09-15): Alipay PC is the primary payment route and its application, product, keys and code path are ready for public callback and small-payment acceptance. WeChat finance qualification continues separately; the customer page shows WeChat as unavailable and cannot select it. Dual-provider runtime composition and the legacy Native naming seam wait until WeChat work resumes. Alipay mobile website payment follows PC acceptance; WeChat H5 and JSAPI remain separate later decisions.
- Website preparation is a minimal truthful static page at geohdp.com, whose company-held ICP filing the owner confirmed. The HTTPS page is deployed in an isolated directory on the nominated Alibaba Cloud host; app.geohdp.com remains reserved and the business application is not deployed. Full application launch and production login were not prerequisites for the static page. The owner provided website filing 粤ICP备11067188号-12 and chose to omit public company/telephone text from the introduction page; the footer uses the Guangdong filing and official link.
- Customers choose amount/method locally, use the selected cashier and return to local order management. Cashier presentation is replaceable; a future provider requires its own official interface and merchant evidence.
- Local commands commit synchronously; channel work and accepted payment receipts are processed asynchronously. Receipt acceptance commits before ACK; ACK does not wait for atomic local settlement. Customer reads and notification delivery never own payment truth.
- Publishing Commerce owns points, reservations and the narrow transaction binding used by Recharge; its independently assembled points capability needs no standalone wallet service. Publication Delivery owns fulfilment and return eligibility.
- Recharge uses whole-renminbi amounts, ten funded points per yuan, four customer states and explicit publishing reconfirmation. Returns, cancellation, QR expiry and client completion cannot manufacture payment facts.
- Official interface rules and discriminating evidence precede dependent integration. Security, concurrency, compatible recovery and financial consistency remain mandatory.
- The owner confirmed reliability rather than mandatory full automation: ordinary transient failures should recover with bounded work, while unsafe financial discrepancies retain human escalation. R1 recovery and truthful cross-surface status precede management actions; read-only management and reconciliation follow. R1 is merged through PR #87. The owner accepted administrator read-only recharge lookup as the next bounded slice; O1a is merged through PR #88, with accepted behavior reconciled into the Recharge spec; its integration checkpoint owns exact merge and CI evidence.
- The owner subsequently simplified customer presentation to the existing four statuses and short copy. No public recovery-stage hint is added for that purpose. Customer support is a separate persistent entry; its placement and interaction are deferred, and R1 does not highlight or change it based on payment state.

## Scope

In: Recharge lifecycle and ports; bounded Commerce points extraction; durable authenticated notification acceptance and active query/close; once-only funded credit; PC Native, Alipay PC/mobile website payments and external-browser H5; operational reconciliation and recovery needed for activation.

Out: changing publication fulfilment/point-return semantics; treating point returns as cash refunds; JSAPI, aggregate acquiring, commissions, tax integration, a general payment platform or full application deployment. A minimal static public introduction is included in website-payment preparation. Real money and production enablement retain named-environment and financial controls.

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

The [integration decision](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5628184476) authorized the four now-merged Partial PRs and superseded their earlier merge-permission limits. The user canceled manual-experience preparation and later authorized cleanup: canceled scripts, the stopped dedicated Redis container and the merged temporary integration worktree were removed; test records, databases, the Redis volume and research evidence were retained. No real-money or production authority follows from these decisions.

Earlier implementation and shared-writer windows remain evidenced by their PRs and the [N4 decision](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5611948972). That window has been returned. The [R1 execution checkpoint](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5630151311) records the refreshed bounded window; M4 confirmed no overlapping Recharge/schema/UI writes. No other task worktree is modified.

Workspace exit: retain the #77 workspace and local research/recovery evidence. PRs and the Issue own live merge, branch and cleanup state. The Change remains open for its unfinished acceptance rather than serving as a second mutable merge ledger.

Remaining design, evidence and sequence: [design](design.md), [review](architecture-review.md), [source brief](source-brief.md), [verification](verification.md), [tasks](tasks.md).
