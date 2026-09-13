# Design: M4 Parent Contract and Integration Gate

## Design role

This is an architectural parent contract, not a shared implementation module.
It fixes ownership, dependency direction and final evidence while leaving each
Schema, Prompt, task graph, page and telemetry adapter in its child Change.
Creating a parent service, generic workflow engine, second attempt store or
cross-module database access is outside this design.

## Affected slice

```mermaid
flowchart LR
  I40["#40 Brand store context - done"] --> I26["#26 Query Generator - done"]
  I32["#32 Sample parser projection"] --> I42A["#42 architecture checkpoint"]
  I42A --> I41["#41 Synthesis copy and brand grouping"]
  I41 --> I42B["#42 runtime, budget and progress"]
  I42B --> I43["#43 Customer waiting experience"]
  I44["#44 Local/test Langfuse diagnostics"] --> G["#39 Integration Gate"]
  I26 --> G
  I32 --> G
  I41 --> G
  I42B --> G
  I43 --> G
```

The initial native relationships were recorded on 2026-09-02. The 2026-09-04
execution reconciliation keeps only dependencies that block the next Issue-level
action:

- #39 has native Sub-Issues #26, #32 and #40–#44;
- #40 and #26 are complete, so their stale native blocker is removed;
- #32 blocks #42 activation;
- #41 is not a native blocker of #42 because its accepted task interface depends
  on #42's first architecture checkpoint;
- #42 blocks #43;
- #44 is complete and has no child dependency.

Parent/Sub-Issue represents one M4 outcome. Native Dependency represents the
next Issue-level block, not every phase exchange inside an open architectural
Issue. #42 therefore remains one Issue with two independently reviewable PR
slices rather than creating another Issue or two opposing blockers.

## Cross-task interface registry

| Producer             | Stable handoff                                                                                                                                                                                                                 | Consumer                                                      | Producer owns                                                                                                                 | Must not cross the seam                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #40 Brand Knowledge  | Versioned `EvaluationPurposeBrandView` and immutable Evaluation Brand Snapshot v3 containing validated store-location semantics, chosen Query locality, main product/service and ordered characteristics; semantic fingerprint | #26 and existing GEO definition preparation                   | Editable Brand facts, external location adapter, validation, fingerprint, projection, migration and v1/v2 decoder             | Query cannot call AMap, read Brand tables/reference JSON, reinterpret locality or rewrite old snapshots                                                                                   |
| #26 Query Generator  | One accepted immutable ordered Definition with the existing four question kinds and generator identity                                                                                                                         | Official evaluation start and the 20 logical sample positions | Prompt/model contract, one durable preparation per fingerprint, retry/fallback and final question content                     | No extra official questions, refresh on unchanged fingerprint, customer editing, map access or fact research                                                                              |
| #32 Sample Parser    | Completed exact-anchor baseline in PR #35                                                                                                                                                                                      | #42 runtime migration input                                   | Historical current contract until #42 integrates the accepted replacement                                                     | No reopening #32 or rewriting historical interpretations                                                                                                                                  |
| #41 Report semantics | Customer-safe performance/perception/themes/directions and valid brand grouping in the actual report path                                                                                                                      | #39 Gate                                                      | Semantic acceptance over #42's integrated name-resolution and composition results                                             | No separate runtime implementation, deterministic metric rewrite, global brand master, default web research or raw internal enum/ID/field exposure                                        |
| #42 Performance      | Purpose-level task graph plus authoritative stage timing/budget evidence and a customer-safe progress projection with per-platform expected/acquired/analyzed/available counts                                                 | #43 waiting UI and #39 Gate                                   | Scheduling/orchestration at existing owner seams, route budget, limiter, timeout, retry, idempotency and performance evidence | Queue or telemetry cannot own business truth; parallelism cannot issue concurrent duplicate Provider requests or duplicate accepted evidence or reports; no speculative workflow platform |
| #43 Waiting UI       | Responsive presentation over generated REST/OpenAPI progress types and existing notification reads                                                                                                                             | Terminal customer                                             | Per-platform status display, truthful stage-local easing, long-wait content, responsive/accessibility behavior                | No scheduling policy, fabricated platform completion, Provider/retry/queue detail, new WebSocket authority or report-page redesign                                                        |
| #44 AI telemetry     | Explicit local/test diagnostic projection for versioned task input, normalized output/failure and correlation; production metadata-only default                                                                                | Human debugging only                                          | Environment gate, allowlist/mask, non-blocking exporter behavior and telemetry tests                                          | Langfuse cannot drive retry, report, evidence, progress or history; no credentials/raw envelopes/unneeded answers; no production content without a new approval                           |

