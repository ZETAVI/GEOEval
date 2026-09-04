# Change: Optimize Evaluation Analysis Task Graph

- Status: Proposed; Phase A architecture approval pending
- Class: Architectural
- Owning Issue: [#42](https://github.com/ZETAVI/GEOEval/issues/42)
- Parent result: [#39](https://github.com/ZETAVI/GEOEval/issues/39)
- Current PR boundary: architecture Partial only; no runtime implementation

## Why

One retained 20/20 run took about twelve minutes. Two Qwen synthesis calls each
reached the 180-second timeout before a Hy3 fallback completed in about 103
seconds. Subsequent #41 controlled probes showed a second problem: one broad
synthesis request could produce readable JSON while still omitting required
brand decisions, citing absent observations, or adding unsupported tactics.

More Prompt text, a larger global concurrency number, another API key, or a
BullMQ flow would not by itself fix both semantic overload and slow recovery.
The current single synthesis attempt identity also cannot retain two independent
accepted semantic tasks or retry only the failed one.

## Outcome

Keep one evaluation lifecycle and one final immutable synthesis, but replace the
single overloaded model request with two bounded semantic tasks that can execute
in parallel:

1. **Brand relationship:** classify every compact other-brand candidate into an
   evidence-supported group or an explicit independent decision.
2. **Report narrative:** form the current-brand assessment, perception, themes,
   customer directions and protected writing guidance from deterministic facts
   and compact accepted evidence, without deciding other-brand identity.

GEO Intelligence persists each accepted component, deterministically assembles
the existing canonical synthesis only after both are available, and preserves
the existing report, metric, history and retry meaning.

## Scope

### Phase A — this Partial

- Compare one broad synthesis, parallel semantic tasks, and sequential
  analysis-then-writing.
- Fix the component interfaces, ownership, persistence, idempotency, retry,
  timing, cost, migration and rollback boundaries.
- Decide whether current BullMQ queues, concurrency and limiter capabilities are
  sufficient without making Redis a workflow authority.
- Define the customer-safe progress facts later consumed by #43.

### Phase B — after #41 acceptance

- Implement the selected task graph through existing PostgreSQL Outbox and
  Product Worker seams.
- Add additive persistence and task-local attempt identities.
- Measure queue wait, Provider, projection, retry and assembly time.
- Run the separately authorized same-store controlled comparison.

## Non-goals

- No new workflow framework, microservice, permanent Integration Branch, Critic
  Agent, third final model call, brand master, default web research, extra API
  account, billing activation, production deployment or customer-data transfer.
- No change to four questions, five platforms, 17/20 readiness, recommendation
  index, accepted sample evidence, report history or Notification authority.
- Phase A does not edit #41 Prompt/model contracts or #43 presentation.

## Initial engineering budget

These are implementation ceilings to test, not a customer SLA:

- both tasks are scheduled from one PostgreSQL transition and may overlap;
- initial route candidate: Qwen low reasoning for brand relationship and Qwen
  medium reasoning for report narrative;
- no more than two explicit Qwen attempts per task in the first split Gate;
- initial timeout candidates are 90 seconds for brand relationship and 120
  seconds for report narrative;
- at most four Provider requests per synthesis cycle, with no SDK or BullMQ
  delivery retry creating hidden model calls;
- Hy3 remains outside the first split Gate while its current contract and account
  entitlement are unverified; enabling billing or using it requires a separate
  decision;
- the final same-store comparison must beat the retained twelve-minute total and
  explain any remaining retry or queue cost. Exact customer timing remains open
  until that evidence exists.

## Impact and recovery

The implementation is expected to add a task kind to synthesis attempts and one
GEO-owned accepted-component table. Existing single-synthesis rows and public
reports remain readable. The attempt uniqueness change requires a staged
migration: first add/backfill the legacy task kind while retaining the old key,
then deploy schema-aware code before the split path removes the old key. Runtime
rollback uses the new code's legacy mode; a pre-migration binary is not redeployed
after parallel task attempts can exist. Accepted reports never require data
rollback.

The current Phase A PR changes proposed design only. It authorizes no migration,
Provider call, runtime code, production operation or merge of PR #48.
