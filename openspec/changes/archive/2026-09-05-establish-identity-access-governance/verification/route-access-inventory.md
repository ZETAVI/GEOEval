# Authenticated route access inventory

- Status: Implementation checkpoint evidence
- Checked against: generated OpenAPI, backend controllers, and executable Nest
  metadata discovery on 2026-09-04
- Owning Change: `establish-identity-access-governance`

The application-scoped access guard is fail-closed. A route without
`PublicAccess` requires a valid active-account Session; role metadata further
narrows that authenticated set. This inventory covers every registered HTTP
controller in `ApiModule` and its imported modules.

`access-policy-inventory.spec.ts` discovers every registered controller and
route handler. A controller outside the 11 known policy families, a public route
with role metadata, or a new non-exempt public mutation fails verification.

| Controller surface | Authentication | Fixed roles | Unsafe-request boundary |
| --- | --- | --- | --- |
| `/health/live`, `/health/ready` | Public | None | Safe methods only |
| `/foundation/**` | Public F0 validation surface | None | Explicit CSRF exemption; remains non-product validation code |
| `POST /identity/challenges`, `POST /identity/sessions` | Public | None | JSON, `x-geoeval-request: 1`, exact configured Origin |
| `/identity/me`, `DELETE /identity/session`, `DELETE /identity/sessions` | Required | Any active fixed role | Logout mutations use the shared CSRF boundary |
| `/brands/**`, `/brand-reference-data/**`, `/brand-location-verifications/**` | Required | `TERMINAL_CUSTOMER` | Shared CSRF boundary for POST/PATCH/PUT |
| `/brands/**/evaluation-*`, `/evaluation-definitions/**`, `/evaluation-runs/**` | Required | `TERMINAL_CUSTOMER` | Shared CSRF boundary for POST/PUT |
| `/notifications/**` | Required | `TERMINAL_CUSTOMER` | Shared CSRF boundary for PUT; SSE remains authenticated |
| `/media-catalog/**` | Required | All four fixed roles | Read-only in the current controller |
| `/admin/media/**` | Required | `ADMINISTRATOR` | Shared CSRF boundary for POST/PATCH/DELETE |
| `/admin/accounts/**` | Required | `ADMINISTRATOR` | Shared CSRF boundary for account/session governance mutations |

The Media Catalog retains its accepted all-authenticated-role visibility;
Media administration remains administrator-only. Brand, Evaluation, and
Notification no longer depend on a customer-specialized Guard or an
Identity-owned request object. They consume `CurrentPrincipal.accountId`.

## Expected denial semantics

- missing, unknown, or already-cleaned credential: `401` with
  `AUTHENTICATION_REQUIRED`;
- retained revoked Session: `401` with `SESSION_REVOKED`;
- retained idle- or absolute-expired Session: `401` with `SESSION_EXPIRED`;
- retained Session for an inactive account: `401` with `ACCOUNT_INACTIVE`;
- active authenticated account outside declared fixed roles: `403` with
  `ACCOUNT_ROLE_FORBIDDEN`;
- untrusted/missing Origin or application header on a state mutation: `403`;
- non-JSON state mutation: `415`;
- stale governance revision or uniqueness/concurrency conflict: `409`;
- forbidden self-governance, customer/internal conversion, or last-active-
  administrator loss: `403`.
