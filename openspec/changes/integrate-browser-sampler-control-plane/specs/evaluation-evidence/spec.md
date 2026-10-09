## ADDED Requirements（规划修订；未实现）

### Requirement: Independent execution preserves GEO ownership

GEO Intelligence SHALL own the twenty immutable samples, Provider native parameters and normalization, business retries, accepted evidence, interpretation and report readiness. The independent center SHALL own actual web/API execution, credentials, capacity and technical results/events.

#### Scenario: An item finishes before its siblings

- WHEN one item completes while the platform batch or cleanup remains active
- THEN GEO SHALL receive a result-available event and read the durably committed result
- AND map it by stable itemId, validate actual evidence and accept it atomically
- AND append interpretation work without waiting for siblings or resource release.

#### Scenario: Partial or uncertain remote work

- WHEN submission response or event delivery is interrupted
- THEN GEO SHALL restore the same persisted request identity/key/task
- AND duplicate or early completion events SHALL not cause duplicate accepted evidence or interpretation
- AND uncertain external execution SHALL not be blindly resent with a new identity.

### Requirement: GEO-owned bounded web-first acquisition

Sampling SHALL use a durable cycle-anchored 130-second deadline including queueing, web/API execution, extraction and delivery. Later interpretation and reports SHALL use independent budgets.

#### Scenario: Web remains unresolved at 80 seconds

- WHEN fallbackDueAt arrives with unresolved items
- THEN GEO SHALL submit API execution only for those items through the center
- AND preserve Provider request parameters and existing explicit business retry rules
- AND another still-eligible web attempt SHALL not be terminated solely because API failed.

#### Scenario: Competing or late results arrive

- WHEN a result passes GEO validation before the deadline
- THEN its acceptance transaction SHALL check exact attempt/channel, current cycle and PENDING state
- AND persist at most one canonical evidence and interpretation Outbox
- AND a race loser, old-cycle result or late-after-deadline response SHALL not replace or reopen it.

#### Scenario: Acquisition deadline arrives

- WHEN deadlineAt is reached
- THEN only items without accepted answers SHALL terminate with explicit acquisition errors
- AND accepted answers and already-started interpretation SHALL remain intact.

### Requirement: Truthful rich browser evidence and original prompt

Web SHALL receive only the unchanged question, not an invented system instruction.
GEO SHALL retain complete answer, content/readingText, available images, internal sources and technical capture/finality fields. Missing sources SHALL not be fabricated or alone invalidate a completed answer. The rich card SHALL not display source lists or citation mapping. Historical Markdown SHALL remain readable.

### Requirement: Short work and immediate notification consumption

After the remote accepted identity is durably stored, the submit Outbox SHALL finish while the business Attempt remains pending. Completion inbox/cursor and resume Outbox SHALL be committed together. Long remote waits SHALL not occupy product Worker slots or indefinitely block new work behind an oldest-record relay window.

## MODIFIED Requirements

### Requirement: Versioned neutral sampling context

Provider API requests SHALL preserve the executable objectivity profile and snapshot its actual version/context. Consumer Web/App requests SHALL record only the immutable question and actual external execution provenance, without claiming an unavailable system-instruction capability. GEO SHALL not alter existing model, Prompt, valid-sample threshold or report semantics through transport migration.
