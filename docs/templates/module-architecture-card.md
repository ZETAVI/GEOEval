# Module Architecture Card: <module or increment>

Embed the completed sections in the active change's `design.md`. Keep the card
proportional; delete unused prompts rather than filling them with ceremony.

## Outcome and Boundary

- Owner and observable outcome:
- In:
- Out:
- Upstream prerequisites and downstream consumers:

## Lifecycle and Data

- States and allowed transitions:
- Authoritative records and invariants:
- Transaction, concurrency, and history boundary:
- Migration and rollback:

## Contracts and Dependencies

- Public commands, queries, and facts:
- Dependency direction:
- External ports and failure boundary:
- Earned patterns or extension seams:

## Failure and Recovery

| Failure | Classification | Retry or recovery owner | Idempotency or reconciliation evidence |
| --- | --- | --- | --- |
| <reachable failure> | <transient, permanent, ambiguous, business exception> | <owner> | <constraint, key, state, test, or drill> |

## Tool and Framework Decision

| Candidate | Adopt, defer, or reject | Evidence and limitation | Exit or refresh trigger |
| --- | --- | --- | --- |
| <tool or existing capability> | <decision> | <primary source or controlled evidence> | <observable trigger> |

## Operational and Verification Boundary

- Security and sensitive data:
- Backpressure, capacity, and cost:
- Metrics, logs, traces, and operator recovery:
- Completion claims and discriminating evidence:
- Residual risk accepted by:
