# Architecture Review: Evaluation Analysis Experiments

## Name-level2.1 full-chain checkpoint

- Fixed diff: working tree after the owner-approved Prompt2.1 regression and
  fresh42-call Taotaoju chain, against branch HEAD `d0ff25f`.
- Intent: matches Issue #42's controlled experiment boundary. One supported
  writing-equivalence criterion is added; no model matrix, retry-first design,
  runtime activation or frontend change is introduced.
- Engineering: `observedName + mentionContext` is the complete model-facing
  identity interface. Exact name-to-source-record mapping, exclusive coverage,
  focus exclusion and per-sample statistics remain cohesive in the existing
  program owner. No dependency, persistence, migration or external runtime
  route is added. The interface cannot split two unrelated entities with the
  exact same observed name or an upstream compound row; these remain explicit
  residuals rather than speculative machinery.
- Evidence:18/18 focused tests, backend typecheck/build, repository formatting,
  project framework/link validation and diff hygiene pass. Prompt2.1 retained
  replay passes2/2; the fresh chain passes20 acquisition,20 parse, one resolution
  and one composition call in238.644s with no retry. Both private Langfuse traces
  match all44 actual inputs, outputs, settings and usage.
- Continuity: current design/proposal/tasks/research own the accepted controlled
  result. Current runtime specs remain intentionally unchanged. Live Issue #42
  is `Review / Decision`; PR #62 remains Draft, behind main, and its remote CI
  predates this working tree. The old CI formatting failure is repaired locally
  but not yet pushed or rechecked remotely.
- Verdict: `ready with follow-up` for committing the controlled experiment to
  PR #62. Not ready for runtime activation, PR merge or Issue closure until the
  branch is synchronized, remote CI is green, and runtime/spec/frontend ownership
  is explicitly decided. The 点都德/毕德寮 brand-line counting ambiguity is a
  product-policy follow-up, not a blocker for the validated mechanism.

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

## Subject-grounded instruction checkpoint

- Fixed implementation `1c29b9c` against `89686a6`; reviewed locally without a
  second agent. Intent: P3 changes only instruction within the existing experiment,
  preserving P2 input/Schema/projection and the approved staged stop boundary.
- Engineering: one existing builder/asset-loading seam, no new runtime interface,
  application import, dependency, migration or #49 publishing operation.
- Evidence: 3 files / 13 focused tests, Backend typecheck/build, framework links,
  format and diff checks passed. The real retained-case output still fails
  semantic quality despite code acceptance; all three holdout calls were skipped.
- New proven seam: name containment does not establish a name's semantic unit;
  per-span name filtering loses separated role/condition context. The offline
  two-variable check isolates these independently without changing actual evidence.
- Verdict: `ready with follow-up` for the experimental evidence checkpoint;
  `not ready` for runtime activation. Clarify the model-facing units and test
  before changing projection semantics or accepting a downstream report.

## Diagnostic view and input-pair checkpoint

- Fixed implementation `03172ed` against `48eaf0f`, local fixed-diff review.
- Intent: separate display from actual input, then ablate context without changing
  instruction, output Schema or final projector. The real pair completes this
  bounded question, not Parser quality or #49 mirror delivery.
- Engineering: view consumes an already captured body; a mock HTTP boundary
  proves no duplicate request construction or mutation. Input is content-free
  by default; explicit diagnostic messages receive serialized-content masking.
  The isolated runner keeps presentation/export failures outside Provider state.
- Evidence: 47 focused tests, typecheck/build, framework/format/diff checks and
  actual browser System/User display. Both real model outputs remain rejected;
  input savings cannot compensate for omitted facts. No runtime activation.
- Verdict: `ready with follow-up` for the experiment/view checkpoint, `not ready`
  for adopting minimal context or selecting synthesis topology. Prior real-call
  variability and independent-answer/positive-mention gaps remain explicit.

## Brand-subject and explicit-null checkpoint

- Fixed implementations `32fc3cc` and `97ff78e` against `f9c2fd1`, locally reviewed.
  Live main `975f2d2` does not change the relevant AI/Parser/Prompt boundary;
  this branch was not rebased between experiments.
