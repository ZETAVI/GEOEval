# Backend foundation fixed-diff review

- Reviewed: `f75790b` against `82f70564889698d501129b5188f4046a1a20dfa9`
- Date: 2026-09-04
- Verdict: Ready as an Issue #50 backend implementation checkpoint; not ready
  as the final Issue #50 delivery

## Intent

The diff stays inside Issue #50 ownership: Account, Authentication, Session,
Access, Governance, Audit persistence/contracts, authenticated controller
migration, and generated contracts. It does not add GEO Optimization/article
semantics owned by Issue #57, a multi-role model, generic permissions, JWT,
real SMS, production activation, or a recovery backdoor.

Brand creation's existing account-mobile default initially conflicted with the
narrow principal contract. The implementation preserves that accepted behavior
through one documented scalar `CurrentAccountMobile` compatibility accessor;
business controllers no longer receive an Identity `AccountView`.

## Engineering findings

1. **Resolved — recovery wording competed with the approved decision.** The
   module map and impact text still mentioned a recovery CLI/operator even
   though the owner explicitly deferred that authority. The active Change now
   describes one-time Bootstrap and the absence of an automated recovery
   command; the persisted actor enum remains only `ACCOUNT | BOOTSTRAP`.
2. **Resolved — malformed governance account IDs could reach PostgreSQL.** The
   governance service now validates target/audit account UUIDs and returns a
   bounded `400` rather than allowing an adapter/database parse error to become
   a `500`.
3. **Resolved before the fixed point — old-writer Session compatibility.** A
   non-null `idle_expires_at` without a database default would have broken an
   application rollback after migration. The schema/migration now provide a
   conservative 30-minute default, and the migration rehearsal proves both
   role-aware backfill and post-migration old-shape insertion.

No unresolved finding invalidates this backend checkpoint. The deliberately
combined PostgreSQL repository is still an internal implementation detail; the
application responsibilities are already separated at Authentication, Session,
Access, and Governance seams. Account/Audit/Bootstrap completion remains an
open task and should determine whether repository ports need a later local
split—no speculative abstraction is required at this checkpoint.

## Evidence and continuity

The evidence matrix is in
[backend-foundation-checkpoint.md](backend-foundation-checkpoint.md). Current
spec reconciliation, browser role shells, administrator UI, Challenge/cleanup,
Bootstrap, fixed-diff final review, PR, and workspace exit remain open. Issue
#50 must remain `In Progress`; Issue #57 may remain `Review / Decision` and
continue product discussion under the recorded single-writer boundaries.
