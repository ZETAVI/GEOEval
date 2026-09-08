# Tasks

Owner #77. Completed boxes distinguish P0 experiments, A0 adapter, B0 unregistered notification module and current C1 design. B0 has been handed back; no shared schema/Commerce/API write window is currently open for this refinement.

## Remaining work and actual dependencies

The approved route stays account recharge → verified payment → funded credit → return to publishing review → explicit purchase → #73 fulfilment/point return. Finance assets are not a prerequisite for every engineering step. Existing evidence is reused; no further generic crypto/HTTP confidence loop is scheduled.

| Package | Concrete acceptance | Actual dependency / current action |
| --- | --- | --- |
| A0: WeChat operation adapter | Native initiate, query and close interpret authenticated protocol results; notification decrypts to a safe observation; exact required fields and frozen identity are validated; no activation | Technically independent of C0 and merchant credentials. A0 window approved and implementation/tests complete locally; confined to Recharge and its tests, no shared composition/schema writes |
| B0: Notification acceptance and recovery | Real Nest handler and Identity exemptions; observation + receipt commit before ACK; host/connection replacement and DB scans | Implemented under the B0 schema window: 25 new tests plus 2 current API inventory tests passed. Module remains unregistered in the current application; no settlement/worker claim |
| C0/N1: Points seam and first atomic credit | Reserve amount/sequence capacity, unique payment settlement and ledger, concurrent grant/purchase/return/recharge, crash rollback | #73 is sole points extraction writer. Review of its fixed extraction is complete; confirm a new shared writer/window before points/schema changes. Integration stays deferred; financial amount values are required before live orders, not for synthetic tests |
| Native/H5 customer journey | Own-order access/history, QR/local polling, saved publishing choice and reconfirmation; external-mobile H5 IP/domain/return | UI/API contracts can be prepared now. Executable journey needs N1; real browser launch additionally needs the named product entitlement, domain and controlled merchant environment |
| Recovery and reconciliation | Same-order query/close, persisted due state/lease, stop-new-orders, T+1 discrepancy handling | Recovery and bill parsing can be implemented/tested with controlled inputs in their write package. Real bill/download and money-exception handling require account/finance decisions |
| Activation | Limits, support, merchant/domain/secret rotation owners, bounded money test, financial reconciliation | Finance/product/operations supply these only before the corresponding live test or enablement. No production value is inferred from test configuration |

Current planning: A0/B0 have passed their fixed-head CI; [B0 handoff](https://github.com/ZETAVI/GEOEval/pull/80#issuecomment-5584078408) ended its schema window. #77 remains Review / Decision while refining its next atomic-core contract. The consumer review of unmerged #79 is complete. The user prefers continued preparation before later coordinated merges; no current merge is requested. C1 requires a new shared writer/window before implementation, not merchant credentials for synthetic tests. Alipay follows the first WeChat journey; H5, JSAPI and funds activation are not implied by these packages.

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
- [ ] At later authorized integration, reconcile #79 with the Recharge stack and recheck the affected composition/interfaces. Pending merge does not block owner-local design or independent core preparation, and is not authority to cherry-pick another owner's work.

## C1: First atomic recharge core — next implementation package

- [x] Refine design 5.0/6.2/6.3/7.2/9.2/10.1a: ownership, finite capacity, system-versus-client idempotency, receipt rechecks and recovery classification. These are proposed implementation contracts, not runtime capabilities.
- [ ] Before shared writes, confirm one writer/window for PointAccount, PointChange, the common capacity policy and #73 return interaction. The B0 window has ended; this design update does not reopen it or authorize edits to #79.
- [ ] In one coherent unactivated slice, implement RechargeOrder, per-order reservation, shared account capacity checks, dedicated RECHARGE ledger ownership and the narrow transaction-bound writer. Leave the current HTTP PointAccountService public interface and granted-only semantics intact.
- [ ] Demonstrate reserve → verified synthetic success → exactly one funded ledger result; safe UNSENT cancellation releases capacity. Provider calls and live customer APIs remain outside this first core transaction package.
- [ ] Apply the same balance/sequence-capacity check to existing grant and purchase writers and the approved return writer when it exists. No separate recharge balance algorithm or arbitrary cross-module applyDelta.
- [ ] Separate client creation retry from system settlement identity; preserve legacy request-key conflicts and require explicit non-null actor/key rules for old ledger kinds after any nullable migration.
- [ ] Prove the discriminating matrix in architecture-review: concurrent grant/purchase/return against reservation; two success notifications/query versus one ledger; partial failure after each write; lost response; same client key used by another operation; terminal replay; receipt conflict race and pending queue starvation.
- [ ] Keep quota/amount policy explicit and injected for synthetic tests. Live min/max, activity limits and exceptional money disposition require the named product/finance decision before dependent activation.

## N1: Native dispatch, recovery and customer journey

- [ ] Implement stable merchant identity, UNSENT/MAY_EXIST, cancel intent, query/close convergence, generation fences and visible unresolved obligations. Do not infer remote cancellation from a local timeout or expired lease.
- [ ] Register B0 and the verified core in the approved API/Worker composition with precise raw-body configuration and owner-bound customer commands. Recheck receipt state inside settlement; complete bounded due-state recovery and visible review-needed handling.
- [ ] Expand actual QUERY/CLOSE observation shapes without fake notification IDs; preserve B0 immutable notification facts and real nullable query fields.
- [ ] Build Native QR + local order status/history and publishing-shortage entry; preserve saved publishing intent and reprice/reconfirm on return.
- [ ] Run real HTTP and desktop browser tests with a controlled adapter, missing callback, cancellation/late dispatch, expired QR and interrupted responses; distinguish them from real merchant proof.
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
