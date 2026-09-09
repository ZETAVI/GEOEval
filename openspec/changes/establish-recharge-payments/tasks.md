# Tasks

Owner #77. Completed boxes distinguish P0 experiments, A0 adapter, B0 unregistered notification module and C1 core implementation. The explicit [C1 writer window](https://github.com/ZETAVI/GEOEval/issues/73#issuecomment-5587081614) owns the bounded shared changes; its delivery and handback are maintained by [PR #82](https://github.com/ZETAVI/GEOEval/pull/82). No current API/Worker or merchant activation is included.

## Remaining work and actual dependencies

The approved route stays account recharge → verified payment → funded credit → return to publishing review → explicit purchase → #73 fulfilment/point return. Finance assets are not a prerequisite for every engineering step. Existing evidence is reused; no further generic crypto/HTTP confidence loop is scheduled.

| Package | Concrete acceptance | Actual dependency / current action |
| --- | --- | --- |
| A0: WeChat operation adapter | Native initiate, query and close interpret authenticated protocol results; notification decrypts to a safe observation; exact required fields and frozen identity are validated; no activation | Technically independent of C0 and merchant credentials. A0 window approved and implementation/tests complete locally; confined to Recharge and its tests, no shared composition/schema writes |
| B0: Notification acceptance and recovery | Real Nest handler and Identity exemptions; observation + receipt commit before ACK; host/connection replacement and DB scans | Implemented under the B0 schema window: 25 new tests plus 2 current API inventory tests passed. Module remains unregistered in the current application; no settlement/worker claim |
| C0/C1: Points seam and first atomic credit | Reserve amount/sequence capacity, unique payment settlement and ledger, concurrent grant/purchase/recharge, transaction rollback | #79 assembly is accepted on main; C1 implements and verifies the first atomic core in PR #82. Future #73 returns must consume its explicit capacity snapshot. Host/connection replacement is tested; OS/storage crash and return execution remain separate |
| Native/H5 customer journey | Own-order access/history, QR/local polling, saved publishing choice and reconfirmation; external-mobile H5 IP/domain/return | UI/API contracts can be prepared now. Executable journey needs N1; real browser launch additionally needs the named product entitlement, domain and controlled merchant environment |
| Recovery and reconciliation | Same-order query/close, persisted due state/lease, stop-new-orders, T+1 discrepancy handling | Recovery and bill parsing can be implemented/tested with controlled inputs in their write package. Real bill/download and money-exception handling require account/finance decisions |
| Activation | Limits, support, merchant/domain/secret rotation owners, bounded money test, financial reconciliation | Finance/product/operations supply these only before the corresponding live test or enablement. No production value is inferred from test configuration |

Current planning: the user approved C1 implementation and cross-task coordination, recorded in [Decision](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5587176110). #73 confirmed the single-writer window. #79 has since merged into accepted main@bcb81db, with [integration evidence](https://github.com/ZETAVI/GEOEval/pull/79#issuecomment-5587460726). A0/B0/C1 were synchronized linearly; only generated OpenAPI/client files conflicted and were regenerated from both accepted assembly and C1 DTO sources. C1 core is implemented and verified in PR #82; that PR owns exact-head CI and explicit window handback. N1 implementation sequence and shared-write prerequisites are maintained in its task list below. No payment PR merge or actual money authorization is inferred.

## P0: Fixed inputs and reviewable contracts

