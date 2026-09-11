# Architecture Review: Controlled Evaluation Report Analysis

- Review base: `origin/main@adb0df9`
- Owning Issue: #42
- Result: `ready with follow-up` for a Partial controlled-candidate merge;
  `not ready` for runtime activation or Issue closure

## Intent

The clean diff retains only the owner-approved current candidate and its minimum
evidence. It removes the superseded two-task architecture, model matrices,
intermediate Prompt assets, alternate parsers, stale tests and chronological
research diary. The PR remains Partial and does not claim formal runtime work.

## Engineering

Responsibilities are cohesive:

- the Prompt owns semantic task and workflow;
- Zod schemas own output fields, types and bounds;
- GEO Intelligence-owned program logic restores source records, computes
  statistics and validates references/invariants;
- AI Execution-owned attempts remain the external-call evidence boundary.

The name-level interface is smaller than record/group-ID alternatives and keeps
model input task-relevant. Exact reversible mapping stays internal. No new
public contract, datastore, queue, migration, runtime dependency direction or
production side effect is introduced.

## Evidence and residuals

Focused parser/report and Markdown-cleaning tests, backend typecheck/build,
repository formatting, framework/link validation and diff hygiene are required
on the clean base. The real42-call run proves the controlled route and semantic
shape, not formal Worker recovery or frontend delivery.

Two explicit residuals remain:

1. two unrelated entities with the same exact parsed name cannot be separated;
2. separately named parent-brand lines need a product counting decision if they
   materially affect customer statistics.

Neither justifies a larger interface in this Partial.

## Verdict

`ready with follow-up` once the clean branch passes checks against current main.
PR #62 may merge as `Part of #42 — does not close`. Runtime/spec/frontend
adaptation remains the next Issue #42 boundary and requires a new architecture
and verification checkpoint before activation.
