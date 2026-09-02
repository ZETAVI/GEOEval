# Tasks

- [x] Confirm Issue #44 Owner, P1 Priority, In Progress status, parent #39
      boundary, branch base, merge destination, and no existing #44 workspace.
- [x] Research the locked Langfuse JS/TS 5.11.0 observation, masking, release,
      and shutdown interfaces from official sources and installed package types.
- [x] Record the standard proposal, evaluation-evidence delta, implementation
      design, documentation owner, verification boundary, and workspace exit.
- [x] Run architecture review and resolve every must-fix boundary finding before
      implementation.
- [x] Add an explicit metadata-only/local-diagnostic telemetry content policy
      with a production startup guard and optional release/revision tag.
- [x] Add versioned, purpose-aware local input and normalized success/failure
      output projections without Provider envelopes or reasoning content.
- [x] Make the final mask sanitize serialized JSON and inline credentials while
      preserving diagnostic content only in the explicit local/test mode.
- [x] Verify metadata-only, local diagnostic, mask, and exporter failure with
      focused unit/integration tests and no real Provider calls.
- [x] Pass typecheck, relevant test suites, build, format, framework validation,
      and `git diff --check`; disclose anything not run.
- [x] Reconcile accepted behavior into the current evaluation-evidence spec and
      record the design/documentation disposition.
- [ ] Commit, push, open a Draft PR linked to #44 as the Final PR, update #44
      with evidence and boundaries, and stop before merge or production change.

## Local Verification Evidence

| Claim | Evidence | Result |
| --- | --- | --- |
| Metadata-only, local diagnostic, serialized/object mask, fail-closed behavior, structured parser/synthesis projection, release tag, and rejected exporter isolation | `pnpm --filter @geoeval/backend exec vitest run test/ai-attempt.telemetry.spec.ts test/runtime-config.spec.ts test/langfuse-telemetry.integration.spec.ts` | 3 files / 13 tests passed; expected sanitized shutdown warning |
| Complete deterministic Backend behavior remains compatible | `pnpm test` against project-named PostgreSQL/Redis | 22 files / 121 tests passed; pre-existing `pg@9` deprecation warnings retained |
| Workspace contracts compile | `pnpm typecheck` | Backend, API client, and Web passed |
| Production artifacts build | `pnpm build` | Prisma/OpenAPI generation, Backend build, API client typecheck, and Next.js production build passed |
| Formatting and diff hygiene | `pnpm format:check`; `git diff --check` | Passed |
| Project framework and links remain valid | `python3 scripts/validate_project_framework.py` | 17 cataloged Skills and local Markdown links passed |
| Database compatibility | `pnpm db:migrate` | 14 migrations found; no pending migration |

No real Provider call, customer-data upload, production configuration change,
deployment, or browser/UI action was performed. The loopback OTLP fixture used
fictional content and intentionally returned HTTP 400 to exercise export
failure isolation.
