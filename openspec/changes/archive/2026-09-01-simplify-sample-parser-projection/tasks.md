# Tasks

## Evidence and design

- [x] Classify two real runs' Provider-successful parser rejections without
      exposing raw customer answers or credentials.
- [x] Separate metric-critical evidence from recoverable optional detail.
- [x] Verify current Qwen3.8 Flash low-reasoning support from official sources.
- [x] Confirm the existing model-to-domain projector is the correct repair seam.

## Implementation

- [x] Make evidence registration answer-aware and bounded.
- [x] Recover only literal target-form anchors and preserve hard mention/rank
      rejection.
- [x] Drop unsupported optional observations/brands, deduplicate brands, and
      normalize optional positions.
- [x] Reduce parser Prompt/output budgets and version the provider contract.
- [x] Set only the Qwen interpretation route to low reasoning effort.

## Verification

- [x] Add focused contract tests for every recovered and preserved-hard case.
- [x] Replay both runs' retained failed outputs and report recovery categories.
- [x] Run the parser, Provider-route, evaluation lifecycle, full tests, typecheck,
      build, framework validation, formatting, and diff checks.
- [x] Use a minimal real call only if protected replay cannot discriminate the
      remaining uncertainty.

## Reconciliation and exit

- [x] Update the current evaluation-evidence spec and architecture overview with
      accepted behavior and measured evidence.
- [ ] Run fixed-diff review, open the #32 PR after #28 integration, and record
      branch/Worktree exit state.

## Verification evidence

- Protected replay: 39 of 42 previously rejected normalized outputs now
  project; the remaining three lack any literal target form and remain rejected.
- Earliest-output replay: 互动派 would accept 20/20 on first interpretation;
  星巴克 would accept 19/20 on first interpretation and all 20 within 22 total
  attempts. Together the same forty samples fall from 77 to 42 attempts.
- Metric comparison: 互动派 remains zero open mentions. 星巴克 changes from six
  to seven only because the previously discarded output literally names the
  target and records position one.
- Parser-only real probe: four representative stored answers were accepted on
  their first low-reasoning Qwen call at approximately 10.5–25.2 seconds, about
  19.2 seconds average; no platform acquisition or report mutation occurred.
- Local verification: parser contract 16/16, Provider/route 21/21, evaluation
  lifecycle 18/18, full backend 22 files / 126 tests, typecheck, format, complete
  build, framework validator, Markdown links, and diff checks passed.