- [x] Re-read main, #73, #77 and PR #76; obtain #73 owner response on points assembly and upcoming returns.
- [x] Record owner approval for internal Commerce points assembly and Native → H5.
- [x] Move candidate architecture/source/review into one formal change and add scenario deltas.
- [x] Verify the official request signature and Java AES-256-GCM expected values with mutation negatives (14/14 offline).
- [x] Specify cancellation before dispatch separately from MAY_EXIST, unknown query results and confirmed provider closure.
- [x] Establish response/notification framing, required headers, trusted key matching and the pinned SDK clock rule; verify 23 offline cases including controlled empty-body framing and SIGNTEST rejection. Record one failing public-page sample separately.
- [x] Select Node standard crypto and a narrow HTTP adapter; keep official Java/Go as references, without adding a new process/dependency. Probes are not product code.
- [x] Run controlled loopback HTTP for exact signed bytes/headers, provider-signed empty 204, timeout/body limits, 4xx/5xx classification and no implicit redirect/retry: 37 checks, 34 received requests, zero redirect-target requests. This is non-product evidence.
- [x] Validate raw signed notification → safe facts → PostgreSQL receipt/cursor commit → ACK, concurrent duplicates, committed/uncommitted visibility and receiver-process exit in an owned temporary database: 20 checks. No ledger or production Nest route is present.
- [x] Distinguish raw-message digest from normalized-fact equality, and preserve order total versus payer total/currency for later authorized consumers. Projection-version migration remains an implementation concern.

## A0: Independent product-code package

