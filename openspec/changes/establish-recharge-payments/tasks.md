# Tasks

Owner #77. A0/B0/C1 and publication return are accepted on main; N1–N4 implementation and controlled verification are complete. The owner authorized the four Partial PRs in the [integration decision](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5628184476). [#83](https://github.com/ZETAVI/GEOEval/pull/83), [#84](https://github.com/ZETAVI/GEOEval/pull/84), [#85](https://github.com/ZETAVI/GEOEval/pull/85) and [#86](https://github.com/ZETAVI/GEOEval/pull/86) own live merge/head/check evidence. Current behavior is reconciled into [Recharge](../../specs/recharge/spec.md), Commerce and Notification. H1/O1/activation remain unfinished; no real merchant or production Worker is enabled. Earlier package rows record historical implementation scope, not current merge authority.

## Remaining work and actual dependencies

The approved route stays account recharge → verified payment → funded credit → return to publishing review → explicit purchase → #73 fulfilment/point return. Finance assets are not a prerequisite for every engineering step. Existing evidence is reused; no further generic crypto/HTTP confidence loop is scheduled.

| Package | Concrete acceptance | Actual dependency / current action |
| --- | --- | --- |
| R1 recovery/status | Transient failures recover under bounded scheduling; unsafe facts remain held; customer hints match persisted work | Merged through PR #87; implementation and CI evidence remain in that PR |
| Management read-only | Find each order, payment confirmation, credit and independent notification state | Implemented and locally verified in PR #88; current CI/merge state belongs to the PR |
| O1 reconciliation | Verify daily coverage, compare provider/order/ledger, query discrepancies and settle only through existing C1 | Official request metadata read; download/format details and synthetic samples still required before implementation |
| H1 external-browser H5 | Correct launch, return, identity and same-order recovery | Existing Native/core seams; named mobile/browser and merchant-domain evidence remain required |
| Activation | Maintained amount/support policies, configured merchant, budgets, financial verification | Finance/product/operations inputs required at the actual enablement boundary; no production value inferred from controlled tests |

Current planning: R1 transient-failure recovery and simple four-state customer copy precede management actions. The owner confirmed reliability with human fallback where evidence is unsafe, not mandatory full automation. The [execution checkpoint](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5630151311) records the authorized bounded implementation and refreshed M4 non-overlap confirmation. #77 entered In Progress for R1 and returns to Review / Decision at the review handback. Management read-only views, reconciliation and H1 follow their own bounded acceptance. Manual-experience preparation is canceled and cleaned up.

## R1: Transient recovery and truthful status

- [x] Recheck main7c5a4a5, #77 and the merged N1–N4 contracts; distinguish existing persistence from the missing recovery behavior.
- [x] Inspect retry exhaustion, loss of HTTP status in persisted attempts, and reviewRequired → supportRequired projection; specify the smallest change in design14.
- [x] Align owner intent: improve reliability without requiring full automation; keep financial holds, same-order identity, four customer states and once-only credit.
- [x] Define simple customer four-state copy, necessary internal diagnostics and focused verification below; management page implementation and the independent persistent support entry remain later discussions.
- [x] Refine implementation contract in design14.1a: nullable immutable attempt outcome metadata, explicit slow-delay policy, conservative legacy evidence, and API/Worker status separation. Customer processingHint expansion is retired; internal stages do not become user states. Implemented evidence and remaining limits are recorded in verification.
- [x] Implement operation-aware TEMPORARY/REJECTED/UNKNOWN classification, immutable HTTP status metadata and durable short/slow policy. QUERY 404 remains conservative same-order verification; other unclassified 4xx are held.
- [x] Verify the additive migration from all 40 previous migrations: only two known transport-exhausted fixtures resume; ambiguous HTTP_ERROR, monetary hold and closed fixtures, all old attempts and accounting snapshots remain unchanged. Old scanner skips SLOW_RETRY. The shared schema window was confirmed before edits.
- [x] Share four short status messages across history/detail/QR; retain permissions, terminal-state priority and account fencing. Local read failures remain local and the existing support entry is unchanged; no DTO extension.
- [x] Verify recovery beyond the old ceiling, same-order success and expiry/close, duplicate/late facts, stale completion and progress of later work using the existing core/customer/notification regressions plus new recovery cases.
- [x] Kill a real Worker child during slow recovery and restart it: due time/count persist, replacement settles once without another INITIATE. No machine/storage-loss or multi-replica budget claim.
- [x] Verify 401/403, signature/amount/identity safeguards and ambiguous historical failures remain restricted. Existing unauthenticated receipt and C1 money guards are reused unchanged.
- [x] Run 117 distinct targeted backend cases and 182 Web cases, workspace typecheck, format and full build. The initially skipped process cases were subsequently executed. Customer HTTP and rendered/controller tests are covered; no new browser/manual experience or real merchant run.
- [x] Reconcile current specs, design and author review; retain the active Change and #77. PR #87 owns final required CI and review/merge state; local passes do not imply merge or activation.


