# Administrator account-governance architecture review

Date: 2026-09-04

Review boundary: administrator governance command client and Web workspace diff
after `0f2a468`, including the command-contract checkpoint `b472efa`.

## Review contract

Authoritative intent is the active Identity and Access change specification and
design. The existing backend repository transaction remains the executable owner
of role families, self/last-administrator restrictions, revision comparison,
Session revocation, and audit insertion. This review does not reopen those
approved semantics or redesign unrelated Web/Media Supply code.

## Interface and dependency result

Ready for this checkpoint.

- Four typed API-client functions were chosen instead of a generic
  `mutateAccount(kind, payload)` surface. Each caller sees only its command's
  generated request contract and the shared bounded error type.
- Creation and dangerous target actions use separate dialog interfaces. Their
  common reason/confirmation presentation is local implementation detail rather
  than a new authorization or workflow abstraction.
- Dependencies point Web → generated API client → Identity HTTP contract. The Web
  neither imports repository/schema internals nor evaluates server invariants.
- Successful mutation is followed by a fresh account/audit read. Optimistic
  conflict is never automatically retried; the administrator must close and
  refresh before issuing a new reasoned command.

## Resolved findings

1. `should-fix` — the initial fixed overlay declared `aria-modal` but did not
   enforce a browser focus boundary. It was replaced with the native modal dialog
   lifecycle, explicit initial command-field focus, and controlled Escape cancel.
2. `must-fix` — switching audit targets had already been corrected in the prior
   read-model checkpoint; this diff preserves that clearing/request-generation
   behavior while refreshing after mutations.

## Residual boundaries

- The backend permits the current approved revoke-all semantics; the full
  duplicate/concurrent revoke matrix remains Stage 4 verification rather than a
  new frontend rule.
- Final browser mutation clicks were not used because they require separate
  Computer Use confirmation. Typed client tests, actual local HTTP commands,
  PostgreSQL inspection, and browser readback jointly cover the same boundary.
- Issue #50 is not ready to close until current design is reconciled out of the
  active change and all remaining verification/rollback tasks pass.
