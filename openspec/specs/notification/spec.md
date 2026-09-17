# Notification Specification

## Purpose

Define the accepted first durable in-product notification capability. This
increment owns terminal-customer evaluation-completed, retry-required and
recharge-successful notices, agent withdrawal-result notices, account-scoped
read state, and a recoverable realtime refresh hint. It does not own source
evaluation results, recharge/point accounting, withdrawal state, external
channels, retention policy, deletion, or subscription settings.

## Requirements

### Requirement: Durable idempotent inbox

Notification SHALL materialize one recipient-owned notice from each approved
business-result fact before its owning delivery obligation is marked delivered.
Evaluation and Agency Withdrawal use Product Outbox; Recharge owns its private
post-settlement obligation.

#### Scenario: An evaluation reaches a customer-relevant result

- **WHEN** GEO Intelligence atomically accepts a report or commits terminal
  retry-required state and appends its unique business-result fact
- **THEN** Notification validates that fact and stores one concise title,
  summary, typed evaluation target, occurrence time, and unread state
- **AND** the source Outbox-event identity makes repeated or concurrent delivery
  create at most one notice
- **AND** the notice contains no answer, score payload, prompt, source, model,
  provider failure, attempt, queue state, trace, or protected guidance

### Requirement: Account-scoped reading

Every inbox query and read command SHALL be scoped to the authenticated
recipient account.

#### Scenario: A recipient uses the notification center

- **WHEN** the recipient lists notices
- **THEN** the API returns a bounded newest-first page, unread count, and opaque
  continuation cursor
- **AND** the recipient may idempotently mark one owned notice or all current
  unread notices read
- **AND** another account receives no indication that a notice exists
- **AND** opening an evaluation target first selects its owning brand through
  the existing global current-brand command, then opens current diagnosis or
  the immutable report detail

### Requirement: Realtime remains a recoverable hint

The authenticated app shell SHALL use SSE only to reduce refresh latency over
the durable inbox.

#### Scenario: Notification state changes while the app is open

- **WHEN** the latest notice identity or unread count changes
- **THEN** the SSE stream emits a `refresh` event containing only that revision
- **AND** the Web performs the ordinary durable list read on connection, hint,
  reconnect, and window focus
- **AND** duplicate revisions are not emitted and the stream closes during API
  shutdown or component unmount
- **AND** a missed hint, temporary disconnect, or page absence cannot lose a
  notice or alter its read state

## Current environment boundary

The implementation covers terminal-customer evaluation completion,
retry-required and successful-recharge notices and agent withdrawal results in
controlled local environments. Recharge delivery requires an explicitly
configured worker lane; migrations do not backfill old results. Production
proxy buffering and reconnect behavior, notification retention, load, external
channels, and event production for operations and administrators are later
release gates.

### Requirement: Agent withdrawal result notices

- Agency Withdrawal SHALL append a unique Product Outbox event only for
  Completed, Rejected, and Payment failed results. Notification SHALL
  materialize it for the owning agent with an `AGENCY_WITHDRAWAL` target.
- The title and summary MAY include the request number, amount, and customer-safe
  result reason. They SHALL NOT include payout data, bank transaction reference,
  internal note, or encryption material.
- Opening the notice SHALL revalidate and mark the owned notice, then open the
  agent withdrawal detail without selecting a customer Brand. Delivery retry
  SHALL create at most one notice and SHALL never change withdrawal state.

### Requirement: Recharge notice identity and destination

- Notification SHALL accept an internal validated recharge order UUID, recipient,
  positive integer funded points and occurrence time through `publishRecharge`.
  It SHALL materialize `RECHARGE_SUCCESSFUL` with a `RECHARGE_ORDER` target; no
  merchant, payment proof, financial review reason or client idempotency key is exposed.
- The order UUID SHALL identify its once-only success notice. Replay preserves
  the existing title, summary and `readAt`; a different recipient, kind or target
  under that identity SHALL be rejected explicitly, never acknowledged as delivered.
- Opening a recharge notice SHALL revalidate/mark the owned notice and open the
  owned recharge detail. It SHALL neither select a Brand nor submit a purchase.

### Requirement: Account change and bounded browser requests

- Notification HTTP may carry `x-geoeval-account`; SSE may carry
  `expectedAccountId`. If supplied, either SHALL match the authenticated account,
  including rejecting malformed/repeated expected-identity values. Neither selects
  a recipient. Legacy callers without a fence retain existing authentication.
- Lists and read mutations SHALL use `no-store`. The browser SHALL bound list,
  read and destination-selection requests, ignore responses after unmount or any
  account generation change (including A to B to A), and clear private state on
  access loss. An older list SHALL not overwrite a later read mutation.
- SSE/focus/reconnect hints SHALL coalesce during active work and perform an
  ordinary durable refresh. Temporary failures retain a visible retry path.
