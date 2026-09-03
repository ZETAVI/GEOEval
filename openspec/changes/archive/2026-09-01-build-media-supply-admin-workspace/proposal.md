# Change: Build the Media Supply administrator workspace

- Status: Reconciled and ready for Final PR review
- Class: Standard
- Owning Issue: [#37](https://github.com/ZETAVI/GEOEval/issues/37)
- Accepted foundation: [#33](https://github.com/ZETAVI/GEOEval/issues/33)
- Authorization: deterministic implementation and pull-request preparation;
  no production data, deployment, merge, or #34 data import

## Why

`main@af72ba5` contains the accepted Media Supply persistence, administrator
HTTP API, customer-safe projection, commercial revision, audit, and all-role
Identity session. Administrators still have no usable Web route for maintaining
those records. Relying on handwritten API requests leaves the confirmed
create-maintain-price-publish-pause-audit flow unavailable to the operating
role and leaves its interaction and recovery states unverified.

## Desired outcome

Provide one administrator-only Media Supply workspace that uses the existing
generated contract to maintain platform facts, the platform Listing, concrete
resources, and internal supply sources as distinct but connected concerns. The
workspace makes successful saves, validation failures, authorization denial,
stale Listing revisions, backend failures, loading, and empty results clear to
the administrator and offers an explicit recovery action where one exists.

## Scope

- Route a successfully authenticated administrator into `/admin/media` while
  preserving the terminal-customer first-brand flow.
- Reject terminal-customer, operations, and agent accounts from the
  administrator workspace before loading administrator data; the backend role
  guard remains authoritative.
- Add a desktop-first, responsive administrator shell and Media Supply route
  with platform search and category/status filters, platform selection, and
  create/edit flows.
- Keep platform identity/classification, Listing price/state, resources, and
  sources in separately labeled workspace regions with independent mutation
  reasons.
- Support existing platform, Listing, resource, and source fields and lifecycle
  values, including RMB-fen procurement cost and the confirmed first-release
  defaults.
- Use the current Listing revision as `expectedRevision` for every existing
  Listing change and turn a conflict into a refresh-and-reconfirm state rather
  than a silent overwrite.
- Provide a read-only audit view with actor, time, action, reason, and protected
  before/after values.
- Add owner-local API-client functions and types over the generated OpenAPI
  schema. Expose #33's existing administrator mutation DTOs as deterministic
  OpenAPI request bodies where their controller metadata is currently missing;
  do not change route, field, validation, authorization, or lifecycle meaning.
- Add focused Web tests for role routing, default/validation rules, status
  transitions, and conflict classification, plus browser verification against
  the real local backend contract.

## Non-goals

- Terminal-customer media-library pages, a generic administrator home, or a
  site-wide visual redesign.
- Prisma Schema, Media Supply domain meaning, administrator API semantics,
  customer-safe projection, Identity role semantics, or data migration changes.
- Publishing Commerce, point deduction, paid-order snapshots, Publication
  Delivery, packages, supplier accounts/roles, automatic allocation, SSE,
  message buses, or CQRS.
- Importing or publishing #34's forty platforms or Logo assets, reading its
  output directory, or changing #26/#32 evaluation work.
- Editing `apps/web/app/diagnosis/workspace.tsx` or moving ownership of existing
  customer journeys.
- Production data, production deployment, automatic Logo fetching, or external
  publication activity.

## Impact

- **Web:** gains an administrator-only Media Supply route, shell, forms, status
  feedback, and responsive presentation. Existing customer pages remain
  owner-local and unchanged except for role-aware post-login routing.
- **API client:** exposes Media Supply request/response types and focused request
  helpers using the generated schema. Request errors retain HTTP status so the
  Web can distinguish authorization, validation, conflict, and server failure.
- **Backend/data:** request-body OpenAPI annotations make existing DTOs visible
  to deterministic client generation. Identity's existing `RoleGuard` receives
  an explicit `Reflector` injection token so the same guard works in the
  metadata-light local `tsx` runtime as in compiled/test paths. Protected
  endpoints, role meaning, runtime DTO validation, transactions, revisions,
  audit, and database records remain otherwise unchanged and authoritative.
- **Documentation:** this active change owns the proposed UI behavior. On
  acceptance, the administrator-workspace scenarios move into the owner-local
  Media Supply current specification, the product-definition evolution marker
  remains for unrelated capabilities, and this Change is archived.

## Architecture readiness

- **Owner:** Web owns interaction composition and local form state; Media Supply
  remains the only owner of lifecycle rules and durable facts; Identity remains
  the role authority.
- **Dependency direction:** administrator page -> typed API-client helpers ->
  existing REST/OpenAPI -> Media Supply application. No Web code reads Prisma or
  duplicates backend transition rules as durable truth.
- **Failure/recovery:** validation stays field/page local; 401 returns to login;
  403 renders an access-denied state without administrator data; 409 requires a
  refresh before another Listing submission; 5xx retains input and offers retry;
  accepted mutations refresh the selected projections and audit.
- **Reuse:** existing visual tokens, button/form language, login challenge, and
  generated contract are reused. Administrator components remain owner-local;
  no generic form/table framework is introduced from one use case.
- **Rollback:** the Web route and client helpers can be reverted without data
  migration. Existing backend authorization and records remain unchanged.

## Control state

- Branch: `codex/issue-37-media-supply-admin`
- Worktree: current isolated Codex worktree for #37
- Base: `origin/main@af72ba5f261925525b897c9124c28f5fb574c111`
- Writer: the current #37 Codex task; #34 owns only its independent data and Logo
  output
- Merge destination: protected `main` through a Final pull request
- Verification boundary: focused Web behavior tests, existing backend role
  regression, real local backend/browser flow, `pnpm check`, `pnpm build`,
  project-framework validation, and remote Required Checks
- Exit: fixed diff reviewed, current truth reconciled, Change archived, PR open
  with `Closes #37`, Issue moved to Review / Decision, and branch/worktree
  retained for product-owner review; no self-merge or deployment

## Reconciliation result

The accepted administrator-workspace behavior is owned by
`openspec/specs/media-supply/spec.md`; generated OpenAPI/client artifacts, Web
tests, backend role/projection tests, and browser evidence agree with it. The
product-definition evolution marker remains in place only for unrelated product
capabilities that have not yet gained an activated owner. No ADR or architecture
overview change is required because Media Supply, Identity, PostgreSQL, and Web
dependency ownership did not change.

## Approval boundary

Issue #37 and the task authorization approve this bounded standard change over
the existing #33 contract. Any implementation need that changes product meaning,
role authority, backend DTOs, persistence, or Media Supply lifecycle stops for a
new human decision before implementation.
