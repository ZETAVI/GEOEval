# Verification record

Evidence date: 2026-09-22. Candidate branch:
`codex/issue-156-public-auth` from `main@bed4d41`.

## Completed code and local evidence

| Claim | Evidence | Result |
| --- | --- | --- |
| All migrations apply from the accepted chain | isolated PostgreSQL database `geoeval_issue156`, `pnpm db:migrate` | pass; 55 migrations applied |
| Exact budget, rollover, early stop and redaction | backend Identity integration suite | pass; 21 Identity tests after review fixes |
| Public surface and deployment contract | access-policy, runtime-config and application-deployment tests | pass; 29 focused tests before final delta |
| Notice is linked and renders required facts | Web public-auth entry test | pass; 2 tests |
| Backend regression | full backend suite after review fixes | pass; 99 files passed, 3 skipped; 962 tests passed, 16 skipped |
| Web regression | full Web suite | pass; 37 files, 243 tests |
| Static compatibility | `pnpm typecheck` | pass |
| Production bundles | `pnpm build` | pass; Prisma, OpenAPI, backend, API client and Next |
| Project governance | `python3 scripts/validate_project_framework.py` | pass; 17 Skills and links validated |
| Candidate edge syntax | reviewed file validated on `8.138.100.3` with `nginx -t` using a temporary top-level config | pass; no production activation |
| Production Web composition | local production Next runtime | pass; `/privacy` 200 and `/foundation-probe` 404 |

The backend suite emits expected controlled telemetry-failure and runtime-error
fixtures and a pg deprecation warning already present in concurrent integration
paths; they produced no failed assertion. No real provider call or SMS charge
was made by these local tests.

## Outstanding release evidence

- switch scene `18hnihr4` from test to formal/default and wait for propagation;
- bind both RAM actions to `acs:SourceIp=8.138.100.3`, proving server allow and
  outside deny;
- rotate the runtime AccessKey, install it through the protected environment and
  revoke the superseded key;
- deploy the accepted revision under both host locks with backup and rollback;
- prove anonymous Web, privacy, protected API denial, formal CAPTCHA, real SMS,
  user-entered OTP/Session, role landing, callback rejection, unchanged payment
  facts, service health and logs.

Issue #156 is not complete until these named-environment checks are recorded.

