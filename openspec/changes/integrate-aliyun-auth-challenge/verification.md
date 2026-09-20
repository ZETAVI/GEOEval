# Verification

Verification date: 2026-09-20. Base:
`main@5f3ec07`. Reviewed implementation through
`codex/issue-64-sms-challenge-delivery@a45c56d` plus this evidence
reconciliation.

PR #134 was linearly rebased from `main@6b09858` through `71136ad` to
`5f3ec07` after four Recharge-only commits entered `main`. The first update's
only shared source file was `apps/backend/package.json`, where the newer base
added an independent Recharge script outside this Change's dependency block;
the second update changed only WeChat implementation/tests. Both rebases had no
conflict. Dependency, build, affected test, Diff and closing-relationship
evidence were refreshed before each branch update.

## Evidence matrix

| Claim | Evidence | Result | Boundary |
| --- | --- | --- | --- |
| Human verification precedes Challenge persistence and normal denial never degrades | Focused policy/adapter tests plus isolated Identity integration | Passed | Missing, replay, scene mismatch, configuration error, finite outage budget and zero-row denial covered |
| Real codes are secure six-digit values and deterministic remains local/test-only | Generator tests, runtime-config tests and production build | Passed | No statistical security certification; uses Node `crypto.randomInt` |
| SMS accepted/rejected/unknown are distinct and never automatically retried | Fake official-SDK client contract tests and Identity integration | Passed | Includes response body, thrown timeout and nested network cause |
| Official SDK packages can construct under NodeNext without postinstall build | Runtime client-construction test; frozen install | Passed | No provider request was sent |
| Production configuration fails closed | Runtime-config tests | Passed | Requires Aliyun CAPTCHA/SMS modes, scene/sign/template and official endpoints; send switch defaults closed |
| Direct and acquisition Web paths forward only the opaque CAPTCHA value | Web CAPTCHA loader and same-origin acquisition tests | Passed | Acquisition token remains server-cookie-owned |
| Public/generated contracts agree | OpenAPI regeneration, API-client typecheck and complete build | Passed | `captchaVerifyParam` remains optional in schema because local/test disabled mode is supported; production enforces it at runtime |
| Existing Identity, Session, role and consumer semantics remain compatible | Final focused 5 files / 46 tests; fresh-database full Backend suite | Passed | Full Backend: 206 suites, 923 passed, 16 environment-gated skipped, 0 failed |
| Web regression boundary remains compatible | Complete Web suite | Passed | 34 files, 236 tests |
| Current truth and operator recovery are reconciled | Current Identity spec, operations runbook, environment example and active Change review | Passed | No Evolution marker was present |
| Repository remains buildable and policy-compliant | `pnpm install --frozen-lockfile`, `pnpm format:check`, project framework validator and `pnpm build` | Passed | Alibaba OpenAPI Core postinstall is explicitly denied |

## Commands and results

- `pnpm install --frozen-lockfile`: passed; lockfile supply-chain policy passed.
- `pnpm format:check`: passed.
- `python3 scripts/validate_project_framework.py`: passed; 17 cataloged
  skills and local Markdown links validated.
- `pnpm build`: passed; Prisma/OpenAPI regenerated, Backend/API client
  compiled and 22 Web static pages generated.
- Fresh isolated PostgreSQL database with all 54 migrations plus isolated Redis
  logical database:
  - complete Backend: 206/206 suites; 923 passed, 16 skipped, 0 failed;
  - after fixed-diff review corrections: 5/5 files, 46/46 tests.
- `pnpm --filter @geoeval/web test`: 34/34 files, 236/236 tests.

The first broad run reused a previously exercised isolated database and failed
through unrelated cross-module cleanup leftovers. Repeating from a newly
migrated empty database reduced that to one real standalone-Identity assembly
regression. The optional telemetry dependency was corrected; the next fresh
database run was fully green. The failed contaminated run is not counted as
passing evidence.

## Fixed-diff review

- **Intent:** ready with follow-up. The diff implements the approved single-
  provider CAPTCHA/SMS boundary without changing Account, role, Session or
  acquisition meaning.
- **Engineering:** ready. SDK types remain in infrastructure, existing
  `ChallengeDeliveryPort` is reused, configuration and endpoints fail closed,
  non-idempotent SMS has no automatic retry, and telemetry excludes
  authentication-capable values.
- **Evidence and continuity:** ready with external gates. Current spec/runbook
  and generated contracts are reconciled; the Change remains active because
  activation evidence is intentionally absent.

No unresolved code-level review finding remains at the reviewed revision.

## Not run / external gates

- No RAM identity, role, policy or AccessKey was created or copied.
- No live `VerifyIntelligentCaptcha` call, official client-script browser
  session or paid `SendSms` call was made.
- CAPTCHA remains in test state; formal mode was not enabled.
- No compliant `HDP` signature exists and no signature/template was changed.
- Named carrier test numbers, receipt checks, daily/monthly alert configuration,
  privacy wording approval, trusted-proxy/IP topology and production activation
  remain unverified.

Verdict: **partially verified for the full Issue outcome; verified for the
credential-free implementation slice.** The branch may enter PR review as a
Partial delivery and must not close Issue #64.
