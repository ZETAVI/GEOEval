# Delivery and verification plan

Issue #73 controls approved business decisions. This checklist owns the bounded implementation sequence and evidence, not current product behavior.

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

- [x] Reconcile order-side decisions and activation seams against the integrated normal-delivery baseline; keep the #77 C1 shared-accounting/schema window exclusive.
- [ ] Confirm whether zero-point termination is permitted and who may close it; do not infer this from zero compensation on continuing service.
- [ ] Consume the #77 fixed capacity/transaction contract and close or renew the shared write window before persistence/API/settlement implementation.
- [ ] Implement precise replacement/history and ordinary random reallocation distinction; continue operation without waiting for admin credit.
- [ ] Implement explicitly saved order-level negotiated amount/version, eligibility from finished/stopped work and dedicated administrator unpaid-agreement list; no separate finalization workflow.
- [ ] Implement one administrator confirmation/credit action, return kind/original consumption link/source allocation and exact actor-bound reload recovery.
- [ ] Verify original-spend cap, whole numbers, origins, exact revision race, duplicate/new-key attempts, ledger failure and wallet bound; no gift fallback.
- [ ] Verify every saved unpaid agreement remains in admin queue before and after settlement eligibility; Completed N/N remains Completed after payment. Validate original-order returns for inactive customers without restoring customer access under the approved security boundary.
- [ ] Verify termination keeps actual partial results/count and whole-remainder stop enforcement, fails without false credit/closure, and succeeds with atomic Closed + credit for positive returns. Complete the zero-point scenario only after its decision.
- [ ] Browser-check replacing C with D and compensation; partial stop/final return; unauthorized operations and interrupted administrator submission.

## 3. Reconcile, recovery and close

- [x] Rehearse empty and historical DB migrations, interrupted backfill and compatible read-only/forward-recovery after activity; document restore approval boundary.
  - The controlled read-only HTTP barrier is test evidence, not a deployed maintenance mechanism. Physical restore/process-crash rehearsal and the production ingress plan are not claimed by this local slice.
- [x] Remove Commerce placeholder status ownership; no permanent dual writes. Generate OpenAPI/client and verify current customer routes compose true status.
- [ ] Promote accepted Delivery behavior; update Commerce/product/glossary/vision/architecture and ADR; handle only relevant evolution-marker activation.
- [ ] Map final acceptance to real evidence; record skipped checks and future Writer/real recharge/#74 boundaries without appending their work here.
- [ ] Open final acceptance PR, complete fixed-diff review and checks, obtain merge authorization, verify integrated revision and only then reconcile #73 closure/Project Done/workspace exit.
