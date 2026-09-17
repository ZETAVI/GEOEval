# Verification

Date: 2026-09-16

| Claim | Evidence | Result | Boundary |
| --- | --- | --- | --- |
| Clean schema installs the payout profile, request, audit, transition, uniqueness and immutability constraints | `prisma migrate deploy` against empty `geoeval_issue116`, all 53 migrations | Passed | Disposable local PostgreSQL; no production migration |
| Withdrawable money derives from booked commission and accepted requests without over-reservation | `agency-withdrawal.integration.spec.ts`, including real order settlement/commission and two concurrent submissions | Passed, 6 tests | Includes terminal withdrawal/new record, review/payment outcomes and two-admin policy race |
| Account number uses authenticated encryption and stays out of normal reads, audit, Outbox and notifications | `sensitive-data-cipher.spec.ts` plus integration stored-value, snapshot, reveal-audit and payload assertions | Passed | Test-only local key; production key lifecycle remains a Release Gate |
| Role, suspension, current-account fence and agent notification access are enforced | withdrawal integration, `access-policy-inventory.spec.ts`, `identity-access-http.integration.spec.ts` | Passed | Inactive agent loses access; administrator can finish accepted work |
| Exact money input, masking, unknown-payment explanation and terminal new-request wording render correctly | `agency-withdrawal.spec.tsx` and browser role journeys | Passed | Browser used local synthetic agent/admin data only |
| Feature flag is server-driven and pages are not frozen to build-time 404 | production Next build route table shows both withdrawal list/detail routes as dynamic; disabled navigation unit assertion | Passed | API and Web must use the same deployment setting |
| Existing backend behavior remains compatible | `pnpm test` | Passed: 85 files / 876 tests; 3 files / 15 tests skipped by existing gates | Existing controlled telemetry/error logs are expected test evidence |
| Web behavior remains compatible | `pnpm --filter @geoeval/web test` | Passed: 32 files / 226 tests | Includes notification destination and unified record navigation |
| Contracts and deployable artifacts compile | `pnpm typecheck`, `pnpm build`, `pnpm format:check` | Passed | Build regenerated Prisma, OpenAPI and API client |
| Current truth has one owner and repository guidance remains valid | `python3 scripts/validate_project_framework.py`, current Agency Withdrawal spec and linked owner updates | Passed | No ADR required; production activation remains explicitly outside this Change |

## Runtime inspection

The built local API and Web were activated against the isolated database. An
AGENT opened summary, current masked profile, pending request and detail; the
withdraw confirmation stated that the request cannot recover and a later
application creates a new request. An ADMINISTRATOR reached withdrawal through
the unified business-record views and read the same terminal snapshot. Final
detail showed no empty action surface and browser console errors were empty.

## Residual release gates

Production remains disabled. Product Owner and finance still own the production
encryption-key lifecycle, minimum amount, offline payment procedure,
sensitive-data handling review, and a real-agent/real-funds acceptance run.
Recharge invoice Issue #109 remains a separate Ready outcome and did not share
this Change's write window.
