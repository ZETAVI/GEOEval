# Architecture review

Target: Issue #162 diff rebased onto `main@0b367e4` after the accepted
Issue #161 Identity change. Result: **ready with runtime gate**.

- **Ownership and cohesion:** Agency Entry still owns link issuance, visit
  token/digest and initial attribution; Identity still owns CAPTCHA/Challenge,
  Session and roles. Commerce continues to freeze agent/rate facts at purchase.
  Removing the obsolete `ApiModule` startup exception does not move a write or
  introduce a shared authority.
- **Security:** `AGENCY_ACQUISITION_ENABLED` remains off by default in both
  processes. The Agency controller still gates every entry action; only an
  administrator issues a link and only an active agent reads its own. The Web
  uses an exact trusted Origin and passes a server-read visit token through the
  same-origin bridge. Existing accounts cannot be rebound through login.
- **Money boundary:** Live commission execution and withdrawal are still off.
  Missing commission terms mean disabled, and accepted purchases snapshot
  current eligibility rather than inferring later rates. Activating acquisition
  alone cannot create a payout.
- **Consistency and rollback:** The existing registration transaction binds a
  new account and its source atomically. Both flags must be coordinated. A
  one-sided deployment is visible as unavailable, not silent public fallback.
  Turning the feature off stops new acquisition while preserving accepted
  attribution, audit and immutable order terms.

No code-level `must-fix` finding. The named-host gate is a live admin login,
exact API/Web flags and Origin, one eligible demo agent, a backed-up baseline,
and a user-driven new-customer registration. This review does not approve
commission accrual or withdrawal activation.

The rebase brought in only Identity-owned delivery routing and its neutral Web
message. A focused combined Identity/Agency integration run passed, and the
Agency diff still touches no Identity implementation or shared schema.
