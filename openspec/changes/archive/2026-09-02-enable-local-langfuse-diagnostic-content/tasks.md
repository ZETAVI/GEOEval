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
- [x] Emit one credentialed, fictional Langfuse Cloud smoke batch and read it
      back through Observations API v2 without calling any Provider.
- [x] Pass typecheck, relevant test suites, build, format, framework validation,
      and `git diff --check`; disclose anything not run.
- [x] Reconcile accepted behavior into the current evaluation-evidence spec and
      record the design/documentation disposition.
- [x] Commit, push, and open Draft PR #47 linked to #44 as the Final PR; update #44
      with evidence and boundaries, and stop before merge or production change.
- [x] Rebase the fixed diff onto `main@29518a8`, confirm patch equivalence, and
      rerun focused tests, full tests, type checks, build, format, migration,
      framework, and diff validation.
- [x] Confirm PR #47 still carries the native `Closes #44` relationship, both
      Required Checks pass on the rebased revision, and #39 remains the open M4
      parent for later child delivery and final integration.
- [x] Reconcile accepted behavior into the current evaluation-evidence owner and
      archive this temporary Change before the authorized integration gate.

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
| Actual Langfuse account behavior | Two fictional Generations exported to `us.cloud.langfuse.com`, then queried via Observations API v2 with `core,basic,io,metadata,model,usage,trace_context` | HTTP 200 on first read; metadata-only Input/Output empty; local-diagnostic Input/Output present; release/contentMode matched; secret, raw-envelope, and reasoning markers absent; redaction present; Provider calls 0 |

No real Provider call, customer-data upload, production configuration change,
deployment, or browser/UI action was performed. Both the loopback exporter-
failure fixture and live Langfuse smoke used fictional content. UI rendering
was not inspected; the live server-side result was verified through the
authenticated Observations API v2.
