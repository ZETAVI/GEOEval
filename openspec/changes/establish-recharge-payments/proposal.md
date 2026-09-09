# Change: Establish reliable recharge and WeChat web payment

- Status: A0 in [PR #78](https://github.com/ZETAVI/GEOEval/pull/78); B0 in [PR #80](https://github.com/ZETAVI/GEOEval/pull/80); C1 atomic core and an isolated Native checkout component implemented and verified in [PR #82](https://github.com/ZETAVI/GEOEval/pull/82); dispatch/customer API integration still pending; no application/payment activation
- Issue: [#77](https://github.com/ZETAVI/GEOEval/issues/77)
- Owner: ZETAVI
- Lane/class: product delivery / architectural; Critical money boundary

## Why

GEOEval already owns account points and atomic publishing purchases, but customers cannot yet recharge online. Finance is progressing merchant assets under #75. The engineering work can establish a reliable recharge boundary before credentials arrive, while avoiding conflicting edits to #73's publication delivery and upcoming point-return path.

## Confirmed direction

- The owner accepted PC Native followed by mobile external-browser H5. JSAPI is outside this first pair of slices.
- Reference-site exploration clarifies the preferred customer experience: choose amount/method locally, use an independent cashier, then return to local order management. This does not select Doit or another third-party acquirer. Native QR remains a verified direct-channel capability; a hosted PC route needs its actual provider contract/merchant decision before customer activation (design 11.0).
- The owner accepted independently assembling point-account capability inside Publishing Commerce, with explicit responsibility for recharge, purchase and point return; no standalone wallet service.
- Confirmed product rules remain whole-yuan amounts, ten points per yuan, funded-only recharge, four customer states and explicit publishing reconfirmation after recharge.
- Official interface rules and discriminating evidence precede SDK choice and runtime integration. Security, concurrency, rollback and consistency are part of the outcome.

## Scope

In: formal Recharge lifecycle/ports; a bounded Commerce points extraction; verified notification inbox and active query/close; atomic funded credit; PC Native and external-browser H5; operational reconciliation and recovery needed to enable those flows.

Out: changing #73's fulfilment semantics; pretending point returns are cash refunds; JSAPI, Alipay implementation, aggregate acquiring, commissions, tax integration, general payment platform or new service deployment. Real money and production enablement keep their named-environment and financial controls.

## Impact and canonical owners

- Recharge gains the new business module and current spec only after accepted implementation.
- Publishing Commerce retains PointAccount/PointChange, origin allocation and money idempotency; its current spec later gains recharge-credit and reservation rules.
- Identity's customer role/ownership/CSRF behavior remains; only provider callbacks use precise existing public/CSRF-exempt route metadata plus cryptographic authentication.
- API/Worker composition gains narrow Recharge/Commerce points imports. Existing Evaluation outbox remains Evaluation-owned.
- Existing accepted sources: [product definition](../../specs/product-definition/spec.md), [Commerce spec](../../specs/publishing-commerce/spec.md), [ADR 0005](../../../docs/architecture/adr/0005-atomic-publishing-purchase.md). This change does not declare their future behavior already active.

Documentation impact: move the former local architecture, review and API brief into this change; update the remaining #75 preparation indexes to link here. No second active architecture candidate or glossary. On acceptance, reconcile executable owners/current specs and the affected ADR, then archive this change. Current-spec evolution markers are untouched in P0.

## Coordination and workspace

Historical A0/B0 base was a550fc4 after [#76 integration](https://github.com/ZETAVI/GEOEval/pull/76#issuecomment-5583603102). A0 was rebased without code changes to dfe98bc; its new exact-head CI passed. The points extraction was implemented in [PR #79](https://github.com/ZETAVI/GEOEval/pull/79), with its own [producer evidence](https://github.com/ZETAVI/GEOEval/pull/79#issuecomment-5583740565). It has since been [integrated into main@bcb81db](https://github.com/ZETAVI/GEOEval/pull/79#issuecomment-5587460726). That assembly-only change does not provide reservations/writer; C1 now implements them under its own approved window.

The [A0 approval](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5582243258) starts a bounded non-conflicting code package on codex/issue-77-wechat-adapter from 0552aa7, reusing this workspace. Scope is Recharge protocol/business ports, the Native gateway, targeted tests/public fixtures and this owner-local change. No schema, application composition, customer API/UI, Commerce or environment activation changes. Existing locked project dependencies are installed; no new payment dependency is introduced.

P0 experiments remain local research material. Executable types own A0/B0 behavior; the remaining points/orchestration sections are proposed behavior. Existing locked dependencies are reused without new payment packages.

The [B0 window](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5583465643) assigns only additive Recharge observation/receipt schema and owned code to #77. #73 retains points/module/return ownership; the [B0 handoff](https://github.com/ZETAVI/GEOEval/pull/80#issuecomment-5584078408) ended that window, and later shared writes require a new coordination checkpoint. B0 uses a linear stacked branch `codex/issue-77-recharge-notification-inbox` against A0; it does not edit current API/Identity composition or any Commerce table. Host composition is exercised only by a real Nest/Identity integration test. Neither PR is implicitly authorized to merge or deploy.

Workspace exit: retain this #77 worktree, A0/B0 branches, the pre-rebase A0 recovery tag and local research artifacts. Only the named #77 test database/Redis are used. PRs own fixed diffs/evidence; this does not activate Recharge in main or production.

## Acceptance

- [x] User-confirmed module and browser direction is explicit; actual owner/PR state has been refreshed.
- [x] #73 coordination identifies the extraction boundary and deferred shared write window.
- [x] Proposal, design, behavior deltas and ordered tasks have a single active home.
- [x] Published WeChat request-signature and official Java AES-256-GCM vectors are checked offline, with tamper negatives and clear limits.
- [ ] Runtime contracts, DB constraints, concurrent idempotency, inbox recovery and Native/H5 journeys are implemented and tested in their named slices.
- [ ] Required merchant products/environment, business amount limits and operational cash-exception handling are settled before dependent activation.

Current execution: the user approved [C1 implementation](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5587176110) and #73 confirmed its [bounded shared writer window](https://github.com/ZETAVI/GEOEval/issues/73#issuecomment-5587081614). C1 core is implemented on a linear successor to #80, now including #79 from accepted main. It does not alter #73 fulfilment/return semantics or authorize payment PR merge, live merchant calls or application activation.

Concrete architecture, failure cases and verification: [design](design.md), [review](architecture-review.md), [source brief](source-brief.md), [verification](verification.md), [tasks](tasks.md).
