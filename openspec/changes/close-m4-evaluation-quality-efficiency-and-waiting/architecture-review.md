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

Overall result: `ready for Draft PR review`; product meaning and the parent
integration contract remain unapproved until the product owner explicitly
accepts the Propose package.
