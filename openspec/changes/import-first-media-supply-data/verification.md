# Verification: Controlled first-batch Media Supply import

- Result: `verified` for implementation and isolated review-database rehearsal
- Revision under test: working tree based on `origin/main@f1b5ef47097bc50947f85808e326d88372f925ae`
- Review database: local PostgreSQL `geoeval_issue51_review`
- Full-test database: local PostgreSQL `geoeval_issue51_test`
- Formal/production database write: not run and not authorized
- Deployment, activation, customer publication, PR merge, order, fulfilment, and
  external supplier calls: not run and not authorized

## Evidence matrix

| Claim | Evidence | Result | Notes |
| --- | --- | --- | --- |
| #34 handoff was received without source drift | Source and mode-600 private copy both SHA-256 `2b071c88a94b962e1f8331df400e4ee9a7ca220510b849e7469ccc3f100dc8e9` | Passed | Original #34 worktree/material was not changed or deleted |
| Fixed parser accepts only the reviewed shape and preserves owned text | Exact Node 24.12.0 workbook smoke plus `first-batch-workbook.spec.ts` | Passed | 5 tests cover namespace prefixes, accepted mapping, NFKC-key/display-text separation, duplicate warning, hash, formula, fractional cost, receipt path, and Logo failure |
| Workbook maps to the accepted batch | Exact-source parse | Passed | 40 platforms, 76 supplier groups, 6 suppliers, 208 resources, 40 PNGs, 45 category links; asset bundle SHA-256 `1facb065c4806e4523cc1c13859695566be95a201167b68f7812752e740ca6f8` |
| Plan is read-only and deterministic | Full CLI plan followed by aggregate database query | Passed | Before apply Media Supply counts remained `0/0/0/0`; plan reported 40/6/208 new, 40 Logos existing, 45 category links, no conflicts |
| First apply is atomic and exact | Full CLI apply to `geoeval_issue51_review` | Passed | Inserted 40 platforms, 6 suppliers, 208 resources, 45 categories and 254 `IMPORT_CREATE` audits in one transaction |
| Repeated apply is idempotent | Same confirmation and full CLI apply repeated | Passed | Reported 40/6/208 and 45 category links existing; every applied count and new audit count was zero |
| Imported business fields match the parsed workbook | In-memory parsed batch compared by deterministic ID with review-database records | Passed | Platform mismatches 0, supplier mismatches 0, resource mismatches 0; only matching keys are normalized |
| Accepted initial safety state is enforced | Aggregate SQL plus administrator API | Passed | 40/40 platforms inactive and priced 1000; 6/6 suppliers inactive with contacts null; 208/208 resources inactive, hidden and supplier-linked; 168 valid HTTPS case links retained |
| Customer projection remains safe | Authenticated runtime smoke | Passed | Customer catalog returned 0 items, customer admin request returned 403, forbidden-field scan returned 0 |
| Administrator projection and Logo bundle work | Authenticated API smoke plus real browser/accessibility/visual inspection on `/admin/media` | Passed | 40 platforms, 6 suppliers and 208 resources; all 40 Logo URLs returned HTTP 200 `image/png`; list/detail Logo, resource internal fields, null contacts and supplier association navigation rendered |
| Asset failure blocks before database write | Full CLI plan against a temporary asset root missing one approved Logo | Passed | `ASSET_MISSING` and `ASSET_SET_MISMATCH`, 39/40 valid Logos, status `BLOCKED`, confirmation null |
| Conflict and database failure do not partially import | `first-batch-import.integration.spec.ts` | Passed | 2 integration tests cover field conflict, deterministic ID conflict, negative-cost database constraint failure, whole-transaction rollback, exact replay and safe receipt |
| Receipt failure is explicit and recoverable | Full no-op apply to a missing receipt directory, then replay after directory creation | Passed | First result `APPLIED_RECEIPT_PENDING/RECEIPT_WRITE_FAILED`; replay saved a mode-600 receipt with zero new business/audit writes |
| Receipts exclude sensitive row values | Three mode-600 receipts plus prohibited-field scan | Passed | No display/resource/supplier/contact/procurement/case/note/source field names or values were included |
| Dependency choice is bounded | Exact-source failure with ExcelJS, successful fflate/fast-xml-parser smoke, frozen install, and `pnpm audit --prod --json` | Passed with baseline note | No advisory path through the two added packages; existing unrelated Prisma optional and Nest/qs findings remain visible |
| Repository behavior remains compatible | Backend full suite, Web full suite, typecheck, format, build, framework validation, generated-contract build | Passed | Backend 26 files / 136 tests; Web 3 files / 17 tests; production build includes `/admin/media` |
| Design knowledge is current | Current Media Supply spec, architecture overview, executable CLI/parser/tests, archived Change | Passed after archive | No schema migration, public HTTP/client change, or new ADR was warranted |

## Warnings and bounded data decisions

- Source rows 102 and 104 share one logical platform/resource/account key but
  carry different reviewed internal facts. Both remain deterministic resources
  to preserve the accepted 208 count; plan/receipt exposes only row numbers and
  a key hash.
- Forty case-reference cells are not valid HTTPS URLs. They are not copied into
  `caseUrl`, notes, logs, Git, or receipts; one row-only warning records them.
  The other 168 valid HTTPS case links are preserved exactly.
- Current `main` has no standalone customer Media resources page. Verification
  therefore covers the authoritative customer API and unchanged signed-in
  routes; this Change does not create a new customer page.
- `pnpm audit` still reports pre-existing paths through Prisma optional tooling
  and Nest/Express `qs`; no reported path is introduced by fflate or
  fast-xml-parser. Remediation belongs to dependency maintenance, not this fixed
  offline exact-hash parser.

## Retained gates and workspace exit

- `geoeval_issue51_review` intentionally remains populated at 40/6/208/254 for
  review until Issue #51 integration/cleanup is explicitly authorized.
- `geoeval_issue51_test` and Redis DB 14 are isolated test resources; they are
  not formal data.
- The private workbook copy and safe receipts remain under
  `/private/tmp/geoeval-issue-51/`; nothing from that directory is tracked.
- #34 worktree and handoff material remain untouched for the parent task to
  retain or remove only after this receipt is accepted.
- The Issue #51 branch/worktree is retained for PR Review / Decision. It is not
  safe to remove before merge or an explicit abandonment decision.
