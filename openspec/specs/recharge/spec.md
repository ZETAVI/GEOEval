# Recharge Specification

## Current boundary

Recharge owns recharge orders, payment observations and payment recovery. Commerce
owns account balance and point history; Recharge uses its existing transaction
binding for reservations and credit. Customer commands and safe reads are owned by
[CustomerRechargeService](../../../apps/backend/src/recharge/application/customer-recharge.service.ts);
the [Native runtime](../../../apps/backend/src/recharge/native-recovery.runtime.ts)
and its repositories own dispatch and settlement. Payment adapter contracts remain
in the provider-neutral [RechargePaymentGateway](../../../apps/backend/src/recharge/application/provider-payment.ts),
with the released WeChat port retained behind a compatibility adapter.
The explicitly configured [resident worker](../../../apps/backend/src/recharge/recharge-worker.module.ts)
drives that runtime independently of customer API, Identity, evaluation and Redis.

The ordinary API exposes authenticated history and recovery of committed creation
requests. Alipay and WeChat remain disabled unless the host supplies their explicit
activation profiles and protected key files. A configured host may compose both
channels; customer commands route by the order's frozen method, callback routes
select their own verifier, provider dispatch remains independent, and the shared
settlement scan still applies one authoritative Commerce transaction. The separate
Recharge worker entry point uses the same configuration and durable recovery; the
general evaluation worker does not load payment keys. This boundary does not
activate production payment or H5. Customer recharge invoicing is implemented by
the owner-local [Recharge Invoice specification](../recharge-invoice/spec.md),
which consumes only the narrow eligibility and `invoiceableAmountFen` projection;
it does not enter Provider, callback, recovery or credit state. Customer success
notifications require the configured Recharge delivery lane.

The [Alipay adapter](../../../apps/backend/src/recharge/infrastructure/alipay/README.md)
provides SDK-level page/notification/query/close handling and is assembled through
an Alipay gateway only when configured. Its presence and installed SDK do not
enable payments. Alipay V2 observations coexist with unchanged WeChat V1 records
and converge on the same settlement transaction.

## Requirements

### Requirement: Customer identity and safe order reads

- Customer routes SHALL require the current terminal-customer session and the
  existing CSRF policy for mutations. The expected-account header fences stale
  browser identity and SHALL never select or override the authenticated owner.
- A missing or another customer's order SHALL be unavailable. Responses SHALL
  contain only customer order terms, status, usable payment action and permitted
  operations, with `no-store`; merchant identity, proofs, reservations, executor
  details and internal review reasons SHALL remain private.
- Account and optional status filters SHALL run before stable descending
  `createdAt/id` pagination. A cursor SHALL be bounded and tied to that account
  and filter. Unpaid orders SHALL remain discoverable independently of the ledger.

### Requirement: Recoverable whole-renminbi creation

- One explicit raw amount draft SHALL drive the form and confirmation. Decimal,
  malformed or out-of-range input SHALL not be rewritten into another amount or
  silently fall back to a shortcut. Successful payment credits ten funded points
  per renminbi; grants remain a separate Commerce operation.
- The browser SHALL retain account, amount, method and request key before sending.
  An uncertain result SHALL preserve that request across reloads; recovery uses
  the same content and key. A known committed request remains recoverable when
  new creation is disabled or the host has no merchant configuration.
- Only host-advertised methods SHALL be selectable for a new order. During the
  Alipay-primary rollout, the customer UI MAY keep WeChat visible as unavailable,
  but SHALL disable it and SHALL NOT submit it. A previously committed request
  keeps its original method visible and recoverable even when new creation for
  that method is unavailable.
- Creation SHALL commit the order, reserved capacity and first durable work
  together before any provider dispatch. Browser failure cannot create authority
  to release capacity, mint a replacement payment or report success.

### Requirement: Authoritative status and bounded browser work

- Customer business states SHALL be pending payment, confirming, successful and
  closed. Only matched authenticated provider facts may authorize once-only
  settlement through the existing atomic order/reservation/Commerce ledger core.