- Intent: short brand subjects and task-relevant context follow the owner's
  confirmed direction. Exact branch qualifications remain in evidence; no
  company-master enrichment or cross-answer grouping was introduced.
- Engineering: existing experimental builder, cloned field descriptions only,
  unchanged structural constraints/projector. Tests prove no P2/P3 mutation and
  exercise current metric consumers, including mention-only exclusion. No new
  dependency, application import, runtime activation or other-worktree change.
- Evidence: seven focused files / 50 tests, Backend typecheck/build, framework,
  links, format and diff checks. Two real requests: P4 code rejection; explicit-null
  control code acceptance but semantic rejection. Both private traces read back
  with wire/message/Schema/output/projection/usage equality and no credentials.
- Verdict: `ready with follow-up` for recording the experimental checkpoint;
  `not ready` for runtime or quality approval. The next bounded work reviews
  identity, role/position, source evidence and prose responsibilities against
  actual consumers. Independent answer, positive mention, synthesis and product
  integration remain unverified. No further call is part of this checkpoint.

## Source-reference handoff checkpoint

- Fixed implementation `582d282` against `57d5c54`; independent read-only
  fixed-diff review found no blocking finding for the single-call experiment.
  This was not an approval to activate runtime or accept model semantics.
- Consumer audit grounded the design in final metric, grouping, card and
  highlight needs. Synthesis receives semantic records, not the complete raw
  answer. Keep mechanical source restoration separate from subject/role meaning.
- Existing P4 instructions/constraints are reused; the isolated input representation
  and four span leaves change. Source offsets restore exact substrings with
  compatible trimming/occurrence semantics. Invalid/empty/oversized ranges reject
  before final projection; no fallback, runtime import, persistence or migration.
- Pre-call evidence: 4 files / 30 tests, Backend typecheck/build and framework/links.
  Post-call offline identity-loss regression extends this to 31 tests; typecheck
  passes, unchanged implementation build/review evidence is reused.
- The real call resolves all seven ranges but fails semantic acceptance. A
  single-variable offline replay proves shared prose forms cause distinct-name
  deduplication loss; the role/metric issue remains independent. Actual messages,
  restored source and final projection were read back separately from Langfuse.
- Verdict: `ready with follow-up` for this evidence checkpoint; `not ready` for
  runtime. Next align individual identity and local recommendation/mention meaning
  with their consumers, not another surface prohibition or an assumed Agent split.

## Identity/role transfer checkpoint

- Fixed implementation `ec43f87` against `fd44956`; independent one-pass review
  found no blocking finding for the frozen experiment. P5 request hash is checked
  unchanged by the runner; P6 only changes instructions/descriptions, not input,
  structural constraints, restoration, final acceptance or metric eligibility.
- Verification: 4 files / 33 tests, Backend typecheck/build, framework/links,
  format/diff; existing unchanged runtime/display evidence reused. No runtime import.
- Four real calls completed under the manifest. Acquisition input was verified
  against the actual wire body, without target/profile injection. The new answer
  naturally mentions the target; both Parser arms identify its first position.
- Independent semantic review rejects all three Parser outputs. Completeness,
  role/condition, position and unsupported-attribute errors remain even when
  source references resolve. Nine private Langfuse observations read back with
  wire/output/projection/usage and full review equality; Trace public=false.
- Verdict: `ready with follow-up` for the evidence checkpoint; `not ready` for
  P6 runtime adoption or a superiority claim. Next compare smaller evidence-led
  task responsibilities with the complete frozen one-call outcome, not another
  holistic wording patch. Persistent/runtime topology still needs evidence and
  explicit architecture approval.

## Source-inventory/judgment checkpoint

- Fixed implementation `be96f55` against `f85386f`: independent review found a
  reachable hidden-source fallback through the full-source projector. A red
  regression reproduced it; `f7047e8` adds pre-projection lexical grounding and
  final exact-anchor/name checks. Focused re-review accepted this correction
  before any call. Existing P6 input hashes remain unchanged.
