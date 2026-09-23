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

Live read-only baseline: API acquisition off; Web acquisition unset/off;
commission Worker off; withdrawal off; one active demo agent, zero issued links
and zero commission terms. Runtime enablement, actual CAPTCHA/SMS/OTP,
new-customer attribution and rollback have not yet been exercised.
