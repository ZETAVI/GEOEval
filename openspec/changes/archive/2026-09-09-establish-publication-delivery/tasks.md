# Delivery and verification plan

Archived implementation and verification record for Issue #73. Current behavior belongs to the reconciled specifications and code. The remaining external integration/closeout transaction is owned by PR #81, not a later feature backlog in this archive.

## 0. Approval and isolated write window

- [x] Record latest Completed + pending compensation confirmation and retire that question from Issue #73.
- [x] Complete scoped architecture review, then the requested bounded simplification; preserve approved behavior while removing separate receipt/finalization framework and premature later-slice tables.
- [x] Obtain human approval for synchronous minimal aggregate admission, two-owner transaction composition, sparse work items and migration/recovery plan.
- [x] Coordinate #39/#42 shared Schema/API ownership and the explicitly approved parallel WIP exception; create the sole #73 implementation branch from verified main and move this draft into the formal change.

## 1. Vertical slice: paid order → responsible operator → visible results

- [x] Implement admission and historical migration with original-consumption precheck, bounded conflict-safe inserts and atomic new-purchase rollback; empty/valid historical/invalid consumption cases verified.
- [x] Implement claim/my-orders/explicit-start/unstarted-return/admin-reassignment with corresponding pages, transaction-local actor checks and exclusive responsibility history.
- [x] Implement bounded logical work pages and outside-transaction Mock/manual preparation; fence stale preparation and label capability honestly.
  - [x] Extend the existing 35-test slot projection through HTTP/DB, preserving frozen precise targets and the existing maximum purchased quantity without eagerly writing slots.
- [x] Record/correct valid results with one-slot counting, customer-safe order detail/progress and whole-order completion.
- [x] Verify two simultaneous claims, old owner after reassignment, maximum quantity pagination, duplicate results and immutable article/terms using isolated DB and HTTP tests.
  - [x] Add current-role recheck after delayed preparation, direct-work start protection, Completed-preserving reassignment/correction and atomic work-audit failure evidence.
- [x] Browser-check customer/operations/admin flows and narrow-screen layout. No direct DB writes as feature acceptance evidence.
  - [x] Responsibility baseline: real browser login → operator claim/start → customer Publishing → administrator reassignment/history, plus 375px form/bottom checks.
  - [x] Result slice: actual form submission → partial customer result → full completion/correction → original customer page refresh, plus real 375px form/bottom/result checks; prior browser blockage is resolved for this path.
- [x] Finish deadline/urgency workbench presentation and operational recovery rehearsal before requesting the normal-result slice merge gate.
  - [x] Keep database ordering and immutable-pair pagination coherent; separate Completed history; exercise normal/nearing/delayed ordering in HTTP and actual 375px browser views.
- [x] Reconcile activated specs/DTOs/architecture in a Partial PR; keep unavailable exception/financial actions visibly unavailable and #73 open.
- [x] Obtain the normal-result slice's merge authorization and verify its integrated revision; PR #76 is integrated at `a550fc4`, without closing #73 or activating production.

## 1.1. Commerce points assembly: no behavior change

- [x] Extract the existing points controllers/providers into CommercePointsModule with only PointAccountService exported; preserve PublishingOrderService, Delivery admission and optimization registration.
- [x] Prove real consumer injection without the publishing graph, single provider/controller registration, semantically unchanged OpenAPI and existing points/selection/purchase/admission behavior.
- [x] Publish the separately reviewable Partial PR #79; keep reservations, schema, funded writes and payment activation outside this extraction.
- [x] After the extraction's review/check and human integration gate, integrate PR #79 at `bcb81db` and share the accepted revision with #77; the module is not a recharge or return writer.

## 2. Vertical slice: manual exception → continued service or settled termination

