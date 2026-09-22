# Change: Establish reliable recharge and web payments

- Status: Completed for the protected desktop-payment pilot. A0/B0/C1,
  N1–N4, administrator lookup, resident API/Worker/callback composition and
  both desktop channels are implemented. Production evidence now contains
  three successful ¥1 recharges (one Alipay PC and two WeChat Native), three
  canonical payment observations/receipts and 30 funded points. Public desktop
  operation continues under #157; mobile Web continues under #158. This Change
  is archived after current-spec and evidence reconciliation.
- Issue: [#77](https://github.com/ZETAVI/GEOEval/issues/77)
- Owner: ZETAVI
- Lane/class: product delivery / architectural; Critical money boundary

## Why

Customers need a reliable account-recharge path before paying points for publishing. Finance continues merchant qualification and assets under #75. Credential-free engineering has now established the Native order, payment recovery, atomic funded credit, customer journey and durable customer notification. Controlled verification does not establish real merchant or funds readiness.

## Confirmed direction

- Latest owner decision (2026-09-22): the certified/bound WeChat service-account AppID and Native merchant, Alipay PC product/app and both protected credential sets are activated only in the authenticated internal pilot. One real ¥1 payment per desktop channel has passed. Alipay mobile website payment, WeChat H5 and JSAPI remain separate later decisions.
- `geohdp.com` remains the minimal truthful public site using the confirmed filing 粤ICP备11067188号-12. `app.geohdp.com` now hosts the separately protected internal application pilot on the nominated Alibaba Cloud host; this is not a claim of unrestricted public product launch or formal mobile payment coverage.
- Customers choose amount/method locally, use the selected cashier and return to local order management. Cashier presentation is replaceable; a future provider requires its own official interface and merchant evidence.
- Local commands commit synchronously; channel work and accepted payment receipts are processed asynchronously. Receipt acceptance commits before ACK; ACK does not wait for atomic local settlement. Customer reads and notification delivery never own payment truth.
- Publishing Commerce owns points, reservations and the narrow transaction binding used by Recharge; its independently assembled points capability needs no standalone wallet service. Publication Delivery owns fulfilment and return eligibility.
- Recharge uses whole-renminbi amounts, ten funded points per yuan, four customer states and explicit publishing reconfirmation. Returns, cancellation, QR expiry and client completion cannot manufacture payment facts.
- Official interface rules and discriminating evidence precede dependent integration. Security, concurrency, compatible recovery and financial consistency remain mandatory.
- The owner confirmed reliability rather than mandatory full automation: ordinary transient failures should recover with bounded work, while unsafe financial discrepancies retain human escalation. R1 recovery and truthful cross-surface status precede management actions; read-only management and reconciliation follow. R1 is merged through PR #87. The owner accepted administrator read-only recharge lookup as the next bounded slice; O1a is merged through PR #88, with accepted behavior reconciled into the Recharge spec; its integration checkpoint owns exact merge and CI evidence.
- The owner subsequently simplified customer presentation to the existing four statuses and short copy. No public recovery-stage hint is added for that purpose. Customer support is a separate persistent entry; its placement and interaction are deferred, and R1 does not highlight or change it based on payment state.

## Scope

In: Recharge lifecycle and ports; bounded Commerce points extraction; durable authenticated notification acceptance and active query/close; once-only funded credit; WeChat Native and Alipay PC desktop journeys; bounded recovery, administrator read-only lookup and customer notification for the protected pilot.

Out after the accepted scope decision: public desktop operational activation,
T+1 reconciliation and ambiguous no-submit/expiry terminalization (#157);
Alipay WAP, WeChat H5 and mobile-browser acceptance (#158); JSAPI, aggregate
acquiring, commissions, tax integration and a general payment platform.

## Current owners and reconciliation

- [Recharge](../../../specs/recharge/spec.md) owns accepted customer orders, Native recovery, worker lifecycle, explicit activation and post-settlement delivery obligations; executable ports and schema own exact interfaces and constraints.
- [Publishing Commerce](../../../specs/publishing-commerce/spec.md) owns PointAccount/PointChange, origin allocation, purchase and atomic recharge/return writes. [Publication Delivery](../../../specs/publication-delivery/spec.md) owns fulfilment and return eligibility.
- [Notification](../../../specs/notification/spec.md) owns materialized customer notices, read state and account-safe navigation. Identity remains the session/role/CSRF authority.
- [Product definition](../../../specs/product-definition/spec.md) owns product meaning and future invoice rules; [ADR 0005](../../../../docs/architecture/adr/0005-atomic-publishing-purchase.md) owns the existing purchase transaction rationale.

Documentation impact: accepted Recharge and Commerce behavior is reconciled into
their current specs. Detailed design and historical slice evidence remain in the
archived Change; #157 and #158 own all later acceptance rather than keeping this
completed parent as a mutable roadmap.

## Acceptance

- [x] Module, money and browser boundaries are explicit; the points extraction is adequate and has been consumed without a broad rewrite.
- [x] Official signature/AES vectors, protocol tamper cases, database constraints, concurrent idempotency, durable receipt/dispatch recovery and atomic credit have bounded evidence.
- [x] Customer API, order history, Native QR and explicit publishing return have controlled HTTP/browser evidence.
- [x] Resident worker process recovery and durable account-safe customer notices have focused, process and browser evidence.
- [ ] Transferred to #158: H5/WAP implementation and named iOS/Android external-browser journeys.
- [x] Administrator read-only lookup and bounded transient recovery.
- [ ] Transferred to #157: reconciliation, ambiguous expiry handling and maintained public-operation policies.
- [x] Dual-provider host composition and protected WeChat configuration.
- [x] Controlled Native merchant verification, public callback and real-funds acceptance for the desktop internal pilot.
- [x] Required desktop merchant products, bounded ¥1 financial tests, real-channel/funds verification and separately authorized internal-pilot activation.

## Coordination and workspace

The [integration decision](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5628184476) authorized the four now-merged Partial PRs and superseded their earlier merge-permission limits. The user canceled manual-experience preparation and later authorized cleanup: canceled scripts, the stopped dedicated Redis container and the merged temporary integration worktree were removed; test records, databases, the Redis volume and research evidence were retained. No real-money or production authority follows from these decisions.

Earlier implementation and shared-writer windows remain evidenced by their PRs and the [N4 decision](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5611948972). That window has been returned. The [R1 execution checkpoint](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5630151311) records the refreshed bounded window; M4 confirmed no overlapping Recharge/schema/UI writes. No other task worktree is modified.

Workspace exit: the final reconciliation branch is removed after integration.
Protected merchant material and production recovery evidence remain in their
host-owned locations; no local credential copy is part of the archived Change.
Issues #157 and #158 are the only continuation owners.

Remaining design, evidence and sequence: [design](design.md), [review](architecture-review.md), [source brief](source-brief.md), [verification](verification.md), [tasks](tasks.md).
