# Architecture Review

Date: 2026-09-17. Scope: Issue #109 proposed Recharge Invoice module before implementation.

## Verdict

`ready`

No must-fix design finding remains. The module has one business owner, a small Recharge read contract, one-way notification dependency, explicit immutable history, bounded roles and a recoverable external-effect boundary.

## Challenge results

- Cohesion: request, submission revision, assignment, processing facts and audit change together and belong together. Payment observations, point credit, Support conversation and agency finance remain outside.
- Coupling: Recharge exposes eligibility/amount; it never imports Invoice. Notification consumes payload only. Web composition is not authorization.
- Integrity: order uniqueness, locked eligibility recheck, revision preconditions, atomic claim and state/audit/outbox transactions cover the reachable races.
- External effects: the real tax/email action is explicitly manual and outside the database transaction. `ISSUED` records an operator confirmation after the action, not delivery telemetry.
- Permissions: customer ownership, operations assignment and administrator takeover are distinct checks. Administrator power is broad operationally but cannot rewrite legal or monetary truth. Agent access is absent.
- Reuse: existing Prisma/Nest/Zod/Outbox/Notification and role shell are sufficient. A generic invoice, workflow, file or profile platform would add unsupported variability.
- Migration/rollback: additive tables/enums/relations; initial rollback disables commands and preserves accepted history. Destructive down-migration is not an operational recovery plan.
- Observability/privacy: logs and events use request/order IDs and states; tax number and full email stay inside submission records and customer/assigned/admin reads.
- Verification: the failure matrix names the smallest tests that can disprove money, ownership, revision, claim, completion and UI claims.

## Bounded residual gates

- Production brand-asset authorization and current visual rules must be rechecked against the merchant agreements.
- Production real invoicing remains blocked on finance-owned item name, processing time, refund/red-letter handling and operator SOP.
- Future payer discounts or refunds require Recharge to revise `invoiceableAmountFen`; Invoice must fail closed until then.
