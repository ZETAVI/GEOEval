# Change: Activate agency entry for controlled production demo

- Status: approved by the product owner for testing on 2026-09-23
- Issue: [#162](https://github.com/ZETAVI/GEOEval/issues/162)
- Owner: Agency Entry
- Class: architectural / production attribution boundary

## Why

The agency entry, account attribution and purchase-time agent/rate snapshot
capabilities have been implemented and accepted. Their earlier production
startup prohibition still prevents the product owner from testing the live
invitation journey. The live API and Web flags are both off, one demo agent is
active, and no agency entry or commission terms have been issued.

## Outcome

An explicit API/Web deployment switch permits the existing agency entry flow
in the controlled demo. The administrator issues one link for the active demo
agent; a new customer follows it through the same `/enter` page and gains the
correct durable attribution. Public registration remains unattributed, and
existing accounts never rebind. Commission accrual and withdrawals stay off
for this pilot.

## Scope and non-goals

- Remove the obsolete unconditional production-startup rejection. Keep the
  existing API and Web activation flags default-off and coordinated.
- Verify the accepted link, Cookie, Challenge snapshot, atomic new-account
  attribution and existing-account invariants with production-like config.
- Document enable/disable checks and the fact that disabling cannot erase
  already accepted attribution or orders.
- No commission rate activation, payout, automatic money movement, payment or
  point mutation, new public API or new database table.

## Acceptance

- The production API starts with either flag value, while disabled entry
  requests still return unavailable.
- The Web and API use the same enabled value; a new agent link is issued by an
  administrator, not self-created by a visitor.
- A new test customer registers with that link and has one attributed account;
  an existing customer and a public visitor retain their prior/no source.
- `AGENCY_COMMISSION_ENABLED=false` and `AGENCY_WITHDRAWAL_ENABLED=0` remain
  unchanged on the named host; no commission or payout fact is produced by
  this activation alone.
- Turning both entry flags off blocks new acquisition without rewriting
  accepted relationships.

## Release

Merge and build one immutable release. After the real demo administrator login
is available, back up the current environment/database, verify the exact agent
and zero-link baseline, activate both flags under the deployment lock, restart
API and Web, then perform one user-driven new-customer test. Revert by turning
both flags off; preserve accepted account attribution and audit.
