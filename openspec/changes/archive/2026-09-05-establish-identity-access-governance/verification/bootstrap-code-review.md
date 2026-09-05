# Bootstrap fixed-diff review

- Reviewed commit: `55df5ad`
- Date: 2026-09-04
- Verdict: Ready as a bounded Issue #50 Bootstrap checkpoint

## Intent

The diff implements the approved one-time offline first-administrator boundary.
It adds no HTTP entry, second Bootstrap path, Recovery Secret, break-glass
command, real administrator, production mutation, or multi-role behavior.

## Engineering findings

1. **Resolved before the fixed point — package-manager argument separator.**
   The first actual CLI rehearsal showed that pnpm preserved a standalone `--`
   argument and the strict parser rejected otherwise valid options. Parsing now
   ignores only that separator, retains exact allowed-option validation, and has
   a focused regression test.
2. **Resolved before the fixed point — offline code depended on an HTTP
   exception.** Mobile normalization previously lived in Authentication and
   threw a Nest `BadRequestException`. It is now an Identity domain function;
   Authentication and Governance translate invalid input to HTTP while
   Bootstrap emits its own bounded CLI error.
3. **No finding — secret custody boundary.** The CLI accepts plaintext only from
   non-TTY standard input, bounds input size, requires a 32-character minimum,
   compares against the explicit digest verifier in constant time, and prints
   only account/result data or bounded error codes. The database stores only
   the verifier digest and non-secret key ID.
4. **No finding — concurrency and replay.** The singleton Governance control
   row is locked before reading completion or administrator state. Tests and
   actual CLI evidence prove first create, exact no-change replay, conflict, and
   concurrent single-winner behavior.

## Evidence and continuity

The complete suite passes at 35 files / 187 tests, alongside build, typecheck,
format, Diff and framework checks. The disposable CLI database was removed.
No remaining Bootstrap finding blocks the next frontend slice. Whole-Issue
verification, current-spec reconciliation, PR review, integration, real SMS,
and production actions remain separate.