- GET SHALL not invoke a payment provider, extend a QR or advance a lease.
  Completion/refresh commands only request verification; durable attempt timing
  SHALL coalesce repeated hints and preserve failure backoff.
- Local poll/request timeout, QR expiry, return and cancellation acceptance SHALL
  not imply payment or remote closure. Cancellation intent SHALL survive reload;
  the QR stays hidden while remote obligations are unresolved. Only safe unsent
  cancellation or authenticated terminal evidence may release the reservation.
- Access loss, changed order/account, unmount and request generations SHALL fence
  stale UI responses. Success SHALL trigger a fresh account-fenced Commerce
  balance read, never a browser-computed balance increment; a failed refresh
  SHALL not undo successful payment.
- A notification ACK SHALL follow durable receipt acceptance and SHALL not wait
  for the settlement lane. Retries and concurrent query/notification delivery
  SHALL converge on one credit. This is separate from customer notification UI.

### Requirement: Alipay PC official cashier and authenticated evidence

- `ALIPAY_PC` creation SHALL freeze the same merchant, application, amount,
  description and absolute payment deadline as the local order. Before any signed
  cashier form becomes visible, an authenticated POST SHALL durably mark the order
  `MAY_EXIST` and link one immutable cashier attempt. Reopening SHALL retain the
  same order and deadline.
- The private cashier GET SHALL require the owning customer session, return a
  no-store/no-referrer document, and restrict form submission to the configured
  official production or sandbox Alipay gateway. The browser SHALL not supply
  signed HTML, gateway URLs, merchant identity, amount or payment outcome.
- Alipay form notifications SHALL be read as bounded raw form bytes, require RSA2
  verification and the configured app/seller identity, and be committed before a
  plain-text `success` response. Authenticated waiting/closed observations SHALL
  be retained without credit; only authenticated success with matching local
  order, transaction and total amount may enter settlement.
- Query and close SHALL use the official v3 POST interfaces through the pinned
  SDK. Query success and notification success SHALL share one monetary identity.
  Optional payer amounts or channel times MAY be absent from one source; absence
  alone SHALL not create a conflict or block credit. When both sources provide a
  field with different values, the order SHALL remain protected for review.
- Provider payment time MAY remain null when a successful query omits it.
  `creditConfirmedAt` and the unique RECHARGE ledger record SHALL establish local
  credit completion. A later matching notification MAY supplement evidence and
  SHALL neither duplicate points nor downgrade the successful order.
- `TRADE_CLOSED`, a missing trade, local expiry, return navigation and a lost close
  response SHALL not be treated as proof of an unpaid terminal outcome. A matched
  authenticated close response may close the order; ambiguous closed/refund
  outcomes remain held until the named channel lifecycle is accepted.

### Requirement: Bounded transient recovery

- Classified TIMEOUT, TRANSPORT, RESPONSE_INTERRUPTED and HTTP 429/5xx failures
  SHALL retain same-order QUERY work. QUERY 404 SHALL also retain bounded
  verification, without proving absence, payment or closure. Authentication,
  identity/amount mismatch and unclassified failures SHALL retain protection.
- The explicit policy SHALL switch from short retry delay to `slowRetryDelayMs`
  at `maxFailures`; the slow delay SHALL not be shorter than the short delay.
  Counts and next due time SHALL commit with the operation outcome. Restart and
  customer verification SHALL not reset backoff, extend expiry or release funds.
- Attempt failure class and optional HTTP status SHALL be immutable after
  completion. New runtime failures SHALL write classification; legacy all-null
  metadata remains compatible and SHALL not be filled with guessed evidence.
- Legacy exhausted orders SHALL resume only when active, without financial hold
  or lease, and with finished current-generation transport-failure evidence.
  Historical ambiguous HTTP errors and terminal orders SHALL remain unchanged.
  The SLOW_RETRY marker SHALL prevent old scanners from consuming resumed work;
  reverting the executor pauses that work and SHALL NOT delete its obligation.