## O1a: Administrator read-only recharge lookup

- [x] Owner accepted the read-only slice after R1; PR #87 is merged at main29d115d. No manual payment mutation or expanded account role is implied.
- [x] Inspect Recharge order/attempt/observation/notification records, existing Commerce ledger relation, administrator account search, sidebar and role guards. Record the small read boundary in design14.4.
- [x] Separate provider payment time, local credit time, latest query time and message-delivery time; no fabricated generic order updatedAt or new payment state.
- [x] Refresh shared occupancy and execute the approved scope under the [O1a checkpoint](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5630711415); M4 confirmed no overlapping Recharge/API/generated/sidebar/schema writes.
- [x] Implement administrator-only list/detail queries, explicit DTO projection and independent API module. Database transactions use a read-only repeatable snapshot; no provider runtime, ledger mutation or new business table.
- [x] Connect admin navigation, account search, list and detail. Reuse four-state labels; currency, points, customer and order references are explicit. The actual small-fixture query plan was inspected; no new index or large-scale performance claim.
- [x] Verify 6 new HTTP/PG cases: four-role access and actor fence, inactive-customer history, tied-time pagination/filter cursor binding, private projection and no payment writes, payment/credit/message separation, and concurrent settlement across one read-only snapshot.
- [x] Verify 10 new Web cases for request generations, changed actor, timeout/unmount, pagination failure and terminal-state presentation; full Web suite 192 passed. Existing API/Identity/customer checks and the updated controller access inventory total 31 distinct backend passes.
- [x] Complete browser login/navigation, inactive-account search, customer/status/date filtering, detail and return, pending message on successful credit, and API-offline local error with filter retention. Native date-picker interaction verified the date range; synthetic data only.
- [x] Reconcile current Recharge spec, design, source/review/verification. Typecheck, formatting and full build pass; only two GET paths and three response schemas added, prior OpenAPI paths/schemas unchanged. PR #88 owns final required CI and submission status; #77 remains open.


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

Official-source design, the Adapter URI repair and the independent Web component are implemented. #73 completed its browser checks and returned the shared runtime/schema window at fixed `990ece2781dcb2b08281f24282f698ed4635be22`, documented in [final handoff](https://github.com/ZETAVI/GEOEval/pull/81#issuecomment-5597379967). This bounded N1 backend package is on `codex/issue-77-native-recovery` above #81 in the same worktree. The later #73 successor `a456703413df98ebe38ae4d62903c3ce01d73811` only updates its owner-local proposal/tasks; it does not change the consumed runtime or contracts. Actual merge/base changes require coordination; no payment/main merge authority is inferred.

- [x] Read current Native prepay/invoke/query/close and callback-query guidance; distinguish QR lifetime, provider payment deadline and verified close, and Native versus micropay states.
- [x] Define dispatch/cancel generation, truthful attempts, same-parameter recovery, customer projection and saved publishing-return context in design sections 9–11; review their concrete failure boundaries.
- [x] Reproduce an A0 compatibility defect with current official QR examples: two /up variants fail, legacy control passes. This is a recorded failed probe, not an acceptance pass.
- [x] Repair the existing Adapter URI boundary: both documented /up targets and the legacy form work; malformed scheme/host/path, credentials, ports, fragments and raw whitespace/control bytes remain rejected. 80 gateway checks and 20 controlled HTTPS checks pass; the old failed diagnostic remains historical evidence.
- [x] Explore the user-specified reference sites and supplied Doit cashier in Chrome; record redacted UI fields, pending payment/return semantics, account/profile and invoice boundaries in source-brief. Clarify the preference for locally selecting amount/method and using an independent cashier. Actual third-party schema/API and blocked Alipay continuation remain unverified.
- [x] Reconcile the complete business chain and synchronous/asynchronous choice against actual B0/C1, Commerce, Notification and publishing code. Unify the summary sequence with durable Worker dispatch, and distinguish current payment action from per-call operation attempts. Record new amount/form and bounded-wait/history cases from the additional reference-site review.
- [x] Continue common amount/method confirmation, local order/history/recovery and controlled Native work independently of cashier selection. Validate any selected real provider at its actual Adapter/merchant activation boundary; do not make that choice a prerequisite for common business design.
- [x] Before shared runtime work, review #81's exact current fixed diff, migration/DTO/RETURN constraints and owner handoff; determine the linear successor and exact Recharge schema/attempt/API/Worker scope. Keep the same worktree where appropriate, all consumer C1 evidence and pre-change refs; no reverse integration into #82.

