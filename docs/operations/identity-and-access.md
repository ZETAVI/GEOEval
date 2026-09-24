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

## Real Challenge protection and delivery

Local development uses deterministic delivery with human verification disabled.
Production configuration is fail-closed and requires both real modes:

    AUTH_CHALLENGE_MODE=aliyun
    AUTH_HUMAN_VERIFICATION_MODE=aliyun
    AUTH_CHALLENGE_SENDING_ENABLED=0

Keep the sending switch closed while preparing the release. Supply the remaining
AUTH, ALIYUN and ALIBABA_CLOUD values listed in
[the environment example](../../.env.example) through the deployment
environment or secret manager. The browser prefix and SceneId are public
configuration; the AccessKey pair is not. Never use the Alibaba Cloud primary-
account AccessKey, place a secret in Git or copy it into an Issue, PR, log or
command output.

Before opening the switch:

1. Create a dedicated minimum-permission RAM runtime identity in a separately
   authorized account operation. It needs API access only, not console login or
   self-managed credentials. Attach one custom policy with exactly the current
   runtime calls:

   ```json
   {
     "Version": "1",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["yundun-afs:VerifyCaptcha", "dysms:SendSms"],
         "Resource": "*"
       }
     ]
   }
   ```

   Do not substitute the product-wide `AliyunYundunAFSFullAccess` or
   `AliyunDysmsFullAccess` policies. Record the custom policy name/version and
   RAM identity, never its keys. After the production egress is stable, add an
   `IpAddress` condition on `acs:SourceIp` to these policy actions and verify
   both the allowed egress and an outside source; this restriction belongs to
   the RAM policy, not the AccessKey itself. A separately approved local test
   credential must be short-lived and revoked or rotated after the test.

2. Confirm the backend and Web use the same approved mainland Web/H5 scene.
   Public authentication requires formal mode; test mode is limited to
   connection and deterministic second-challenge validation and remains
   billable. Alibaba documents approximately five minutes for a mode change to
   take effect.
3. Confirm the visible SMS SignName and TemplateCode are approved and reported
   for the target carriers. The accepted initial signature is `互动派科技`, and
   recipients will see it. A future `HDP` signature is not an activation
   dependency; never substitute an unapproved name in configuration.
4. Keep `/privacy` readily available before the user triggers CAPTCHA/SMS. It
   identifies the processor and contact path, purpose, categories, retention
   and rights procedure, and describes Alibaba's browser, IP, device and
   interaction-risk processing. GEOEval must not copy those raw observations
   into its own records.
5. Verify the configured 60-second resend interval, five requests/hour,
   provider-side limits, source-IP edge throttle, finite CAPTCHA-unavailable
   budget and operator stop path in the named environment. Production requires
   explicit daily/monthly attempt caps. The database control row is authoritative
   for admission and emits one redacted warning at each 80% threshold crossing;
   Alibaba statistics remain the provider-side cost reconciliation.
6. Use named authorized test mobiles and an explicit maximum paid count/amount.
   Keep carrier receipt, actual receipt and successful Challenge completion as
   separate evidence.

The identity.challenge.request telemetry event contains only the internal
correlation ID, configured provider names, bounded verification/delivery
outcomes and duration. It must not contain the full mobile, Challenge code,
captchaVerifyParam, AccessKey material or raw provider messages. Aggregate this
event for daily/monthly volume and cost alerts before paid activation.

The production runtime credential policy contains only
`yundun-afs:VerifyCaptcha` and `dysms:SendSms` and constrains both with
`acs:SourceIp` equal to the verified fixed server egress. Prove an allowed
server request and an outside-source denial before revoking the superseded key.
Changing egress is a fail-closed credential-policy incident, not a reason to
remove the condition silently.

Alibaba SendSms is not idempotent. The adapter never retries automatically: an
explicit rejection returns a service failure, while a timeout/connection loss
after possible submission preserves and returns the existing Challenge. The
user waits for that SMS and any later resend must pass the normal interval.
Provider acceptance is not carrier delivery and carrier delivery is not login.

## Temporary existing-demo-account SMS routing

When approved for a named demonstration, the API may route codes for at most
five exact, pre-existing demo mobiles to one controlled mainland recipient.
Configure `AUTH_DEMO_SMS_FORWARD_SOURCES` as comma-separated normalized
`+86` mobiles, `AUTH_DEMO_SMS_FORWARD_TO` as one normalized recipient and
`AUTH_DEMO_SMS_FORWARD_UNTIL` as a UTC timestamp no more than 14 days ahead.
Keep all three blank in normal operation. Partial, duplicate, non-mainland or
recipient-in-source configuration prevents startup. The route works only with
real Alibaba CAPTCHA and SMS and `INTERNAL_DEMO_MODE=0`.

Before activation, read the exact production Account roles/status for every
source, confirm each is an existing demo account, check the recipient through a
private deployment channel, back up the current environment and record the
expiry. Do not place the source list or recipient in Git, PRs, Issue comments,
telemetry or public responses. The original mobile remains the Challenge and
Session identity; this route cannot register a new account. CAPTCHA, per-mobile
limits, aggregate budget and the provider's no-retry behavior remain active.