- Authenticated success/closure SHALL still use existing financial matching,
  reservation and once-only settlement. Neither HTTP diagnostics nor retry
  exhaustion SHALL manufacture financial terminal states.

### Requirement: Simple customer copy

- History and checkout SHALL share four business labels and the corresponding
  short copy owned by [recharge-status](../../../apps/web/app/recharges/recharge-status.ts).
  Internal recovery phases SHALL not introduce public states or extra DTO hints.
- Local read/operation failures SHALL remain separate feedback and SHALL not
  overwrite the last known order state. Browser polling pause SHALL not imply
  that server recovery stopped. Notification failure SHALL not downgrade credit.
- The existing persistent support entry SHALL not be moved, hidden or highlighted
  according to order/retry state. Its later placement and service design are
  independent of this payment change; command permissions remain enforced.

### Requirement: Administrator read-only recharge lookup

- Only a current ADMINISTRATOR SHALL read the management list/detail endpoints.
  The expected-account header SHALL fence the actor, never select a customer.
  Customer, operations and agent sessions SHALL not gain this financial access.
- The list SHALL support exact customer/order, four-state and creation-time
  filters with bounded stable `createdAt/id` pagination. Cursors SHALL bind the
  actor and normalized filters. Inactive customer history SHALL remain readable.
- Management reads SHALL use a read-only consistent snapshot and explicit field
  projection. Order terms, adopted payment confirmation, unique credit record,
  latest completed query and customer-message delivery SHALL remain distinct.
  Missing confirmation SHALL not mean nonpayment; pending message delivery or
  later review SHALL not erase or downgrade an existing credit record.
- GET SHALL work without a merchant configuration and SHALL not call a provider,
  mutate an order/ledger/reservation or schedule work. The projection SHALL not
  expose credentials, proofs, raw payloads, QR actions or lease internals.
- The admin list/detail pages SHALL preserve simple four-state presentation and
  separately show payment, credit, query and delivery times. Read failures SHALL
  remain local feedback; stale account/filter/unmount/timeout responses SHALL not
  replace current data. Permission loss SHALL clear financial views.
- This read capability SHALL NOT introduce administrator payment, point-credit,
  cancellation, retry, cash refund or reconciliation commands. Exact fields are
  owned by [Admin DTO](../../../apps/backend/src/recharge/presentation/admin-recharge.dto.ts)
  and generated OpenAPI; the independent admin module owns assembly.

### Requirement: Explicit publishing continuation

- Publishing keeps the saved article and selection. Its recharge entry SHALL
  preserve only an account-bound saved Brand reference, without arbitrary return
  URLs or a pending purchase request. Unavailable browser return storage SHALL
  not destroy or prevent reading the server-owned publishing selection.
- Return SHALL re-read the current workspace, available balance and quote. A
  different current Brand SHALL be explained rather than silently switched.
  Recharge SHALL not reserve media, lock price, submit or purchase automatically.
- Confirmed success SHALL not expose customer self-service cash refund. A
  consistent support entry SHALL retain the order identity for manual handling.

### Requirement: Resident recovery and truthful process shutdown

- The configured worker SHALL use existing durable order and settlement scans,
  with one in-flight item per independent lane and an explicit delay after each
  completion. A slow provider SHALL not block the settlement lane. Local pacing
  SHALL not be presented as a merchant-wide or multi-replica rate limit.
- Stopping SHALL prevent future scan/claim attempts. A claim, provider call or
  commit already begun SHALL finish through the existing uncertainty and durable
  completion rules; stopping SHALL not manufacture provider cancellation.
- Shutdown SHALL wait for those lanes before Persistence disconnects. Exceeding
  the configured drain-warning time SHALL report pending work and continue
  waiting, never declare a drained worker or release money reservations.
- SIGKILL cannot run cleanup. A replacement process SHALL rediscover the same
  committed due/lease records, query the same merchant order and use once-only
  settlement. Process-crash evidence SHALL not imply machine/storage durability
  or verified real-merchant behavior.
