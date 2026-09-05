# Source Brief: Browser Session and CSRF boundary

- Decision: keep server-side opaque Cookie sessions and define the missing
  lifecycle and request-forgery controls without introducing JWT or OAuth token
  layering.
- Accessed: 2026-09-03; reused on 2026-09-04 because the standard URLs,
  application surface, and decision boundary are unchanged.

## Recommendation

Retain the 32-byte cryptographically random opaque credential and digest lookup.
Add server-owned idle and absolute timeouts, complete revocation, renewal through
new authentication after privilege changes, minimal Cookie scope, and lifecycle
logging without plaintext credentials. For GEOEval's JSON API, use a required
custom request header, exact Origin/CORS allowlist, non-simple content types,
and SameSite as defense in depth.

Do not add access/refresh tokens: GEOEval has one first-party browser client,
requires immediate server-side privilege invalidation, and has no delegated API
authorization boundary that would justify OAuth token layering.

## Decision Constraints

- Role and status must never be accepted from Cookie content.
- Logout, status changes, role changes, and administrator revoke-all must make
  the server reject affected credentials.
- Timeouts are enforced by server records, not browser clocks.
- Production credentials never appear in URLs, JavaScript storage, logs,
  telemetry, audit before/after state, or API response bodies.
- CSRF protection cannot rely only on `SameSite=Lax` or permissive CORS.

## Evidence

| Claim | Primary source | Version/date | Design implication |
| --- | --- | --- | --- |
| Browser sessions may use a host-issued opaque Session Cookie; the secret must be random, time-bounded, invalidated at logout, unavailable to JavaScript, and protected in transport | [NIST SP 800-63B, Session Management](https://pages.nist.gov/800-63-4/sp800-63b.html#session-management) | Current final SP 800-63B-4; accessed 2026-09-03 | Keep opaque Cookie sessions; enforce lifecycle and HTTPS server-side |
| Cookie guidance includes minimum hostname/path scope, `HttpOnly`, `__Host-`, `Path=/`, `SameSite=Lax/Strict`, opaque content, and expiry aligned with server validity | [NIST SP 800-63B, Browser Cookies](https://pages.nist.gov/800-63-4/sp800-63b.html#browser-cookies) | Current final SP 800-63B-4; accessed 2026-09-03 | Tighten production Cookie serialization; Cookie expiry never grants authority |
| Session identifiers need sufficient CSPRNG entropy, meaningless client content, server-side business meaning, renewal after privilege changes, idle/absolute expiry, and server-side logout invalidation | [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | Current page; accessed 2026-09-03 | Existing random token is sufficient; lifecycle and privilege-change handling are incomplete |
| Stateful Cookie applications need CSRF protection; JSON/AJAX APIs may require a custom header backed by strict CORS, while SameSite alone has deployment limitations | [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) | Current page; accessed 2026-09-03 | Add one shared Origin/custom-header boundary to state-changing HTTP |

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| Current opaque PostgreSQL session, completed with lifecycle controls | Adopt | Matches immediate revocation and first-party browser needs with the least new authority surface |
| JWT carrying role/status | Reject | Duplicates current account truth and either permits stale privilege or still requires a server lookup |
| OAuth access and refresh tokens | Reject | No delegated client/resource-server requirement; adds rotation, replay, and long-lived revocation complexity |
| Redis as Session authority | Reject | PostgreSQL must transact account changes, revoke-all, and audit together; Redis would create a second truth or reconciliation problem |
| Device/IP-bound risk engine | Defer | Privacy and false-positive cost are not justified by current evidence or first-release recovery needs |
| Synchronizer CSRF token | Defer | A required custom header plus exact Origin/CORS and JSON-only mutation is the smaller current SPA boundary; revisit if non-browser or form clients appear |

## Unknowns and Validation

- Confirm exact role-family idle/absolute defaults against product-owner UX and
  isolated browser evidence before final acceptance; changing a configuration
  default does not change the opaque-session architecture.
- Verify the deployed Web/API origin topology before release. If the API cannot
  maintain an exact trusted-origin allowlist, the selected header/CORS boundary
  is unacceptable and a session-bound synchronizer token must replace it.
- Real SMS security, rate limit, price, delivery, and recovery evidence belong
  to the later provider/release Gate.

## Reuse and Refresh Boundary

- Reusable while: GEOEval remains a first-party browser SPA using server-side
  Cookie sessions, fixed roles, PostgreSQL authority, and no delegated API.
- Refresh when: standards change materially, a native/mobile or third-party
  client appears, Web/API origin topology changes, OAuth/SSO becomes approved,
  or controlled runtime evidence disproves the Cookie/CSRF assumptions.