- [x] Implement order + reservation + first due work in one creation transaction; dispatch only from committed work. Keep stable merchant identity, UNSENT/MAY_EXIST, cancel intent, query/close convergence, generation fences and visible unresolved obligations. Do not infer remote cancellation from a local timeout or expired lease.
- [x] Provide explicit credential-free host construction and independent bounded order/settlement lanes; persist successful query work before C1, retry its completion marker idempotently, and defer transient failures without starving later work. Validate old-data upgrade and the existing Commerce/RETURN boundary in isolated PostgreSQL. Exact result counts live in verification and the PR checkpoint.
- [x] N2 registers safe customer routes and explicitly configured B0/raw-body reception; N1 owns bounded durable recovery and settlement receipt rechecks. The ordinary host remains unconfigured.
- [ ] Register the production payment Worker/merchant host only with operational policies, configured secrets and activation gates; test controls are not that host.
- [x] Add truthful non-success query/close/dispatch-attempt recovery records when dispatch is implemented; C1 already persists authenticated successful QUERY observations without fake notification IDs.
- [x] Build the isolated Native QR/status component and local lifecycle: bounded polling, separate expiry clocks, cancellation recovery across reload/tabs, stale-response invalidation, truthful terminal states and narrow-screen handling. All 21 focused tests and 122 Web tests pass; real browser decoding, cancellation/late-response, reload, expiry, keyboard and narrow layout verified with an explicitly synthetic source. No customer API, merchant scan or automatic purchase claim.
- [x] Connect the component to authenticated local order APIs, history and publishing-shortage entry. Preserve one explicit amount draft and reject invalid custom input without fallback; retain same-key create recovery and truthful history scope. Restore saved selection via an account-scoped return reference, not a forged pending purchase request; reprice/reconfirm on return. Implement actual source mapping/access/CSRF tests in the shared API window.
- [x] N4 implements durable successful-recharge notification work and Notification kind/target mapping. Crash/repeated delivery, account fencing, SSE refresh and off-page retry have evidence. Customer activation still requires explicit delivery configuration; notification failure does not reverse credited points.
- [x] Run real HTTP and desktop browser tests with the controlled adapter: interrupted create/reload, QR, cancellation/reload, signed callback ACK before settlement, duplicate payment facts, one credit and explicit publishing return. Reuse N1 tests for missing callback/late dispatch/expired QR; do not claim new browser or real merchant evidence for those unchanged cases.
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

## N2: Authenticated customer API and controlled desktop journey

- [x] Fix #83@9d27b92 dependency, same-worktree upper branch and #73 shared-write handback; retain lower heads during their separately coordinated integration.
- [x] Add safe owner-bound customer API, no-store projection, creation replay, filtered keyset history and durable verify coalescing. Default host has no merchant or callback activation.
- [x] Connect one amount draft, recoverable create request, independent Native detail and all-state history through generated API contracts.
- [x] Connect account/history and saved publishing-return reference; re-read balance/quote and require explicit purchase.
- [x] Verify real HTTP security/privacy/recovery, index migration and the default disabled host; then exercise actual browser against the controlled API/database/gateway.
- [x] Fixed-diff review, current-owner/evidence reconciliation and PR/CI delivered in [#84](https://github.com/ZETAVI/GEOEval/pull/84); #77 remains open and real merchant/Worker operational activation separate.

## N3: Resident recharge worker and process recovery

- [x] Verify current main/#83/#84/Project and fix a single-writer Recharge-only window above #84@89f0dbd; preserve #39 main delivery and all shared surfaces.
- [x] Review Node/Nest lifecycle and existing N1/C1 seams; record a no-migration architecture card with explicit stop/drain and process-crash limits.
- [x] Add the isolated worker module/factory and two bounded independent lanes; guard configured activation and expose safe aggregate diagnostics.
- [x] Stop future claim attempts without interrupting in-flight provider/commit work; drain before Prisma shutdown and preserve unresolved obligations after a hard kill.
- [x] Verify actual Nest/PostgreSQL/child-process independence, SIGTERM/SIGKILL, signed delayed success, once-only settlement and stop-new-order recovery.
- [x] Fixed diff review, canonical lifecycle reconciliation, exact-head CI/Partial [#85](https://github.com/ZETAVI/GEOEval/pull/85) and retained workspace exit; #77 remains open.

## N4: Durable successful-recharge notification

- [x] Read exact #85/main/Issue and current M4 shared-window acknowledgement; define Notification/Recharge ownership and fixed client wire contract in the N4 card.
- [x] Write one private delivery obligation with the successful credit transaction; add forward migration and monotonic identity/delivery constraints, without historical backfill.
- [x] Add idempotent Notification publishing and opt-in independent Worker delivery; retain recoverable failures without changing money facts.
- [x] Extend typed notification target and account-fenced HTTP/SSE/client behavior; preserve evaluation notices and safe explicit order navigation.
- [x] Verify rollback, duplicate/late failures, process restart, old-data upgrade, current HTTP/SSE and actual browser behavior.
- [x] Complete fixed-diff reviews, canonical specs and local required checks. N4 is a Partial upper slice; its PR Delivery checkpoint owns exact-head CI, current window handback and workspace exit. #77 remains open.
