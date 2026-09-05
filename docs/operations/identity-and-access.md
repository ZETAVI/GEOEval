# Identity and Access Operations Runbook

## Purpose and authority

This runbook covers safe preparation and operation of the accepted
[Identity and Access contract](../../openspec/specs/identity-and-access/spec.md).
It does not authorize a production migration, real SMS, a real administrator,
deployment, activation, direct database repair, or acceptance of residual risk.
Each of those actions remains an explicit human Gate.

## Before production preparation

1. Confirm a named release owner, environment, database, trusted Web Origin,
   Cookie topology, migration revision, rollback window, and backup/restore
   evidence.
2. Select and validate a real Challenge-delivery adapter. The current
   deterministic adapter is local/test-only and the API intentionally refuses
   to start with it in production.
3. Review all `AUTH_*` and `CORS_ORIGINS` values in
   [`.env.example`](../../.env.example). Customer and internal idle/absolute
   timeouts, Challenge limits, retention, Cookie security, and exact Origins are
   security policy, not harmless deployment defaults.
4. Provide deployment monitoring for Challenge issue/failure/rate-limit,
   Session creation/revocation/expiry, 401/403/CSRF, Governance, cleanup, and
   Bootstrap outcomes without logging Challenge codes, Session credentials,
   Cookies, Bootstrap secrets, or authentication-capable identifiers.
5. Keep an independently restorable backup before migration. Rehearse restore
   against the named release environment or its representative isolated copy.

## Migration and activation

1. Stop before applying migrations unless the production migration Gate names
   the target database and accepted revision.
2. Apply the checked Prisma migration owner once and confirm migration status.
3. Before activation, verify that the application can read existing Accounts
   and Sessions, that exact Origins are correct, and that no production Cookie
   Domain is configured. Production Cookies use the `__Host-` prefix, `Secure`,
   `HttpOnly`, `SameSite=Lax`, and `Path=/`.
4. If the new access contract fails before activation, revert the application
   and leave additive fields dormant; do not delete Account or business data.
5. Do not roll old application code back after new account status, idle expiry,
   or revocation semantics have become active without a separately approved
   procedure that stops conflicting writes, invalidates affected Sessions, and
   verifies the restored security boundary.

## First administrator Bootstrap

Bootstrap is a one-time offline deployment command, not an API. Its deployment-
managed secret must be at least 32 characters; configuration contains only its
SHA-256 digest. The plaintext secret is supplied through protected standard
input and must not appear in shell history, logs, tickets, or command arguments.

With placeholders resolved by the authorized release owner:

```bash
<secret-manager-read-command> | \
  IDENTITY_BOOTSTRAP_SECRET_DIGEST=<sha256-digest> \
  DATABASE_URL=<explicit-target-database> \
  pnpm identity:bootstrap -- \
    --mobile=<unused-mobile> \
    --key-id=<non-secret-deployment-key-id> \
    --secret-stdin
```

Accept only:

- `CREATED` on the first authorized execution; or
- `UNCHANGED` for an exact replay against the same account and key identity.

Any conflict is a stop condition. Do not alter Bootstrap control, create an
administrator directly in SQL, or repurpose Bootstrap as recovery.

## Administrator readiness

Before production depends on administrator-only work:

1. Sign in as the Bootstrap administrator through the real Challenge path.
2. In `/admin/accounts`, create a second active administrator with a recorded
   business reason.
3. Verify the second account can independently authenticate, reach `/admin`, and
   inspect account governance.
4. Keep both accounts under separate role-specific mobile identities. Do not
   share one credential, create a multi-role account, or lower the database
   invariant into an informal single-person exception.

An administrator may use ordinary current logout or logout-all. They cannot use
Governance to deactivate, change, or administratively revoke their own account;
another active administrator performs an allowed, reasoned change.

## Routine Session and Challenge cleanup

Run the bounded cleanup command under a scheduled deployment job with an
explicit database target:

```bash
DATABASE_URL=<explicit-target-database> pnpm identity:cleanup
```

The command deletes only terminal Session, Challenge, and Challenge-rate records
past configured retention in bounded batches. It does not delete active
Sessions, Accounts, business records, or Identity Governance audits. Record
counts and failures as operational evidence, and investigate repeated backlog
growth before changing retention or adding another authority store.

## Incident boundaries

| Situation | Allowed response | Stop condition |
| --- | --- | --- |
| One of two administrators loses access | The other active administrator uses normal Governance to deactivate/change the account or revoke its Sessions, then creates a separate replacement identity if needed | Never edit the old mobile or share another account |
| A user reports a lost device | The user uses logout-all, or another administrator uses reasoned revoke-all for that account | Do not inspect or expose credential digests as replacement credentials |
| An account is inactive, revoked, or expired | Follow the bounded Web recovery state; reactivate only through authorized Governance and require a new authentication | Reactivation never restores an old Session |
| The sole active administrator is unreachable | Preserve backups, Account/Session/audit state, stop administrator-only operations, and open an explicitly authorized production incident and recovery-security decision | Bootstrap stays closed; there is no Recovery Secret or automated break-glass command |
| A release needs post-activation application rollback | Pause and design an approved Session invalidation, compatibility, write-stop, and verification plan | The pre-activation compatibility rehearsal alone is insufficient |
| CSRF/Origin failures appear after release | Confirm the exact deployed Web Origin and request header/content type; do not weaken checks to wildcard or suffix matching | Topology changes require review before policy changes |

## Release evidence

A release record should identify the exact revision, database, migration status,
backup/restore evidence, real Challenge adapter validation, trusted Origins,
Cookie inspection, first and second administrator readiness, cleanup execution,
monitoring, allowed/denied role smoke tests, and rollback decision. Never attach
plaintext Challenge, Session, Cookie, Bootstrap, provider, or database secrets.
