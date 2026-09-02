# Change: Enable Controlled Local Langfuse Diagnostic Content

- Status: Live Langfuse verified in Draft PR #47; ready for review
- Class: Standard maintenance change
- Owner: GitHub Issue #44 under M4 parent #39

## Why

Langfuse currently receives Generation observations with model, route, status,
latency, usage, and correlation metadata, but the adapter never sets
observation `input` or `output`. The global mask also treats every input,
output, prompt, answer, content, or raw key as content to remove. The resulting
traces cannot explain the Prompt/task sent to an evaluation Agent or the
normalized result returned by it, even in a controlled local diagnostic run.

The current object-recursive mask test does not exercise the actual Langfuse
5.11.0 boundary: the span processor applies the hook to already serialized JSON
strings. A local content mode therefore also needs a serialized-payload-aware
mask so the explicit diagnostic projection does not weaken credential or raw
Provider evidence protection.

## Scope

- In: one explicit telemetry content mode; metadata-only default and production
  enforcement; versioned local/test input and output projections; serialized
  JSON-aware masking; environment and optional release correlation; focused
  tests for metadata-only, local diagnostic, mask, and exporter failure; and
  current evaluation-evidence reconciliation.
- Out: real Provider calls, production content transfer or retention approval,
  customer-data upload, Prompt management, automatic evaluation, business
  Prompt or Schema changes, Worker scheduling changes, Provider envelope or
  reasoning-chain export, report ownership, and deployment.

## Impact

AI Execution remains the only owner of attempt telemetry. Runtime Config owns
whether Langfuse is disabled, metadata-only, or explicitly local-diagnostic;
the Langfuse adapter owns the narrow input/output projection; and the
OpenTelemetry runtime owns final export filtering, masking, release tagging,
and non-blocking shutdown. GEO Intelligence, Provider adapters, persisted
Attempt envelopes, retries, and customer-visible contracts do not change.

The implementation extends only the private telemetry configuration and
adapter construction boundary. It adds no persistent data, public API, queue
state, Provider request, or second business truth source.

## Control State

- Documentation: add this proposed delta, implementation design, tasks, and
  Langfuse v5 source brief; before Draft PR completion, update the current
  `openspec/specs/evaluation-evidence/spec.md`. That current spec is the durable
  owner; this change folder remains temporary and has no Evolution marker.
- Workspace: branch `codex/issue-44-langfuse-diagnostic-content`, based on
  protected `origin/main@af72ba5`, owned by Issue #44, merging only through a
  Draft PR to `main`. Exit requires the four named boundary tests, static/build
  verification, current-spec reconciliation, pushed commits, a Draft PR, and
  an Issue update. Merge, production activation, and deployment are excluded.

## Approval Boundary

Issue #44 and the delegated task authorize local implementation, fictional
test fixtures, project-local dependencies, a loopback OTLP fixture, and one
credentialed Langfuse Cloud smoke with fictional content. They do not authorize
real Provider calls, real customer material, production content capture,
production configuration changes, deployment, or merge.

## Reconciliation State

- Current truth: runtime configuration, the telemetry adapter/mask, focused
  tests, and `openspec/specs/evaluation-evidence/spec.md` own the accepted
  behavior. This active Change no longer contains the only copy of a stable
  design claim.
- Review: fixed-diff review is `ready`; no remaining intent, engineering, or
  evidence finding requires a code change.
- Release: `release:skip`; local diagnostic capability is not enabled or
  deployed by this PR, and production remains metadata-only.
- Handoff: no separate file; Issue #44, this branch, and the Draft PR are
  sufficient continuation state.
- Exit: locally and live-Langfuse verified, published for PR #47 review.
  Archive, Issue close, Project Done, branch deletion, merge, and deployment
  remain later authorized actions.
