# One-time administrator Bootstrap verification checkpoint

- Date: 2026-09-04
- Branch base: `d68edd3`
- Result: Verified for the offline Bootstrap slice; Issue #50 remains partially
  verified

| Claim | Evidence | Result | Scope and limitation |
| --- | --- | --- | --- |
| Bootstrap authority is offline and explicit | CLI requires explicit `DATABASE_URL`, mobile, key ID, digest-only environment verifier, and `--secret-stdin`; OpenAPI contains no Bootstrap or recovery path | Passed | No real secret or administrator |
| Plaintext secret is not an argument, environment value, result, audit, or stored verifier | Service/CLI tests, actual CLI output, and disposable-database inspection | Passed | Public fixture secret only; production secret custody remains a release Gate |
| First execution is atomic | Integration test and actual CLI create one active administrator, singleton control completion, and one Bootstrap audit | Passed | Local project PostgreSQL only |
| Exact replay is deterministic no-change | Service test and actual second CLI execution return `UNCHANGED`; account/audit counts remain one | Passed | Replay requires the original account to remain active administrator and the key/verifier to match |
| Conflicting or unsafe starts fail closed | Tests cover changed mobile, key, verifier, existing active administrator, previously owned mobile, invalid secret/mobile, and two concurrent targets | Passed | No exceptional recovery authority is added |
| Ordinary small-team readiness uses Governance, not Bootstrap replay | Test creates the second administrator through `AccountGovernanceService` and records a second ordinary governance audit | Passed | This remains an operational runbook recommendation, not a mandatory two-admin invariant |
| The package-manager CLI route works | Actual `pnpm identity:bootstrap -- ...` first exposed and then verified the standalone `--` parser fix; a pure CLI-options test retains the regression | Passed | Test database was deleted after inspection |
| Existing application behavior remains intact | `pnpm test`: 35 files / 187 tests; typecheck, build, format and framework validation | Passed | Frontend and final Issue verification remain open |
| Whole Issue #50 is complete | Role homes, administrator UI, remaining security/failure/browser/rollback evidence, reconciliation, PR and integration remain unchecked | Not run | Keep #50 `In Progress` |