- Five real calls ran against `f7047e8`. The negative full comparison fails
  semantic quality in both arms; the positive split has no final output because
  its inventory failed the original per-record alias guard. Program acceptance
  is not semantic acceptance, and an incomplete arm is not a topology verdict.
- Offline replay demonstrates that rejected `Manner大店` already exists in the
  shared visible union. A second red-to-green regression in `c35824f` corrects
  this overconstraint without allowing unseen source recovery. Focused independent
  review confirms the hidden-source boundary remains closed. It does not prove
  alias identity, repair missing context or change the original call result.
- Verification: 5 files / 43 tests, Backend typecheck/build; twelve private
  Langfuse observations read back with messages/Schema, raw output, program
  result, usage and full review equality. Trace public=false; no credential values.
- Verdict: `ready with follow-up` for experimental evidence; `not ready` for
  runtime. The next question separates complete structural/conditional context
  from relationship judgment. No sixth call, runtime import, migration, model
  change or production activation followed the offline correction.

## Full-source simplification checkpoint

- Fixed diff `1af658c..3e310f2` independently reviewed `ready` for experiment only.
  Both final tasks share full source, Prompt, Schema and four-field context;
  optional inventory is the only difference. Both runner paths use the same
  existing final projector. No clipped-source lexical gate applies to full source.
- 5 files / 46 tests, Backend typecheck/build and framework/links passed. Existing
  clipped-experiment tests remain intact; no runtime or public-contract change.
- Six calls completed; independent review assessed meaningful fidelity rather
  than verbatim prose. Both split arms fail materially despite complete context,
  with higher total tokens/serial time. Single also needs role/condition repair.
- Fourteen private Trace observations read back: actual messages/Schema, outputs,
  program results, usage and full review match. Matched final requests retain all
  45/69 source lines; public=false and no credential values were found.
- Verdict: `ready with follow-up` for this evidence package, `not ready` for
  runtime. Stop advancing the inventory/judgment split; do not expand Agent layers
  or treat program recovery as model quality. No further call follows this batch.

## Single-call worked-example checkpoint

- Fixed diff `de0d518..01749c8` reviewed for complete demonstrations, shared Schema,
  source context and contamination. Review identified a wire Schema-name variable;
  `72930d4` removes the version override and strengthens whole-contract equality.
  Actual fresh request bodies prove only system instruction differs.
- 5 files / 48 tests, Backend typecheck/build passed; affected 15 tests/typecheck
  reran after correction. No new runtime interface, dependency or acceptance guard.
- Five calls completed, including an independently acquired answer. Examples
  improve some roles and prose but candidate acceptance fails on both retained
  and held-out cases. Name-array punctuation is already in raw model content;
  local decode/projection/display are not its origin. Root cause upstream remains
  unresolved, so no production fix or unsupported-mode claim follows.
- Eleven private Trace observations read back with wire messages/Schema name,
  output, projection/rejection, usage and complete review equality; public=false.
- Verdict: `ready with follow-up` for the evidence package, `not ready` for the
  candidate. Next minimize the output anomaly instead of adding another Prompt
  patch, Agent or silent repair. No further call is part of this ended batch.

## Name-mode and reasoning-budget diagnosis checkpoint

- Protocols frozen separately at `702bef5` (six mode calls) and `fc5ffff` (two
  budget calls). Independent protocol review preceded each; semantic review
  assessed meaningful identity, conditions and evidence after each batch.
- Existing HTTP transport is used only by protected ignored diagnostic runners.
  No application adapter, public contract, persistence, retry, dependency or
  runtime setting changes. Mode pairs differ only in response_format; the
  separate budget pair differs from the retained strict request only in effort.
  JSON Object's missing out-of-band Schema is an explicit comparison limitation.
- Full strict replay reproduces intermittent raw name corruption, while both
  minimal modes form names. Object full outputs fail the complete contract.
  Official budget documentation and actual usage show all four full low calls
  consume the 4,096 cap; medium forms names in both observations, but semantics
  remain imperfect and latency is 90.4/178.6 seconds. No unique root cause follows.
