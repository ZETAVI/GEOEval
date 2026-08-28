# Decision Brief: S5 Evaluation Continuity

## Outcome

Let a terminal customer leave and return to an evaluation safely, retry only the
unfinished work after a bounded failure, read prior completed reports, and
receive durable in-product completion or retry notices without exposing process
internals.

## Scope

- In: customer retry over the same official run, immutable report history,
  evaluation-completed and retry-required notifications, unread/read state, one
  notification center, and one shared authenticated SSE refresh hint.
- Out: full operations, administrator, or agent notification events; email, SMS,
  mobile push, notification deletion or subscription settings; report
  comparison or trends; real providers; production transport activation; and
  the separate S4 visual-polish follow-up.

## Decisions

| Decision | Choice | Rationale | Owner |
| --- | --- | --- | --- |
| Retry identity | Keep one official run and its twenty logical sample positions; each customer retry opens one new execution cycle | Preserves the official evaluation and evidence history without treating retry as a new report opportunity | Product owner and architecture owner |
| Retry work | Reuse every accepted answer and interpretation; retry acquisition only where no answer exists, retry parsing where an answer exists without interpretation, and retry only synthesis after synthesis exhaustion | Prevents unnecessary external work, conflicting evidence, and duplicated samples | Product owner |
| Cycle ownership repair | Logical samples belong to the run rather than one cycle; attempts and exhaustion records belong to both the logical sample and their execution cycle | The current first-cycle relation cannot safely reset attempt numbers or retain earlier exhaustion when S5 opens another cycle | Architecture owner |
| History ownership | Query existing immutable completed reports and their frozen definitions; do not create a history copy or comparison model | History is a read perspective over report owners, not another source of report truth | Architecture owner |
| Notification ownership | Add one Notification capability that owns durable recipient records; GEO commits completion or retry-required Outbox facts, and the notification consumer materializes each notice idempotently | Keeps business completion atomic and module ownership explicit while allowing eventual delivery | Architecture owner |
| Realtime boundary | Use one shared authenticated NestJS SSE stream as a refresh hint over durable notification reads; add no new broker or realtime library in S5 | Matches ADR 0001 and current scale; lost hints recover through normal reads | Architecture owner |
| Initial role scope | Implement only terminal-customer evaluation notifications while keeping the notification owner reusable for later role-specific event producers | Proves the capability end to end without prematurely implementing unrelated commercial workflows | Product owner |
| Cross-brand navigation | An evaluation notification names its brand; opening it selects that brand through the existing current-brand command and then opens diagnosis or the immutable historical report | Preserves the single global brand context instead of introducing a competing page-local brand | Product owner |

## Acceptance Boundaries

- Concurrent or repeated retry commands create at most one new active cycle and
  never overwrite accepted evidence, accepted interpretations, or prior attempts.
- A sample-stage retry schedules only the missing stage; a synthesis retry never
  resamples or reparses.
- Current and historical report queries remain account and brand scoped; history
  is newest first, read-only, and has no comparison or deletion actions.
- Report acceptance or terminal retry state eventually creates exactly one
  durable notification per recipient and source event; queue, SSE, or telemetry
  duplication cannot create another notice.
- Missing an SSE hint or reconnecting later still shows every durable notice and
  its correct read state.
- Notification content contains a short business result and target identity,
  not answers, prompts, sources, failures, traces, or internal guidance.

## Assumptions and Open Questions

- Assumption: the initial notification volume supports one app-shell SSE stream
  whose backend checks durable notification state at a bounded interval.
- Assumption: the separate frontend-design agent may refine presentation but
  does not change retry, history, notification, or current-brand semantics.
- Open: production proxy buffering and connection behavior must be verified in
  a production-like environment before release; it does not block deterministic
  S5 implementation.
- Open: notification retention remains an operating rule for a later gate; S5
  provides no customer deletion action.

## Confirmation and Next Gate

- Confirmation: the product owner confirmed the S5 outcome, scope, retry
  identity, data-ownership direction, history ownership, notification boundary,
  initial role scope, and continued architecture refinement on 2026-08-27.
- Confirmation: the product owner confirmed the reviewed exact migration,
  REST/OpenAPI, Outbox, notification, SSE, Web, rollback, and verification
  preflight on 2026-08-27.
- Implementation status: the bounded deterministic S5 slice is implemented,
  locally verified, and reconciled into the current evaluation-evidence,
  evaluation-report, notification, and architecture owners on 2026-08-27.
- Confirmation: the product owner accepted the locally verified S5 journey and
  evidence on 2026-08-28; the commit containing this confirmation is the
  verified S4-S5 branch checkpoint.
- Next action: keep destination-branch integration as an explicit branch-exit
  decision, or enter real-provider S6 through a separately approved change.
- Confirmation required before: branch integration, production transport
  activation, real providers, or any scope beyond deterministic S5.