- [x] Reconcile order-side decisions and activation seams against the integrated normal-delivery baseline; preserve the #77 C1 exclusive window until its explicit handback.
- [x] Confirm zero-point termination: the current responsible operator closes directly with retained reason/history, no administrator and no ledger; zero is a new-form default, not an overwrite of an existing amount.
- [x] Inspect the fixed #77 C1 contract at `59930dd`, verify the live unmerged stack and receive its explicit shared-window handback; reference the producer checkpoint without copying its contract/evidence.
- [x] Consume fixed C1 `59930dd` through the explicitly agreed linear stack on PR #82; recheck base/Diff/Checks and record the #73 Delivery/RETURN single-writer window before shared changes.
- [x] Implement the owner-local negotiated-resolution/positive-settlement decisions and original-source return arithmetic, consuming C1 reservation-aware capacity; 50 pure tests pass, supplemented by the transaction/HTTP evidence below.
- [x] Bind these decisions to the locked Identity/Delivery/Commerce facts, exact-request replay and one atomic audit/ledger transaction; local runtime evidence is not protected-main or production activation.
- [x] Implement precise replacement/history and ordinary random reallocation distinction; continue operation without waiting for admin credit.
- [x] Implement explicitly saved order-level negotiated amount/version, eligibility from finished/stopped work and dedicated administrator unpaid-agreement list; no separate finalization workflow.
- [x] Implement one administrator confirmation/credit action, return kind/original consumption link/source allocation and exact actor-bound reload recovery.
- [x] Verify original-spend cap, whole numbers, origins, exact revision race, duplicate/new-key attempts, ledger failure and wallet bound; no gift fallback.
- [x] Verify every saved unpaid agreement remains in admin queue before and after settlement eligibility; Completed N/N remains Completed after payment. Validate original-order returns for inactive customers without restoring customer access under the approved security boundary.
- [x] Verify termination keeps actual partial results/count and whole-remainder stop enforcement. Positive returns require atomic Closed + credit; zero closes by the current operator without ledger/admin task, including stale-save, replay and audit-rollback checks.
  - Evidence: `apps/backend/test/delivery-resolution.integration.spec.ts` plus existing assignment/purchase/recharge/access suites; real C1 held capacity, two race orderings, failure injection and database-negative checks are covered. Web `delivery-resolution.spec.tsx` covers explicit amount, exact pending-request recovery and customer-safe status. These do not substitute for the browser task below.
- [x] Browser-check the two authorized isolated orders: operator zero termination retains Closed 2/3 without an administrator task; C→D replacement retains the purchase, completes 3/3 with compensation still pending, administrator credits 100 once, and customer remains Completed with linked +100 history. Reloads, customer-to-operations denial, and actual 390px operator/customer/admin form/result views passed.
  - Fix the observed home-card activation omission: operations negotiation links to its existing order workspace; administrator fulfilment no longer claims returns are unavailable. Current positive-credit authority remains administrator-only.
- [x] Complete the remaining browser failure/reload recovery and positive-termination settlement scenarios using the separately authorized single additional isolated order, without resetting the original two orders. Record one result out of three, stop the dedicated test API after saving a 100-point termination agreement, observe a real failed administrator request, restore the API, reload and recover the same request key/agreement revision. The order becomes Closed 1/3, retains the original purchase and result, creates one linked 100-point return, clears the admin pending queue and shows the correct customer balance/history. A read-only database check confirms the six-entry ledger and both original terminal outcomes. This proves a pre-dispatch outage, not loss of a successfully committed response or production recovery.
  - Both repaired home-card entries were exercised through normal role pages. The positive-termination view exposed a misleading NORMAL deadline label; use a time-only label (预计周期内) instead of claiming normal fulfilment while work is stopped. No new state or authority is introduced; focused workspace/resolution tests cover the correction. Reuse unchanged 390px layout evidence.

## 3. Reconcile, recovery and close

- [x] Rehearse empty and historical DB migrations, interrupted backfill and compatible read-only/forward-recovery after activity; document restore approval boundary.
  - The controlled read-only HTTP barrier is test evidence, not a deployed maintenance mechanism. Physical restore/process-crash rehearsal and the production ingress plan are not claimed by this local slice.
