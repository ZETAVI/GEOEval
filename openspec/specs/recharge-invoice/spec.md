# Recharge Invoice Specification

## Current boundary

Recharge Invoice is an owner-local submodule of Recharge. Recharge remains the
only owner of payment success and exposes one transaction-bound
`RechargeInvoiceOrderAccess` projection with the eligible order identity,
customer, currency, paid time, method and `invoiceableAmountFen`. Recharge
Invoice owns the request, immutable submission revisions, current assignment,
processing facts and append-only audit. Recharge does not import Invoice.

Notification materializes correction and issued events from Product Outbox and
does not call back into the lifecycle. Support is the destination for nonreceipt
or post-issue disputes; it does not copy invoice state. Agents have no access to
customer invoice data. Tax-platform work and email sending occur outside GEOEval;
the product stores no invoice file.

## Requirements

### Requirement: Recharge-owned eligibility and amount

- A customer SHALL apply only for their own `SUCCESSFUL` CNY recharge with one
  unambiguous Recharge-provided `invoiceableAmountFen` and no existing request.
- Invoice SHALL NOT derive amount from browser input, points, provider internals
  or payer discount fields. Under the initial no-discount rule the owner-provided
  amount equals the certified order `amountFen`.
- Failed, confirming, closed, zero-value, foreign, refunded,
  discounted/ambiguous and already-requested orders SHALL remain ineligible.
  Another customer's order SHALL be indistinguishable from a missing order.

### Requirement: One explicit electronic ordinary-invoice request

- Payment success SHALL NOT create a request or operations task. Only an explicit
  customer submission creates one.
- One eligible recharge SHALL have at most one request and one electronic
  ordinary invoice. Merge, split, special invoice and customer-entered amount
  are unsupported.
- An individual submission SHALL contain an editable title defaulted to `个人`
  and receiving email. An enterprise submission SHALL contain legal name,
  unified social credit code or taxpayer number, and receiving email.
- Telephone, address, bank, account number, identity document, country/region,
  postcode and VAT/GST SHALL NOT be collected.
- The latest accepted submission MAY seed the next form but is not a separately
  editable profile. Only explicit submission creates a record, and every
  accepted submission is an immutable revision.

### Requirement: Correction, assignment and completion lifecycle

- Stored customer status SHALL be `PROCESSING`, `NEEDS_CORRECTION` or `ISSUED`;
  eligibility is a derived order view. Assignment is independent of customer
  status.
- Operations SHALL atomically claim from a shared pool. Only the current
  assignee may request correction or complete the request.
- Correction SHALL require a bounded reason, notify the customer and allow one
  new submission revision on the same request. Resubmission SHALL keep the
  current assignee by default.
- Completion SHALL require an invoice number, issue date and explicit operator
  confirmation that the invoice has already been sent outside GEOEval. Status,
  completion facts, audit and Outbox SHALL commit together.
- GEOEval SHALL NOT send email or upload, store, preview or serve an invoice PDF.
  Nonreceipt or later dispute SHALL route to Support with the request and order
  reference.

### Requirement: Administrator governance without truth mutation

- A current administrator SHALL read all requests and audit, assign or reassign
  to a current operations account, return to the pool, or explicitly take over.
- An administrator may request correction or complete only after explicit
  takeover. Every governance and processing action SHALL append audit.
- No role may alter an accepted submission, Recharge owner or amount, bypass
  eligibility, delete history or reverse `ISSUED` through this module.

### Requirement: Same-page concise interaction

- The customer recharge page SHALL present `充值记录 / 发票记录` tabs and tables,
  with invoice state and action attached to each recharge. It SHALL NOT add a
  standalone invoice center or account-level invoice-profile module.
- Application and correction SHALL use a focused dialog in the current flow.
  Confirmation SHALL read `我确认以上开票信息准确` and SHALL NOT explain internal
  edit-state rules.
- Payment methods SHALL display official Alipay and WeChat Pay marks with visible
  names and equivalent visual weight.
- Long UUIDs SHALL use a short scannable reference plus a control that copies the
  complete immutable value; details SHALL retain access to the full value.
- Issued detail SHALL show invoice number, issue date, operator-confirmed sent
  time and masked email without claiming verified email delivery or offering a
  file download.

### Requirement: Idempotent, private and recoverable commands

- Customer and internal commands SHALL recheck current role/status, account
  fence, assignment, state and expected revision in the accepting transaction.
- Actor-scoped request identities SHALL recover the same intent and reject a
  different intent. Order uniqueness and locked eligibility SHALL make concurrent
  applications produce at most one request; conditional assignment SHALL make
  concurrent claim produce one assignee.
- Submitted legal data and email SHALL remain in Invoice-owned submissions and
  authorized responses. Audit, notification and Outbox SHALL not copy tax number
  or full email.
- Notification retry SHALL materialize at most one notice and SHALL never roll
  back accepted invoice state.
