# Design: First Evaluation Slice

## S1 Boundary

Identity and Access owns account role, mobile challenge, and revocable session.
Brand Knowledge owns brand profiles, evaluation readiness and fingerprint, and
the account's current-brand selection. The Web consumes generated REST/OpenAPI
types and never imports backend or Prisma types.

## Identity Design

- Public entry uses request-challenge and complete-challenge use cases behind a
  challenge-delivery port.
- The first implementation supplies a deterministic local/test adapter only.
  Configuration rejects that adapter in a production environment; selecting and
  validating a real SMS provider remains a later external-integration change.
- Mobile numbers are normalized before uniqueness checks. One public mobile
  entry can create only a terminal-customer account.
- Challenge values are stored as a keyed digest, expire, are single-use, and
  stop after a bounded number of failed attempts.
- Sessions use random opaque bearer material stored only as a digest. The browser
  receives it in an HttpOnly, SameSite cookie; logout revokes the durable session.

## Brand Design

- Brand records use additive optional fields so incomplete drafts can be saved.
- Evaluation readiness is owner-derived from the complete required basic field
  set. The evaluation fingerprint includes normalized company/store name,
  industry, two characteristics, and region; contact-only edits do not change it.
- Current-brand selection is a Brand Knowledge record keyed by account, not an
  account-role field. Creating the first brand and selecting another brand are
  Brand Knowledge transactions.
- Every command and query is scoped by the authenticated account. Database
  foreign keys support ownership but do not replace application authorization.

## Web Design

- `/` becomes the simple public product entry and the F0 browser page moves to
  an explicitly non-product route.
- `/enter` owns the passwordless entry flow, including the optional first-brand
  handoff.
- `/brands` is the initial terminal-customer service home with the agreed left
  navigation, current-brand utility area, real brand cards, and honest capability
  previews for not-yet-implemented modules.
- Layout is responsive and keyboard-operable. Exact final illustration, motion,
  and full design-system extraction remain outside S1.
- Customer-facing copy uses concise Chinese except for established product terms
  such as GEO and AI. The current interface fixes the journey and information
  structure only; final visual language, typography, motion, and detailed polish
  belong to a later independently reviewed frontend-design task and must not
  silently change accepted product behavior.

## Migration, Failure, and Rollback

- The migration is additive: new account, challenge, session, brand, and current
  selection tables. Existing F0 tables and records remain untouched.
- Invalid or expired challenges return a concise correction outcome. Missing or
  foreign sessions and brand IDs return authorization-safe outcomes without
  exposing account existence.
- Application rollback can stop using the new routes while retaining additive
  tables. A later destructive removal requires a separately reviewed migration.

## Evolution Markers

- The validation-harness objectivity profile is not touched in S1. Its move into
  GEO Intelligence is triggered by S2, when the first production evaluation
  owner exists.
- The deterministic challenge adapter must be replaced or disabled before any
  production release; this trigger is owned by the future authentication
  integration change.

## S2 Boundary

GEO Intelligence owns evaluation definitions, frozen input revisions, question
sets, runs, and the twenty business sample identities. Brand Knowledge exposes
one evaluation-purpose view; it remains the only owner of editable brand facts
and the normalized fingerprint. S2 does not call a model provider or interpret
an answer.

### Definition preparation

- Preparing a definition requires one active, account-owned, evaluation-ready
  brand. GEO Intelligence receives only the evaluation-purpose fields and their
  Brand Knowledge fingerprint.
- Preparation is idempotent by brand and fingerprint. The first preparation
  stores one immutable brand-fact snapshot, one generated four-question set,
  the fixed five-platform policy, question-generator identity, and shared
  objectivity-profile identity. Reopening the same revision returns that record;
  there is no refresh operation.
- The deterministic generator is an S2 adapter for contract development. It
  produces one brand-directed question, one industry-recommendation question,
  and two characteristic questions. Replacing it with approved AI execution is
  a later integration seam and cannot change definition ownership.

### Official start

- Start is one GEO-owned PostgreSQL transaction. It rechecks account ownership,
  active brand state, fingerprint currency, definition identity, one active run
  per brand, and the unchanged revision's opportunity.
- The transaction creates one run, four-by-five sample identities, and one
  product outbox fact. It performs no provider or queue call. A duplicate start
  of the same definition returns the existing active run; a different revision
  cannot start while that brand has an active run.
- One definition has at most one run. Later retry work opens an internal cycle on
  that run rather than creating another official evaluation. Completion and
  please-retry transitions remain S3-S5 work, but the S2 model protects their
  identity and history rules now.

### Customer interaction

- `/diagnosis` uses the current-brand context. No brand or incomplete basic
  information leads to a concise correction route; a ready brand shows the four
  read-only questions and one explicit start action.
- Starting changes the page to the evaluating state and exposes the fixed
  twenty-position scope without fabricating progress. Switching the global
  current brand does not mutate the started run.

### Objectivity policy ownership

S2 moves the confirmed objectivity profile from the provider-validation harness
into GEO Intelligence's production-owned source. The harness and current
product documents link to that same file; no second policy copy remains.

## Confirmed S3 Boundary

S3 makes acquisition and per-sample interpretation resumable without calling a
real provider. It starts from the twenty sample identities created in S2 and
ends when the run either has at least seventeen accepted sample interpretations
and is ready for overall synthesis, or cannot reach that threshold after the
bounded deterministic attempts and becomes `PLEASE_RETRY`.

