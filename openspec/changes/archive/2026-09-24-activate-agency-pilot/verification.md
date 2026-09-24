# Verification

Local evidence on 2026-09-23 (China time), from Issue #162 branch:

- Backend typecheck passed.
- Agency HTTP and attribution integration: 18 passed against the project-local
  PostgreSQL. Production-like module registration no longer rejects opt-in;
  default-off API still rejects entry requests; existing link, Cookie source,
  new-account attribution and authority tests passed.
- Deployment example test: 8 passed. Web acquisition boundary: 7 passed.
- Production build passed.
- After rebasing onto `main@0b367e4`, combined Identity/Agency integration:
  41 passed across three files.

## Production acceptance on 2026-09-24 (China time)

The accepted source is deployed as immutable `geoeval-916d869`. API and Web
both use `AGENCY_ACQUISITION_ENABLED=1`; order settlement is on, while the
Commission Worker and Withdrawal remain independently off. Before the user
journey, production had two active entry rows, one enabled agent commission
term, and no customer attribution, order agency snapshot, final settlement,
booked commission or withdrawal fact.

The product owner opened an active agent link, reached the ordinary `/enter`
page, completed formal CAPTCHA/SMS/OTP with a new mobile and landed at
`/brands`. Redacted authoritative evidence showed:

- account count advanced from 6 to 7 and the new account is one active terminal
  customer with an active Session;
- the Challenge was consumed once with zero failed attempts and no
  supersession;
- one revision-1 attribution with non-null agent/link and one matching
  `INITIAL_BIND` audit committed at the authentication timestamp;
- no mobile, CAPTCHA value, OTP, Cookie token or Session token was read or
  retained.

The owner then logged in again through the same agent entry. Account count
remained 7; attribution remained one row at revision 1 with its original
creation time; `INITIAL_BIND` remained one row. The later source-bearing
Challenge was consumed and authentication time advanced, proving login did not
repeat registration or rewrite attribution.

Configuration rollback ran under both host locks against the same immutable
release. Root-owned `0600` backups of API/Web environments were created. With
both flags set to `0` and both services restarted, the agent entry returned 503
while health returned 200; account/attribution/initial-bind counts remained
`7/1/1`. Restoring both flags and restarting returned entry/health to 303/200
with the same counts. API and Web ended active with `NRestarts=0` and no
warning-or-higher entries in the inspected window.

This proves the controlled acquisition release only. It does not activate or
claim commission, withdrawal, public payment, demo-account SMS forwarding or a
general carrier-delivery rate. Follow-up finance activation is owned by Issue
#167.