## Ownership and dependency direction

- Brand Knowledge remains the only owner of editable and externally validated
  store facts. GEO Intelligence freezes only the Brand-owned projection.
- GEO Intelligence remains the owner of Definition, Run, samples, accepted
  semantics, deterministic metrics, synthesis acceptance and report history.
- AI Execution owns append-oriented attempts and provider-neutral execution
  envelopes. It does not accept business evidence or report truth.
- Background Work/BullMQ owns delivery and resumption only. #42 may partition
  purpose work but may not introduce a second lifecycle authority.
- Notification remains the durable customer-result inbox. #43 consumes normal
  durable reads and the existing refresh hint rather than creating realtime truth.
- Langfuse remains optional observability. Content capture is an environment-
  gated projection, not a copy of the business evidence model.

## Compatibility, failure and rollback boundary

| Reachable boundary                                                             | Owner     | Required protection before integration                                                                                                                                 |
| ------------------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Location provider unavailable, ambiguous or forged client result               | #40       | Customer-actionable fallback, server validation, source identity and no partial Brand write                                                                            |
| Snapshot v3 activation conflicts with v1/v2 history or fingerprint opportunity | #40       | Central decoder, migration rehearsal, unchanged historical JSON and no representation-created evaluation allowance                                                     |
| Query preparation duplicates paid calls or yields incomplete Definition        | #26       | Durable idempotency, bounded retry/fallback, no startable partial question set                                                                                         |
| Parser returns unsupported meaning or cannot map an exact highlight            | #42       | Reject unsupported focus/order/content semantics; preserve the immutable answer and use the unannotated display fallback when only exact visual mapping is unavailable |
| Synthesis leaks internals or misses obvious name grouping                      | #41       | Customer-copy contract, evidence/reference checks, obvious grouping replay and uncertain-name independence                                                             |
| Parallel tasks duplicate work, amplify rate limits or change metrics           | #42       | Purpose budgets, concurrency/limiter, business idempotency, timing/cost evidence and same-report semantic comparison                                                   |
| Waiting page gets ahead of durable work                                        | #42 + #43 | Server-derived counts/stage; easing cannot cross the current stage or reach 100% before completion                                                                     |
| Telemetry content or exporter crosses authority/privacy boundary               | #44       | Explicit local/test mode, credential-safe mask, production metadata-only test and exporter-failure isolation                                                           |

Each child Change owns its own migration and application rollback. This parent
PR changes documentation only and can be reverted without data or runtime
effects. The final Gate must reject integration when a child cannot state a
safe rollback or compatible forward path.

## Integration sequence

1. **Parent and completed producers:** parent approval completed on 2026-09-02;
   #40, #26 and #44 are integrated and reconciled on protected `main`.
2. **Parser stabilization:** #32 is rebuilt from current `main` using only its
   owner-local work, then proves strict metric evidence, recoverable optional
   detail and customer-readable card copy as one parser acceptance boundary.
3. **#42 architecture checkpoint:** after #32 is stable, #42 compares the current
   single synthesis, semantic-task split and analysis-then-writing alternatives.
   A Partial PR records the selected interface, budgets and rollback boundary;
   it does not claim runtime improvement or close #42.
4. **#42 runtime and #41 semantic acceptance:** #42 migrates the accepted
   semantics into current Parser, aggregate-analysis, report and progress
   owners. #41 reviews the actual integrated report output rather than owning a
   competing implementation or blocking the task topology.
5. **#42 runtime completion:** the integrated path proves recovery,
   idempotency, timing/budget evidence and the durable customer-safe progress
   projection.
6. **Waiting activation:** #43 starts its write only after #42's public progress
   contract is stable, then verifies the same generated contract across desktop,
   narrow viewport, refresh, leave/return, multi-brand and partial-unavailable
   states.
