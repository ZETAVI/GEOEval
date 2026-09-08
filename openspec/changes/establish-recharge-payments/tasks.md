# Tasks

Owner #77. Completed boxes distinguish P0 evidence from A0 product implementation. The A0 execution window is approved; shared composition, money and activation remain outside this package.

## Remaining work and actual dependencies

The approved route stays account recharge → verified payment → funded credit → return to publishing review → explicit purchase → #73 fulfilment/point return. Finance assets are not a prerequisite for every engineering step. Existing evidence is reused; no further generic crypto/HTTP confidence loop is scheduled.

| Package | Concrete acceptance | Actual dependency / current action |
| --- | --- | --- |
| A0: WeChat operation adapter | Native initiate, query and close interpret authenticated protocol results; notification decrypts to a safe observation; exact required fields and frozen identity are validated; no activation | Technically independent of C0 and merchant credentials. A0 window approved and implementation/tests complete locally; confined to Recharge and its tests, no shared composition/schema writes |
| B0: Notification acceptance and recovery | Actual application raw-body handling and precise Identity exemptions; observation + processing record commit before ACK; restart/DB scan recovery | Controlled HTTP/PostgreSQL receipt experiment now passed. Production Nest route/config and actual repository still require the shared composition window; neither merchant assets nor points extraction blocks the isolated receipt contract |
| C0/N1: Points seam and first atomic credit | Reserve amount/sequence capacity, unique payment settlement and ledger, concurrent grant/purchase/return/recharge, crash rollback | #73 is sole points extraction writer. Consume its stable revision and re-read return rules before modifying shared points/schema; financial amount defaults are required before enabling new real orders, not for synthetic DB cases |
| Native/H5 customer journey | Own-order access/history, QR/local polling, saved publishing choice and reconfirmation; external-mobile H5 IP/domain/return | UI/API contracts can be prepared now. Executable journey needs N1; real browser launch additionally needs the named product entitlement, domain and controlled merchant environment |
| Recovery and reconciliation | Same-order query/close, persisted due state/lease, stop-new-orders, T+1 discrepancy handling | Recovery and bill parsing can be implemented/tested with controlled inputs in their write package. Real bill/download and money-exception handling require account/finance decisions |
| Activation | Limits, support, merchant/domain/secret rotation owners, bounded money test, financial reconciliation | Finance/product/operations supply these only before the corresponding live test or enablement. No production value is inferred from test configuration |

Current planning: the user approved A0 construction while finance proceeds, recorded in [Decision](https://github.com/ZETAVI/GEOEval/issues/77#issuecomment-5582243258). #77 entered In Progress for this bounded non-conflicting package; #73 keeps all points/shared composition writes. Return #77 to Review / Decision with its fixed A0 PR. Alipay follows the first WeChat journey; H5, JSAPI and funds activation are not implied by the Native gateway.

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

## C0: Coordinate the smallest points extraction

- [x] #73 fulfilment agent explicitly accepted sole CommercePointsModule extraction ownership: results-stable → extraction → point return. #77 owns recharge protocol/adapter and consumes its result.
- [ ] Consume #73's stable result-slice revision and confirm no intervening module/point-return change before extraction.
- [ ] Extract CommercePointsModule within publishing-commerce. Keep customer/admin point controllers at API composition; export only necessary points providers/factory to purchase, return and Recharge consumers.
- [ ] Preserve #73's PublicationDeliveryModule import, purchase admission hook and PublishingOrderService export. Do not remove them because the 0552aa7 baseline lacks them.
- [ ] Keep schemas, URLs, grant-only restrictions, source allocation, idempotency, DTO privacy and wallet-first order unchanged in this extraction.
- [ ] Verify existing points + publishing purchase + accepted delivery-admission integration suites and module construction; show Worker can obtain only point infrastructure without media/article/HTTP dependencies.
- [ ] #73 records the stable extraction revision and evidence; #77 verifies and consumes it without a parallel duplicate.

## N1: First Native recharge vertical slice

- [ ] Freeze single-yuan input, maintained shortcut-amount owner, account activity rules, configured min/max and bounded unresolved exposure. Specific values come from product/finance; test fixtures stay clearly synthetic.
- [ ] Add RechargeOrder, safe immutable observations/processing state, Commerce credit reservations and dedicated RECHARGE ledger relation; include amount and future sequence capacity in all relevant point operations, including returns.
- [ ] Implement stable merchant identity and idempotency, UNSENT/MAY_EXIST, cancel intent, query/close convergence and visible unresolved obligations.
- [ ] Implement exact notification route authentication, raw bytes, durable acceptance before ACK and database-driven inbox/query recovery.
- [ ] Build Native QR + order status + recharge history and account/publishing shortage entry; preserve saved publishing intent and reprice/reconfirm on return.
- [ ] Prove transaction rollback, concurrent callback/query, different-key duplicate, key rotation, delayed dispatch versus cancel, stopped customer, revision/amount limits, ACK-after-crash and Redis loss in isolated DB/HTTP/browser evidence.
- [ ] Verify a controlled Native merchant environment when products and credentials are ready. Distinguish a generated QR from a verified paid/funded result.

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
