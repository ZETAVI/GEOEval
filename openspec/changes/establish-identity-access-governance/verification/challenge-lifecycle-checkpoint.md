# Challenge lifecycle and cleanup verification checkpoint

- Date: 2026-09-04
- Branch base: `54092c4`
- Result: Verified for this bounded backend slice; Issue #50 remains partially
  verified

| Claim | Evidence | Result | Scope and limitation |
| --- | --- | --- | --- |
| Delivery transport is replaceable without owning Account or Session | `ChallengeDeliveryPort`, deterministic adapter, module wiring, typecheck and build | Passed | No real SMS adapter or provider call; that remains a separate external Gate |
| Challenge issuance enforces configured lifetime, resend interval, window cap, and supersession | `identity.integration.spec.ts` covers immediate resend rejection, five-per-window configuration, old-Challenge rejection, and stored rate count | Passed | Policy is per normalized mobile; IP/device collection is deliberately outside this Change |
| Concurrent requests cannot both cross a one-request window | Two simultaneous requests against PostgreSQL produce one Challenge and one `429` | Passed | Local project PostgreSQL; no distributed provider delivery involved |
| Failed verification attempts stop at the configured bound | Two-attempt test rejects a later correct code and creates no Session | Passed | Deterministic code only |
| Cleanup is bounded and cannot delete active Session, usable Challenge, refreshed rate state, or Governance audit | `identity-maintenance.integration.spec.ts` with batch size one and mixed active/recent/old records | Passed | Explicit command only; no automatic schedule is claimed |
| The operational cleanup entrypoint runs with maintenance-only configuration | `DATABASE_URL=... pnpm identity:cleanup` returned `COMPLETED` on `geoeval_issue50` | Passed | No production execution |
| Current migrations apply from an empty database | Temporary `geoeval_issue50_lifecycle` applied all 21 migrations; migration count, rate table, and superseded column were inspected; database then removed | Passed | Local synthetic database only |
| Existing application behavior remains intact | `pnpm test`: 33 files / 175 tests; `pnpm build`, `pnpm typecheck`, format and project-framework validation | Passed | Browser role shells and administrator UI remain outside this slice |
| Shared default resources were not selected | Default PostgreSQL remains at 19 migrations with no rate table; Issue database is at 21. Redis DB 0 was only queried and remains separate from DB 10 | Passed | Pre-existing default Redis records were not modified or cleared |
| Whole Issue #50 is complete | OpenSpec tasks still contain Bootstrap, role shells/UI, expanded failure/browser/rollback evidence, reconciliation, PR and integration | Not run | Do not open a final PR or move #50 from `In Progress` based on this checkpoint |

The implementation adds no dependency, Redis authorization state, real SMS,
real administrator, production migration, deployment, or automatic scheduler.
