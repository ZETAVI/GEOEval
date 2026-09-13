# Architecture and Fixed-Diff Review: M4 Parent Change

- Review base: `main@af72ba5f261925525b897c9124c28f5fb574c111`
- Reviewed proposal diff SHA-256:
  `8df35ec2698b24cc761e260fee6f62fbd97bdb412ae64ac7d94d45077b7f9dad`
- Review scope: transcript archive/inventory, proposal, decision brief, parent
  design, three delta specifications and tasks; this file records the result and
  is not part of the hashed proposal diff
- Review axes: product intent, architecture/engineering, evidence and continuity
- Review type: pre-implementation `Propose → Approve` gate

## Review contract

The parent Change must make #39 reviewable without becoming another business or
workflow owner. It must preserve accepted S1–S6 metrics, history, evidence and
notification meaning; route every implementation decision to #26, #32 or
#40–#44; keep transcript claims non-authoritative; and require separate authority
for real Provider calls, production changes and production content telemetry.

## Findings resolved before the fixed result

1. The initial status wording implied that this parent paused child Issues that
   were already `In Progress`. It now states that the branch neither pauses nor
   broadens separately recorded child authorization.
2. The first interface table required a “versioned” internal task graph without
   a demonstrated consumer or rollback need. The unsupported constraint was
   removed; #42 still owns an explicit task graph and measured budgets.
3. The first parallel-analysis scenario prohibited duplicate Attempts, although
   a bounded timeout/fallback legitimately creates a later numbered Attempt. It
   now prohibits concurrent duplicate Provider requests and duplicate accepted
   business truth.
4. Task headings used P0/P1/P2 as stage numbers and could conflict with live
   Project Priority. They now use explicit Stage labels.

## Intent review

`ready` for product-owner review.

- D1–D9 match the accepted decisions in Issue #39 and do not promote the
  transcript's proposed removal of the industry question, three/five-minute
  targets, multiple API accounts or other brainstorming into requirements.
- The delta keeps one brand-directed, one industry and two characteristic
  questions; 70/30 metrics, 17/20 readiness, five platforms, no-mention meaning,
  immutable history and protected internal detail remain unchanged.
- #13 remains the report-visual owner. No child code, external call, deployment,
  data migration, API purchase or merge is claimed.

## Architecture and engineering review

`ready` for product-owner review.

- Brand Knowledge is the single editable/store-fact and external-location owner;
  Query receives only a frozen projection. Parser and Synthesis keep per-sample
  versus cross-sample ownership distinct. Performance works through existing
  GEO/AI Execution/Background Work seams. Waiting UI and Langfuse remain read-
  side consumers rather than business authorities.
- Native GitHub dependencies are represented exactly: #40 → #26, #32/#41 →
  #42, and #42 → #43; #44 remains independent. The design does not manufacture
  blockers from ordinary contract consumption.
- History, idempotency, late-result, privacy, telemetry-failure, progress-truth
  and rollback consequences are assigned to one child owner and one Gate row.
- No ADR or durable current-design document is warranted at Propose. Stable
  accepted child boundaries must reconcile into existing executable/current
  owners before #39 can close.

No unresolved `must-fix` or `should-fix` finding remains.

## Evidence and continuity review

`ready for Draft PR review` for the documentation-only Propose boundary.

- Both archived transcripts are byte-identical to the supplied Downloads files:
  1,478 + 209 lines and 39,595 + 5,183 bytes, with the two SHA-256 values in the
  source inventory.
- `python3 scripts/validate_project_framework.py` passes, including all local
  Markdown links and active-Change lifecycle checks.
- `git diff --cached --check` passes for maintained Markdown after excluding the
  immutable transcript files; their source whitespace is intentionally preserved
  and is verified by `cmp` and SHA-256 instead.
- Runtime tests, typecheck, build, browser flows, migrations and Provider calls
  are not run because no runtime/current behavior changed. They remain child or
  final-Integration-Gate evidence and are not counted as passes here.

## Residual risk and result

- AMap interface, quota, authorization and fallback evidence is not yet
  available; #40 owns that pre-implementation source/controlled-validation gate.
- Exact performance budgets and any customer SLA remain open in #42.
- Transcript speaker ownership is unconfirmed; D1–D9 therefore rely on Issue
  #39 rather than transcript attribution.
- Live Issue/PR/dependency state can drift and must be reread at each activation
  and the final Gate.

Overall pre-approval result: `ready for Draft PR review`.

## Product-owner disposition