- Fourteen mode and six budget private observations read back with actual
  inputs/settings, outputs/checks, usage and full review equality. Credentials
  and raw reasoning are not exported. Unchanged runtime test/build/display
  evidence is reused; no actual synthesis/report acceptance is claimed.
- Verdict: `ready with follow-up` for recording the diagnostic evidence;
  `not ready` for runtime adoption. Stop parameter probes and reconcile the
  smallest useful single-call semantic/evidence delivery slice. Do not infer
  better quality from program recovery or add Agent layers and repair guards.

## Evidence-before-judgment checkpoint

- Fixed diff `ac31bcb..4122bda` keeps baseline requests, field meanings/constraints,
  full source and final projection unchanged; only experimental instruction and
  other-brand Schema/example property order vary. No runtime import or new field.
- Independent review caught coffee using the shoe original in the ignored runner.
  Before calls, use per-case source and prove both retained outputs match their
  own stored projections. Focused re-review and the frozen manifest pass.
- Four calls completed. Coffee evidence handoff improves without losing brands
  or positions; shoe shared-condition loss remains and FILA disappears. Both
  candidate observations take longer. Code acceptance is not semantic approval.
- Evidence: 31 focused tests, Backend typecheck/build, framework/links/diff and
  both CI checks at the fixed implementation pass. The accidentally broadened
  local integration invocation was interrupted after sandbox Redis EPERM and is
  not counted as passing evidence. No database or service configuration changed.
- Ten private Trace observations read back with actual requests, outputs/checks,
  usage and complete review equality; no credentials/raw reasoning exported.
- Verdict: `ready with follow-up` for the experimental record, `not ready` for
  runtime adoption. Stop property-order tuning; retain the concrete shared-brand
  qualifier failure as the next bounded test case, without expanding topology.

## Shared-condition transfer checkpoint

- `3482617..64152c6` changes one demonstration and its necessary introduction,
  retaining the original baseline, positive example, Schema/order, full input,
  projector and low route. Independent review's introduction mismatch was fixed
  before calls; Shanghai acquisition metadata was also aligned before freezing.
- Four actual calls complete the declared plan, including independent acquisition.
  Retained role improvements do not complete Nike/Adidas evidence; the new candidate
  changes a part fact and adds tokens without an overall quality gain. Do not adopt.
- A zero-call, reference-only replay separates raw model omission from current
  per-span name filtering; a complete contiguous range survives. Original evidence
  and runtime semantics remain unchanged; inspected synthesis input is a passthrough.
- Verification: 33 focused tests, Backend typecheck/build, framework/links/diff,
  independent scope/semantic/diagnostic review and both fixed-implementation CI
  checks. No new contract is accepted and no live report integration is claimed.
- Nine private Trace observations match actual input/settings, output/projection,
  usage and full review; actual new wire differs only in Prompt, public=false.
- Verdict: `ready with follow-up` for this evidence checkpoint, `not ready` for
  runtime adoption. The next boundary is identity anchoring and qualifying-context
  handoff, not additional similar examples, Agent layers or automatic source repair.

## Customer-value Parser scope checkpoint

- The owner explicitly reduces analytical obligations. `831ead3..0f99bc3`
  implements one experimental Prompt/model contract with target points/sentiment/
  summary and other-brand identity/position/positive eligibility. No new Agent,
  legacy semantic fabrication, runtime adapter, score change or persistence.
- Full context and stable source restoration are reused. Forty focused tests,
  Backend typecheck/build and independent fixed-scope review pass. Existing
  counterpart builders and their historical request bodies remain unchanged.
- Three frozen requests complete with lower aggregate token/latency observations;
  historical comparison does not establish stable production gains. Raw internal
  name-field failure remains distinct from Schema/source validity and requires
  disposition before integration; local review uses the new user rubric.
- Automated safety review blocked separate semantic-review upload. Keep that
  payload local; only existing IO readback and aggregate execution metadata are
  continued, not an alternative publication route. Explicit approval is pending.
- Verdict: `ready with follow-up` for the working experiment, `not ready` for
  canonical integration. Resolve name representation, mixed-praise eligibility
  and consumer handoff; do not revive fine-grained conditions or old #48 rules.