- [x] Establish the bounded #77 execution/WIP window; use one main-direct Issue branch, retaining existing P0 artifacts, with no points extraction duplicated here.
- [x] Own only Recharge provider contracts/WeChat implementation and targeted tests. No Prisma migration, ApiModule/WorkerModule, runtime config activation, controller routes, customer pages or Commerce writes in this first package.
- [x] Use one narrow gateway plus internal auth/transport/operation mapping; validate operation-specific required fields and return typed diagnostics. Business ports do not expose an HTTP client, crypto keys or Prisma.
- [x] Enforce configured HTTPS origin/TLS, immutable request bytes, trusted provider key selection and exact response contracts using fixed public fixtures and controlled endpoints. Local 204 is not live WeChat evidence.
- [x] Map authenticated payment observations without payer identifiers, separate notification identity from transaction settlement identity, and validate missing required payer-total/currency fields.
- [x] Verify this actual adapter with fixed vectors, malformed fields, wrong merchant/app/order/amount, unknown request outcome and no implicit retries. Reuse unchanged research evidence as rationale rather than importing the experiment harness as production code.
- [x] Deliver [PR #78](https://github.com/ZETAVI/GEOEval/pull/78) with no customer activation. Implementation checkpoint 35732ae has 88 targeted checks; B0 and C0/N1 consumers and real-merchant limits remain explicit. Draft/review and CI state live in the PR, not an implied #77 completion.

## B0: Real durable notification acceptance

- [x] Fix the schema window with #73 and stack linearly on rebased A0 without touching current API/Identity/Commerce composition.
- [x] Add immutable safe observations, unique receipt with same-identity canonical FK, conflict preservation and additive migration.
- [x] Implement raw-body handler, handler-only Identity metadata and Prisma acceptance; commit before 204, retry on failed/unknown commit and bound waiting.
- [x] Verify canonical facts, concurrent duplicates/conflicts, no pre-commit ACK, rollback, host/connection replacement, late commit discovery, projection privacy and database immutability.
- [x] Verify existing real Identity guards and current API route inventory remain effective and unchanged.
- [x] Publish [PR #80](https://github.com/ZETAVI/GEOEval/pull/80), stacked on #78, with implementation 4f30e10 and local evidence. Exact-head CI and schema-window return are maintained by the PR/Issue checkpoints; no settlement, worker lease or activation is included.

## C0: Consume the bounded points extraction

Producer: [PR #79](https://github.com/ZETAVI/GEOEval/pull/79), fixed head 770a764; [producer checkpoint](https://github.com/ZETAVI/GEOEval/pull/79#issuecomment-5583740565).

- [x] Review actual module declarations, service/repository dependency paths, 2 assembly checks plus 61 existing checks and exact-head CI. The extraction is adequate for its unchanged-behavior scope; do not repeat or expand it here.
- [x] Distinguish exported HTTP/Identity-facing PointAccountService from a transaction-bound writer. Prefer an infrastructure-only binding for the actual Recharge consumer; split another Nest CoreModule only if runtime dependencies require it.
- [x] Consume #79 from accepted main@bcb81db, rebase the existing linear stack and regenerate only the conflicted generated contracts; 26 core/assembly/access checks passed. No #79 cherry-pick or duplicate extraction.

## C1: First atomic recharge core

- [x] User-approved design and the [#73 single-writer window](https://github.com/ZETAVI/GEOEval/issues/73#issuecomment-5587081614) fix actual ownership, interfaces and stop conditions.
- [x] Implement unregistered RechargeCoreModule/Service/Repository, immutable RechargeOrder, one reservation per order, common account capacity, dedicated RECHARGE ledger identity and narrow transaction-bound points access.
- [x] Create/reserve, authenticated notification/query → one credit, safe UNSENT cancellation and review-needed outcomes are real PostgreSQL transactions; provider calls, worker loops and public customer APIs remain outside the core.
- [x] Existing granted adjustments and purchases apply the same explicit capacity snapshot; purchase capacity exhaustion maps to its existing conflict family. #73 return execution is not implemented here and must consume these rules in its own slice.
- [x] System settlement uses business uniqueness and NULL client key/actor with SYSTEM provenance; legacy actor/request constraints remain explicit. Public balance hides reservations; point history represents the new kind truthfully.
- [x] Extend only successful QUERY observations, retaining real nullable payer fields; B0 notification profile remains mandatory. Processed receipts must match a successful order; review-needed records do not starve later pending work.
- [x] Verify 22 core integration cases, 2 new purchase HTTP cases and 1 new Web presentation case. Focused affected backend suite: 73 passed; Web points suite: 5 passed. After #79 integration: 26 core/assembly/access cases passed. Detailed scope and reuse in verification.
- [x] Rehearse B0 → C1 on a separate DB with old accounts, wallet, ledger and immutable B0 receipt data, preserving the old field projection exactly; 35 migrations applied in order. Validate generated contract changes: all 73 paths unchanged, only two point-history schemas extended.
- [x] Publish [PR #82](https://github.com/ZETAVI/GEOEval/pull/82) with fixed C1 implementation and evidence. Exact-head CI, final review state and explicit schema-window handback are owned by its checkpoint; retain this worktree and linear stack, without merge or activation.

## N1: Native dispatch, recovery and customer journey

Official-source design and the Adapter URI repair are complete. The independent Web checkout component is implemented with an injected source and no customer route/API activation; C1 accounting/contracts stay fixed. The QR Web dependency window was returned in the [UI checkpoint](https://github.com/ZETAVI/GEOEval/pull/82#issuecomment-5595144423). #73 has now returned the Delivery/RETURN shared window at fixed `41d37c2`, recorded in its [handoff](https://github.com/ZETAVI/GEOEval/pull/81#issuecomment-5595292334). Its PR #81 is stacked above #82; the next shared payment implementation must consume the actual source in a linear successor or after ordered integration, never reverse-merge #73 into #82. #73 retains its browser/owner-local page checks, with new shared edits requiring renewed coordination.

- [x] Read current Native prepay/invoke/query/close and callback-query guidance; distinguish QR lifetime, provider payment deadline and verified close, and Native versus micropay states.
- [x] Define dispatch/cancel generation, truthful attempts, same-parameter recovery, customer projection and saved publishing-return context in design sections 9–11; review their concrete failure boundaries.
- [x] Reproduce an A0 compatibility defect with current official QR examples: two /up variants fail, legacy control passes. This is a recorded failed probe, not an acceptance pass.
- [x] Repair the existing Adapter URI boundary: both documented /up targets and the legacy form work; malformed scheme/host/path, credentials, ports, fragments and raw whitespace/control bytes remain rejected. 80 gateway checks and 20 controlled HTTPS checks pass; the old failed diagnostic remains historical evidence.
- [x] Explore the user-specified reference sites and supplied Doit cashier in Chrome; record redacted UI fields, pending payment/return semantics, account/profile and invoice boundaries in source-brief. Clarify the preference for locally selecting amount/method and using an independent cashier. Actual third-party schema/API and blocked Alipay continuation remain unverified.
- [x] Reconcile the complete business chain and synchronous/asynchronous choice against actual B0/C1, Commerce, Notification and publishing code. Unify the summary sequence with durable Worker dispatch, and distinguish current payment action from per-call operation attempts. Record new amount/form and bounded-wait/history cases from the additional reference-site review.
- [ ] Continue common amount/method confirmation, local order/history/recovery and controlled Native work independently of cashier selection. Validate any selected real provider at its actual Adapter/merchant activation boundary; do not make that choice a prerequisite for common business design.
- [ ] Before shared runtime work, review #81's exact current fixed diff, migration/DTO/RETURN constraints and owner handoff; determine the linear successor and exact Recharge schema/attempt/API/Worker scope. Keep the same worktree where appropriate, all consumer C1 evidence and pre-change refs; no reverse integration into #82.

- [ ] Implement order + reservation + first due work in one creation transaction; dispatch only from committed work. Keep stable merchant identity, UNSENT/MAY_EXIST, cancel intent, query/close convergence, generation fences and visible unresolved obligations. Do not infer remote cancellation from a local timeout or expired lease.
- [ ] Register B0 and the verified core in the approved API/Worker composition with precise raw-body configuration and owner-bound customer commands. Recheck receipt state inside settlement; complete bounded due-state recovery and visible review-needed handling.
- [ ] Add truthful non-success query/close/dispatch-attempt recovery records when dispatch is implemented; C1 already persists authenticated successful QUERY observations without fake notification IDs.
- [x] Build the isolated Native QR/status component and local lifecycle: bounded polling, separate expiry clocks, cancellation recovery across reload/tabs, stale-response invalidation, truthful terminal states and narrow-screen handling. All 21 focused tests and 122 Web tests pass; real browser decoding, cancellation/late-response, reload, expiry, keyboard and narrow layout verified with an explicitly synthetic source. No customer API, merchant scan or automatic purchase claim.
- [ ] Connect the component to authenticated local order APIs, history and publishing-shortage entry. Preserve one explicit amount draft and reject invalid custom input without fallback; retain same-key create recovery and truthful history scope. Restore saved selection via an account-scoped return reference, not a forged pending purchase request; reprice/reconfirm on return. Implement actual source mapping/access/CSRF tests in the shared API window.
- [ ] At customer activation, add the minimal durable successful-recharge notification work and actual Notification kind/target mapping. Verify crash/repeated delivery, optional SSE loss and stale balance responses; notification failure must not reverse credited points. No generic event bus or payment-only socket service.
- [ ] Run real HTTP and desktop browser tests with a controlled adapter, missing callback, cancellation/late dispatch, expired QR and interrupted responses; distinguish them from real merchant proof.
- [ ] Before enabling the customer journey, supply approved amount/shortcut policy with its administrator maintenance entry, active-order/rate limits, deadline and usable support contact; synthetic profile values are not production policy.
- [ ] Verify named Native merchant products, domain, secret handoff and separately approved minimum real-money test when ready.

## H1: Complete mobile external-browser H5

- [ ] Add H5 scene/IP handling and domain-constrained redirect; preserve frozen merchant order identity and query semantics.
- [ ] Verify iOS and Android external browsers: launch, cancel, return, missing callback, reload and duplicate submit; client hints do not credit.
- [ ] Only after this slice passes claim PC/mobile web coverage. JSAPI remains separately scoped.

## O1: Operational acceptance and controlled activation

- [ ] Add/verify T+1 billing reconciliation, safe operational lookup, discrepancy ownership and bounded retries/alerts for held exposure.
- [ ] Rehearse stop-new-orders while old inbox/query/close/credit still runs, secret rotation and compatible forward recovery. No destructive rollback of money facts.
- [ ] Name merchant/environment/operators, minimum real amount/count/total, money disposition and financial review before any real-money test.
- [ ] Obtain production activation authority separately; run required checks and real-environment evidence.
- [ ] Reconcile current Recharge/Commerce specs, accepted interfaces and ADR; retire the active change only when its approved outcome and workspace exit are complete.
