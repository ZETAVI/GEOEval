# Alipay protocol adapter

`AlipayPaymentAdapter` owns the official SDK 4.14.0 boundary: local POST-form
generation, RSA2 form-notification verification, and authenticated v3 query/close
interpretation. It has no module registration, database, retry loop, environment
lookup or ledger access. `AlipayRechargePaymentGateway` maps it to the shared
Recharge provider port; the host-owned runtime configuration then composes API and
dedicated Worker entry points. The common frozen `PaymentOrder` is reused.

- Configuration pins the merchant, app, environment, key and HTTPS notify/return
  URLs. Public-key and certificate modes both use the real SDK; certificate mode
  checks that the application certificate matches the private key. Certificate
  issuance, account binding, rotation and expiry operations remain host concerns.
- `preparePage` only produces a signed `ALIPAY_POST_FORM`; it has no remote proof.
  The caller must persist its obligation before exposing that material. It uses
  Shanghai calendar times and the original absolute deadline. The result is for
  a dedicated controlled document, never arbitrary HTML in the application UI.
  The sandbox maximum is 15 hours; the protocol production maximum is 15 days.
  Business policy may impose a shorter window.
- `verifyNotification` accepts raw form bytes, rejects duplicates and malformed
  encoding, decodes once, verifies RSA2, and matches the configured app/merchant.
  It accepts delayed notifications and IDs through 128 characters. Its caller
  must additionally match the observed order number and amount to the frozen
  local order before settlement, and persist acceptance before HTTP `success`.
- The returned trade distinguishes success, waiting and `CLOSED_UNRESOLVED`.
  A closed trade is not a refund command or an unpaid-close proof. Optional buyer
  amounts and channel dates stay absent; notification payment time is not
  conflated with query seller-transfer time.
- Only success includes `factsVersion: 2` and `factsSha256`. The existing
  application `payment-facts` owner hashes provider, merchant, app, order,
  transaction, order total and currency in a fixed V2 order. Query, notification
  and `TRADE_FINISHED` share that monetary identity; optional buyer amounts,
  the two distinct channel dates and delivery metadata remain in their original
  trade/proof fields. The existing WeChat V1 digest is unchanged.
  Digest equality alone is not receipt equality or permission to credit: the
  future persistence consumer must match the frozen local order, preserve each
  authenticated observation and detect explicitly conflicting optional values.
  This adapter does not perform those database checks or discard metadata.
- `query` and `close` use the SDK's v3 POST path and require the matching order
  number; success additionally needs transaction identity and exact amount.
  The SDK proof identifies validated parsed data and its JSON-serialization
  digest, not a raw signed body or an independently re-verifiable signature.
- HTTP error responses from this SDK are not authenticated success observations.
  Returned failures contain only fixed classifications and optional status, never
  the SDK exception or raw request/response. SYSTEM_ERROR may be HTTP 400 and is
  retryable. NOT_EXIST and status errors request verification, never release.
- There is no automatic retry inside this adapter. The caller owns retry budgets,
  consistency and recovery. `alipayCallTransport` supplies a separate connection
  pool per query/close, an absolute monotonic deadline and an AbortSignal reaching
  the TLS connector as well as the active response. It destroys that pool before
  completing the call; it does not interrupt another call. `dispose()` rejects
  new outgoing work and idempotently waits for in-flight cleanup. Cancellation
  is local I/O cancellation, never proof that Alipay cancelled the trade; its
  result remains UNRESOLVED for the owning recovery process.
- The transport accepts exactly one POST to the frozen origin/path, rejects
  redirects before urllib can follow them, requests identity encoding and rejects
  encoded responses. It bounds the response to 128 KiB before SDK parsing and
  checks required success authentication headers and the configured certificate
  serial. These limits are local policy, not provider-published limits.
- The SDK types its public `agent` option as ProxyAgent while urllib accepts a
  Dispatcher. One local cast bridges that typing mismatch; actual HTTPS tests
  cover the pinned SDK/urllib/Undici combination. There is no global dispatcher
  mutation, monkey-patch or SDK fork. Undici 7.29.1 was already in the dependency
  closure and is now a direct pinned dependency, without upgrading it.
- Each call creates a connection rather than sharing keep-alive state across
  calls. This deliberately favors isolated cancellation for this bounded payment
  workload. A future pooling change must retain pre-connect cancellation and
  prove that cancelling one order cannot interrupt another.

## Runtime assembly and activation

`alipay-recharge.runtime-config.ts` is the only environment/key-file loader. It
requires absolute protected PEM files and complete merchant, app, HTTPS URL and
amount policy configuration. `RECHARGE_ALIPAY_ACTIVATION` defaults to `disabled`:

- `verify` loads callback verification plus query/close recovery but does not
  allow new orders or cashier grants; it is also the production rollback mode;
- `sandbox` requires the sandbox gateway and allows a controlled cashier;
- `live` requires the production gateway and is the only production cashier
  activation.

The API process loads this optional configuration. The separate
`recharge-worker-main` uses the same values for query, close, settlement and
customer-notification delivery; the general AI/evaluation Worker remains separate.
Stopping the API or Recharge Worker drains started gateway work and disposes the
adapter. Disabling creation does not remove callback/recovery support for existing
orders.

## Evidence and remaining activation work

`test/alipay-payment.adapter.spec.ts` runs the real published SDK with temporary
RSA keys and local self-signed certificates. It intercepts the SDK's ESM HTTP
transport and supplies controlled response bytes; assertions check requests and
signatures independently using Node crypto. These are transport-substitution
tests, not a real network, merchant, sandbox or financial acceptance test.

`test/alipay-payment.https.spec.ts` additionally runs the unmodified SDK, urllib
and Undici against local HTTPS, with ephemeral TLS and signing certificates. Only
DNS/port/CA are redirected to the local service. It covers signed query/close,
certificate serial checks, both redirect kinds, response limits, stalled TLS,
stalled headers, trickling bodies, cancellation, concurrency and disposal.

The versioned observation/receipt migration, durable cashier grant, authenticated
customer and notification HTTP paths, same-transaction credit and Worker recovery
are implemented. A clean database accepted all migrations and the integrated
Alipay suite proves persisted form issuance, callback-before-ACK, query/close,
duplicate convergence, optional-time convergence, wrong identity rejection and
one Commerce credit. Existing WeChat recovery tests remain green.

A production-gateway signed query with the approved app/key returned the expected
nonexistent-trade result. It created no transaction and proves only key, gateway,
SDK and query permission compatibility. Keep SDK debug payload logging disabled.

Per-channel recovery follows authenticated evidence. Routine transient cases
should recover automatically; genuinely ambiguous financial outcomes retain
restricted review. Natural expiry, late form submission, lost close ACK and
fully refunded `TRADE_CLOSED` need separate channel evidence before automatic
closure is enabled. Public callback delivery, browser return, a bounded real
payment and finance review remain action-time acceptance gates. Do not force every
ambiguity into automation or send every ordinary expiry to an operator.

Official sources and the current integration design remain in the owning change's
[source brief](../../../../../../openspec/changes/establish-recharge-payments/source-brief.md)
and [design](../../../../../../openspec/changes/establish-recharge-payments/design.md).
