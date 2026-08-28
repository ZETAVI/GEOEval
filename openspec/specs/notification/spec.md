# Notification Specification

## Purpose

Define the accepted first durable in-product notification capability. This
increment owns terminal-customer evaluation-completed and retry-required
notices, account-scoped read state, and a recoverable realtime refresh hint. It
does not own the source evaluation result, other product-role events, external
channels, retention policy, deletion, or subscription settings.

## Requirements

### Requirement: Durable idempotent inbox

Notification SHALL materialize one recipient-owned notice from each approved
business-result Outbox fact before that fact is marked delivered.

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

The first implementation covers only terminal-customer evaluation completion
and retry-required events in the deterministic local environment. Production
proxy buffering and reconnect behavior, notification retention, load, external
channels, and event production for operations, administrators, and agents are
later release gates.
