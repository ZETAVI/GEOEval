# Alipay protocol adapter

`AlipayPaymentAdapter` owns the official SDK 4.14.0 boundary: local POST-form
generation, RSA2 form-notification verification, and authenticated v3 query/close
interpretation. It has no module registration, database, retry loop, environment
lookup or ledger access. It deliberately does not implement the current
WeChat-only `PaymentGateway`: that port's V1 proof and QR-only result cannot
truthfully represent this protocol. The common frozen `PaymentOrder` is reused.

- Configuration pins the merchant, app, environment, key and HTTPS notify/return
  URLs. Public-key and certificate modes both use the real SDK; certificate mode
  checks that the application certificate matches the private key. Certificate
  issuance, account binding, rotation and expiry operations remain host concerns.
- `preparePage` only produces a signed `ALIPAY_POST_FORM`; it has no remote proof.
  The caller must persist its obligation before exposing that material. It uses
  Shanghai calendar times and the original absolute deadline. The result is for
  a dedicated controlled document, never arbitrary HTML in the application UI.
- `verifyNotification` accepts raw form bytes, rejects duplicates and malformed
  encoding, decodes once, verifies RSA2, and matches the configured app/merchant.
  It accepts delayed notifications and IDs through 128 characters. Its caller
  must additionally match the observed order number and amount to the frozen
  local order before settlement, and persist acceptance before HTTP `success`.
- The returned trade distinguishes success, waiting and `CLOSED_UNRESOLVED`.
  A closed trade is not a refund command or an unpaid-close proof. Optional buyer
  amounts and channel dates stay absent; notification payment time is not
  conflated with query seller-transfer time.
- `query` and `close` use the SDK's v3 POST path and require the matching order
  number; success additionally needs transaction identity and exact amount.
  The SDK proof identifies validated parsed data and its JSON-serialization
  digest, not a raw signed body or an independently re-verifiable signature.
- HTTP error responses from this SDK are not authenticated success observations.
  Returned failures contain only fixed classifications and optional status, never
  the SDK exception or raw request/response. SYSTEM_ERROR may be HTTP 400 and is
  retryable. NOT_EXIST and status errors request verification, never release.
- There is no automatic retry inside this adapter. The caller owns retry budgets,
  consistency and recovery. The SDK timeout is passed explicitly; it is not
  claimed to be a full-operation cancellation deadline or response-size guard.

## Evidence and remaining activation work

`test/alipay-payment.adapter.spec.ts` runs the real published SDK with temporary
RSA keys and local self-signed certificates. It intercepts the SDK's ESM HTTP
transport and supplies controlled response bytes; assertions check requests and
signatures independently using Node crypto. These are transport-substitution
tests, not a real network, merchant, sandbox or financial acceptance test.

Before runtime assembly, complete the versioned observation/receipt migration,
durable form issue/restore, authenticated customer/notification HTTP wiring and
same-transaction credit. Also verify real transport origin/redirect behavior,
response-size limits and total request deadline/cancellation: the current SDK
interface alone does not establish these guarantees. Production assembly must
not proceed until that transport boundary is exercised and bounded. Keep SDK
debug payload logging disabled in the eventual payment host.

Per-channel recovery follows authenticated evidence. Routine transient cases
should recover automatically; genuinely ambiguous financial outcomes retain
restricted review. Natural expiry, late form submission, lost close ACK and
fully refunded `TRADE_CLOSED` need separate channel evidence before automatic
closure is enabled. Do not force every ambiguity into automation or send every
ordinary expiry to an operator.

Official sources and the current integration design remain in the owning change's
[source brief](../../../../../../openspec/changes/establish-recharge-payments/source-brief.md)
and [design](../../../../../../openspec/changes/establish-recharge-payments/design.md).
