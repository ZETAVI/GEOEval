# Access policy and CSRF checkpoint

Date: 2026-09-04

## Scope

This checkpoint verifies the complete registered-controller classification and
the browser mutation boundary for Identity login and logout. It changes no
runtime policy.

## Executable route classification

The inventory test boots the real Nest application and discovers route handlers
from `ModulesContainer`, controller/method path metadata, request-method
metadata, and the same `Reflector.getAllAndOverride` semantics used by the
guards.

| Policy family                                                    | Controllers                                                                   |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Public safe routes                                               | `HealthController`                                                            |
| Public and explicitly CSRF-exempt F0 validation                  | `FoundationController`                                                        |
| Public login writes plus authenticated self Session reads/writes | `IdentityController`                                                          |
| Terminal customer                                                | Brand, Brand Reference, Store Location Verification, Evaluation, Notification |
| Administrator                                                    | Account Governance, Media Admin                                               |
| All four authenticated roles                                     | Media Catalog                                                                 |

All 11 registered product controllers were present and every discovered route
matched its family. A future controller not listed by the executable policy map
fails the test instead of silently inheriting an undocumented assumption.

## HTTP CSRF and CORS matrix

| Boundary                            | Rejected case                           | Expected result                       | Side-effect proof                           |
| ----------------------------------- | --------------------------------------- | ------------------------------------- | ------------------------------------------- |
| `POST /identity/challenges`         | Missing or `text/plain` content type    | 415 `JSON_CONTENT_TYPE_REQUIRED`      | No Challenge row                            |
| `POST /identity/challenges`         | Missing/wrong application header        | 403 `APPLICATION_HEADER_REQUIRED`     | No Challenge row                            |
| `POST /identity/challenges`         | Missing or attacker-suffixed Origin     | 403 `ORIGIN_FORBIDDEN`                | No Challenge row                            |
| `POST /identity/challenges`         | JSON with charset + exact header/Origin | 201                                   | One Challenge row                           |
| `POST /identity/sessions`           | Missing header or form content type     | 403/415                               | Challenge remains unconsumed; no Session    |
| `POST /identity/sessions`           | Complete boundary                       | 201                                   | Challenge consumed; one Session             |
| `GET /identity/me`                  | No mutation headers                     | 200                                   | Safe read allowed                           |
| Current logout                      | Missing content type or Origin          | 415/403                               | Both parallel Sessions remain active        |
| Self logout-all                     | Wrong application header                | 403                                   | Both parallel Sessions remain active        |
| Current logout then self logout-all | Complete boundary                       | 204/204                               | Active Session count becomes one, then zero |
| Trusted preflight                   | Exact configured Origin                 | 204 with allow-origin and credentials | No mutation                                 |
| Untrusted preflight                 | Attacker-suffixed Origin                | No allow-origin header                | No mutation                                 |

## Verification

- `access-policy-inventory.spec.ts`: 2/2 passed.
- `identity-csrf-http.integration.spec.ts`: 4/4 passed.
- Backend typecheck passed.
- Focused Prettier and `git diff --check` passed.
- Each HTTP scenario clears test-owned rows before and after execution.

## Architecture review

Verdict: ready for this test-only checkpoint.

- The test uses Nest metadata only as verification input; no business module or
  production guard imports framework discovery internals.
- Policy expectations are grouped by controller capability owner rather than
  copied for every endpoint. New handlers inherit and verify their controller
  family; new controllers require an explicit policy decision.
- CSRF is tested through the real global-guard order and HTTP response, including
  absence of database effects. Controller unit mocks are not accepted as the
  security claim.
- CORS and CSRF remain separate: preflight response headers do not replace the
  exact Origin/header/content-type checks on state-changing requests.

## Remaining Issue-level work

Issue #50 is not complete. Isolated migration/application rollback, complete
desktop and narrow browser inspection, aggregate verification and fixed-diff
review, design reconciliation, PR review, and integration remain open.