The product owner approved D1–D9, the preserved meaning, the interface registry,
the native dependency graph and the Integration Gate on 2026-09-02. The approval
is recorded in
[Issue #39](https://github.com/ZETAVI/GEOEval/issues/39#issuecomment-5505659279).

Disposition: `ready for Partial PR integration review`. PR #45 remains limited
to this session's research archive and parent contract. Approval does not extend
to PR merge, child implementation outside an owning Issue, real Provider calls,
production deployment, customer-data migration, API purchase or production
content telemetry.

## Latest-head fixed-diff integration review

- Review base: `main@af72ba5f261925525b897c9124c28f5fb574c111`
- Reviewed payload revision: `de2878a5c7bcbebd5b16af3b072e2ea1a6cb0e67`
- Scope: the same eleven transcript/archive and parent-Change files; no child
  implementation or overlap with PR #28, #35, or #46–#48
- Live PR state at review: Ready, CLEAN, MERGEABLE, both Required Checks passed,
  no requested review, and no `closingIssuesReferences`

### Intent

`ready`. The diff remains limited to Issue #39's approved parent contract and
verbatim research archive. It neither claims a child outcome nor changes the
four-question, five-platform, score, history, Provider, notification, production,
or external-cost boundaries.

### Engineering

`ready`. The Change keeps one owner for every child interface, records the live
native dependency graph, and makes PR #45 an ordinary non-closing Partial
reference. Only the future final acceptance PR may create the native closing
relationship after all Integration Gate rows pass.

### Evidence and continuity

`ready for integration decision`. Transcript `cmp` and SHA-256 checks, framework
and Markdown-link validation, maintained-document diff checks, and both PR
Required Checks pass. Product approval and the current Issue/Project pointers are
recorded. Copilot's only COMMENTED review was unavailable because of quota and
was not a requested review or a material finding.

No unresolved `must-fix` or `should-fix` finding remains. Merging this Partial
proposal would establish the approved active parent Change on `main`; it would
not complete, reconcile, archive, or close Issue #39.

## 2026-09-04 execution realignment review

The integrated #40, #26 and #44 outcomes invalidate the old live-status text,
and #41's controlled semantic failure invalidates the assumption that #41 can
finish before #42 chooses a task boundary. Keeping `#41 -> #42` as a native
blocker while describing #41 as waiting for #42 creates an actionable cycle.

The smallest correction is `ready`:

- keep #41 and #42 as the existing owners; do not create another Issue or
  orchestration module merely to express phase order;
- remove #41 as a native blocker of #42 and remove #41's unmatched `blocked`
  label;
- keep #32 as the one activation blocker for #42 and keep #42 blocking #43;
- use a #42 Partial architecture PR, then #41 acceptance, then #42 runtime
  completion to represent the phase exchange with reviewable revisions;
- preserve #32 per-sample, #41 cross-sample meaning, #42 orchestration and #43
  presentation as separate capability owners.

This changes coordination only. It does not approve a specific task graph,
Provider call, production action or customer-data boundary. Runtime architecture
still requires its own fixed design and owner approval in #42.

## 2026-09-13 final Integration Gate review

- Fixed integrated revision: `main@1269b692b432f996d4f80b49ec45783422134a60`
- Result: `ready`
- Scope: accepted M4 producer/consumer boundaries, real Provider evidence,
  current runtime contracts, customer progress/report journey and final
  control-plane reconciliation

### Intent

`ready`. The integrated outcome keeps four questions over five platforms,
deterministic metrics, 17/20 readiness, immutable history and complete original
answers. Precision line/character anchors are not a sample-success requirement;
optional visual highlighting remains a non-blocking enhancement. The report and
waiting experience use customer language and do not expose internal IDs,
models, retries, queues or traces.

### Architecture and engineering

`ready`. Brand, Definition, evidence, AI Attempt, background delivery,
deterministic statistic, report, notification and Web presentation authority
remain in their existing owners. The selected Parser → name resolution →
deterministic restoration → report composition flow does not create another
runtime owner. PR #89 is the only concurrent open PR and has no M4 file overlap.

### Evidence and continuity

`ready`. PRs #90, #91 and test-only repair #94 passed both Required Checks. The authorized real 4×5
evidence proves the selected backend path, recovery and 3–5 minute budget. A
fresh isolated browser run on `befd0c0` proved five platform rows, refresh,
leave-and-return, durable completion notification and a 20/20 final report. The
only subsequent `main` change is #94's Media Supply test assertion. Focused
Parser, analysis, document, provider-adapter and Web progress tests pass. The
framework validator also passes; final PR CI remains the last mechanical check
before integration.

No unresolved `must-fix` or `should-fix` finding remains. A `pg@8` concurrent-
query deprecation warning appeared during local API/Worker execution but caused
no failed work or customer-visible behavior; it is a non-blocking dependency
maintenance observation, not an M4 acceptance exception. Production deployment,
capacity and production content telemetry remain separately authorized work.
