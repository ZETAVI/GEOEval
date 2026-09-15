# Agency terms in the existing purchase transaction

## Architecture card

Agency owns commission settings and audit; Identity owns account eligibility; Commerce owns order snapshots, debit and recovery. Delivery owns fulfilment and actual resolution. Agency exposes an infrastructure leaf bound to the caller transaction, following ADR 0005; Commerce never queries Agency private tables. Importing the full Agency service/report module into Commerce is rejected because it creates unnecessary dependencies through Geo Optimization.

### State and interface

AgencyCommissionTerms: agent account, enabled (false initially), optional retained rate in integer basis points (0..10000, 0.01 percentage-point precision), revision and update time. Enabled requires a rate, zero is valid. Disabling retains the rate. Administrators may prepare settings for inactive agents, but this does not activate commission while inactive. Audit records exact request, before/after, actor, reason and system timestamp; actor/request identity recovers old success before revision checks.

PublishingOrderAgency is an optional one-to-one immutable snapshot owned by Commerce: referenced agent or null, attribution revision, agent eligibility, configured enablement, retained rate and terms revision. A missing row denotes an older order, not public attribution; no public status is added and no historical backfill occurs. Eligibility is the conjunction of captured active-agent status and enabled settings; the snapshot is not a commission ledger. Zero-rate eligible orders stay distinguishable from disabled ones. No customer contact or wallet copy. Database references/checks and an immutability trigger preserve history.

### Transaction and locks

Fast idempotent recovery reads an existing order before mutable inputs. For new work, Agency discovers the current agent, locks customer plus discovered agent accounts FOR SHARE in UUID order through Identity, and rereads attribution. Any changed discovery aborts the entire transaction and retries boundedly; do not acquire a new out-of-order account lock. Customer account locking also serializes a previously public relationship with no attribution row.

All settings writes lock actor/agent accounts in UUID order, using NO KEY UPDATE only for the agent and SHARE for the administrator, before reading or inserting settings. This protects absent settings without a synthetic row created by purchase. Agency transfer uses customer NO KEY UPDATE plus actor/destination SHARE in that order; Identity status/role updates conflict with SHARE. Parallel purchases use compatible account SHARE locks. After the Agency snapshot, Commerce locks wallet and repeats idempotent recovery, then follows its existing selection/article/media/debit/order/delivery sequence. Any retry must release all transaction locks first. No wallet-to-account exclusive-lock upgrade, network effect, global purchase mutex or asynchronous repair.

Settings reads/writes recheck current administrator and agent role under locks. Reactivation does not modify relationships or historical snapshots. Existing order success is recoverable even if current configuration changes. Snapshot/debit/order/delivery commit together.

### Alternatives and source brief

Separate pre-purchase reads permit mixed state; asynchronous snapshot filling loses historical truth; locking an absent settings row does not protect first configuration. Exclusive per-agent purchase locks would serialize unrelated customers. Reuse PostgreSQL/Prisma already in lockfile; no new dependency, fee or external call.

PostgreSQL locking/isolation documentation inspected 2026-09-14:
- https://www.postgresql.org/docs/current/explicit-locking.html
- https://www.postgresql.org/docs/current/transaction-iso.html
Shared row locks conflict with state updates but permit other shared readers; READ COMMITTED requires rereading discovered attribution after locks. Runtime tests must prove actual order and retry behavior; refresh sources if database major version or transaction semantics change.

## Failure and recovery

| Failure | Result / evidence |
| --- | --- |
| Settings same request retry | Original result; changed intent conflicts |
| Stale administrator form | Conflict, refresh; no overwrite |
| Purchase/migration changes discovery | Whole transaction retry; no debit or partial snapshot |
| Suspension/configuration concurrent purchase | One serial outcome; no mixed terms |
| Purchase fails after snapshot creation | Full rollback including wallet/delivery |
| Network result uncertain | Same purchase request returns existing order |
| Old order without snapshot | No inference/backfill; ordinary customer order remains |

## Migration and rollback

Add tables and relations, no destructive data rewrite. Existing orders keep no snapshot. New config defaults off. Migration preserves existing funded/granted ledger and reservations. Validate on reused OrbStack task database geoeval_issue100; no production rollout. Roll back application with additive tables retained, never drop captured history. Keep production acquisition guard until separate commercial acceptance. Use a pre-migration schema/data backup for controlled upgrade verification.

## Readiness

Architecture review: ready for bounded implementation, subject to the concurrency/rollback checks above. Ownership, approved meaning, no external effects, nullable legacy compatibility and recovery boundaries are explicit. No new product decision required. Branch codex/issue-104-agency-order-terms from main@fcc5562, main-direct; a100 worktree retained through integration closeout. Payment #77/#89 keeps Recharge ownership; this slice is sole writer for its Agency/Commerce schema and generated API changes.

Lock review correction: broad account UPDATE locks were rejected because an account foreign-key check from a wallet-owning adjustment can complete a wait cycle with a purchase and a concurrent settings/transfer mutation. NO KEY UPDATE protects the mutable subject against purchase SHARE while remaining compatible with foreign-key KEY SHARE. Only actual key changes/deletion require stronger exclusion. This is a local Identity leaf refinement, not a new global lock framework.
