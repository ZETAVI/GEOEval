# Recharge Specification

## Current boundary

Recharge owns recharge orders, payment observations and Native recovery. Commerce
owns account balance and point history; Recharge uses its existing transaction
binding for reservations and credit. Customer commands and safe reads are owned by
[CustomerRechargeService](../../../apps/backend/src/recharge/application/customer-recharge.service.ts);
the [Native runtime](../../../apps/backend/src/recharge/native-recovery.runtime.ts)
and its repositories own dispatch and settlement. Payment adapter contracts remain
in [PaymentGateway](../../../apps/backend/src/recharge/application/payment-gateway.ts).

The ordinary API exposes authenticated history and recovery of committed creation
requests, with new payment creation disabled. A configured test host can exercise
the same customer API, signed notifications and durable recovery. This boundary
does not activate a real merchant, production Worker, H5, invoices or customer
success notifications.

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

### Requirement: Explicit activation and compatible rollback

- With no merchant configuration, options SHALL report unavailable and the
  default host SHALL register no provider callback, gateway or payment timer.
  Explicit controlled configuration SHALL be labelled and rejected in production.
- Operational merchant configuration, maintained amount policy/support, Worker
  budgets, notifications and real-money acceptance remain separately gated.
- The history-index migration SHALL preserve existing money and order facts.
  Disabling new creation or reverting presentation SHALL not delete facts,
  reservations or the processing capability needed for existing obligations.
