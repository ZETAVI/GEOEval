# Change: Controlled SMS delivery for existing demo accounts

- Status: approved by the product owner for the demo transition on 2026-09-23
- Issue: [#161](https://github.com/ZETAVI/GEOEval/issues/161)
- Owner: Identity and Access
- Class: architectural / critical authentication boundary

## Why

The public site now uses real CAPTCHA and SMS. Existing internal demo accounts
use numbers that cannot receive SMS, so their normal role-specific login cannot
be exercised. The product owner chose a temporary delivery reroute to one
controlled handset instead of changing account identities.

## Outcome

Only an explicit list of existing demo mobiles can receive a real one-time code
at a separately configured mainland mobile. The Challenge stays bound to the
original account mobile, and normal CAPTCHA, rate limits, budget, code digest,
one-time use, Session and role checks remain authoritative. Other mobiles use
normal delivery. The routing expires and can be removed without a database
change.

## Boundaries

- No generic SMS forwarding UI or account-mobile alias.
- No OTP, target mobile or source list in public responses, telemetry or Git.
- Routed Challenges can authenticate existing accounts only, never register a
  new account under a demo mobile.
- No deterministic codes, direct role edits, Bootstrap reuse or change to
  payment callbacks.

## Acceptance

- Configuration is disabled by default and fails closed when partial or invalid.
- An allowlisted existing demo account triggers exactly one real SMS to the
  configured destination; a normal mobile still receives its own SMS.
- A routed Challenge cannot create an account, and the code cannot authenticate
  as the destination mobile or another source mobile.
- After expiration or disabling, routing stops while existing Sessions and
  account facts remain intact.
- On the named host, the owner completes real CAPTCHA and personally enters the
  received code for each required role; no code is copied into evidence.

## Release

Merge the reviewed change, build one immutable Linux release, back up the
current environment and database, activate exact allowlisted sources and an
expiry under the deploy locks, then verify normal and routed behavior. Clear
the protected configuration to roll back the routing. Reconcile the accepted
behavior into the Identity spec/runbook and archive this change after runtime
acceptance.