S3 does not produce the overall synthesis, recommendation index, report,
optimization guidance, notification, or customer retry command. Those remain
S4-S5 work. Real five-platform adapters, production pacing, and paid external
calls remain S6.

### Ownership and collaboration

- GEO Intelligence owns the run stage, execution-cycle identity, expected
  sample state, canonical format-preserving answer, returned source metadata,
  accepted model identity, per-sample interpretation, exhausted failure, and
  the seventeen-of-twenty readiness decision.
- AI Execution owns append-only purpose-specific attempt evidence: request and
  route identity, attempt relationship, deterministic response envelope or
  failure, latency, and available usage fields. It cannot create a sample,
  accept business evidence, or change a run.
- Background Work owns product-outbox relay and BullMQ delivery mechanics. A
  GEO-owned evaluation process coordinator reads durable owner state and asks
  the two owners to perform their operations; it does not become a generic
  workflow engine or a second business-state owner.
- The existing Foundation worker and its F0 tables remain isolated probes. S3
  may reuse the proven delivery pattern but does not turn Foundation records or
  services into product APIs.

### Persistent process and evidence

- Handling `evaluation.run.started` idempotently establishes the run's initial
  execution cycle. A pure GEO-owned planner derives only currently valid small
  work intents: acquire one sample, interpret one accepted answer, or evaluate
  readiness.
- Every owner transition that requires later work appends its next product
  Outbox fact in the same PostgreSQL transaction. The relay maps that fact to a
  BullMQ job whose technical identity is derived from the Outbox event; a
  handler registry dispatches the small intent without embedding lifecycle
  decisions in the queue adapter.
- Each sample tracks acquisition and interpretation separately so a parser
  retry never becomes a second platform sample and an accepted answer is not
  requested again merely because interpretation failed.
- One sample can have at most one accepted canonical evidence record and one
  accepted interpretation. Both reference the exact accepted AI attempt, while
  earlier failed or ambiguous attempts remain append-only diagnostics.
- The canonical answer and returned sources are stored by GEO Intelligence in
  business persistence rather than reconstructed from BullMQ, logs, Langfuse,
  or the AI Execution response history.
- Queue redelivery or worker restart reloads owner state and skips accepted
  stages. A crash after an adapter returns but before acceptance may require a
  new recorded attempt, but uniqueness and owner acceptance still prevent a
  second canonical answer or interpretation.
- Queue retry handles delivery and worker infrastructure failure. AI Execution
  records purpose-specific attempts and classifies transient, rate-limited,
  permanent, ambiguous, structural, and semantic failures; queue attempt counts
  never silently become provider-attempt budgets.
- A BullMQ Job Scheduler drives a periodic reconciliation scan that finds
  unfinished GEO-owned work and reasserts missing delivery without mutating
  evaluation state. BullMQ Flow state is not the evaluation lifecycle authority.
- After all positions are terminal for S3, seventeen to twenty accepted
  interpretations advance the run to an internal `READY_FOR_SYNTHESIS` stage;
  zero to sixteen advance the public run status to `PLEASE_RETRY`. A valid
  no-mention interpretation counts as accepted evidence.

### Deterministic execution

- Deterministic acquisition fixtures preserve representative Markdown answers,
  source metadata, search-used posture, model identity, and controlled failures
  without external access.
- Deterministic interpretation fixtures cover list, table, heading, paragraph,
  mention, no-mention, and relative-position structures and are validated by
  GEO-owned schemas and semantic invariants before acceptance.
- Failure fixtures can exhaust up to three positions while retaining a run that
  is ready for synthesis, exhaust four positions to produce `PLEASE_RETRY`, and
  interrupt processing between accepted stages to prove restart recovery.
- No deterministic adapter is allowed in a production environment.

### Operational reliability

- BullMQ workers use bounded concurrency, exponential backoff with jitter,
  retained failed-job evidence, explicit error handlers, stalled-job recovery,
  and graceful shutdown. Queue payloads carry stable identifiers only.
- Production Redis requires an approved persistence and high-availability plan,
  `noeviction`, reconnect behavior, memory and retention sizing, transport
  security, backup, and recovery evidence. Local Compose does not approve this
  production gate.
- Metrics include Outbox backlog and oldest age, queue waiting, active, stalled,
  and failed counts, run-stage duration, sample coverage, classified attempt
  failures, and reconciliation recoveries. Telemetry failure never changes
  business acceptance.
- Provider selection remains a versioned route-policy plus adapter registry.
  This earns a strategy/factory seam for later route replacement without
  requiring runtime code hot-swapping or speculative lazy loading in S3.

### Customer and contract boundary

The authenticated diagnosis purpose view may expose only the durable public run
status and concise processed, valid, and unavailable counts needed to show real
progress. It does not expose attempt counts, internal error codes, source lists,
queue state, prompts, trace identifiers, or deterministic-fixture controls.
Until S4, `READY_FOR_SYNTHESIS` remains customer-visible as evaluating and no
score or report is fabricated.

### S3 acceptance boundary

S3 is acceptable only when duplicate delivery, concurrent worker handling,
partial failure, telemetry failure, and process restart cannot duplicate an
accepted sample or lose retained evidence; a clean migration replay succeeds;
and deterministic 20/20, 17/20, and 16/20 runs reach the expected durable
boundary. Capacity, cost, and real-provider behavior are not claimed from these
fixtures.
