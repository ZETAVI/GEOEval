# Tasks

## Alignment and design

- [x] Establish Issue #112 with real customer evidence, scope and non-goals.
- [x] Fix the owner boundary: parser owns per-answer query role, resolver owns
      identity, program owns metrics, composer owns expression.
- [x] Select sample-level report provenance and retain original answers as the
      canonical customer evidence.
- [x] Complete architecture review before implementation.

## Implementation

- [x] Add query role to open parser model output and Prompt; keep directed output
      unchanged.
- [x] Project candidate/reference/inapplicable roles into the current canonical
      sample semantic without a migration.
- [x] Replace composition theme point pairs with sample references and keep
      local validation.
- [x] Sort synthesis samples by question/platform ordinals before reference
      assignment.
- [x] Update focused tests and deterministic runtime fixtures.

## Verification and reconciliation

- [x] Run focused parser, metrics, composition and process integration tests.
- [x] Run typecheck, backend build and project-framework validation.
- [x] Replay retained 花悦庭 and 互动派 evidence on the new contracts; after
      bounded enum normalization, the three query-role cases passed 3/3 and
      composition passed 2/2.
- [x] Run one authorized real four-question/five-platform evaluation: 42/42
      calls, 20/20 accepted samples, one resolution and one report.
- [x] Review the fixed diff and architecture boundary.
- [x] Reconcile the evaluation-report spec, product glossary and active Change.
- [x] Open final PR #115 with `Closes #112`, evidence and explicit Follow-up
      Issues #113 and #114 for corrective retry and Worker lock renewal.
