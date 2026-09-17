# Code Review

Reviewed fixed range: `3825beb..2745243` on
`codex/issue-116-agency-withdrawal`.

The branch was rebased linearly onto protected `main@3825beb`. The only base
change since implementation started was Issue #117's archival of the already
merged evaluation Change; it had no shared file or changed assumption for Issue
#116.

## Intent

Ready. The implementation matches Issue #116 and the archived Change: one
current payout profile, balances derived from booked commission, one active
request, the six-state terminal lifecycle, pending-only withdrawal, separate
new applications, administrator offline payment handling, three result notices,
default-off activation, and no automatic bank, receipt-file, tax or invoice
scope.

## Engineering

Ready. Commission remains immutable and Withdrawal owns only its policy,
profile, request, audit and occupation meaning. Identity locks serialize each
agent's funds commands; a transaction advisory lock serializes the initially
absent global policy. Database constraints independently enforce one active
request, legal transitions, immutable snapshots and append-only history. The
versioned AES-GCM boundary binds ciphertext to its record context; normal APIs,
audit, Outbox and notices remain masked.

Review found and resolved three reachable issues before this verdict:

- different administrators could race the first policy insert; a global
  transaction lock and two-administrator integration case now return one
  success and one explicit stale-version conflict;
- list pages could have been prerendered as permanent 404s and the administrator
  records navigation could expose a disabled link; runtime-dynamic pages and a
  server-propagated flag now keep activation consistent;
- terminal administrator detail rendered an empty action card; it is now absent.

No unresolved correctness, security, ownership, or scope findings remain.

## Evidence and continuity

Ready. The verification matrix records clean migration, targeted money,
encryption, concurrency, role and notification checks, the full backend and Web
suites, type/format/build/framework checks, and both browser roles. Current
specs, architecture, product language and glossary now point to Agency
Withdrawal; the Change is archived. Production encryption operations, finance
policy, payment procedure and real-funds acceptance remain explicit Release
Gates rather than hidden completion claims.

Verdict: **ready**.
