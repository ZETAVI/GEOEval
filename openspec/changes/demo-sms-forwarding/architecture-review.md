# Architecture review

Review target: Issue #161 implementation on `main@291607d`. Result: **ready
with runtime gate**.

- **Ownership:** Identity still owns CAPTCHA, Challenge, budget, digest,
  existing-account admission, Session and role. The Alibaba adapter receives a
  destination chosen by Identity and changes only the transport address. There
  is no new account alias, second authentication authority or database write.
- **Integrity:** The original normalized mobile remains in the Challenge and
  code digest. Routed Challenges are marked existing-account-only, so the
  configuration cannot register an account under an absent demo mobile.
  Wrong-mobile completion, one-time use and role checks remain unchanged.
- **Failure/recovery:** Partial configuration rejects startup. An expiry stops
  routing without a process restart. Provider rejection/unknown and ordinary
  resend limits are unchanged. Clearing the root-owned configuration reverts
  delivery without a migration or fact rewrite.
- **Exposure:** The recipient and source list live only in protected API
  configuration. The Web uses a neutral sent message; normal telemetry and
  public responses contain neither routing nor code. The public entry can
  still be used to request codes for known demo mobiles, but existing CAPTCHA,
  IP/mobile limits and daily/monthly budget bound that known pilot risk.

No `must-fix` finding in the scoped diff. The remaining gate is the named-host
recipient/account check and one user-entered real OTP login. Do not call an
Alibaba `OK` response proof of carrier receipt or login.
