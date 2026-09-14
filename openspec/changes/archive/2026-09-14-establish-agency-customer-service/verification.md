# A1 verification

Date: 2026-09-14. Scope: #102 customer reassignment and current-agent read-only service; PR #103 owns exact head, required CI, integration and workspace exit.

## Evidence

| Claim | Evidence | Result / boundary |
| --- | --- | --- |
| Atomic assignment and history | agency-customer-service.integration.spec.ts | 11 cases pass: competing distinct administrators, first public row, stale revision, replay after later transfer, audit-failure rollback, A→B→public, source preservation and invalid targets |
| Current authorization | Same PostgreSQL/HTTP suite | Ordered barriers verify migration during detail/list reads; old URLs rejected; full contacts allowed only for current agent; foreign brands/reports and customer writes refused |
| Existing source remains stable | Same suite plus A0 tests | Repeated link issuance returns identical key; old source link cannot reclaim a migrated account and still attributes a genuinely new account to A |
| Scope regression | Final focused Agency/source/HTTP/access-inventory run | 31 tests passed |
| Full backend | pnpm test using owned DB/Redis | 708 passed, 13 existing environment-gated cases skipped; subsequent owner-projection relocation/admin labels covered by final focused run. Exact final full CI is owned by PR |
| Web | pnpm --filter @geoeval/web test | 213 passed; API no-store/credentials, revoked reads, same-request recovery and read-only renderer regression included |
| Build and types | pnpm typecheck, pnpm build | Passed; final standalone Web uses local API 3390 and Web 3290 for browser verification |
| Existing contracts | Parsed old/new OpenAPI path/schema comparison | No existing route or schema changed; additional consumers reorder generated discovery output but do not change legacy semantics |
| Upgrade | Separate temporary PostgreSQL database with 44 previous migrations and A0 accounts/entry/attribution/audit, then A1 migration | Account data and original source retained; relationship revision initialized to 1, updatedAt initialized to original createdAt; INITIAL_BIND audit retained; temporary DB removed |
| Browser | Real Codex browser A/customer/brand/history → administrator A→B → A old report URL → B same report → administrator B→public → B old customer URL | Passed: old principal gets no contact/report content; B reads pre-migration report/full login mobile/business contacts; original sample answer expands; public pool revokes B too |
| UI review | Real browser and screenshot | Reused customer report originally exposed an optimization link; added readOnly mode, removed action links/new-evaluation callback while retaining report content, then browser and regression verified. Administrator card resides in selected account detail; final browser recheck shows readable agent/operator mobiles and a correct completion message; operator/time automatic |
| Current truth | Agency Customer Service current spec, Agency Entry cross-link, Identity, Product Definition extraction, architecture and README | Reconciled. Commercial snapshot, commission/72-hour point-return and withdrawal requirements remain unactivated under parent #100 |

## Review findings and disposition

- Intent: full login mobile was explicitly approved; source link stability and migrated-customer old-link revocation are separate facts. A0 acquiring links are not invalidated by individual reassignment. No customer operation or historical commercial backfill added.
- Engineering: current relationship revision is separate from Identity revision; absent public relation serializes on the customer account; relationship/audit/replay result commit together. Final reads lock participating Identity facts in consistent order before checking relationship versions. Brand and GeoIntelligence each retain one reusable customer projection in their application layer; no Agency dependency on their HTTP controllers, database internals or Writer/Commerce states.
- Reachable issues fixed during verification: a publishing-only fixture lacked a complete report sample set (replaced with an explicitly synthetic historical-report fixture); missing explicit Swagger/path metadata; customer action links in the reused report renderer; stale form values against a refreshed relation revision. Controlled checks verify fixes, not external provider quality.
- Evidence continuity: existing API shapes compared structurally, legacy customer rendering retains action links, current owners updated and A1 change archived for its independently complete outcome. Ready for required-CI-gated integration; no remaining scoped blocking finding.

## Environment and reproduction

Reuse existing OrbStack PostgreSQL at 55432 and Redis at 56379, with only geoeval_issue100 and Redis logical DB 10 for this work. Never run test cleanup against the default or another owner's database. No extra containers/global packages/real SMS/providers/payments/production changes.

```bash
DATABASE_URL=postgresql://geoeval:geoeval_local_only@127.0.0.1:55432/geoeval_issue100 REDIS_URL=redis://127.0.0.1:56379/10 pnpm --filter @geoeval/backend exec vitest run test/agency-customer-service.integration.spec.ts test/agency-acquisition.integration.spec.ts test/agency-http.integration.spec.ts test/access-policy-inventory.spec.ts
pnpm --filter @geoeval/web test
```

Browser fixture: apps/backend/test/fixtures/agency-customer-journey-host.ts verifies the owned DB/Redis target and prints current synthetic URLs. It uses deterministic local execution solely to build a prerequisite fixture. The synthetic report intentionally has unscored samples and a raw-answer/privacy marker; it does not claim evaluation/provider or production acceptance.

Final temporary HTTP/browser processes are stopped at workspace exit; task-only test data remains reusable. Main/payment worktrees are not used for tests. Full future order attribution, commission activation and real production checks were not run.
