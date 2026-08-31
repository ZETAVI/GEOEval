# Source Brief: S5 Notification Delivery Boundary

## Recommendation

Keep PostgreSQL notifications as the durable customer truth and reuse NestJS
Server-Sent Events only as an authenticated refresh hint. The Web reloads the
normal notification query after every hint, reconnect, focus return, or initial
entry. S5 should not add WebSockets, Redis Pub/Sub, Redis Streams, another queue,
or a notification framework.

## Decision Constraints

- A missed realtime hint cannot lose a notification or change its read state.
- Delivery must remain one-way from the server to the signed-in Web shell.
- API and Worker run as separate processes, so in-process event emitters cannot
  be the business delivery boundary.
- The first slice has low notification volume and one app-shell stream per
  signed-in browser context.

## Evidence

| Claim | Primary source | Version/date | Design implication |
| --- | --- | --- | --- |
| NestJS exposes SSE through `@Sse()` and requires the route to return an RxJS `Observable`; its message shape supports data, ID, event type, and retry delay | [NestJS Server-Sent Events](https://docs.nestjs.com/techniques/server-sent-events) | Project `@nestjs/common` 11.2.2; accessed 2026-08-27 | The existing backend stack can provide a small authenticated hint stream without a new transport dependency |
| Browser `EventSource` is a one-way persistent connection and reconnects by default after interruption | [MDN: Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) | Web platform documentation; accessed 2026-08-27 | SSE fits server-to-client refresh hints; all commands and reads remain ordinary authenticated HTTP |
| HTTP/1.1 browsers commonly limit SSE connections per browser and origin, while HTTP/2 negotiates a larger stream limit | [MDN: Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) | Web platform documentation; accessed 2026-08-27 | Use one shared app-shell connection rather than one stream per module or page; verify proxy and HTTP version during deployment |
| Redis Pub/Sub has at-most-once delivery and permanently loses a message when the subscriber cannot receive it | [Redis Pub/Sub delivery semantics](https://redis.io/docs/latest/develop/pubsub/) | Redis documentation; accessed 2026-08-27 | Pub/Sub may only ever be an optional wake-up optimization; it cannot own notification truth or S5 acceptance |

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| PostgreSQL inbox plus SSE refresh hints | Adopt | Reuses the accepted authority and transport boundary; reconnect or hint loss is recovered by an ordinary durable read |
| Redis Pub/Sub between Worker and API | Reject for S5 | Adds an ephemeral cross-process path without changing the customer outcome; offline subscribers lose hints and database-backed SSE polling is sufficient at current scale |
| Redis Streams or another durable broker | Reject for S5 | Duplicates the existing PostgreSQL Outbox and BullMQ delivery authorities for a bounded notification workload |
| WebSockets or a notification framework | Reject for S5 | Bidirectional channels, connection registries, and another dependency are not required for read-only business-result hints |
| Client polling only | Defer as fallback | It can satisfy no-manual-refresh behavior, but the accepted architecture already selects SSE as the normal disposable hint |

## Unknowns and Validation

- Production reverse-proxy buffering, idle timeouts, HTTP/2 behavior, and
  connection limits remain deployment facts. Validate one authenticated stream,
  reconnect, multi-tab behavior, and durable catch-up in the production-like
  environment before release.
- If measured connection or database-polling load becomes material, evaluate an
  ephemeral Redis wake-up optimization without changing PostgreSQL ownership or
  the public notification contract.

## Reuse and Refresh Boundary

- Reusable while: the modular API/Worker split, PostgreSQL authority, NestJS 11
  SSE surface, low initial notification volume, and one-way Web requirement stay
  unchanged.
- Refresh when: deployment topology adds multiple API regions, measured SSE
  polling becomes material, bidirectional presence is required, or the NestJS or
  browser transport boundary changes.
