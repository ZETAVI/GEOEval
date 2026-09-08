# Change: Establish reliable recharge and WeChat web payment

- Status: A0 implemented and submitted in [PR #78](https://github.com/ZETAVI/GEOEval/pull/78); no application/payment activation
- Issue: [#77](https://github.com/ZETAVI/GEOEval/issues/77)
- Owner: ZETAVI
- Lane/class: product delivery / architectural; Critical money boundary

## Why

GEOEval already owns account points and atomic publishing purchases, but customers cannot yet recharge online. Finance is progressing merchant assets under #75. The engineering work can establish a reliable recharge boundary before credentials arrive, while avoiding conflicting edits to #73's publication delivery and upcoming point-return path.

## Confirmed direction

- The owner accepted PC Native followed by mobile external-browser H5. JSAPI is outside this first pair of slices.
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

Baseline main remains 0552aa7. The #73 owner's [fixed result checkpoint](https://github.com/ZETAVI/GEOEval/pull/76#issuecomment-5581859806) is PR #76@0a88a5b after result-review fixes. It explicitly retains browser/recovery work and confirms points extraction is not implemented. The #73 owner retains the single-writer extraction window after its stable result slice and before point-return implementation; a new result commit alone does not open that window.

The [A0 approval](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5582243258) starts a bounded non-conflicting code package on codex/issue-77-wechat-adapter from 0552aa7, reusing this workspace. Scope is Recharge protocol/business ports, the Native gateway, targeted tests/public fixtures and this owner-local change. No schema, application composition, customer API/UI, Commerce or environment activation changes. Existing locked project dependencies are installed; no new payment dependency is introduced.

P0 experiments remain local research material; the PR carries their durable checkpoints, primary sources and the fixed public inputs now exercised by the actual implementation. Executable types own A0 behavior; the remaining points/orchestration sections are proposed behavior. #73 retains the extraction and shared write window.

The #73 fulfilment agent has explicitly accepted sole execution ownership of the behavior-preserving extraction, after its stable result slice and before point-return implementation. It retains the receipt hook and exported order service, runs existing purchase/points/delivery checks and supplies a stable revision. #77 owns recharge protocol/adapter and consumes that extraction. Recharge schema and funded operations remain a later #77 write with the point-return contract re-read. The existing A0 branch targets protected main through PR; no implicit merge/deploy approval.

Workspace exit: retain the existing #77 preparation worktree with this P0 record and evidence; its exact local location is recorded in the Issue, not this design. No other worktree, database or recovery material is changed. The A0 PR owns its fixed implementation and evidence; this does not activate Recharge in main or production.

## Acceptance

- [x] User-confirmed module and browser direction is explicit; actual owner/PR state has been refreshed.
- [x] #73 coordination identifies the extraction boundary and deferred shared write window.
- [x] Proposal, design, behavior deltas and ordered tasks have a single active home.
- [x] Published WeChat request-signature and official Java AES-256-GCM vectors are checked offline, with tamper negatives and clear limits.
- [ ] Runtime contracts, DB constraints, concurrent idempotency, inbox recovery and Native/H5 journeys are implemented and tested in their named slices.
- [ ] Required merchant products/environment, business amount limits and operational cash-exception handling are settled before dependent activation.

Concrete architecture, failure cases and verification: [design](design.md), [review](architecture-review.md), [source brief](source-brief.md), [verification](verification.md), [tasks](tasks.md).