After the role demonstration, use the administrator workspace to provision
separate real-mobile internal accounts, verify their own SMS login, then clear
all three routing fields under the normal release lock and restart the API.
An elapsed expiry stops routing even if the process remains running. Turning it
off does not revoke an already valid Session; use normal account governance if
an old demo account should be deactivated.

## Controlled Agency Entry activation

Agency acquisition is a separate opt-in capability owned by the
[Agency Entry contract](../../openspec/specs/agency-entry/spec.md). It may be
enabled for a named production pilot only after purchase-time agent/rate
snapshots exist and the product owner approves the exact test. Activation does
not enable commission accrual or withdrawal.

Set `AGENCY_ACQUISITION_ENABLED` to the same `0` or `1` value in the API and Web
environment files. Under the shared-host and GEOEval deployment locks, back up
both protected files, change both values, restart API and Web, and wait for live
and ready probes before exercising an entry. A one-sided setting is a failed
deployment: restore matching values instead of silently falling back to public
attribution.

When enabled, verify one administrator-issued active-agent link returns a 303 to
the ordinary `/enter` page and creates only an expiring anonymous visit. After a
user-operated CAPTCHA/SMS/OTP registration, verify one new terminal account,
one Session, one revision-1 customer attribution and one `INITIAL_BIND` audit;
never retain the mobile, OTP, entry Cookie or Session token as evidence. A later
login through an entry must not create another account, attribution revision or
initial-bind audit.

For configuration rollback, turn both values to `0`, restart API and Web, and
verify the agent link returns 503 while health remains ready. Existing accounts,
attribution, audits and order snapshots must remain unchanged. Restore both
values together when the approved pilot continues. Keep commission and
withdrawal switches under their independent Release Gates.

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

| Situation                                                               | Allowed response                                                                                                                                                        | Stop condition                                                                       |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| One of two administrators loses access                                  | The other active administrator uses normal Governance to deactivate/change the account or revoke its Sessions, then creates a separate replacement identity if needed   | Never edit the old mobile or share another account                                   |
| A user reports a lost device                                            | The user uses logout-all, or another administrator uses reasoned revoke-all for that account                                                                            | Do not inspect or expose credential digests as replacement credentials               |
| An account is inactive, revoked, or expired                             | Follow the bounded Web recovery state; reactivate only through authorized Governance and require a new authentication                                                   | Reactivation never restores an old Session                                           |
| The sole active administrator is unreachable                            | Preserve backups, Account/Session/audit state, stop administrator-only operations, and open an explicitly authorized production incident and recovery-security decision | Bootstrap stays closed; there is no Recovery Secret or automated break-glass command |
| A release needs post-activation application rollback                    | Pause and design an approved Session invalidation, compatibility, write-stop, and verification plan                                                                     | The pre-activation compatibility rehearsal alone is insufficient                     |
| CSRF/Origin failures appear after release                               | Confirm the exact deployed Web Origin and request header/content type; do not weaken checks to wildcard or suffix matching                                              | Topology changes require review before policy changes                                |
| CAPTCHA returns a normal denial, replay or scene mismatch               | Ask the user to complete a fresh verification; confirm matching Web/backend SceneId if failures grow                                                                    | Never classify a normal denial or configuration error as provider unavailability     |
| CAPTCHA invocation has network/timeout/5xx failures                     | Observe the finite configured degradation budget; close new Challenge sending if the threshold is reached or failures grow                                              | Do not widen/reset the budget or add replicas without a new risk decision            |
| SMS returns signature/template/qualification/balance/permission failure | Keep new sending closed, repair the external asset or credential and re-run a named test                                                                                | Do not retry, switch signature silently or expose raw provider detail                |
| SMS submission times out with unknown outcome                           | Preserve the Challenge, ask the user to wait, and allow only the ordinary resend path after its interval                                                                | Do not submit a second SMS automatically                                             |
| SMS cost or abuse grows unexpectedly                                    | Set AUTH_CHALLENGE_SENDING_ENABLED=0 and restart/reload through the authorized release path; keep Sessions available                                                    | Do not delete Challenge, Account or Session facts to stop cost                       |
| Daily or monthly Challenge budget is exhausted                          | Keep new sending closed, inspect the singleton budget and provider console, then adjust only through an approved environment change                                     | Do not reset counters in SQL or expose counts to callers                             |
| Public edge exposes Swagger or Foundation validation                    | Restore the prior Basic-Auth Nginx file or prior immutable release, then correct production composition                                                                 | Do not rely on an unlinked hidden URL as access control                              |

## Release evidence

A release record should identify the exact revision, database, migration status,
backup/restore evidence, real Challenge adapter validation, trusted Origins,
Cookie inspection, first and second administrator readiness, cleanup execution,
monitoring, allowed/denied role smoke tests, and rollback decision. Never attach
plaintext Challenge, Session, Cookie, Bootstrap, provider, or database secrets.
