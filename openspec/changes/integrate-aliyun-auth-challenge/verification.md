# Verification

Verification date: 2026-09-20; local integration evidence refreshed through
2026-09-22 CST. PR #134 merged as
`74563a42f3359a3720aa54511bf9e34d9e21b163`; PR #146 was rebased onto
`origin/main@bb9e7cc`. This follow-up reviews the merged implementation, the
minimum-permission runtime boundary and one controlled full application path.

PR #134 was linearly rebased from `main@6b09858` through `71136ad` to
`5f3ec07`, then to `e0dd70c`, after Recharge-only commits entered `main`. The
first update's
only shared source file was `apps/backend/package.json`, where the newer base
added an independent Recharge script outside this Change's dependency block;
the later updates changed only WeChat or Alipay implementation/tests. All
rebases had no conflict. Dependency, build, affected test, Diff and
closing-relationship evidence were refreshed before each branch update.

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
| Repository remains buildable and policy-compliant | `pnpm install --frozen-lockfile`, `pnpm format:check`, project framework validator and `pnpm build` | Passed | Alibaba OpenAPI Core postinstall is explicitly denied |
| The approved public scene can initialize the real browser component locally | Local `/enter` with public prefix `1fz571`, SceneId `18hnihr4` and Alibaba mode | Passed | Official Alibaba scripts loaded, the UI left its preparing state and browser error/warning logs were empty; no CAPTCHA was started or solved |
| Merged Identity/CAPTCHA/SMS boundaries remain green on current main | Focused merged-main tests | Passed | Backend 5 files / 60 tests; Web 2 files / 8 tests; complete build, format and framework validation passed |
| The dedicated runtime identity can perform the required calls under the reviewed minimum policy | Controlled real CAPTCHA verification and SendSms through the application using the API-only RAM identity | Passed | The policy surface is limited to the two documented actions; no credential value is retained in repository evidence and no management operation was exercised |
| The application can close one real authentication path | Browser `CAPTCHA -> Challenge -> SendSms -> OTP -> Session`, backend telemetry and Alibaba carrier receipt | Passed | CAPTCHA verified; SendSms accepted without retry; carrier receipt was successful; the user entered the OTP and reached authenticated first-brand onboarding |
| Carrier delivery is stable enough for public activation | One earlier `234` filing rejection followed by successful approved-template deliveries on the same masked number | Not verified | Proves route reachability and disproves a template-wide failure; does not prove target-carrier success rate or three-carrier stability |
| Current truth and external residual Gates match observed state | Current Identity spec, operations runbook, source brief, tasks, Issue #64 checkpoints and fixed-diff review | Passed | Production secret injection, credential rotation, formal CAPTCHA, privacy/cost controls and activation remain explicit |

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
- After the final Recharge-only rebase to `main@e0dd70c`, the complete Backend
  suite passed again: 96 files passed, 3 environment-gated files skipped; 938
  tests passed, 16 skipped. The complete Web suite, frozen install, format,
  framework validation and full build also passed on that base.
- On 2026-09-21, current `main@bbd865d` passed the merged-boundary refresh:
  Backend 5/5 files and 60/60 tests; Web 2/2 files and 8/8 tests; frozen install,
  complete build, format and framework validation all passed. The first focused
  database run used a stale generated Prisma client and failed before business
  assertions because `agencyAudit` was absent. `pnpm db:generate` restored the
  schema-owned delegate and the unchanged command passed; this was a local
  generated-artifact prerequisite, not an Identity regression.
- A local browser session using public prefix `1fz571` and SceneId `18hnihr4`
  loaded Alibaba's official CAPTCHA scripts and enabled the entry flow without
  browser warnings/errors. The test stopped before starting or solving a
  CAPTCHA and before any backend/provider or SMS request.
- On 2026-09-22 CST, a separately authorized local run used the dedicated
  API-only RAM identity, the existing approved company signature and login
  template `SMS_496905143`. Backend telemetry recorded CAPTCHA `VERIFIED` and
  SMS `ACCEPTED`; Alibaba's carrier record later showed successful delivery
  with a receive time. The user entered the OTP directly and the Web reached
  authenticated first-brand onboarding. No automatic retry was made in this
  run, and the real-send processes were then stopped.
- The carrier evidence is intentionally not generalized. The same sign,
  template and masked number had previously produced one filing-related `234`
  failure, while later controlled sends succeeded. The current conclusion is
  one reachable route with incomplete stability evidence, not a template defect
  and not production-wide delivery readiness.

The first broad run reused a previously exercised isolated database and failed
through unrelated cross-module cleanup leftovers. Repeating from a newly
migrated empty database reduced that to one real standalone-Identity assembly
regression. The optional telemetry dependency was corrected; the next fresh
database run was fully green. The failed contaminated run is not counted as
passing evidence.

## Fixed-diff review

- **Intent:** ready with follow-up. The diff implements the approved single-
  provider CAPTCHA/SMS boundary without changing Account, role, Session or
  acquisition meaning, and the refreshed evidence does not widen the product
  promise from controlled reachability to production readiness.
- **Engineering:** ready. SDK types remain in infrastructure, existing
  `ChallengeDeliveryPort` is reused, configuration and endpoints fail closed,
  non-idempotent SMS has no automatic retry, and telemetry excludes
  authentication-capable values.
- **Evidence and continuity:** ready with external gates. Current spec/runbook
  and generated contracts are reconciled; Issue #64 and this Change remain
  active because production activation and stability evidence are intentionally
  absent.

No unresolved code-level review finding remains at the reviewed revision.

## Not run / external gates

- A dedicated API-only RAM identity and local test credential now exist and
  have exercised the two required calls. Production secret injection and the
  separately confirmed rotation or revocation of local/older keys were not
  performed.
- CAPTCHA remains in test state; formal mode was not enabled.
- No compliant `HDP` signature exists and no signature/template was changed;
  controlled validation used the approved visible company signature.
- One named-number carrier receipt and login closure passed. Target-carrier
  success-rate coverage, daily/monthly alert configuration, privacy wording
  approval, trusted-proxy/IP topology and production activation remain
  unverified.

Verdict: **partially verified for the full Issue outcome; verified for the
implemented and controlled local integration slice.** The result is sufficient
to merge the reconciled documentation transaction, not to activate production.
Issue #64 stays open for the named external and deployment Gates.