7. **Final parent Gate:** every child PR is merged through protected `main`.
   Separately authorized representative-store runs prove the Provider,
   interpretation, grouping, deterministic metric, composition, recovery and
   timing path. The fixed current revision then proves the integrated waiting,
   notification and report journey without spending another equivalent
   Provider run. Parent reconciliation and archival follow only after both
   evidence sets agree.

PR #45 remains a session-scoped Partial PR with the ordinary reference
`Part of #39 — does not close`; it is not the native closing link for the parent.
Only after every final Gate row passes may the final acceptance PR use bare
`Closes #39`, creating GitHub's native Linked PR/closing relationship for the
complete parent outcome.

## Final Integration Gate

The Gate is a review result over the integrated revision, not an extra feature
PR. It reports `ready`, `ready with follow-up`, or `not ready` and covers all
axes below.

| Gate claim                                                            | Smallest discriminating evidence                                                                                                                      | Blocking result                                                                                              |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Store context and four questions express the approved product meaning | Snapshot v3 contract/migration evidence plus product review of the exact four questions from one valid store                                          | Missing/ambiguous locality or main product/service; mechanical or off-category open question                 |
| History and evaluation opportunity remain truthful                    | v1/v2 decoder fixtures, migration replay and immutable old Definition/Run/report checks                                                               | Rewritten historical JSON/report or a representation-only new opportunity                                    |
| Per-sample and synthesis customer copy is safe                        | Protected replay for `}}}`, internal enum/UUID/field leakage and obvious/uncertain brand-name cases                                                   | Structural fragment or internal identifier reaches the public report; fuzzy grouping merges uncertain brands |
| Metrics and evidence semantics are unchanged                          | Before/after deterministic report reproduction plus 4×5 comparison over retained evidence                                                             | Agent/queue changes counts, index, rank, 17/20 meaning or accepted evidence                                  |
| Performance change is material and explainable                        | Stage baseline and selected-budget table; same-store controlled run showing queue wait, Provider, projection, retry and assembly timing               | No measured improvement, unexplained retry amplification, or missing cost/concurrency boundary               |
| Waiting progress is truthful and usable                               | API/contract tests plus browser inspection for desktop/narrow, refresh, leave/return, multi-brand, partial unavailable, completion and terminal retry | Fabricated platform completion, leaked internal retry/Provider detail, or 100% before durable completion     |
| Local diagnostics work without production content capture             | Unit/integration evidence for metadata-only default, explicit local diagnostic, credential mask and exporter failure                                  | Production mode exports content by default, secrets leak, or telemetry affects business outcome              |
| Coordination and current truth are reconciled                         | All child Issues/PRs, native dependencies, Required Checks, fixed-diff reviews, owner-local specs and evolution markers agree on the final revision   | Stale base, unresolved review, accepted design only in a Change/PR, or unowned residual work                 |

The controlled real 4×5 row passed under separate product-owner authorization.
The retained evidence is summarized in
[#42's validation summary](../2026-09-13-optimize-evaluation-analysis-task-graph/research/validation-summary.md):
the fresh Taotaoju path completed in `238.644s`, and the formal fresh Jinpeng
Worker path completed in `206.227s` with 20/20 acquisition, 20/20 parsing, one
accepted resolution and one accepted composition. Raw inputs and outputs remain
in the approved private diagnostic boundary rather than this repository.

The final Gate did not repeat those paid calls because the backend runtime,
model routes and Prompt owners did not change between PR #90's accepted revision
and `main@1269b69`; PR #91 changed only the Web progress consumer and reconciled
specification, while PR #94 corrected an unrelated test assertion without
runtime changes. The Gate instead ran the API, Web and deterministic Worker from
`befd0c0` over an isolated database and verified active five-platform progress,
refresh, leave-and-return, completion notification and final report projection.

## Current design impact and stopping condition

- Parent Propose documentation impact: `add` active Change; `update` transcript
  source inventory; current specs remain unchanged.
- Child acceptance impact: each child reconciles its owner-local current spec,
  executable contract and architecture overview as applicable.
- Parent completion result: every Integration Gate row passed for
  `main@1269b69`; current specifications already own the accepted behavior; this
  Change is ready to archive in the only final PR that uses bare `Closes #39`.
  PR merge, Project `Done`, branch removal and worktree exit are post-integration
  control-plane facts recorded on Issue #39 rather than predicted in this file.