- [x] Remove Commerce placeholder status ownership; no permanent dual writes. Generate OpenAPI/client and verify current customer routes compose true status.
- [x] Rehearse the two resolution migrations on an empty DB and a separate actual 35→37 synthetic historical upgrade; preserve all old projections and new null/zero defaults. The granted-only historical sample is not production-corpus or physical-restore proof.
- [x] Promote accepted Delivery behavior; update Commerce/product/glossary/vision/architecture and explicitly extract the relevant product-definition evolution marker. Existing ADR 0006 admission remains unchanged; settlement uses its already-approved owner-bound transaction approach without a new ADR or general framework.
- [x] Map final acceptance to existing implementation and evidence below; keep skipped checks and independently owned Writer/recharge/#74 work outside this outcome.
- [x] Obtain the bounded dependency-integration authorization and agree the producer/consumer execution boundary; see the [human Decision checkpoint](https://github.com/ZETAVI/GEOEval/issues/73#issuecomment-5598444830). Review-ready status alone was not used as merge authority.
- [x] Reconcile the completed implementation into its current owners and prepare this archive for the existing final PR, with the actual integration and workspace checks assigned below. No new order functionality or duplicate PR is introduced.
- [x] Supplement segmented upgrades with one continuous main32→combined37 synthetic historical upgrade and post-upgrade HTTP old-request replay/once-only return checks; [evidence and independent second perspective](https://github.com/ZETAVI/GEOEval/pull/81#issuecomment-5598080649).

### Final integration transaction — owned by PR #81

After the payment owner integrates the fixed lower dependencies, the order owner
retargets the existing PR to main and verifies its actual Diff, current Checks,
completed reviews and Closes relationship before squash integration. The owner
then verifies the integrated revision, native Issue closure, Project disposition,
archived Change and explicit retain exit. These are execution gates, not claims
that the merge has already happened. Keep Project in Review / Decision until that
post-integration record is complete; use the PR's live record rather than adding
an artificial follow-up code change to mark external actions in this archive.

## Final acceptance index

This index points to the evidence owners; it does not duplicate business rules or
convert local verification into an accepted-main or production claim.

| Approved outcome | Implementation / discriminating evidence | Disposition |
| --- | --- | --- |
| Paid order admits exactly one aggregate; exclusive responsibility, bounded lists and safe customer detail | [Delivery spec](../../../specs/publication-delivery/spec.md), [assignment/admission integration tests](../../../../apps/backend/test/delivery-assignment.integration.spec.ts), [PR #76 integration](https://github.com/ZETAVI/GEOEval/pull/76#issuecomment-5583603102) | Integrated normal slice; immutable purchase and role boundaries retained by the exception slice. |
| Mock/manual preparation, direct results, correction and whole-order completion preserve the original article/quantity | Same assignment/work integration suite and PR #76 browser evidence | Integrated normal slice; generation does not count as publication. |
| Negotiated precise replacement, continued compensation, zero closure and positive settled termination keep their distinct outcomes | [Resolution HTTP/DB tests](../../../../apps/backend/test/delivery-resolution.integration.spec.ts), [Web resolution tests](../../../../apps/web/test/delivery-resolution.spec.tsx), [approved browser completion](https://github.com/ZETAVI/GEOEval/pull/81#issuecomment-5597379967) | Verified on the PR branch, awaiting integration; all three isolated terminal outcomes are preserved. |
| Original-source, capped, once-only administrator credit; no gift fallback; agreement races and rollback remain atomic | Resolution HTTP/DB tests plus [Commerce return arithmetic](../../../../apps/backend/test/order-point-return.spec.ts) and [current Commerce owner](../../../specs/publishing-commerce/spec.md) | Verified with real isolated database transactions and C1 reservation-aware capacity. |
| Role entry, authority, explicit action, pending work, customer result and interrupted-request recovery form one usable path | Assignment/resolution tests, [role entry assertions](../../../../apps/web/test/supporting-role-workspace.spec.tsx), PR #81 browser checkpoint | Approved role paths and 390px views passed. Browser outage proves a pre-dispatch failure and same-request reload recovery; successful-response loss is not claimed by that browser run. |
| Migration and design reconciliation preserve history and singular ownership | [Recovery integration tests](../../../../apps/backend/test/delivery-recovery.integration.spec.ts), §3 migration evidence above, current Delivery/Commerce specs and architecture | Empty and synthetic historical migration rehearsals passed. Product Definition's other unactivated capability markers remain explicitly retained; no new ADR or duplicate design owner. |

Residual boundaries: real Writer/material preparation, external publication,
real-money recharge, #74 UI/UX and production activation remain separate outcomes.
The granted-only historical fixture is not a production-corpus rehearsal; physical
restore/process-crash and deployment-ingress proof are not claimed. After any base
change, recheck only evidence invalidated by that change. The current fixed-head
review/CI and producer-consumer handoff remain owned by PR #81 and its linked
checkpoint, not by another mutable status table here.
