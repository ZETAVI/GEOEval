# Architecture Review: Evaluation Analysis Experiments

- Baseline: `main@ddadf77`; supersedes the review at `537895b`
- Result: `ready with follow-up` for experimental preparation;
  `not ready` for runtime topology selection or activation

## Corrected findings

1. **Must-fix / evidence:** a failed Prompt was treated as proof against one-call
   topology. Alternatives now remain candidates until matched evidence exists.
2. **Must-fix / context:** #48 compression drops source spans and adjacent
   brand context. Test adequate evidence before judging task capacity.
3. **Must-fix / delivery:** detached semantic probes cannot close #41 before
   the new contracts are connected to the actual report path.
4. **Should-fix / progress:** terminal unavailability differs from successful analysis.
5. **Should-fix / continuity:** parent status, compatibility and characteristic
   ordering must follow merged child decisions.

## Preserved boundaries and pending evidence

Sampling remains natural measurement. GEO owns accepted evidence and metrics.
Experimental code is not wired to application startup and writes no business
records. Real calls require a frozen request manifest and bounded authority.
Raw generation quality and post-projection usability are reviewed separately.

Runtime tables, queues, concurrency, retries and migrations remain conditional.
No new workflow platform or critic is justified. Offline checks cannot establish
model quality; real comparison, holdouts, integration and browser acceptance
remain pending. This review is not approval for a runtime merge.

## Fixed experimental checkpoint

- Reviewed implementation: `fe59cab` against `main@ddadf77`.
- Intent: Prompt-only Parser experiment, parent reconciliation and unselected
  topology match the owner feedback; runtime/current specs stay unchanged.
- Engineering: existing fixture/executor reuse; fixed Qwen interpretation scope;
  request-content confirmation before adapter execution; no application import,
  business persistence, acquisition or fallback path.
- Evidence: 2 files / 7 focused tests, Backend typecheck/build, Prisma generation,
  format, framework/Markdown links, diff checks and credential-free plan passed.
  An initial discriminated-union type error was corrected before this revision.
- Not run: real Provider calls, full database suite, browser, migrations and
  whole-workspace build; no runtime/UI/database boundary changed.
- Verdict: `ready with follow-up` for the Partial experimental checkpoint, not
  for a claim of improved model quality. Retain this worktree; do not merge or
  activate a candidate before its relevant evidence and approval.

## Evidence-first candidate checkpoint

- Reviewed implementation: `4f2ebc9` against `93b18e2`.
- Intent: follows the observed P0/P1 missing-proof failure without claiming a
  confirmed LLM root cause or changing current Parser acceptance.
- Engineering: open-question-only experimental boundary; current field schemas
  reused, deterministic shape translation, unchanged final projector. Mandatory
  proof applies only to a mentioned target; unmentioned results remain valid.
- Remaining risk: a model can still omit competitors, invent quote content or
  choose false absence. Nested object/null Schema support on the actual route
  and semantic quality need real evidence. Strict Schema cannot prove these.
- Verification: 3 files / 12 focused tests, Backend typecheck/build, format,
  framework links and diff hygiene passed. No application coordinator imports
  the candidate. Current specs, runtime Prompt and database schema are unchanged.
- Verdict: `ready with follow-up` for controlled testing, not runtime activation.
  Real acquired-answer lineage is requested separately; current P0/P1 evidence
  is real model execution over a fictional input, not a real sampling run.