- Process diagnostics SHALL distinguish started/stopping/stopped, lane failure
  and business review. Only fixed classifications, lane timestamps and counts
  may be emitted; raw errors, credentials and payment/customer identifiers SHALL
  not be exposed. A reporting failure SHALL not change payment results.
- Configuration SHALL be explicit. The dedicated module SHALL import no
  customer controllers, Identity, AI or Redis; the existing ordinary entry
  points SHALL not activate it without at least one provider activation profile.
  Each configured provider SHALL receive order work independently; the
  provider-neutral settlement lane SHALL be scanned once. Signal-hook ownership
  and an external supervisor's forced-stop policy remain the deploying host's
  responsibility.

### Requirement: Explicit activation and compatible rollback

- With no merchant configuration, options SHALL report unavailable and the
  default host SHALL register no provider callback, gateway or payment timer.
  Explicit controlled configuration SHALL be labelled and rejected in production.
- Operational merchant configuration, maintained amount policy/support, Worker
  budgets and real-money acceptance remain separately gated.
- Alipay activation SHALL default to `disabled`. `verify` SHALL load authenticated
  callback/query recovery without opening new payment creation and SHALL remain
  usable as the production stop-new-payments mode; `sandbox` and `live` SHALL
  require their matching gateway environments. Sandbox activation SHALL be
  rejected in production, and `live` is the only profile that may expose a
  production cashier. Private/public PEM paths SHALL be absolute protected files
  outside Git, never inline environment secrets.
- WeChat activation SHALL default to `disabled`. `verify` SHALL load request
  signing, response/callback verification, callback decryption and existing-order
  query/close recovery without allowing a new Native order. `live` alone SHALL
  expose `WECHAT_NATIVE` for creation and enable Native initiation. Merchant API
  private key, WeChat Pay public key and APIv3 key SHALL be read from absolute
  protected files outside Git; key contents SHALL not be accepted through public
  API input, logs or committed environment files.
- When several providers are configured, the host SHALL reject duplicate methods,
  duplicate callback providers and conflicting shared amount/active-order policy.
  Stopping creation for one provider SHALL keep its callbacks and existing-order
  recovery available and SHALL NOT remove another provider's creation method.
- The history-index migration SHALL preserve existing money and order facts.
  Disabling new creation or reverting presentation SHALL not delete facts,
  reservations or the processing capability needed for existing obligations.


### Requirement: Durable post-settlement customer notification

- The first successful C1 credit SHALL insert one Recharge-owned notification
  delivery row in the same transaction as the order, funded balance, reservation
  consumption and unique RECHARGE ledger. Failure to insert rolls back that
  uncommitted credit; existing trusted observations remain recoverable.
- An already successful order SHALL not add another obligation. Forward migration
  SHALL preserve old money/order/notification data and SHALL not backfill old
  successful orders, including later payment-fact replay.
- The private obligation SHALL reference immutable successful-order facts, keep
  identity/occurrence immutable, and advance delivery monotonically. It SHALL NOT
  duplicate payment proofs or use the order's financial review reason for notices.
- A separately opt-in Worker lane SHALL ask Notification to materialize the notice
  before marking delivery. This lane SHALL remain independent of slow Native I/O,
  use bounded work and join shutdown drain. No configuration means no delivery;
  all committed obligations remain available for later activation.
- Notification/materialization failures SHALL never undo committed points. A
  temporary error defers that row to permit later work; source-identity conflict
  stops its automatic retries with a restricted classification. Conditional writes
  SHALL prevent stale failures from reversing successful delivery or conflict hold.
- A process killed after materialization but before the delivery marker SHALL
  retry the same source and preserve the one notice and its read state. No new
  claim lease or generic evaluation Outbox is required for this idempotent effect.
- Disabling the notification lane is a compatible operational fallback; deleting
  obligations, notifications or money facts is not its rollback mechanism.
