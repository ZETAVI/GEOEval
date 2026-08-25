# Evidence: F0 Bounded Foundation Spike

- Change: [`define-application-architecture`](../proposal.md)
- Execution date: 2026-08-25
- Branch: `codex/foundation-spike`
- Result: Passed with an explicit TypeScript candidate revision
- Scope: Local non-product foundation only; no provider call, production
  resource, customer data, or commercial workflow

## Accepted execution set

| Boundary | Executed set |
| --- | --- |
| Runtime and workspace | Node.js 24.12.0, pnpm 11.9.0, TypeScript 5.9.3, one pinned pnpm lockfile |
| Web | Next.js 16.3.2, React 19.2.8, App Router, standalone output |
| Backend | NestJS 11.2.2, one source application and build artifact with API and worker entrypoints |
| Data and work | Prisma 7.9.1 with PostgreSQL adapter, PostgreSQL 18.6, BullMQ 6.2.1, Redis 8.2.8 |
| Local infrastructure | OrbStack Docker through root `compose.yaml`; official PostgreSQL and Redis images pinned by manifest digest |
| Contract | Nest Swagger 11.4.7 emits OpenAPI; `openapi-typescript` 7.13.0 generates the web client contract |

TypeScript 7.0.2 was the initial trial. Installation produced a formal unmet
peer contract because `openapi-typescript@7.13.0` supports TypeScript `^5.x`.
The spike did not waive the warning or pretend that installation was
compatibility evidence. It recorded the failure, revised the compiler to
5.9.3, regenerated the lockfile, and reran the full evidence set.

## Evidence matrix

| Claim | Evidence | Result | Notes |
| --- | --- | --- | --- |
| The workspace is reproducible and project-local | `pnpm install`; exact manifests, `pnpm-lock.yaml`, `.node-version`, and Corepack package-manager pin | Passed | No global or system package was installed. pnpm build scripts use an explicit allow/deny map. |
| Web and backend compile as the selected application shape | `pnpm typecheck`; `pnpm build`; API and worker started from `apps/backend/dist` | Passed | Next standalone output and both Nest entrypoints were produced from the checked workspace. |
| The public contract has one generated path | `pnpm openapi:generate`; before/after SHA-1 comparison of `openapi.json` and generated `schema.d.ts` | Passed | Regeneration was byte-stable; the web imports only `@geoeval/api-client`, not backend or Prisma types. |
| Process configuration and shutdown are scoped | Config tests; built API runtime; SIGTERM with active SSE; `/health/ready` returned 503 before exit | Passed | API does not require worker-only Redis configuration. Shutdown closes SSE through the readiness lifecycle and then exits after the bounded grace period. |
| Owner write and outbox fact are atomic | Reviewed SQL applied with `prisma migrate deploy`; focused rollback integration test | Passed | The forced failure left zero owner and outbox rows; the successful path committed both. |
| Background work is durable and duplicate-safe | Worker stopped; API committed one pending Outbox fact; backlog was observable; restarted worker completed it; duplicate-delivery integration test produced one `WorkEffect` | Passed | Redis is delivery state only. Stable business keys and a PostgreSQL unique constraint protect the business effect. |
| Realtime and telemetry are non-authoritative followers | Browser created a record, observed completion, deliberately disconnected SSE, then recovered through a normal GET; controlled telemetry exporter failure left records committed | Passed | One correlation identity was retained across request, owner record, outbox fact, worker effect, and browser read. Browser console had no warning or error. |
| Recovery and deployable web boundaries work | `rehearse-backup.sh` restored 3/3 owner records into dedicated `geoeval_restore`; standalone Web ran behind the local reverse proxy; server-secret fixture was absent from `.next` | Passed | The restore database and `.foundation-evidence` dump are disposable F0 artifacts. No production RPO/RTO or proxy product is selected. |

## Runtime observations and corrections

1. Prisma's first migration attempt inside the restricted tool sandbox returned
   a generic schema-engine failure. A direct `pg` probe identified the real
   boundary as local-socket `EPERM`; the same reviewed migration succeeded when
   explicitly allowed to reach the dedicated OrbStack port. This was not a
   PostgreSQL 18 or Prisma schema incompatibility.
2. The first Swagger generation treated implicit property metadata as circular.
   Explicit DTO schema types fixed the contract without changing owner data.
3. An active SSE client initially delayed shutdown. Readiness now publishes a
   shutdown signal that ends hint streams before the process exits; durable API
   state remains the recovery authority.
4. A root-wide formatter touched unrelated documentation before failing on
   protected Skill files. Unrelated changes were restored and the verified
   format command is now scoped to application and foundation files.
5. The initial framework validator followed Markdown inside project-local
   dependencies. It now excludes dependency, cache, and build-output roots so
   local-link governance remains limited to repository-owned documents.
6. Architecture review found the F0 application service and worker importing
   Prisma directly. A repository port now belongs to the foundation boundary,
   with Prisma isolated in the PostgreSQL infrastructure adapter; the public
   OpenAPI contract and generated web client remain free of test-only rollback
   controls.

## Retention and non-goals

The workspace, process bootstraps, generated-contract pipeline, migration
history, transaction/outbox seam, idempotent worker seam, readiness lifecycle,
and verification scripts are retained as the executable application foundation.
The `FoundationRecord` schema, F0 endpoints, and validation page are test-only
probes, not customer behavior or a public product contract. They must be removed
or placed behind an explicitly non-production validation boundary before a
commercial deployment. F0 does not authorize S0 product implementation.

E0 remains separate from the application foundation. Its four-call entitlement
sub-gate passed with rotated credentials and access-controlled raw evidence.
The initial, repair, and one-call retry R01-R03 batches now provide successful
evidence for all fifteen unique positions. One shared objectivity-instruction
candidate also passed five-route transport and narrow semantic calibration.
Exact wording and the remaining parser, synthesis, resilience, capacity/cost,
and telemetry matrix still require their owning gates.
