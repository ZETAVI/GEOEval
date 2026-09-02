# Tasks

## Contract and interaction foundation

- [x] Add generated-schema-backed Media Supply types and API-client helpers for
      administrator platforms, Listing, resources, sources, and audit, with
      status-preserving request errors.
- [x] Make existing login completion route terminal customers to the Brand flow
      and administrators to `/admin/media` without calling customer-only APIs
      for supporting roles.
- [x] Add focused tests for role destination, administrator-route denial,
      defaults, validation, Listing revision payloads, and conflict recovery.
- [x] Prove the existing Identity role guard resolves its `Reflector` dependency
      in both compiled/test and metadata-light local `tsx` runtime paths without
      changing role semantics.

## Administrator workspace

- [x] Add the owner-local administrator shell and Media Supply route with stable
      loading, access-denied, empty, filtered-empty, and backend-failure states.
- [x] Implement platform search/filter/select and platform create/edit with
      fixed categories, Logo reference, lifecycle state, and required reason.
- [x] Implement the separate Listing region with whole-point price, explicit
      lifecycle copy, expected revision, conflict refresh, and success feedback.
- [x] Implement resource and source maintenance with current defaults, privacy
      labels, RMB-fen cost, masked-alias validation, pause/archive/inactive
      states, and retained input on failure.
- [x] Implement read-only audit inspection with bounded before/after rendering.
- [x] Complete desktop-first responsive styles and verify ordinary mobile status
      inspection and actions without horizontal page overflow.

## Verification and reconciliation

- [x] Run focused Web tests and existing backend role/projection regression,
      then run `pnpm check`, `pnpm build`, and
      `python3 scripts/validate_project_framework.py`.
- [x] Exercise the administrator main flow against the real local backend in a
      browser, including loading, empty, successful mutations, validation,
      authorization denial, stale revision, backend failure, responsive layout,
      and visual inspection; record any environment-limited evidence.
- [x] Run fixed-diff architecture, code, and verification reviews and resolve
      every must-fix finding within #37.
- [x] Reconcile accepted administrator-workspace behavior into the owner-local
      Media Supply current spec, review the product-definition evolution marker,
      archive this Change, and rerun framework validation.
- [x] Commit and push the coherent result, open Final PR #38 with `Closes #37`,
      map acceptance to evidence and residual risk, move #37 to Review /
      Decision, and retain the branch/worktree for product-owner review without
      self-merge, deployment, or real-data import.
