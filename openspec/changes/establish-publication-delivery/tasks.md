# Delivery and verification plan

Issue #73 controls approved business decisions. This checklist owns the bounded implementation sequence and evidence, not current product behavior.

## 0. Approval and isolated write window

- [x] Record latest Completed + pending compensation confirmation and retire that question from Issue #73.
- [x] Complete scoped architecture review, then the requested bounded simplification; preserve approved behavior while removing separate receipt/finalization framework and premature later-slice tables.
- [x] Obtain human approval for synchronous minimal aggregate admission, two-owner transaction composition, sparse work items and migration/recovery plan.
- [x] Coordinate #39/#42 shared Schema/API ownership and the explicitly approved parallel WIP exception; create the sole #73 implementation branch from verified main and move this draft into the formal change.

## 1. Vertical slice: paid order → responsible operator → visible results

- [ ] Implement admission and historical migration; prove new purchase rollback and old-order idempotent backfill.
- [ ] Implement claim/my-orders/unstarted-return/admin-reassignment with corresponding pages, current-actor checks and exclusive responsibility history.
- [ ] Implement bounded logical work pages and outside-transaction Mock/manual preparation; fence stale preparation and label capability honestly.
  - [x] Implement the owner-local bounded slot projection and 35 focused tests, including frozen order, invalid commitments and maximum quantity; HTTP/DB composition remains unstarted.
- [ ] Record/correct valid results with one-slot counting, customer-safe order detail/progress and whole-order completion.
- [ ] Verify two simultaneous claims, old owner after reassignment, maximum quantity pagination, duplicate results and immutable article/terms using isolated DB and HTTP tests.
- [ ] Browser-check customer/operations/admin flows and narrow-screen layout. No direct DB writes as feature acceptance evidence.
- [ ] Reconcile activated specs/DTOs/architecture in a Partial PR; keep unavailable exception/financial actions visibly unavailable and #73 open.

## 2. Vertical slice: manual exception → continued service or settled termination

- [ ] Implement precise replacement/history and ordinary random reallocation distinction; continue operation without waiting for admin credit.
- [ ] Implement explicitly saved order-level negotiated amount/version, eligibility from finished/stopped work and dedicated administrator unpaid-agreement list; no separate finalization workflow.
- [ ] Implement one administrator confirmation/credit action, return kind/original consumption link/source allocation and exact actor-bound reload recovery.
- [ ] Verify original-spend cap, whole numbers, origins, exact revision race, duplicate/new-key attempts, ledger failure and wallet bound; no gift fallback.
- [ ] Verify every saved unpaid agreement remains in admin queue before and after settlement eligibility; Completed N/N remains Completed after payment. Validate original-order returns for inactive customers without restoring customer access under the approved security boundary.
- [ ] Verify termination keeps actual partial results/count and stop enforcement, fails without false credit/closure, and succeeds with atomic Closed + credit.
- [ ] Browser-check replacing C with D and compensation; partial stop/final return; unauthorized operations and interrupted administrator submission.

## 3. Reconcile, recovery and close

- [ ] Rehearse empty and historical DB migrations, interrupted backfill and compatible read-only/forward-recovery after activity; document restore approval boundary.
- [ ] Remove Commerce placeholder status ownership; no permanent dual writes. Generate OpenAPI/client and verify current customer routes compose true status.
- [ ] Promote accepted Delivery behavior; update Commerce/product/glossary/vision/architecture and ADR; handle only relevant evolution-marker activation.
- [ ] Map final acceptance to real evidence; record skipped checks and future Writer/real recharge/#74 boundaries without appending their work here.
- [ ] Open final acceptance PR, complete fixed-diff review and checks, obtain merge authorization, verify integrated revision and only then reconcile #73 closure/Project Done/workspace exit.
