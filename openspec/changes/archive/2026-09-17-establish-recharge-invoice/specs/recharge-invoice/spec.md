# Recharge Invoice Delta Specification

## ADDED Requirements

### Requirement: Recharge-owned eligibility and invoice amount

- A customer SHALL apply only for their own `SUCCESSFUL` CNY recharge with one unambiguous Recharge-provided `invoiceableAmountFen` and no existing request.
- Invoice SHALL NOT derive amount from browser input, points, provider observations or payer discount fields.
- Failed, confirming, closed, zero-value, foreign, refunded, discounted/ambiguous and already-requested orders SHALL remain ineligible without leaking another account's order.

### Requirement: One customer-initiated ordinary invoice request

- Payment success SHALL NOT create an invoice request or operations task.
- One eligible recharge SHALL have at most one electronic ordinary-invoice request; no merge, split, special invoice or customer-entered amount is supported.
- An individual submission SHALL contain an editable title defaulted to `个人` and a receiving email. An enterprise submission SHALL contain legal name, unified social credit code/tax number and receiving email.
- Telephone, address, bank, account number, identity document, country/region, postcode and VAT/GST SHALL NOT be collected.
- The latest prior submission MAY seed a new form, but only explicit submission creates a server record; accepted submissions are immutable revisions.

### Requirement: Correction, assignment and completion lifecycle

- Stored customer status SHALL be `PROCESSING`, `NEEDS_CORRECTION` or `ISSUED`; eligibility is a derived view.
- Operations SHALL atomically claim from a shared pool. Only the current assignee may request correction or complete the request.
- Correction SHALL require a bounded reason, notify the customer and allow a new revision on the same request. Resubmission SHALL keep the assignee by default.
- Completion SHALL require an invoice number, issue date and explicit confirmation that operations has already sent it outside GEOEval. Status, completion facts, audit and Outbox SHALL commit together.
- GEOEval SHALL NOT send email or upload/store/serve an invoice PDF. Nonreceipt or later dispute SHALL route to Support with the request reference.

### Requirement: Administrator governance without legal-data mutation

- A current administrator SHALL read all requests and audit, assign or reassign to an eligible operations account, return to the pool, or explicitly take over.
- An administrator may perform correction/completion only after explicit takeover; every governance and processing action SHALL append audit.
- No role may alter an accepted customer submission, Recharge owner/amount, or eligibility; `ISSUED` SHALL not be reversed by this module.
- Agents SHALL have no recharge-invoice access.

### Requirement: Same-page, concise and identifiable interaction

- The customer recharge page SHALL present `充值记录 / 发票记录` tabs and tabular records, with invoice status and action attached to each recharge.
- Application and correction SHALL use a focused dialog in the current payment/order flow, not a separate invoice center or long inline expansion.
- User copy SHALL explain only the current action and next step; the confirmation is `我确认以上开票信息准确` and SHALL NOT expose internal edit-state rules.
- Payment methods SHALL display official Alipay and WeChat Pay marks with visible text and equivalent visual weight.
- Long UUIDs SHALL use a short human-scannable reference with a control that copies the complete immutable value; the detail view SHALL make the complete value available.
- Issued detail SHALL show invoice number, issue date, operations-confirmed sent time and masked email, without implying verified email delivery or offering a file download.
