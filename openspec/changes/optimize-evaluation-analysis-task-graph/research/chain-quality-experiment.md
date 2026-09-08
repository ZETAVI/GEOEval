# M4 Chain Quality Experiment

## Question and authority

Does a clearer semantic task and sufficient evidence context improve raw
generation enough to justify a runtime change? The owner's 2026-09-05 feedback
approves preparing this comparison, not accepting a topology in advance.
The owner authorized the first batch and then explicitly approved the generic
Beijing endpoint for this isolated experiment only. The earlier
[zero-request preflight](https://github.com/ZETAVI/GEOEval/issues/42#issuecomment-5550245255)
is historical; the executed first-batch result is recorded below. The product
Worker's workspace-dedicated endpoint restriction remains unchanged.
Subsequent synthesis batches require their own frozen scope.
The owner subsequently confirmed controlled real calls and diagnostic Langfuse
input/output synchronization. The later three-call package below has separate
authority; the first fictional-fixture batch's no-export rule is historical.

## First package: Parser instruction only

- P0: current main Parser instruction/profile 2.2.0 and model contract @5.
- P1: [experimental instruction](../../../../apps/backend/geo-intelligence/experiments/m4-parser-instruction.json),
  experiment version 1.0.0; production assets are untouched.
- Inputs: existing fictional P01/P03/P05/P07 fixtures from the S6 manifest.
- Each fixture receives P0/P1 once, with order counterbalanced across fixtures.
- Maximum eight Qwen3.8 Flash calls, interpretation route @2, low reasoning,
  same input and strict output Schema, no fallback, sampling or automatic retry.
- First transport, identity, structure or semantic failure stops the batch.
  Review before any resumption; unused calls are not permission for another batch.
- No customer data, business database writes or telemetry export.
- No customer SLA or fixed currency ceiling is claimed. Preserve actual usage;
  route/request-count limits are explicit, and timeout/request scope stays frozen.

The [builder](../../../../apps/backend/src/ai-execution/controlled-validation/m4-parser-comparison.ts)
reuses existing fixtures and the existing stop-on-failure/private-evidence
executor. Confirmation hashes actual instructions, inputs, schemas and route
definitions, rather than version labels alone. No application startup imports it.
Use a real adapter with telemetry disabled only after authorization; plan mode
requires no credentials, database or network.

From repository root, the credential-free plan is:

```bash
pnpm --filter @geoeval/backend exec node --import tsx --input-type=module -e 'import {m4ParserComparisonPlan} from "./src/ai-execution/controlled-validation/m4-parser-comparison.ts"; console.log(JSON.stringify(m4ParserComparisonPlan(), null, 2))'
```

Freeze the reviewed commit and confirmation together. Runtime execution is an
explicit call to the exported executor using this exact confirmation. Store
evidence under an ignored, task-owned directory, directories 0700/files 0600;
retain through decision/review and record the later cleanup owner. Raw evidence
does not belong in an Issue or PR. Save the exact plan alongside the results.

## Outcome review

| Dimension        | Observe                                                                                       | Changed action                                                  |
| ---------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Raw structure    | Model Schema validity before projection                                                       | Output description/Schema candidate, not more recovery          |
| Raw semantics    | Correct subject, mention, original order, attribution, negation and qualifying facts          | Diagnose the precise input/task ambiguity                       |
| Useful evidence  | Key supported observations and competitor candidates retained; exact excerpts support meaning | Revise extraction/context if facts are missing or distorted     |
| Customer reading | Faithful, complete enough, focused and readable prose                                         | Change task/examples if generation itself is poor               |
| Projection       | Accepted/rejected, discarded facts, position normalization and card fallback                  | Report recovery separately; do not credit it as model quality   |
| Efficiency       | Wall time, usage and number of calls, with failure reason                                     | Compare only matched conditions; no production percentile claim |

The existing validator checks selected fixture facts, not all prose. Machine
ACCEPTED is provisional until raw human-readable results are inspected. Preserve
P0/P1 failures equally. Do not feed observed holdout answers into Prompt examples.
Four fixtures cannot establish broad stability; select one later small holdout
that could disprove the proposed mechanism before activation.

## Following packages, not yet executable

1. Diagnose any missing Parser context using frozen v3 data and an explicit
   subject-identification projection. Do not indiscriminately include customer
   claims or change quote representation without a failing example.
2. Compare current-main and improved one-call synthesis packages. Reuse #41
   compact references, but preserve task-relevant source excerpts and name
   context; label joint Prompt/context changes as package comparisons.
3. Compare adequate-context one-call and split tasks on the exact same accepted
   interpretations. Review consistency between grouping and prose. Only test a
   sequential alternative if a real dependency or grounding gap changes the choice.
4. Use matched replay to separate architecture effects from changed upstream
   Query/Parser output. After selection, perform one integrated downstream check
   and later the representative #39 4x5 under separate sampling authorization.

Freeze contracts and budgets for each later package before real calls. Do not
convert the historical twelve-minute run or old Parser recovery count into
current-version evidence. Actual report-path acceptance precedes #41 closure.

## First real batch result — 2026-09-05

- Tested revision: `8a717eac621206b04b0222b95c27f23987af4cbc`.
- Exact confirmation: `26088fd63d0acc7761666d3ac6de864ff85cfe4fe8a009b331d4e90a903e9ff0`.
- Endpoint: `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`.
- Isolated adapter execution only; no Worker startup, business database,
  telemetry, acquisition, Hy3 or runtime configuration change.
- Executed 1/8 requests: P01-P0, the current-main Prompt. First failure stopped
  the batch. P1 and all later cases are **not run**.
- Provider succeeded with matching `qwen3.8-flash`, `finish_reason=stop`, 8,720 ms.
- Usage: 628 prompt + 445 completion = 1,073 total tokens. Reasoning details are
  preserved as provider data and are not added again to this total.

### Evidence matrix

| Claim                                            | Retained evidence                                                                                                 | Result                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Selected generic endpoint works for this request | Successful response and exact model identity                                                                      | Passed; not a production capacity or dedicated-endpoint comparison |
| Provider receives the full intended task         | Sanitized request exactly matches input, instruction and Schema; strict mode and low effort retained              | Passed                                                             |
| Raw output conforms to the model Schema          | Raw output parses successfully                                                                                    | Passed                                                             |
| Raw result completes the extraction task         | Mention=true, position=2 and fluent card prose; mention/position evidence, otherBrands and observations all empty | Failed                                                             |
| Current product accepts this output              | Projector rejects missing open-position evidence                                                                  | Failed as intended                                                 |
| Candidate Prompt improves quality                | No P1 request was made                                                                                            | Not verified                                                       |

### Diagnosis and next discriminating action

The proven failure is incomplete structured extraction despite correct coarse
classification and readable prose. The Schema permits empty evidence arrays
independently of mentioned/position; local validation catches the inconsistent
combination afterwards. The output also omits two explicit competing brands.
Transport, input loss, Schema loss and token-limit truncation are not supported
by this retained request/response.

Offline counterfactual only: adding the exact second list line as position
evidence makes the domain projection accept, but the unchanged fixture still
fails because competitors are missing. The real output was not modified or
accepted. Thus filling one evidence gap would hide a broader extraction omission.

Ranked hypotheses for later comparisons:

1. The task and field contract let coarse classification/prose dominate full
   evidence extraction. Compare the already-frozen P1 on the same P01 input first.
2. Empty-field semantics do not distinguish no evidence from unfinished work.
   If P1 also fails, compare a coherent evidence-first output contract at its
   explicit owning decision boundary rather than add another recovery rule.
3. Low reasoning may affect extraction completeness. Change effort only after
   the instruction comparison, so model/effort and Prompt effects stay separate.

These hypotheses do not establish why the model omitted the fields or prove a
new Prompt, Schema or topology superior. Do not rewrite P1 using this result
before its paired comparison; further calls follow the stop-and-review boundary.

### Protected evidence and exit

Ignored directory relative to this worktree:
`.provider-evidence/m4-parser-comparison/2026-09-05T07-27-10-081Z-semantic-probe/`.
Directories are 0700 and evidence files 0600. Raw outputs and provider reasoning
stay there, not in GitHub comments or committed documents.

- `01-P01-P0.json` SHA-256:
  `bd8694c0aa6015419b955a4a307985102f1d75d5d3d7334326c6d3a8a75ba5b2`.
- `experiment-plan.json` SHA-256:
  `660b2b46362ebaaa18798931cf7c74f74d7899f0664e7487b147c171d7951d0f`.

#42 owns retention through the comparison/review decision. Keep the current
worktree and evidence; review exact targets before cleanup at experiment close.
No customer result, current spec or production behavior changed.

## Resumed instruction comparison — 2026-09-05

After the owner requested continuing from real evidence, the remaining frozen
cases were resumed at ordinal 2, without repeating P0 or changing P1.

| Arm               | Model/Schema     | Latency   | Input/output/total tokens | Raw extraction                                                                            | Acceptance |
| ----------------- | ---------------- | --------- | ------------------------- | ----------------------------------------------------------------------------------------- | ---------- |
| P0, first batch   | Qwen3.8 low / @5 | 8,720 ms  | 628 / 445 / 1,073         | Correct mention and position; empty evidence, competitors and observations                | Rejected   |
| P1, resumed batch | Same             | 11,231 ms | 710 / 614 / 1,324         | Same omissions; displayed forms also empty, though prose names the target and competitors | Rejected   |

The resumed batch stopped after one request. Across the original eight-case
plan, 2/8 cases were executed in two authorized stages; all later cases remain
not run. Each arm has only one observation. This disproves a success claim for
P1 on P01, not a universal claim about Prompt engineering or relative latency.
The next action is an evidence-first interface candidate, not more appended
prohibitions or a production guard change; see the active design.

Protected resumed directory:
`.provider-evidence/m4-parser-comparison/2026-09-05T07-37-25-334Z-semantic-probe/`.

- `02-P01-P1.json` SHA-256:
  `30547f08c7bf6f8c82935f2f813718cc1eff8848ef7456e012fb7a3488577912`.
- `experiment-plan.json` SHA-256:
  `4778c940de582c3c3ab3970b037a38dd3e541f05b3d8ec4345b0f45a03208bbe`.

### Evidence lineage audit and next package

The inspected retained #41 manifests are Y02/Y03 and fictional Parser fixtures,
not platform acquisitions. Historical Parser diagnostic scripts reference old
database runs, rather than retained answer artifacts; their old execution
worktree is gone. No reusable acquisition artifact was located in the inspected
main/#41/#44 evidence paths. This is a bounded search result, not proof that every
historical answer has been deleted. Do not call these fixtures a real sampling
chain or restore old development databases merely for testing.

The proposed max-three-call real chain uses the exact accepted open Query from
[Query review](../../archive/2026-09-04-implement-ai-query-generator/real-query-review.md):
“想找能做抖音和小红书广告代理的营销策划公司，广州天河猎德社区附近有哪些值得比较？”
Target identity is 互动派科技股份有限公司. The acquisition uses the current
Qwen sampling route (qwen3.7-flash, natural objectivity profile and automatic
search); parsing uses Qwen3.8 Flash low. The requested scope is one acquisition
plus P0 and the evidence-first candidate over the same unchanged answer.

Do not claim to rerun Brand/Amap/Query generation: the archived accepted Query
is reused. The two parsing outcomes are examined separately after each call;
no automatic semantic repair or retry is authorized. Reject an invalid
acquisition/transport identity before any parser call. Full report/synthesis
claims still require accepted sample sets and later bounded evidence.

## Natural-answer chain and Langfuse readback — 2026-09-05

### Scope, identity and reproducibility

The owner confirmed this three-call package and diagnostic input/output export,
and authorized continuing controlled real-call testing. Freeze each later
batch's inputs and ceiling within that authority; a new privacy, provisioning,
billing or production boundary still needs its own decision. No automatic
sweep, forced target recommendation, new Brand/Amap/Query generation, business
database, Hy3, synthesis or 4x5 run occurred in this package.

- Tested HEAD: `3b2cc1c5301418bd42743cdbb42ccca5c4335034`.
- Current `origin/main` observed during the run: `975f2d2` (#50/#63). Diff from
  the Parser baseline `ddadf77` is empty for ai-execution, Parser policy/model
  contract, Prompt assets and the lockfile. This is not integrated-main testing;
  keep the fixed experimental revision rather than rebase during measurement.
- Exact manifest confirmation:
  `579ed855a21102ff29022f4b86e14fa9cf9ea617a5fdeb77458cd4f5f496339b`.
- Answer SHA-256, identical in both Parser requests and cloud readback:
  `afe5f76ef7c4ade9061fcc8e56598e31d93a07853c3ff1c6ffb524e6389c7dda`.
- Protected evidence directory relative to this worktree:
  `apps/backend/.provider-evidence/m4-real-chain-Nod6Pg/`.
  It contains the exact plan, requests, responses, answer lineage, projections,
  summary, separate semantic review and Langfuse readback. Directory 0700,
  evidence files 0600; #42 retains them until decision/review and owns cleanup.
- Isolated runner: `apps/backend/.provider-evidence/m4-real-answer-runner.ts`,
  SHA-256 `4f7d21fe2b05ca8a21bc1851f2a687f20e9aff466d4d2d8a26cce38a50249c13`.
  It is protected operational evidence, not application code or a portable CI
  entrypoint. Credentials are supplied from the existing local environment;
  no credential is stored in the runner, committed record or Langfuse content.

### Matched observations

| Stage                     | Model             | Latency   | Input / output / total tokens | Review                                                         |
| ------------------------- | ----------------- | --------- | ----------------------------- | -------------------------------------------------------------- |
| Natural acquisition       | qwen3.7-flash     | 46,553 ms | 433 / 3,848 / 4,281           | Valid observed platform answer; not independently fact-checked |
| P0 current Parser         | qwen3.8-flash low | 29,972 ms | 1,577 / 3,357 / 4,934         | Code accepted; semantic review rejected                        |
| P2 evidence-first package | Same              | 21,864 ms | 1,479 / 1,279 / 2,758         | Code accepted; semantic review rejected                        |

Exactly three calls, 11,973 total tokens; no retry or fallback. Provider reasoning
usage is a subset of output, not another additive bucket. One pair with changed
Prompt and Schema cannot establish relative reliability, production latency or
currency savings. Token records are not a provider invoice.

The answer did not mention the target. That is a valid natural measurement, not
a reason to force another acquisition. The route requested automatic search,
but `searchObservation=UNKNOWN`: actual search execution was not proven. The
answer's company, location and qualification claims remain platform statements.

### Semantic findings and root-boundary diagnosis

P0 correctly reports target absence but emits eight positive target observations
about other companies, categories, locality and buying advice. The current
[projector](../../../../apps/backend/src/geo-intelligence/domain/sample-parser-model.contract.ts)
retains all eight as recommendation reasons. One non-verbatim quote is discarded,
but supported excerpts still have the wrong subject. Nine other-brand records
also include two certification platforms as competitors. The named platform's
role in this answer, not a universal name blacklist, is the discriminating fact.

The current synthesis policy passes the full canonical semantics, and
`collectSampleSemanticObservations` registers these reasons as referencable
observations. Thus the contaminated input is reachable at the Parser-to-synthesis
boundary. No synthesis call or customer report was executed; an actual downstream
misstatement is not claimed. This is a semantic relationship gap, not merely
invalid JSON or a missing quote. The model's internal cause remains unproven.

P2 sets target=null and produces no target observations; it also excludes the
two certification platforms in this case. Nevertheless it labels a non-table
answer TABLE, explains the target's category as an unsupported substitute
recommendation, and includes an internal-style `classificationReason` prefix
plus speculative name confusion in limitations. Five null positions arrive
with non-null position kinds that the projector normalizes. Raw and projected
quality are therefore not identical. Both arms flatten some unnamed partner or
group relationships into brand candidates; preserve this ambiguity for review.

P2's absent-target branch cannot prove the original P01 missing-proof failure
is solved: its nonempty target branch was not exercised by this real answer.
No candidate is ready for runtime or topology selection. Before another Prompt
revision, fix the test expectations for subject, entity role and what each quote
actually supports, using this retained failure plus an independent mentioned-
target case. Keep absence valid and prevent profile context becoming answer
evidence. Then compare the smallest coherent candidate without tuning on a
holdout. New Parser runtime delivery still needs an explicit owner; #32 stays
completed, #41 owns synthesis and #43 waits for a stable progress contract.

### Langfuse and verification

Authenticated project-only trace:
[M4 natural answer and P0/P2 review](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/ece7e000f130375eaef4ff6611c3ba9c).
SDK 5.11.0 reused the existing diagnostic projections, masking and non-blocking
exporter. Production remains metadata-only; this experiment uses
`m4-controlled-public` / `local-diagnostic`, release `issue-42-real-chain-3b2cc1c`.

Cloud readback at 08:11:40Z found five observations: one root, three generations,
and a separate Codex semantic-review span. Verified original answer content,
both Parser inputs, raw model outputs and canonical projections against local
evidence; checked request/answer hashes, parent links, models and mutually
exclusive usage. Credential values, raw provider envelopes, reasoning text and
raw acquisition source metadata were absent from the checked content. No public
sharing was enabled. The review is `SEMANTIC_REJECTED`; owner acceptance remains
pending. Original code-acceptance records were not overwritten as if they were
quality acceptance.

The [SDK instrumentation](https://langfuse.com/docs/observability/sdk/instrumentation)
and [Observations API](https://langfuse.com/docs/api-and-data-platform/features/observations-api)
were checked on 2026-09-05 alongside locked declarations; the actual scoped
readback establishes account-specific operation. Recheck on SDK/API, account,
region, content mode or projection changes. This grants no production content
export and does not migrate repository Prompt ownership into Langfuse (#49).

Focused verification: two experimental test files / eight tests passed; three
telemetry/config test files / fourteen tests passed, including intentional
exporter failure. Full DB suite, integrated report, browser, migration and
synthesis topology comparison were not run. Verdict: operational traceability
verified for this package; quality improvement not verified.

## Subject-grounded instruction package — frozen protocol

The next owner-authorized iteration is P3, instruction
`experiment.m4.parser-subject-grounded@1.0.0`, over the unchanged P2 model
contract, input context and final projector. The baseline P2 instruction remains
unchanged. Freeze the actual plan before calls; changing only the instruction
isolates this attempt from Schema, reasoning-effort or upstream-input changes.

1. Run P3 once over the retained marketing-service answer. The earlier P2 result
   is a retained, non-contemporaneous quality baseline, not a speed benchmark.
2. Review target absence, correct observation subject, actual service-provider
   candidates, source-supported prose, accurate structure and raw/projected
   consistency. The answer's explicit BlueFocus, YCHOO and Xinxuan candidates
   should survive; certification-only platforms should not become candidates.
   Group/partner relationships remain scoped to their excerpts, not a forced
   exact entity count. No-target is a valid result, not a sampling failure.
3. Only if that result passes, acquire one fresh public open-question answer:
   “在上海市静安区，想找可以买到现磨咖啡、适合短暂办公的连锁咖啡店，有哪些值得比较？”
   The preselected target is 星巴克. This is an experimental question, not a
   product-generated Query or a newly verified brand/store profile.
4. Compare frozen P2 and P3 once each over that same new answer. Inspect actual
   mention, original order/qualifiers, useful observations, quote support and
   customer prose. If the target is absent, retain that result and leave the
   positive branch unverified; do not fish for a favorable answer.

Maximum four calls, Qwen only, low parsing, 180-second request timeout. Retained
case semantic failure stops before the new acquisition. Transport, identity or
structural failure stops; no automatic retry, fallback, Prompt patch or same-
batch resampling. A per-arm semantic review is separate from code acceptance.
Export controlled IO and independent review to Langfuse, preserve local raw
evidence, and verify readback. No runtime, full report, production or #49 Prompt
Management activation follows from this batch.

### Executed result and next discriminating seam

- Fixed implementation: `1c29b9c`; plan confirmation:
  `697fcf463dd71ac2e990c250420ead2c5c4c396e9897be9f1321f709bf71034f`.
- Executed **1/4** calls: retained-answer P3. qwen3.8-flash low returned in
  20,152 ms, 1,704 input + 1,791 output = 3,495 total tokens. Code accepted;
  Codex semantic review rejected. Reasoning usage is not added again.
- The fresh coffee acquisition and both holdout Parser arms were **not run**.
  No Prompt edit, retry or replacement batch followed the failure.
- P2/P3 share the original answer hash recorded above. P3's input hash is
  `8eb904fcf71208342418f380ff16b65ae277923fd4516d3c903c0c59b7bd32a7`.

In this case P3 correctly returned MIXED and target=null, excluded certification
platforms, retained the explicit companies, and treated partner-brand references
as MENTIONED_ONLY with scoped limitations. The prior unsupported substitute-
recommendation explanation, internal classification prefix and name-confusion
guess were absent. These are observed local improvements, not a proven general
advantage or an accepted complete output.

The blocking relationship errors moved rather than disappeared:

1. Three `observedForms` contain whole formatted descriptive paragraphs rather
   than name forms; other entries retain Markdown decoration. The current field
   schema permits these strings, and projection preserves source-contained forms.
2. Each brand's raw evidence separates the name from its characterization or
   condition. `projectOtherBrands` keeps only individual spans containing a name
   form, so all five projected anchors reduce to names; the supporting context
   is lost even though it was present in the raw model output.
3. The conditional live-selling example is assigned unconditional RECOMMENDED;
   the retained bare-name anchor no longer carries that condition. The card also
   expands into an other-brand summary beyond this batch's target-record scope.

No runtime fix or fallback was applied. A first-brand-only offline counterfactual
using the unchanged full answer isolated two different interface units:

| Offline intervention                                               | Name field still contains a sentence | Supporting context retained after current projection |
| ------------------------------------------------------------------ | ------------------------------------ | ---------------------------------------------------- |
| Copied raw first-brand record                                      | Yes                                  | No; 22-character name anchor                         |
| Only replace name forms with the displayed name                    | No                                   | No; same anchor                                      |
| Only replace split evidence with its actual whole source paragraph | Yes                                  | Yes; 98-character source anchor                      |
| Both interventions                                                 | No                                   | Yes                                                  |

All four variants pass code acceptance. They are diagnostic counterfactuals,
not model outputs, a repair of the official result or proof of a new Prompt's
quality. The original response remains untouched. This proves the local
containment/filtering mechanism and distinguishes naming from context retention;
it does not establish the LLM's internal reason for producing either error.

The next bounded candidate should first clarify model-facing units: name forms
are names; a role/condition evidence unit includes its named subject and the
contiguous supporting context. Compare field descriptions on the frozen P3
instruction before inventing a richer relation schema. Assess whether the
existing name-per-span containment boundary suffices on real outputs; any
required runtime change needs an explicit owner and separate acceptance. Do not
silently broaden the experiment projector or classify this result as passed.

Protected directory:
`apps/backend/.provider-evidence/m4-subject-retained-djPowl/` (0700, files 0600),
retained by #42 until decision/review; cleanup requires exact-target review.

- Raw result SHA-256:
  `ff3f79a04e777e77972590d8e70ac7eb9cb39bfb14a80d52f8f8d01a6f26fb0b`.
- Plan file SHA-256:
  `a007586e2c039d57087d0d131537a48c61121883e5b4088e4cec67a7d3a8c7db`.
- Isolated runner `apps/backend/.provider-evidence/m4-subject-grounded-runner.ts`
  SHA-256 `9c4f839c99d9afddefc0ae887117a342a17f413c750f14b395eb6a6d216883da`.

The [P3 Trace and separate quality review](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/e567a2a9fb262f4c897b5b2ed3385f42)
links the retained source Trace. Cloud readback verifies original input/answer
hash, raw model output, program projection, model, usage and the separate
SEMANTIC_REJECTED review; no credential, provider envelope or reasoning text is
in the checked content. This is Trace observation, not #49 Prompt Management.
See [#49 reconciliation](https://github.com/ZETAVI/GEOEval/issues/49#issuecomment-5550652475)
for completed prerequisites and outstanding mirror acceptance.

## Actual Provider input versus diagnostic display

The owner observed apparent redundant `contentHash` and `task` fields in
Langfuse and requested input reflection before further calls. Inspection of the
retained P3 `evidence.sanitizedRequest.body` and the original acquisition request
confirms the mapping below; `executeProviderJsonRequest` uses that same body for
the transport. The Langfuse diagnostic projection is not a wire-body dump.

| Diagnostic field                                                        | Actual Qwen request mapping                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| schemaVersion, purpose, prompt.contentHash, task wrapper, task.taskKind | Diagnostic-only; not sent as these fields                                             |
| prompt.systemInstruction                                                | Parser messages[system].content                                                       |
| task.userContext contents                                               | JSON serialized into messages[user].content, without a task/userContext outer wrapper |
| task.outputContract.jsonSchema                                          | response_format.json_schema.schema with strict=true                                   |
| task.outputContract.version                                             | Sanitized into the response_format schema name, not an extra user-context field       |
| Run/cycle/sample IDs, source hash and trace lineage                     | Local/telemetry metadata, not Parser message content                                  |

The actual Parser user message has nine keys: companyName, primaryIndustry,
secondaryIndustry, region, characteristicOne, characteristicTwo, questionKind,
question and originalAnswer. No diagnostic contentHash/task/taskKind is present
in it. The actual acquisition body has model, input=query,
instructions=objectivity and tools=web_search; it does not send the target
company or Parser brand profile. This proves only the inspected Qwen route.

Next work has two different acceptance boundaries. A clearer diagnostic view
should distinguish model messages/structured-output contract from provenance
metadata, preserve hashes rather than discard them, and prove that changing
display does not change the Provider body. It must use safe allowlisted content,
not expose a full credential-bearing Provider envelope. No runtime telemetry
projection or historical Trace was changed during this audit; #49 remains the
independent Prompt mirror owner, not the owner of Parser context semantics.

For actual model context, first classify each field as target identity, question
scope, answer evidence or business-profile claim. Preserve the original answer,
question and necessary identity; evaluate whether industry/region/compatibility
characteristics add disambiguation or encourage profile-to-answer attribution.
Do not assume all JSON keys or all profile context are redundant. Compare a
minimal context against the frozen full context separately from the pending
output-field-description test: one changed variable family per batch, with
semantic completeness and disambiguation checks, not token reduction alone.
No further Provider call or input/Schema change was made in this audit.

## Full/minimal context and clearer diagnostic view — protocol

The owner approved executing the separated plan. This batch changes the
experimental view and runs a contemporaneous full/minimal context pair on the
retained public marketing-service answer. Both arms use the frozen P3 instruction,
P2 Schema, Qwen3.8 Flash low and unchanged projector. Minimal removes industry,
region and both characteristic fields, retaining name/question kind/question/
answer verbatim. This is an input-family ablation, not proof of any single removed
field's causal effect. No output-field description is changed in this batch.

Maximum two calls, full then minimal, one per arm; no acquisition, fallback,
retry or same-batch tuning. Transport/model identity/structural failure stops.
Inspect both semantic observations separately after the pair; known P3 quality
defects are neither waived nor assumed fixed. One absent-target answer can test
scope fidelity and measured usage here, not general input adequacy, ambiguous-
name identification, positive mention coverage or production performance.

The generation's input is an allowlisted, masked copy of the actual transmitted
messages from retained request evidence; its output is the model result. Actual
Schema/request controls and content hashes are metadata, and a separate span
records program projection. The helper does not build or mutate Provider bodies.
Default metadata-only behavior omits both messages and Schema content. An explicit
diagnostic mode masks JSON-serialized message contents before export. The current
runtime telemetry projection and all historical traces stay unchanged.

### Paired result

Fixed implementation `03172ed`; exact plan confirmation
`205a62548262b739ea21708df9f30a9ed9afde13f01bfc8e7b683498441de0ba`.
Executed two requests, no acquisition or retry:

| Arm                             | Input / output / total tokens | Latency   | Code acceptance | Semantic review                                    |
| ------------------------------- | ----------------------------- | --------- | --------------- | -------------------------------------------------- |
| Full P3 context, nine fields    | 1,704 / 2,135 / 3,839         | 28,130 ms | Accepted        | Rejected: entity scope and conditional role errors |
| Minimal P3 context, four fields | 1,661 / 1,304 / 2,965         | 21,209 ms | Accepted        | Rejected: all other brands omitted                 |

Total 6,804 tokens. Removing five fields saved only 43 input tokens (about 2.5%)
in this request. The shorter overall response cannot be credited as an efficiency
gain because extraction completeness failed; reasoning usage is already included
in output. The pair has one observation per arm and fixed order, not a stability
estimate or causal proof about any particular removed field.

Both arms correctly reported MIXED and target absence. Full context retained
actual names and contextual evidence this time, but also synthesized one combined
WPP/Omnicom-group candidate and two unnamed team candidates from locations, and
flattened a conditional live-selling example into unconditional recommendation.
Minimal context returned no other brands at all, omitting the answer's explicit
BlueFocus, YCHOO and Xinxuan candidates. Do not adopt this minimal input.

Full's input hash matches the previous P3 request exactly, yet its failure mode
changed: prior full-paragraph name forms and bare-name-only anchors did not recur
for the explicit companies. This observed variation is another reason not to
assign every single-run output change to an input/Prompt modification. The full
context remains the experimental control, not a quality-approved runtime candidate.
Next compare the narrowly described output units on frozen input/instruction,
then add independent-answer/mentioned-target evidence before claiming adequacy.

### Display delivery and evidence

The new [context-pair Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/f9e39143359de70ca8d3bac9832a7c3c)
has generation and program-projection layers. Browser verification in the actual
Langfuse page confirmed the two generations with child projections; selecting
the full generation's Formatted view shows System/User messages and separate
Metadata containing requestSettings, schemaHash and messageHash. No task or
contentHash wrapper was inserted into generation Input. The independent quality
review marks both arms SEMANTIC_REJECTED; owner acceptance remains pending.
Cloud readback at 09:36:03Z verified all six observations: actual messages,
model outputs, request Schema, hashes, usage and both program projections match
the protected evidence; no credential values were present and the Trace is not
public. The post-run review appears after model execution, so the whole Trace's
time span includes review delay; use generation durations for Provider timing.

This experimental display comes from an allowlisted copy of the actual captured
body, not a second message builder. A local HTTP mock verifies equality with the
transmitted messages and output contract. The actual controls remain sent to the
Provider even though displayed separately in metadata. No production telemetry,
old Trace, Prompt Management entry or #49 mirror has been changed.

Protected directory `apps/backend/.provider-evidence/m4-context-pair-0uC01y/`
(0700, evidence files 0600), retained by #42 until decision/review:

- Full result SHA-256:
  `a5d5e5be0289bb71a3c3c36ec3b16103f30153baf894af7dcb711e7557cb85c0`.
- Minimal result SHA-256:
  `0d7932f01248693f19891b7c29a0f09191aef1ab32f58bfea672b219204e0c0b`.
- Plan SHA-256:
  `50d286c93719c74bdc97d6f425018cef35538465e677c2332d41f1616d411e0b`.
- Isolated runner `apps/backend/.provider-evidence/m4-context-pair-runner.ts`
  SHA-256 `689708078adc34e47eb250f63cad380b7c6c2a710f81d636616ecf3009c791bc`.

Verification: seven focused files / 47 tests, Backend typecheck/build, framework
links, format and diff checks passed. Content masking covers serialized messages
and defaults to metadata-only. Full DB suite, migrations, end-to-end report,
new sampling and topology selection were not executed by this slice.

## Brand-subject package — confirmed scope and protocol

The owner confirmed brand-focused first-layer extraction and task-relevant
context per Agent, rather than treating the prior nine-field control as a
universal input requirement. P4 changes instruction and field descriptions as
one package; input, structural constraints, target proof and final projection
remain frozen. It does not prove an isolated Prompt or Schema effect.

Acceptance emphasizes a short recognizable brand subject, no invented unnamed
teams/places, no combined independent brands, and no lost explicit brands.
Original name forms and evidence preserve branch/store scope. Geographic words
intrinsic to a brand stay intact. Named affiliation/partner brands may remain
scoped mentions without becoming recommended local providers. Current role and
position fields remain because competitor metrics consume them; cross-answer
grouping still belongs to #41.

First call: P4 on the retained public marketing answer. The explicit BlueFocus,
YCHOO and Xinxuan subjects must survive without branch decoration or invented
teams. WPP/Omnicom or partner brands, if included, must remain distinct and retain
their actual mention-only context rather than acquire the unnamed firm's role.
Check target absence, exact name forms, conditional meaning and source evidence
alongside brand coverage. Program normalization is not credited as model quality.

Only after that result passes agent semantic review, acquire one new answer to
the previously frozen public coffee question about Shanghai Jing'an, current
target 星巴克, then parse that unchanged answer once with frozen P4. No brand
name is injected into acquisition. This is an experimental question, not product
Query generation or a verified storefront profile. If the target is absent,
retain it and disclose the positive branch unverified, with no resampling.

Maximum three calls: retained Parser, independent Qwen acquisition, independent
Parser; Qwen3.8 low for Parser and current Qwen3.7 sampling route. Timeout 180s,
no retries/fallback, stop on transport/identity/structure failure or failed
retained-case semantic review, no same-batch changes. Use actual-message Langfuse
display and separate program projection/review; do not activate runtime or #49.

### Explicit absence-branch control after the P4 stop

The original P4 package stopped after its first rejected request; independent
sampling was not run. Audit found P4's shortened instruction removed P3's explicit
target=null mapping, though the Schema still permits null and earlier real calls
returned it. This is a falsifiable instruction difference, not a proven cause.

The existing brand-subject asset advances to 1.1.0, restoring only an explicit
companyName/absent-target/null workflow sentence and independence of other-brand
extraction. Freeze a separate maximum-one-call control against the same retained
input, exact output Schema, model, effort and endpoint. No acquisition, automatic
retry, format-mode change or further tuning is included. Retain v1.0.0's request
and rejection independently; the new result cannot retroactively accept it.

### Brand-subject results — 2026-09-05

The original P4 package executed 1/3 and stopped. The separately frozen explicit-
null control executed its sole call and stopped. No new acquisition, holdout,
automatic retry, mode change or runtime activation occurred.

| Package / fixed revision | Input / output / total tokens | Provider latency | Code acceptance | Agent semantic review |
| --- | --- | --- | --- | --- |
| P4 1.0.0 / `32fc3cc` | 1,464 / 2,860 / 4,324 | 56,267 ms | Rejected: false target and invalid proof | Rejected |
| Explicit-null 1.1.0 / `97ff78e` | 1,511 / 3,419 / 4,930 | 53,197 ms | Accepted | Rejected: scope, role/position and quotes |

Total 9,254 tokens, with reasoning already included in output. This is one
observation per package on the same retained answer, not causal, latency or
stability proof. Both requests used Qwen3.8 Flash low and returned model identity
qwen3.8-flash with finish_reason=stop. Neither specified a max_tokens cap.

P4 incorrectly assigned 元创互动 to the absent target 互动派. A displayed form
contained repeated structural debris and a field name absent from the answer;
mention evidence was not verbatim. The card nevertheless stated target absence.
Raw JSON passed structural validation, but the unchanged final acceptance guard
rejected missing valid name/mention proof. Shorter other-brand labels did not
compensate for false attribution and incomplete extraction.

Read-only wire audit confirmed intended input, instruction and Schema matched
the actual request, and normalized output equalled parsed raw model content.
Earlier calls used target=null successfully with the same nullable structure.
This does not establish a Provider/decoder defect. P4 had removed P3's explicit
absence mapping; restoring only that instruction was the separate control.

The control returned target=null and recognizable subjects 蓝色光标、元创互动、辛选、
有赞、微盟、WPP、宏盟, without branch suffixes or fabricated unnamed teams. However,
it also included certification/tool platforms, assigned sequential positions to
mention-only records, and flattened conditional recommendation. Some WPP/宏盟
quotes omitted source Markdown, so projection fell back to bare-name anchors
and lost position; this recovery is not faithful model quoting. The card also
expanded into an answer-wide summary instead of a concise absent-target reading.
Partial improvements do not accept the whole output or prove their cause.

Both independent quality reviews remain SEMANTIC_REJECTED, owner acceptance
pending. Next review first-layer identity, role/position, evidence and prose
responsibilities against real consumers before another candidate; do not solve
these failures with a growing blacklist or silently erase metric-used fields.

### Trace and protected evidence

- [Original P4 Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/98e763edd36c680b7bb5fa609a5f2865), read back at 10:39:10Z.
- [Explicit-null control Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/d5ad7ee66e47616ebb9fd000ed017a71), read back at 10:54:23Z.

Each private Trace has four observations: root, generation, program projection
or rejection record, and independent semantic review. Actual messages, request
Schema, model output, program result and usage match local evidence; credential
values are absent. Generation durations exclude post-run review/export delay.
The display is unchanged from the browser-verified preceding slice; this slice
reverified both new traces through the API, not another browser session.

Retain under #42 until decision/review: directories 0700, evidence files 0600,
ignored by Git. No raw response/reasoning or credentials enter repository history.

| Artifact | P4 | Explicit-null control |
| --- | --- | --- |
| Directory under apps/backend/.provider-evidence/ | m4-brand-retained-VaMaOl/ | m4-explicit-null-control-yz2E5N/ |
| Result SHA-256 | ac8f70467f23521a78b1451135c80bae2e7d906fe83d01ac88282f30fd8a708f | 2b800eada9012a5876376100e44cde33b27a0fc146887820477a61f078c14abf |
| Plan file SHA-256 | 303eb88e8b2e28071c0bfa78a2db95e6bd8ba0305ca836295e604ed907f4ffde | 7a4a18fa464640cf83d1c3f6da6fb5e108c41d9cd8f1aa4a61dc9da034f2af47 |
| Exact call-plan confirmation | 26bd186fea21e04df66560bdf456bfc369c90ebbf7d4d5e7972d78d154358fec | 2f4416f869f864b7422b3cd096ee40775807081d7ef354e662c821efbcc58a24 |

Verification: seven focused files / 50 tests passed, including metric-consumer,
immutable-control, actual-message display and telemetry masking coverage;
Backend typecheck/build, framework/Markdown links, format and diff checks passed.
Reuse unchanged display/browser and runtime evidence. Full DB suite, new sampling,
positive-target real evidence, synthesis, 4×5 and customer report acceptance were
not executed. #49 Prompt Management publishing remains outside this slice.

## Source-reference handoff — bounded protocol

The owner's output-first/task-handoff direction and current consumer audit select
P5: source-range selection instead of quote copying. P4 1.1.0 is the fixed semantic
control. Change only the source/evidence representation and its instructions:
replace originalAnswer with the complete ordered answerLines, and exactText/
occurrence with startLine/endLine. Keep all other context, brand/target/prose
fields, list/quote limits, model, effort and final projector. This is a coherent
handoff-package comparison, not a Prompt-only effect.

Offline checks cover unchanged P4/structural constraints, Markdown/CRLF/blank lines,
adjacent qualifiers, repeated occurrence identity, invalid/empty/reversed/oversized
references, both target states and actual metric consumption. A deliberately wrong
role/position/prose remains wrong after restoration: exact quoting cannot prove
semantic attribution. No new public or persisted source-reference contract.

Maximum one new Qwen3.8 Flash low call on the same retained natural marketing
answer (hash afe5f76ef7c4ade9061fcc8e56598e31d93a07853c3ff1c6ffb524e6389c7dda).
Timeout 180s, existing approved generic endpoint, no new acquisition, retry,
fallback, mode change or same-batch tuning. The previous P4.1 observation is a
non-contemporaneous reference, not a matched performance benchmark. Stop after
this call regardless of outcome; independent-answer and positive-target real
coverage require a subsequent frozen package.

Judge two dimensions separately: do selected source ranges resolve and retain
brand/relationship/condition context without quote loss, and does the entire result
remain faithful, complete and customer-readable? Inspect candidate inclusion,
target absence, conditional role, candidate order and card scope even if every
range resolves. Do not reward selecting whole-answer ranges or program recovery.
Keep raw range output, restored evidence and final projection separate. Export
the authorized actual messages and separate program result/review to a new private
Langfuse Trace. No runtime activation, #49 publishing or business record write.

### P5 result and isolated downstream loss

Fixed implementation `582d282`; exact confirmation
`f6233ad8e3272897c7c0bdd788af49f50366c5d6a67d87b6b806bda4805a3038`.
Executed 1/1 calls from 12:52:25Z on 2026-09-05; no acquisition or retry.
Qwen3.8 Flash low returned in 36,018 ms, input/output/total tokens
1,957 / 3,700 / 5,657, including 2,860 reasoning tokens already counted in output.
finish_reason=stop; code accepted, agent semantic review SEMANTIC_REJECTED.
Do not infer a speed gain from a non-contemporaneous single P4.1 reference:
the source representation adds input tokens, and total tokens did not decrease.

Source handoff passes this case: seven ranges across five unique source locations
resolve to exact source text, with Markdown, branch/affiliation and conditional
context intact. No quote-copying fallback or whole-answer reference was needed.
Target absence and concise card copy are faithful, seven short brand subjects
are present, and unnamed teams/certification/tool platforms are not emitted in
this observation. This is not stability or positive-target evidence.

Overall semantics still fails. Every brand is COMPARED, flattening conditional
choice and affiliation-only contexts. Current metric eligibility therefore has
zero competitor occurrences. Relative positions are all null while positionKind
is CONTEXTUAL, which projection normalizes to null. The structure is labelled
PARAGRAPHS despite headings and nested lists. None of these meanings is fixed
by mechanically restoring a source range.

The name/evidence distinction remains wrong too: observedForms contain Markdown,
relationship prose and a multi-brand heading. WPP and 宏盟 share exactly that
whole heading as a name. Existing normalized-form deduplication consequently
keeps only WPP, reducing seven raw records to six projected records even though
their source ranges are correct.

An offline counterfactual changes only those two observedForms to their separate
literal names and invokes the same projector: seven records survive, but eligible
competitor occurrences remain zero because roles are untouched. Original model
output and acceptance evidence remain immutable. A fictional two-brand regression
reproduces the shared-form collapse and isolated restoration without Provider use.
This proves the program's loss mechanism, not why the model chose those forms.

### P5 evidence and continuation

[Private P5 Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/00ff650152d1321e3cef98dd5847c06c).
API readback at 14:03:37Z verified all four observations: actual line-context
messages, request Schema/hashes, raw range output, separately restored evidence/
accepted interpretation and usage match the local artifacts. Independent review
is SEMANTIC_REJECTED. No credential values were present. The display is unchanged;
this slice did not repeat the earlier browser check or modify historical traces.

Protected directory `apps/backend/.provider-evidence/m4-line-reference-DoBC7W/`,
0700 with evidence files 0600, ignored and retained by #42 until decision/review:

- Result SHA-256 `e597509c071e09d4b28dd82655b8b96b5785db9250246845cc4624d28e29bfca`.
- Plan SHA-256 `b296b6d2e6bd1850d6208e21d545b8ea4c35e6656b4fd4f9783434e7f54c74db`.
- Runner SHA-256 `aa9cbd5e940c238c1653f125fffb2ef475b57f81eb41c6b22b462c14223ca756`.

Four files / 31 tests, Backend typecheck/build, fixed-diff independent review,
framework/Markdown links and format/diff checks support the bounded checkpoint.
No DB, migration, synthesis, independent answer, positive-target real branch or
customer report acceptance was run. Full-report/production quality is not claimed.
Next align individual name identity and local choice/mention/condition meaning
against report consumers, retaining current metric policy; only then freeze the
next comparison. Do not add an Agent merely because these semantics are unresolved.

## Identity/role transfer comparison — protocol

P6 is an instruction and field-purpose package on the unchanged P5 input and
source-reference Schema structure. It separates individual name identity from
relationship evidence and offered choices from benchmark/incidental/excluded
mentions. All classification remains a model judgment; current metric eligibility,
count/quote constraints, source restoration and final acceptance stay unchanged.

Maximum four calls, no retries/fallback/tuning: retained marketing answer with P6;
one natural Qwen3.7 Flash acquisition; independent answer with P5, then P6 using
Qwen3.8 Flash low. The independently frozen question is: 在上海市静安区，想找可以买到
现磨咖啡、适合短暂办公的连锁咖啡店，有哪些值得比较？ Parser target is 星巴克, with the
previously frozen coffee identity context. The actual acquisition request must
contain only the question/objectivity/search controls, not that target or profile.
This is public experimental input, not a newly approved product Query/store profile.

Freeze P6 before observing the new answer. All phases belong to this new manifest;
no stopped P0–P5 batch resumes. Review each arm's meaning independently after its
planned execution, preserving failures. Transport/model mismatch, invalid source
acquisition, structure/reference or code acceptance failure stops the remaining
requests. Timeout 180s per call; no resampling to obtain a preferred answer or
positive target. If absent, keep absence and report the positive branch untested.

Retained acceptance checks seven independent named subjects without shared prose
forms, context-faithful distinction of offered/conditional choices from affiliation,
meaningful ordering, absence, evidence completeness and concise card. On the new
answer, derive expected semantics from that immutable source, not from the known
brand profile or expected corporate relationships. Compare P5/P6 coverage, useful
source retention, role/position, target evidence/prose, token usage and latency;
one ordered pair does not prove causality, stability or general performance.

Keep each raw output, restored evidence, final projection and review separate in
protected local evidence and a private Langfuse Trace. No application import,
business DB, synthesis, #49 mirror, Hy3 or runtime/production activation.

### Transfer results — 2026-09-05

Fixed implementation `ec43f87`; exact manifest confirmation
`704121503c02a013d2bc96582f4f117555c49828691fcc0fa29d2e982735c60f`.
Executed 4/4 from 15:44:37Z to 15:46:35Z, with no retries, same-batch tuning or
resampling. All model identities and code acceptance checks passed.

| Stage | Input / output / total tokens | Latency | Review |
| --- | --- | --- | --- |
| Retained marketing answer / P6 | 1,897 / 1,459 / 3,356 | 16,680 ms | Semantic rejected |
| New natural coffee acquisition | 435 / 3,332 / 3,767 | 27,535 ms | Accepted platform observation, not verified business truth |
| Same new answer / P5 | 2,465 / 2,710 / 5,175 | 37,596 ms | Semantic rejected |
| Same new answer / P6 | 2,405 / 3,878 / 6,283 | 36,599 ms | Semantic rejected |

Total 18,581 tokens; reasoning is already included in output, including the
acquisition's nested usage details. P6's new-answer input uses 60 fewer tokens,
but total tokens increase by 1,108. No efficiency or stability conclusion follows
from a single ordered pair, especially with failed quality.

The new source hash is
`1a8a46fcd6390bbf8e6b45c03a3134f3319f88ed9b0bf511943fbd1b0dfedd41`.
The actual acquisition body contained the frozen query, objectivity and search
configuration, not 星巴克 or the Parser profile. The answer naturally mentions
星巴克 first. Search observation remains UNKNOWN; no actual search or real-world
store/brand-fact verification is inferred. Potential platform inaccuracies are
preserved as measurement, not silently corrected during parsing.

Retained P6 emits five brands, omits WPP/宏盟, assigns every item COMPARED with
position 1/CONTEXTUAL, and gives only the company name as card text. Absence is
correct, but current competitor eligibility becomes zero and customer explanation
fails. Raw name forms still contain markup/relationship material. All five source
ranges resolve, which does not make their associated judgments correct.

On the new answer both P5/P6 correctly identify target mention and position 1.
This supplies the previously missing naturally positive target observation, not
complete positive-branch semantic acceptance. P5 keeps Maxwell and Tims as separate
subjects at their shared third source item, but incorrectly makes Reserve a
separate recommended competitor and introduces outside translation correction.
P6 removes that false target-store competitor and shortens names, but omits Maxwell
from brand records and gives Peet's position 1 despite its selected second heading/
table entry. Some P6 raw name forms are not verbatim and are filtered by projection.

Both label Manner unconditionally RECOMMENDED despite the cited anti-office warning
and the source's limited large-store/light-rest conditions. P6 also infers favorable
Reserve coffee quality from an office-use recommendation; the unsupported claim
survives projection. Exact ranges therefore do not establish subject completeness,
the meaning of a recommendation, or entailment of an attribute. The three Parser
arms contain 5, 20 and 18 resolvable ranges respectively; preserved text is not a
reason to overlook dropped qualifiers or mismatched judgment.

Primary and independent read-only semantic reviews agree that all three Parser
arms fail. P6 is not accepted as superior. The next experiment should compare
smaller evidence-extraction and dependent judgment/expression responsibilities
against the complete frozen one-call task; topology remains unselected. This
batch is over, and no further call or Prompt edit is included in it.

### Transfer evidence and exit

[Private transfer Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/00574a94bfa8666d4777b3f12f4257af).
API readback at 15:56:30Z verified nine observations: actual acquisition/Parser
inputs, output, Schema/hashes, restored evidence and final projection, usage and
complete independent review match local evidence. Trace API confirms public=false;
credential values are absent. The prior browser/display evidence is unchanged
and was reused, not rerun. Generation timing excludes post-run review delay.

Protected directory `apps/backend/.provider-evidence/m4-identity-role-transfer-4hzKba/`,
0700 and evidence files 0600, ignored and retained by #42 until decision/review:

| Artifact | SHA-256 |
| --- | --- |
| Retained P6 result | 65d1f971b8180daec1a98cbe9a8020d6224949820396cce3c3889f35d7e40e26 |
| Acquisition result | cb9716ed8d9a943c56e0d81817e222c51b8a5474370d0a6e0ea3ec49984484fd |
| Independent P5 result | 7250a9385d66d0381d3ab9f250f3b9477f88acd7e410d1ef6f4d5ae9bb59fc20 |
| Independent P6 result | f1ad4aa91c126ac5c70531062643fe42e29a57bfc9a3969fb1b312a930c37609 |
| Plan | 4be38b8e7ee18039846d4ff391d2f9515c0d00775f00a045fbe214900d9e1a59 |
| Runner | fe22d79c14bb0e46391de4831b5d52df18b488f01c8beebff5b21d8e9e0ff2c4 |

Four files / 33 tests, Backend typecheck/build, independent fixed-diff review,
framework/Markdown links, format/diff checks passed. No business DB, migration,
synthesis, product report, runtime activation, Hy3 or #49 mirror was run. This
worktree remains the active #42 experiment owner; other worktrees are untouched.

## P7 task-load comparison — protocol

Freeze P6 single-call and P7 extraction/judgment before execution. For each of
the retained marketing (target absent) and coffee (target present) answers, call
P6, then extraction, then judgment if the extraction is structurally/source-valid.
Maximum six Qwen3.8 Flash low requests, timeout 180s each, no new acquisition,
retry, fallback, tuning, Hy3 or runtime activation. These are independent planned
arms, not retries of failed candidates. Transport/model mismatch stops all;
invalid inventory skips its dependent judgment, but not the other frozen case.

This compares coherent task/context packages, not task count alone: extraction
uses full source with necessary question/identity, judgment only selected source
lines plus the proposal, and P6 retains its frozen full context. The judgment
Schema, source restoration and final metric/prose requirements remain unchanged.
Preserve and review first-stage names/coverage/ranges, visible second-stage input,
raw judgment and final projection separately. All cited judgment lines must have
been visible to that task; missing context is a failure, not authority to infer it.

Check identity/target coverage, conditional recommendation, candidate order,
source entailment and customer readability on both answers. Report split total
tokens and summed serial latency, not only its faster component. The comparison
has one observation per arm/case and a fixed order; it establishes neither
stability nor a selected production architecture. Export a new private Trace
with actual messages and separate program results/reviews; keep history immutable.

## P7 task-load comparison — observed result

Executed 2026-09-05 16:49:45–16:52:21 UTC against `f7047e8`, confirmation
`75e835e5ce4e51ce553cb84950fbe196be3c9147cdb6a10bc4becfa85fda6d05`.
Five requests ran; positive judgment (06) was skipped under the frozen invalid-
inventory rule. There was no new acquisition, retry, fallback or post-result
Prompt tuning. P6 input hashes match the prior package byte-for-byte: negative
`2daf19d50385e41bc483d68bb3e0ee45f4662b2ffe56af7bf596e1b7ba851cda`,
positive `460acca84bca40d1a523c88e06a20f33d7f48e9236e2fe6b978e1e5e4925c10b`.

| Stage | Input / output / total tokens | Latency | Program result |
| --- | --- | --- | --- |
| 01 Negative P6 | 1,897 / 4,551 / 6,448 | 47,612 ms | Accepted |
| 02 Negative inventory | 1,671 / 1,861 / 3,532 | 17,799 ms | Accepted |
| 03 Negative judgment | 1,378 / 2,919 / 4,297 | 29,896 ms | Accepted |
| 04 Positive P6 | 2,405 / 3,164 / 5,569 | 32,097 ms | Accepted |
| 05 Positive inventory | 2,189 / 2,481 / 4,670 | 28,482 ms | Rejected by name-grounding guard |
| 06 Positive judgment | Not run | Not run | Skipped |

Total 24,516 tokens; reasoning is already included in output. Negative split
totals 7,829 tokens / 47,695 ms, versus P6 6,448 / 47,612: 1,381 more tokens and
essentially equal observed latency. Positive 4,670 / 28,482 is only extraction,
not a complete split cost or speed advantage. One observation per fixed-order
arm does not establish variance, reliability or general cost/performance.

### Absent target: names retained, relationship judgments still fail

P6 correctly reports the target absent, but emits platform noise, recommends
conditionally relevant/partner brands without preserving those relationships,
and produces a long whole-answer card. Its structure label is also unfaithful.
The inventory preserves all seven principal names (蓝色光标、元创互动、WPP、宏盟、辛选、
有赞、微盟), alongside 聚划算、天猫、巨量引擎. It selects only six of 45 lines
(9, 10, 11, 24, 25, 34) and labels the answer PARAGRAPHS.

Judgment improves the absent-target card, but labels all seven principal names
RECOMMENDED and gives them contextual positions 1–7. WPP/宏盟 are thereby promoted
from context to recommendations; the local conditions and partner relationships
for other names are flattened despite relevant wording being visible. All raw
quotes are visible and accepted by code. Both complete final outputs fail
semantic quality; clean names or exact quotes do not compensate for wrong roles.

### Present target: separate a guard error from actual information loss

P6 identifies the target and position 1 but retains only Peet's as another brand,
losing most candidate coverage; role/observation classification is also unreliable.
The inventory instead covers the target and all five other brands: Peet's,
Maxwell, Tims, Manner and Jia. Its `Manner大店` form is absent from Manner's own
ranges (36–44, 64), so the original per-record guard rejects it. However, Jia's
record selects line 69 containing that exact form: it is already visible in the
shared union. This rejection is an experimental validation overconstraint, not
proof the model fabricated a hidden alias.

Offline-only correction `c35824f` requires all forms in the visible union and at
least one name grounded in each record's own evidence. Hidden-source name recovery
and final anchor augmentation remain rejected. Corrected replay yields 45/69
visible lines, but line 34 (negative/group conditions) and table headers 59–60
are genuinely omitted. A lexical check does not prove same-brand identity or
semantic completeness. No sixth call ran, no historical result was overwritten,
and the positive split is still incomplete, not semantically accepted.

The first implementation also had a distinct pre-call defect: visible raw refs
could pass to the full-source projector, which recovered an unseen brand name.
Independent review and a red reproduction established it; `f7047e8` fixed it
before execution. The later shared-union correction has its own red-to-green
regression and focused independent review, without reopening that visibility hole.

### Evidence, decision and next boundary

[Private Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/e804069417e924adbd341485476ccfdb)
has root `0b1e8a44a9537989`; generation IDs in stage order are
`a3d744b3be835eb4`, `558836d2d1c947d7`, `2fef95c73828c70b`,
`1fbebb8be2c223bb`, `0cb09c3e8e65bd79`. Program-result observations are
`5353da9c6ff7d504`, `5e0141b4925b063b`, `fae477da20e0d9c4`,
`2d8069a13e33dde2`, `a817905508be965d`; review is `8b61b1b7d882d413`.
API readback verified all twelve observations: actual messages/Schema hashes,
raw outputs, restored/projected result or original rejection, usage and complete
review equality. Trace public=false; credential values absent. Review status is
`NO_WINNER_PARTIAL_COMPARISON`, not a passing Parser score. Post-run review delay
is excluded from generation latency. Unchanged browser display evidence is reused.

Protected evidence directory `apps/backend/.provider-evidence/m4-task-load-FZ639m/`
is ignored, 0700 with evidence files 0600, retained by #42 until decision/review.

| Artifact | SHA-256 |
| --- | --- |
| 01 Negative P6 result | 3c1d58dd6119acc3d044ffd9491df4779624ce7316f1c65f86c0a12c26a42a02 |
| 02 Negative inventory result | ce9091a102a854bdb0a2c851633ea7f343b03b7b9992978c2b6cb4f740988c66 |
| 03 Negative judgment result | ca20d54851eb7e856da7794929863a347e520f31374ce6a0f1b63e0df86bef10 |
| 04 Positive P6 result | a6aee4872773776b4d9b1b29fcf942d58a86662dce2d23b595c852892e15e34d |
| 05 Positive inventory result | d46455d6857e2c9867300c372d21a314489e358a447a50d9c44cf20b462a97a7 |
| Plan | 923366fb95c00673eb47c91f637d0f1764114b65c192e179d639281e3aad960c |
| Runner | 327ee3b671341a1969b4b8bfaf14791168380b7d8508d5bd706c6e97c1948427 |

Five files / 43 tests, Backend typecheck/build, independent fixed-diff/focused
correction review passed. No DB/migration, synthesis, product report, runtime,
Hy3, #49 Prompt mirror or other worktree change is included. Next define complete
structural/conditional handoff and isolate relationship judgment on already-
complete source before freezing another batch. The observed negative failure and
positive incompleteness do not select a production topology or justify another
Agent layer. This batch is ended; the offline correction does not resume it.

## Full-source task comparison — frozen protocol

Owner approved 2026-09-06: task-relevant context is not minimal source, explanation
may paraphrase faithfully, and the next comparison keeps the full original answer.
Use the two retained natural answers, no acquisition. At most six Qwen3.8 Flash
low calls: negative aligned single / inventory / full-source judgment, then the
same three positive arms. Each final task has identical full answer, four-field
context, Prompt, Schema and projector; only the inventory proposal differs.
The baseline is P6-derived with aligned context and a shared paraphrase instruction,
not historical P6. Existing extraction is unchanged, so its cost is included.

Inventory is mechanically checked for shape/ranges/capacity, not exact name
spelling or semantic completeness. Those remain review dimensions; a consumer
may repair omissions from the full source. No clipped-source guard is imported
into this full-source comparison. Raw outputs, program recovery and customer-
relevant correctness are scored separately; explanation need not be verbatim,
but attribution, negation, conditions, target identity and metric meaning remain.

Timeout 180 seconds, no retry/fallback/tuning/Hy3/runtime. Provider or returned-model
failure stops the batch; invalid inventory skips only its dependent final task.
Semantic failure is recorded after the planned independent arms, not used to
silently adjust later requests. Compare summed serial split time and all tokens,
not one component. Two fixed-order cases remain diagnostic, not a production
success rate. If no useful advantage emerges, do not add further task layers.

## Full-source task comparison — observed result

Six of six calls completed 2026-09-06 04:11:51–04:14:08 UTC at `3e310f2`.
Confirmation `3a50e5beb6f2bf9141e5521809bc0d331a2ae7d4560a033bbafc4fb710752d6b`.
No new acquisition, skip, retry, fallback, tuning or later call. Both final
request pairs differ only by inventory; all 45/69 original lines remain visible.
All six results were accepted by code; none of the four complete final outputs
passed independent material-semantic review. This is not a verbatim-text test.

| Case / arm | Tokens | Serial latency | Material result |
| --- | --- | --- | --- |
| Negative single | 3,921 | 18,641 ms | Raw absent target incorrectly added as another brand; projection removes it. Conditional/partner roles still flattened |
| Negative inventory + judgment | 3,319 + 4,624 = 7,943 | 14,452 + 23,837 = 38,289 ms | Final recommendation positions are source line numbers 9/10/24/25, retained by projection |
| Positive single | 5,674 | 29,961 ms | Target position 1 and all five other brands preserved; Manner's restricted office use becomes unconditional recommendation |
| Positive inventory + judgment | 5,650 + 5,015 = 10,665 | 28,372 + 21,780 = 50,152 ms | Inventory has all five other brands; final model emits only Peet's, at wrong position 1 |

Total 28,203 tokens. The split final requests have 1,664/2,048 cached input tokens;
cache and reasoning are already included in the reported totals. Fixed order,
one observation per case/arm and cache differences preclude a general speed,
stability or billed-cost claim. Both observed split totals exceed the single arm.

The inventories retain the seven principal negative-case brands and all five
positive-case other brands. The positive inventory also includes the table and
negative context. The second-step omissions therefore occur in model output,
not clipping or projection. Nonverbatim explanations, readable names and aliases
were not failure criteria. Both positive outputs contain useful target facts;
their empty `targetObservations` arrays do not mean those facts disappeared:
single's five observations survive in `recommendationReasons`, split's six in
`conditions`. The category placement is imperfect; do not misreport it as loss.

Decision: stop advancing this inventory/judgment split. A full-source single task
is the simpler working baseline, not an approved Prompt or runtime. Next address
material identity/role/position fidelity within that task and test a held-out
answer before a small actual report-path check. This batch does not prove all
splits ineffective or that the model cannot perform the task. Do not respond by
adding another Agent, clipping algorithm or blanket rejection guard.

[Private Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/d75fce5557c6be7229af795240ab187d),
root `4402769db9ed46aa`, review `7dab3499dc83e7d6`. Stage-ordered generation IDs:
`2a8cb0874027b654`, `52eae59f9db9ba00`, `09fcffef937ede45`,
`f232f09287ef80ef`, `366bf46fca87b413`, `77db990eb115a757`.
Protected directory `apps/backend/.provider-evidence/m4-full-source-WIxCUy/`,
0700 / files 0600, ignored and retained by #42 through decision/review.
Fourteen observations read back with actual wire messages/Schema, raw output,
program result, usage and full review equality; Trace public=false and credential
values absent. Final-arm equality and complete 45/69-line visibility were checked
again from saved requests. Existing unchanged browser presentation evidence reused.

| Artifact | SHA-256 |
| --- | --- |
| Negative single result | 7dc9ce760c0cd6205c219b8e64a74600a6eb332c9b2cb3fbf02098dca5132912 |
| Negative inventory result | c6c594e69ca954b1d2ee4ea41e7938aece0436712e67a0a6ecb516694702fcb9 |
| Negative judgment result | 33d97c918351973b34f0426d7c53d8fe3203d7343f7aec83019eef2f4650b53f |
| Positive single result | 9bc466a03ffd8f93c11f80f9e7ff746c71d0357abc1c92833fea4905b609434a |
| Positive inventory result | 47ec6e1ba122015a2bd586db47b783ddd08e192c7668ea1aab4aeea510ff9304 |
| Positive judgment result | d852e67907d72b7803894cfc2da76559e692d8404265ccb3ba23d17e3abc6809 |
| Plan | 6ea8f712fede8c6dee6fb66db5ca36da07a999beb4535e37a12b88f96ade60bb |
| Runner | 6e2a717ccd5267bad5faf93a524ab2649448ca181752d0f0f70e786088561b29 |

Verification: 5 files / 46 tests, Backend typecheck/build, independent fixed-diff
and semantic review, framework/links and diff checks. No runtime, DB/migration,
synthesis/report/browser, model/route switch, #49 mirror or other worktree change.

## Worked-example single-call probe — protocol

Freeze a Prompt-only candidate using two complete fictional demonstrations.
Full-source input, Schema, projector and Qwen3.8 Flash low route remain unchanged.
First run the candidate on retained negative and positive answers; the exact
baseline requests/results from the preceding full-source batch are reused for
semantic comparison, not a matched new timing claim. Then obtain one natural
answer for a frozen running-shoe shopping question in Beijing Chaoyang, and run
both baseline and candidate on that same answer. Maximum five calls in fixed
order: retained negative candidate, retained positive candidate, Qwen3.7 Flash
acquisition, new-answer baseline, new-answer candidate. Target identity (迪卡侬)
is for parsing only; actual acquisition input must not include it.

All independent arms remain planned despite semantic failure; Provider/model
identity failure stops the batch, and invalid acquisition prevents both dependent
parsers. No automatic retry, fallback, tuning, second acquisition, Hy3 or runtime.
Preserve actual source, raw output, projected records and useful/rejected meanings.
Evaluate material identity/condition/position errors, not exact paraphrase wording.
The new answer is held out from Prompt design, not statistical reliability proof.

## Worked-example single-call probe — observed result

Five of five calls completed 2026-09-06 04:42:49–04:45:49 UTC at `72930d4`.
Confirmation `1886b16f5afb399ab69762aa95be711c07884eec5bb268d1b389a2a1f2986b8b`.
Independent pre-call review found that changing outputContract.version also changes
the actual JSON Schema name. The correction preserves the entire baseline contract;
the new-answer wire bodies now differ only in the system instruction. Prompt
identity/version/hash is diagnostic metadata, not another model input variable.

| Stage | Input / output / total tokens | Latency | Result |
| --- | --- | --- | --- |
| Retained negative candidate | 2,472 / 3,796 / 6,268 | 31,659 ms | Code rejected; false target attribution and punctuation-only names |
| Retained positive candidate | 2,990 / 3,807 / 6,797 | 34,997 ms | Code accepted; local improvements, semantic review failed |
| New natural acquisition | 445 / 3,350 / 3,795 | 46,481 ms | Accepted natural answer; no target in actual acquisition request |
| New-answer baseline | 2,465 / 3,511 / 5,976 | 28,679 ms | Code accepted; useful facts, incomplete conditions/card |
| New-answer candidate | 2,990 / 4,309 / 7,299 | 38,461 ms | Code rejected; punctuation-only names and blank evidence line |

Total 30,135 tokens. Reasoning, cached tokens and acquisition nested x_details
are not added twice. Positive/new candidates each report 1,024 cached input tokens.
The fresh pair is fixed-order; historical retained baselines are semantic controls,
not new paired timing observations. No retry, fallback, tuning or additional call.

The new question asks about trying running shoes in Beijing Chaoyang on a 300–600
budget. Its 68-line answer naturally mentions 迪卡侬 as the fourth shopping stop;
answer hash `e4efad4a5a4cd56804a51567a199d77ae01427dc41be2e16432e579090c256bd`.
Neither that answer nor its names were used in the two fictional demonstrations.
Acquisition source claims about products/stores are not independent reality checks.

Independent semantic review distinguishes useful changes from acceptance:

- Negative candidate assigns 元创互动/蓝色光标 facts to the absent target and outputs
  punctuation in name arrays. Existing rejection is justified, not a wording issue.
- Coffee candidate keeps all five other-brand records and correct presentation
  positions; Manner becomes conditional. Its target observations survive as two
  recommendation reasons and three characteristics. However Manner's evidence
  selects the heading/value rather than office conditions, leaving only the
  heading after projection. Maxwell becomes mention-only; unsupported Reserve
  taste claims remain. A role label improvement is not complete evidence handoff.
- New baseline correctly identifies the target/position 4 and nine sports brands;
  target descriptions are grounded, but the card is only a mention statement and
  the international brands' discount/old-season budget conditions are flattened.
- New candidate's target card is more useful and mostly faithful, but names again
  become punctuation; source line 56 is empty and cannot support the appearance
  observation. Natural paraphrase and readable names were not failure criteria.

### Bounded diagnosis, not another Prompt patch

All four parsed raw Provider message contents exactly equal `result.output`, with
matching returned model and finish_reason=stop. Name corruption therefore precedes
local JSON decoding, projection and diagnostic display. Actual acquisition has
no target injection; final baseline/candidate wire settings and Schema name match.

Ranked hypotheses: (1) Prompt/model/structured-generation interaction remains
unresolved; a minimal name-output reproduction should precede another semantic
Prompt revision. (2) Forwarded-input/Schema-name drift is excluded for this batch.
(3) Local decoder/projector/display corruption is excluded for these name values.
(4) Merely excessive verbatim requirements cannot explain false attribution,
punctuation-only names or an empty reference. JSON Schema mode support alone does
not prove value quality or establish a specific upstream defect.

Do not activate this candidate or add a repair guard, Agent or automatic optimizer.
The single-call direction remains; its implementation outcome is still unaccepted.
The held-out failure prevents a claim that these demonstrations generalize.

[Private Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/8404c95d220f92e6c0549eccde80aa79),
root `fffa2690d5492c35`, review `cdda761e2bd54d83`. Generation IDs in stage order:
`c18455be53bb5e99`, `5c3586aa976412c1`, `b41db8540cfbd218`,
`57999bde6497e47f`, `bc1dc449f0f9cb41`.
Protected directory `apps/backend/.provider-evidence/m4-worked-examples-cfxHbl/`,
0700 / files 0600, ignored and retained by #42 until decision/review.
Eleven private observations read back: actual messages/Schema, raw output,
program projection or rejection, usage and complete semantic review match.
The matched wire comparison includes Schema name; Trace public=false and no
credential values were found. Unchanged browser display evidence was reused.

| Artifact | SHA-256 |
| --- | --- |
| Negative candidate result | 5697d53a3d05065e5f09d06105b9cea1d238d007a47e5486259db68e21dfaddc |
| Positive candidate result | b8f38d62718b91a9adc8c6138760ed240e4d314f936a7db579912bf8d3af110c |
| Acquisition result | 1d96d8496e4ae37a848d7b23e4d8df5f0afcf6c877feb8f843420609efc94eae |
| Fresh baseline result | f8478da4f36f9ff31dea6730b8d89e246300705d7305c3d6e5d4aa6d3e6df941 |
| Fresh candidate result | 35d07ca17dd399611b283ffa9240d73ff4ba5468b444e2a0a0bba4c32119e182 |
| Plan | 553b2e653f057c0cf3b392a20fb577b7c762148e12b5c8ed477eba6315da6c32 |
| Answer lineage | 85cbe811747b7f0488676b2dc255934249d1fda2c3c082ae487159f132f988cb |
| Runner | 63295b9d667a7a6423485835500cc788896949b0a2517f61396d64080f5fcc85 |

Verification: 5 files / 48 tests, Backend typecheck/build; after the wire-name
correction, affected 15 tests/typecheck reran. Independent fixed-diff/semantic
review and framework/links/format/diff passed. No DB/migration, actual synthesis/
report/browser, runtime, Hy3, #49 mirror or other worktree change is included.

## Name-array output-mode diagnosis — protocol

Owner approved continuing the bounded anomaly diagnosis. Freeze at most six
Qwen3.8 Flash / thinking=true / low calls, with the current endpoint and transport.
First a minimal fictional target/other-brand name-only task in strict JSON Schema
and JSON Object modes. Then replay the preserved failed shoe-answer request twice
per mode in alternating order: full strict A, full object A, full strict B, full
object B. Strict full bodies must exactly match the preserved request; each pair
changes only response_format. Replications are preplanned, not retries or tuning.

The name-only Schema reuses the actual name leaves and their constraints. Its
Prompt states the JSON shape and its tiny input has two named brands with aliases.
The full Prompt already includes complete output examples; no schema text or
semantic instruction is added during the comparison. JSON Object does not carry
the out-of-band Schema/descriptions, so this diagnoses the configured output-mode
package, not constrained decoding alone or a fair quality-equivalent deployment.

Use existing ProviderHttpTransport directly in the protected diagnostic runner;
do not alter ModelStudioProviderAdapter, routes or runtime. Preserve wire body,
raw message content, parsed output, name-array defects, code projection/rejection,
usage and latency separately. Readback must verify mode/settings and actual messages.
Primary observations are whether meaningful names are generated and whether the
preserved anomaly reproduces; secondary semantics cannot be inferred from names.

Timeout 180 seconds, no acquisition, retries, fallback, model/effort change,
post-result edits or later calls. HTTP/transport/model-identity/abnormal-finish
failure stops the batch. Invalid JSON/name values remain results, not triggers
for another request. Reuse unchanged runtime tests; preflight asserts exact full
replay, pair-only response_format difference and deterministic minimal expectation.

Ranked hypotheses: mode-sensitive upstream generation; full task/context load;
Prompt/example interaction; stochastic failure. Local transformation already
excluded by raw replay. These six observations can narrow, not establish universal
Provider behavior, production reliability or a model-internal mechanism.

## Reasoning-budget counterfactual — separate frozen protocol

The six-call output-mode batch is ended and immutable. It reproduced a punctuation
target name on one of two identical full strict requests; both full object
responses instead violate the complete contract. All four full calls report 4,096
reasoning tokens. Official documentation maps the current low setting to that
thinking-token maximum; reaching it is observed, causality is not.

Under the owner's continuing controlled-call authority, freeze a separate maximum
of two strict-medium requests on the exact retained full body. Only reasoning_effort
changes from low to medium (documented 16,384 maximum); do not also set thinking_budget.
No new Prompt, Schema, sampling, model, mode, retry, fallback or production change.
Same 180-second timeout and stop on HTTP/transport/model/abnormal finish. Both
replications are planned before either result, with separate trace and manifest.

Compare raw names, complete contract, meaningful conditions and actual usage to
the two already observed low strict replications; do not replay low just to fill
a table. Two unseeded medium observations are diagnostic, not reliability or
causality proof. End after these two calls; any further scope requires a new
decision checkpoint rather than a continuing parameter sweep.

## Name-array output-mode diagnosis — observed result

Six calls completed 2026-09-06 05:30:51–05:33:54 UTC at `702bef5`, confirmation
`bbd5da1440b2221c959be8b7df0f5a69f3035fe62057e2aead725256aa81f1cb`.
Strict full request hash `39526f05e7b20d656b5dac379ebc58aad578e42fd9a4214835649a88bd757bd3`
matches the preserved failed body. All calls returned the configured model,
HTTP 200 and finish_reason=stop; no acquisition, retry or fallback occurred.

| Request | Tokens | Latency | Name/contract observation |
| --- | --- | --- | --- |
| Minimal strict | 358 | 3,912 ms | Real names formed; target English alias omitted |
| Minimal object | 393 | 2,509 ms | Both brands and Chinese/English forms present |
| Full strict A | 7,990 | 44,130 ms | Names formed; code accepted, condition/evidence gaps remain |
| Full object A | 7,773 | 41,893 ms | Names formed; LIST/REASON enum values cause rejection |
| Full strict B | 7,889 | 42,694 ms | Raw target name becomes punctuation; projector restores target and accepts |
| Full object B | 7,970 | 47,768 ms | Names formed; REASON and evidence-count violations cause rejection |

Total 32,373 tokens. Both minimal modes can form names, so there is no universal
unsupported-array result. Identical full strict A/B bodies produce different
name quality; B reproduces the upstream punctuation symptom. Its final restored
`迪卡侬` does not turn raw failure into model success. B also omits 361°; role,
coverage and selected conditions remain separate review dimensions in all arms.
Neither full JSON Object output satisfies the unchanged complete contract.

Four full calls report 4,096 reasoning tokens, the documented low budget maximum;
both normal and malformed names occur at that value. This is a budget-saturation
observation, not proof it causes the anomaly. Full strict A has zero cache hits;
the other full calls have 2,048 cached input tokens. Counts already include cache
and reasoning; fixed-order samples do not establish pure mode timing or billed cost.

Decision: preserve strict runtime and raw/projection separation. Do not switch to
JSON Object or add a string-repair guard. A particular decoder mechanism remains
unproven. The separately frozen two-call budget probe addresses the remaining
load/effort hypothesis; it does not resume this ended mode batch.

[Private Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/fe524fdae3bba565a0159f7b93805fa0),
root `bc4b9726af5436c7`, review `cf96aacdfd1516c1`. Fourteen observations read back
with exact messages/settings, raw outputs/checks, usage and full review equality;
pair-only response_format difference confirmed, public=false, credentials absent.
Protected directory `apps/backend/.provider-evidence/m4-name-mode-g8ccbv/`, 0700 /
files 0600, ignored and retained by #42 until decision/review. Raw envelopes and
reasoning remain local, not exported to Trace or Git. Existing runtime test/build
and browser evidence are unchanged and reused; runner preflight and independent
scope/evidence review are the discriminating checks for this diagnostic.

| Artifact | SHA-256 |
| --- | --- |
| Minimal strict result | d7c538cd51ac5c354456f7f27f4ba8580cb09449f5647877879f722eef1d8f82 |
| Minimal object result | 7bf9a7bc4e7c133586a3a86b20c181a94b6b7d5e5a2f75a3aad59ecfbc9fe1cc |
| Full strict A result | dc9506880ff475b48685f584790491666a2180d33adcc71a1a32ee09420bc950 |
| Full object A result | d7797e7cd6a4bcad99ad83fe0a139114b41ad32bd3b15d4ebb7ff4f70f08c36a |
| Full strict B result | 6db12b3a3d6e95914332ba38c8fbde22a5f41723bfa48ebd641b05f2b936e771 |
| Full object B result | 2c2dc513d188e8c861031e479c522158681e9785373fdd96d3724c0aefb2aa8f |
| Plan | 884f646a541803d8a4638ad09a0ee60ba7b6e2ad2b7f4c16340742a8c8f7cf0f |
| Runner | 3105816da733b608658cde44f64cf8d07c4e62af6aaaf4071e7fa3282ee38184 |

## Reasoning-budget counterfactual — observed result

Two separately frozen calls completed 2026-09-06 05:42:28–05:46:57 UTC at
`fc5ffff`, confirmation
`866114f61e9c70e41b6b9bcb7f51a24a90f2041abf8adf2b187b765e9b7e47ac`.
Both request bodies hash to
`64275594dbfb22408863ecb5b4a7625737f1214828e9cd244623708bbf1a90a8`;
only reasoning_effort differs from the preserved strict-low request. Both return
the configured model, HTTP 200 and finish_reason=stop, without retry or fallback.

| Request | Input / output / total tokens | Reasoning tokens | Latency | Observation |
| --- | --- | --- | --- | --- |
| Full medium A | 2,964 / 5,508 / 8,472 | 4,202 | 90,363 ms | Names formed, all nine other brands, target position 4; accepted by code |
| Full medium B | 2,964 / 10,784 / 13,748 | 9,883 | 178,590 ms | Names formed, all nine other brands, target position 4; accepted by code |

Total 22,220 tokens; both batches together use 54,593 across eight calls.
Reasoning is included in output, not added again. Provider-reported input is
2,964 versus the earlier 2,990 despite unchanged visible messages; no hidden
Provider accounting explanation is assumed. A has zero cache hits, B has 2,048.
These fixed-order observations establish neither pure effort-related latency
nor monetary cost. B approaches the diagnostic 180-second timeout.

Independent semantic review confirms useful name, coverage and target-position
results, and a natural, faithful customer card in B. It also identifies material
residuals rather than demanding verbatim prose:

- A says 199–399 completely covers and is below the 300–600 budget's lower bound;
  that interval inference is false, even though the source supports the price.
- B calls ASICS recommended while its selected evidence requires an older season
  or a discount. The role does not preserve that explicit condition.
- Both call Adidas conditionally recommended, but their selected evidence omits
  the discount premise on source line 20. A correct role label alone does not
  provide complete evidence for the downstream semantic handoff.

Names are normal in 2/2 medium observations, and both reasoning counts exceed
the documented low cap. This supports investigating budget/task-load interaction,
not a unique causal conclusion: low already produced both normal and malformed
names. No reliability estimate or default medium promotion follows two unseeded
calls. Better surface structure is not semantic or runtime acceptance.

Decision: end parameter probes. Keep strict output and runtime effort unchanged;
neither JSON Object nor blanket medium is an accepted replacement. Next reconcile
one bounded single-call delivery slice around necessary semantic judgments and
complete source-evidence handoff, before another implementation or call batch.
Do not add Agent layers, source clipping, repair guards or a parameter sweep.

[Private Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/edfcffd50b384cc2e03d480da8b1e687),
root `80ef667387956de8`, review `0a7f742921842676`. Six observations read back
with exact messages/settings, raw outputs/checks, usage and complete review;
only-reasoning_effort difference confirmed, public=false and credentials absent.
Protected directory `apps/backend/.provider-evidence/m4-budget-counterfactual-AYgftT/`,
0700 / files 0600, ignored and retained by #42 until decision/review. Raw envelopes
and reasoning remain local, outside Trace and Git. Runner preflight, independent
protocol/semantic review and readback cover this diagnostic; unchanged runtime
test/build/browser evidence is reused. No runtime, current spec, DB/migration,
actual synthesis/report, #49 mirror or other-worktree change is claimed.

| Artifact | SHA-256 |
| --- | --- |
| Medium A result | 5f2760fe5c94a10bfc9dfaa849ada7291b29467e2fdb50970e7b384d2feb9a1d |
| Medium B result | aea4530e260db7aa74a3b2e50622bd070755f174e078c420c1eabc96ddefa076 |
| Plan | 7d08ccfc979961cfc25a04da454c87a325030ce8af6dbd88bdae3ac201856914 |
| Runner | ee669632f52d01dbcc54fca5498b1788d8a3dc629fa6c98de13cd362d3797f54 |

## Evidence-before-judgment — bounded protocol

Under the owner's request for efficient execution, test one isolated ordering
package, not another multi-option design round. Retain all fields with actual
consumers. Candidate reorders otherBrands in Schema/complete examples to names,
evidence, role/position and adds a positive instruction to select complete
qualifying context first. Field values/constraints/descriptions, full user input,
model, strict mode, low effort and final projector remain unchanged. Baseline
generation requests are deep-equal to the preserved worked-example inputs; the
shoe wire body is also byte-value equal. No property-order guarantee is assumed.

Freeze four calls before results: shoe baseline, shoe candidate, coffee baseline,
coffee candidate. Qwen3.8 Flash, 180-second timeout, same endpoint/transport and
private diagnostic telemetry. HTTP/transport/model/abnormal-finish failure stops
all; semantic/code rejection is recorded and does not cause retries. No new
sampling, fallback, Prompt edits mid-batch or later parameter calls. The two
retained positive answers are diagnostic, not held-out or absence validation.

Compare whether brand identity, roles, positions and selected condition evidence
remain faithful as a whole. Natural paraphrases need not be verbatim. Inspect raw
model output separately from program recovery; report all usage/latency without
inferring reliability or causal performance from one ordered pair per answer.
If no useful improvement, stop this candidate. If useful, keep it experimental
until held-out and actual report-path evidence; no runtime activation follows.

Pre-call evidence: 31 focused tests, Backend typecheck/build, exact historical
baseline and changed-package assertions. An initial package-script invocation
expanded to integration tests and met sandbox EPERM on Redis; it was interrupted,
then the exact two-file Vitest invocation passed. No database/service changes or
full local integration pass is claimed. Reuse unchanged telemetry/boundary tests.
Independent pre-call review caught a diagnostic-runner source mismatch: coffee
projection still used the shoe source. Correct it before calls and compare both
cases' known retained outputs against their own previously accepted projections.
Those offline assertions pass; the old provider outputs are not modified.

## Evidence-before-judgment — observed result

Four calls completed 2026-09-06 06:27:09–06:31:16 UTC at `4122bda`, confirmation
`5c967d0190d01793d81e7e315cfbb651b8a8a9798b7a175ed82e65d5f353d9ed`.
All returned the configured model, HTTP 200, finish_reason=stop, meaningful name
arrays and code acceptance. No acquisition, retry, fallback or follow-on calls.

| Answer / arm | Total tokens | Latency | Semantic observation |
| --- | --- | --- | --- |
| Shoe baseline | 8,137 | 58,955 ms | Nine brands and target position 4; shared discount evidence/roles incomplete |
| Shoe candidate | 8,474 | 88,262 ms | Target retained; same conditional defects, FILA lost (nine to eight brands) |
| Coffee baseline | 6,047 | 26,439 ms | Five brands/positions and Manner conditional role; other-brand evidence only headings |
| Coffee candidate | 8,195 | 73,362 ms | Five brands/positions retained; complete paragraph evidence carries meaningful conditions |

Total 30,853 tokens, reasoning/cache not counted twice. Shoe pairs have no cached
input; coffee pairs each have 1,024. Reasoning counts in order are 4,096, 4,096,
2,314 and 4,057. Each candidate uses 51 more input tokens. One fixed-order pair
per answer is not a causal performance estimate or reliability result.

Independent semantic review agrees with the scoped comparison. Coffee improves
from headings to substantive blocks: Peet's 16–25, Maxwell/Tims 27–34, Manner
36–44 and Jia 46–53. Manner's desk/seat restrictions and qualified office use
survive in final anchors; target line 67 preserves the Reserve distinction for
complex work, and the customer card is faithful. This is useful local evidence,
not failure merely because it paraphrases or shares a paragraph between brands.

The shoe candidate emits evidence before judgments, but Nike/Adidas/New Balance
still omit their shared discount premise at line 20 and remain RECOMMENDED.
ASICS includes its older-season/price context at 27–28 but is still RECOMMENDED.
FILA at line 39 disappears, although baseline retains its mention-only role.
The targeted cross-brand condition loss is therefore unresolved. Normal name
arrays in this batch do not establish that the previous punctuation fault is fixed.

Decision: keep the coffee improvement as evidence, stop property-order tuning,
and do not promote this package. The next narrow test case should explicitly
cover brands inheriting a shared upper-level condition. No extra schema field,
Agent, clipping system, runtime implementation or larger parameter study follows
from these four calls. Held-out, absent-target and actual report-path acceptance
remain outstanding.

[Private Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/a9a66a43eb1c66c55c80903c107f994f),
root `a8386f4b207f5bd7`. Protected directory
`apps/backend/.provider-evidence/m4-evidence-order-0DtJCJ/`, 0700 / files 0600,
ignored and retained by #42 until decision/review. Raw envelopes/reasoning remain
local, outside Trace/Git. Verification: 31 focused tests, Backend typecheck/build,
independent fixed-scope review, framework/links/diff and both CI checks at
`4122bda` passed; interrupted broad local integration invocation is not a pass.
No DB/service, actual synthesis/report, runtime, #49 or other-worktree change.

Ten private observations read back with frozen actual messages/settings, raw
outputs/checks, usage and complete semantic review equality; public=false and
credentials absent. Review `69ea321b7721bc8b` was missing from the first immediate
query and present on a read-only repeat; no duplicate publication or model call.

| Artifact | SHA-256 |
| --- | --- |
| Shoe baseline result | 14fd1c0276acbbceb17dae9daadab3d3a0556277c17ea23398e076402ab18952 |
| Shoe candidate result | e1aaf6d67e397e41c474c8029ee88a37eb93cfd1ed76188fd482ece71f3cdb4d |
| Coffee baseline result | 81e2bf0769da179f9aa42f71f9d4b902bc378775b44a30d562246072c47e126a |
| Coffee candidate result | 295f9c80dafeafd5d6febe1d4e328b4057a2e33334ecad42b2ac0d4df420934e |
| Plan | 9f45d9e2b64033f474d9f798356eaddddf411b9e0bc43bddcf5d10b15457ac4f |
| Runner | fada8a76c8fb4cb377cd59b1754409da8bd9863a848e6599f7a28cdfb6e4125a |

## Shared-condition demonstration — bounded protocol

The owner confirms stable, efficient iteration. Replace only the original
worked-example Prompt's absent-target demonstration with a fictional shared
booking condition, a direct recommendation with an ordinary drawback, and a
partner mention. Retain the positive-target example, total example count, Schema
including property order, complete task input, low effort and final projector.
No actual test-answer names or category-specific instructions enter the example.

Offline tests prove distinct names are not merged and each brand retains the
complete shared qualifier through exact source restoration and canonical evidence
anchors; existing metric eligibility is unchanged. Synthesis repository and task
builder pass this semantic record directly. This static path plus projection
evidence does not claim a DB-backed or real synthesis/report integration pass.

Freeze at most four calls: retained shoe candidate; one natural Qwen acquisition
for a new robot-vacuum question; matched original baseline/candidate on its answer.
Reuse the shoe baseline from the preceding experiment, disclosing it is historical
and not a fresh paired observation. Freeze recipes before acquisition and permit
only the new answer lines to populate them. Acquisition does not receive the target
brand, Parser remains Qwen3.8 Flash/low/strict, and all calls retain the existing
180-second diagnostic timeout. Provider/model failure stops the batch; unusable
acquisition stops its dependent Parsers. No retries, fallback or post-result edits.

Inspect full brand identity/coverage, roles, positions and qualifying evidence,
including raw versus program-restored results; allow faithful paraphrase. Compare
new baseline/candidate usage and latency without inferring reliability or billed
cost. Do not promote on JSON acceptance or a single pair. Stop after this batch.

Live main advanced to `6868732` via #66/#67 (writing workspace/brand foundation).
The change list does not modify Parser, synthesis input, metrics or process rules;
this branch remains on its existing base without rebase. No other-worktree writes.

Independent pre-call review identifies that the inherited introduction still
describes both examples as the same source. Correct only that candidate phrase
to different source/target situations alongside the replaced example. Baseline
and the positive demonstration remain byte-value unchanged; this necessary
introduction correction is part of the declared Prompt-only package.

## Shared-condition demonstration — observed result

Four calls completed 2026-09-06 07:02:53–07:05:31 UTC at `64152c6`, confirmation
`5f77ed42ba422254152624cf6e4473e456ea5fbe8641b0a51ddbe89221f5372e`.
All return their configured models and code acceptance. No retry, fallback,
post-result Prompt edit or fifth call. New source has 35 lines; target Ecovacs
appears naturally, source hash
`09ca8909cccc47bd522e3d62b926ff72104ba32c6988cf33ded5628393437275`.
Search observation is UNKNOWN; platform product/store claims were not separately
fact-checked. Existing acquisition/objectivity and privacy boundaries are reused.

| Stage | Total tokens | Latency | Finding |
| --- | --- | --- | --- |
| Retained shoe candidate | 8,137 | 57,543 ms | Nine brands; useful condition roles, but Nike/Adidas shared evidence still missing |
| Independent acquisition | 3,666 | 50,253 ms | Natural robot-vacuum answer matching the frozen Shanghai question |
| New baseline | 4,575 | 23,894 ms | Core brands/order and target facts retained; line 30 already represented |
| New candidate | 5,681 | 25,893 ms | Same core coverage; main-unit/base-station fact error, no overall quality gain |

Total 22,059 tokens. New candidate adds 1,106 (about 24%) and 1,999 ms in this
pair. It has 1,024 cached input tokens versus baseline zero; these observations
do not establish causal timing, a cost percentage or reliability. Reasoning,
cache and acquisition x_details are included, not counted again. The historical
shoe baseline comparison is not a newly matched timing experiment.

Independent semantic review confirms useful retained role changes: Nike, Adidas,
New Balance and ASICS become conditional; New Balance line 24 and ASICS line 28
support conditions. FILA remains. Nike/Adidas still omit shared discount line 20.
Other-brand positions all become 1; this is not established improvement, nor does
the nested source prove one uniquely correct alternative ranking.

On the independent answer, both arms retain target Ecovacs, table position 2 and
the three other robot brands. The candidate changes source line 9's **main-unit**
cleaning convenience to **base-station** cleaning in its card. Line 8's base-station
dust-box description belongs to Roborock; the changed part is not paraphrase.
Target preference line 30 already exists in baseline recommendationReasons;
moving it to conditions is not recovering lost evidence. All brands becoming
conditional is not automatically better: general recommendations at 3–11 are
followed by preference situations at 30–32, not uniform necessary preconditions.
Other-brand references still omit those later preference passages.

The batch ends here. Keep local gains and counterexamples, do not promote the
candidate or append more similar examples. No real synthesis/report acceptance.

### Zero-call handoff diagnosis

The retained actual output is immutable. Only Nike's evidence references vary in
two separately labelled offline counterfactuals; role, position and program code
stay fixed. Existing result hash is checked before and after.

| Reference selection | Restored condition | Final Nike anchor condition |
| --- | --- | --- |
| Actual lines 18 + 22 | No | No |
| Counterfactual lines 18 + 20 | Yes | No |
| Counterfactual continuous 18–20 | Yes | Yes |

This distinguishes actual model omission from the existing projector's per-span
brand-name filter. It disproves that the current contract cannot carry any shared
context. Synthesis repository/task construction passes the semantic record without
rewriting these anchors; that is inspected path evidence, not a DB-backed or live
synthesis test. Next address identity anchoring versus qualifying-context handoff
at this concrete boundary, not automatic source guessing or a global guard change.
Independent narrow review confirms the three-arm replay and original result hash.

[Private Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/97c570393db7c71fb2238c3009b3e50c),
root `aeae094e2580aa30`. Protected directory
`apps/backend/.provider-evidence/m4-shared-condition-KlTRQ4/`, 0700 / files 0600,
ignored and retained by #42 until decision/review. Raw envelopes/reasoning remain
local, outside Trace/Git. Verification: 33 focused tests, Backend typecheck/build,
independent pre-call and semantic review; after the introduction fix, all 33 and
typecheck reran. Framework/links/diff and both CI checks at `64152c6` passed.
No DB/migration, actual report/browser, runtime, #49 mirror or other-worktree change.

Nine private observations read back with actual wire messages/settings, outputs,
source/program projections, usage and complete semantic/diagnostic review equality.
The new pair differs only in system instruction on the actual wire; acquisition
input contains no target name. Review `c3ba3207d22e7041`, public=false and credentials
absent. No raw envelope/reasoning is exported and no further model call occurred.

| Artifact | SHA-256 |
| --- | --- |
| Retained candidate result | 2da625ec1b1459592518f802438beabc944c4d6b7cad0ca4a3cf9c5c807742b8 |
| Acquisition result | 3f75f6beab125a7c8093c977fb1c00db926b21fff59149f509720fdefb674ff8 |
| New baseline result | b67bba0c903bc558db5fdc12d030d4ed581465559cd3c2e2aaec97b69cc337aa |
| New candidate result | bfbbaf3b0cc25cc0a30839af2fdf67148184c92dc11601a55706e8a9e8fdd8f5 |
| Plan | 9cc50cecf55455d289cd70d11c52f1a42b6fdc7e3cd22416208b7b611fb49f91 |
| Answer lineage | 2a48c99958563bca6be1f267cb7abb16db4a73cf417440fc7e1161f296b63847 |
| Offline handoff | 268fabc40a9672ef5c1fec4c692d978842e60866a70b346f05eada99ca044827 |
| Runner | ef15f47c7b05dfb501977b4ec7e312a968cce9c69027c2fe474f68f932152598 |

## Customer-value scope — owner recalibration and bounded protocol

The owner confirms: no inventory→judgment split; target prominent points and
sentiment plus sample summary; other brands only recognizable subjects, source
positions and positive-recommendation eligibility. Do not demand competitor
condition/opinion extraction, exhaustive role categories or independent target
condition fields. Pure negative/non-recommendations stay out of competitor counts.
Keep useful excerpts, with natural summary wording; existing exact source-range
restoration is a program capability and does not require model quote copying.
Minor part-wording such as the discussed main-unit/base-station phrasing is not
an independent rejection gate under this customer reading level. PR #48 is past
reference; synthesis need not adopt its compact context or strict candidate form.

Historical raw results and original verdicts are not rewritten. The new rubric
prioritizes omitted/invented brands, unsupported positions, wrong dominant
positive/negative meaning, negative-only eligibility and materially misleading
summaries. The previous conditional-role and tiny wording gates no longer own
the frontier. An explicit question remains for overall positive recommendations
with ordinary drawbacks; the reversible probe uses the existing overall-reading
assumption and does not activate any statistical policy.

Freeze at most three Qwen3.8 Flash/low/strict calls on retained robot, coffee and
absent-target agency answers. Compare with saved baseline outputs under this same
rubric, not the old verdict labels. This is a smaller Prompt plus model-contract
task package, not a Prompt-only or contemporaneous performance comparison.
Full answer, question and target identity stay available; no new sampling,
retry, fallback, parameter sweep or runtime import. Timeout 180 seconds. Stop on
Provider/model failure, record invalid structured/source output without retries.
Keep actual input/output, diagnostic source restoration, positive-list view,
usage/latency and human-level review distinct in protected evidence and Trace.

The task deliberately has no old-role/category translator and no canonical
report acceptance. Formal implementation/consumer reconciliation remains later.
Main observed at start is `189e1cc` (#69 article backend); it does not alter this
Parser/metric path or the project process. No rebase or other-worktree write.

## Customer-value scope — execution metadata

Three frozen requests completed 2026-09-06 08:29:23–08:30:03 UTC at `0f99bc3`,
confirmation `122e975c43b92c1f44863fcb281c9c077feb7a40189765a415aeba45badfff82`.
All returned the configured model, HTTP 200 and finish_reason=stop. Experiment
Schema/source validation passed; this is deliberately not canonical report
acceptance. No new acquisition, retry, fallback or fourth request.

| Stage | New tokens | Retained baseline tokens | New latency | Retained latency |
| --- | --- | --- | --- | --- |
| 01 | 2,691 | 4,575 | 8,771 ms | 23,894 ms |
| 02 | 3,451 | 6,047 | 19,890 ms | 26,439 ms |
| 03 | 2,882 | 6,268 | 12,047 ms | 31,659 ms |

Total 9,024 versus 16,890 tokens (about 47% lower), and 40.708 versus 81.992
seconds (about 50% lower). These are three retained, non-contemporaneous,
unseeded comparisons of different task packages; no production reliability,
causal speed or billed-cost reduction is established. New reasoning counts are
331/336/656 and new cached input counts are zero; do not count them again.

The local review uses the owner's revised scope, not old conditional-role,
verbatim-summary or component-wording gates. A raw target-name array in stage 01
contains a structure fragment despite valid Schema/source references. That
internal defect remains open and was not repaired by diagnostic validation;
occurrence below the former thinking cap also precludes attributing every such
name fault to budget exhaustion. Other business-level review content remains
in the protected local review artifact rather than being republished here.

Automated safety approval rejected the separate semantic-review upload to
Langfuse, interpreting that derived payload as beyond the existing call-log
authority. The command did not execute. No retry or alternate upload route was
used. Existing call logs may be read back; review publication requires explicit
owner authorization. This is distinct from the already emitted actual call IO.

[Private call Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/9f83c58a64a4d9998d5be2ecd0918872),
root `6d43dec037fb5a97`. Protected evidence directory
`apps/backend/.provider-evidence/m4-customer-summary-VhCcUI/`, retained by #42,
ignored, directory 0700/files 0600. `semantic-review.json` is local-only pending
approval; raw provider envelopes/reasoning are not exported. Verification: 40
focused tests, Backend typecheck/build, independent scope review, framework/
links/diff and both CI checks at `0f99bc3` passed. No DB, live synthesis/report,
runtime, migration, production or other-worktree change is claimed.

Read-only verification returned seven existing private observations with exact
actual messages/settings, raw output/source checks and usage equality. Frozen
requests/full context match; credentials absent and public=false. Separate
reviewPublication remains NOT_UPLOADED_APPROVAL_REQUIRED; no remote review
equality or publication success is claimed.

| Artifact | SHA-256 |
| --- | --- |
| Stage 01 result | 7f7c1f14880c40533b54db5c85ec2146a4713086de5342c840b3731658924759 |
| Stage 02 result | d9f5b858ba5f6e4c96d99517a38a5fec436ecde2be7410fb44ca5601ab9877eb |
| Stage 03 result | 241a62b04cc4b2ad0b35c998f7ae24fbadc45177b06c3e10fc96f2d110a95b33 |
| Plan | 281636e55453ec0ce21b8e710c586e4196f1d57bb09c8c5170f9fbc052e39803 |
| Local review | 730b8e31d7af7ee65e980015de4d99c72ddd7f2632e8f0165132f66369b748ec |
| Runner | cd18b90d88602c3fe6a12d44e6e31947fd6ca125025c10d2a350556033928e04 |

## Known target identity — owner decision and execution

The owner confirms that overall-positive recommendations with ordinary drawbacks
remain eligible. Independent semantic review stays local by choice; this is not
a pending upload authorization. Historical upload-rejection records above remain
unchanged. New telemetry exports only actual model messages/output and operational
call metadata, without program-projection or independent-review observations.

Experiment 1.1.0 removes `target.displayedForms` because request `companyName`
already supplies that identity; null remains a model decision, never reconstructed
from the input label. The Prompt also states the confirmed eligibility rule.
Other-brand naming, target points, full source, reference restoration, strict
mode and low effort are unchanged. This is a task-package comparison, not an
isolated field-removal causal test. There is no canonical report adapter.

At `28933f3`, the three retained answers were replayed once each on 2026-09-06
09:02:15–09:03:04 UTC. Manifest
`d7cd70af6682281bccd92b63ba8728565ecbb063a51f4b82e09f1aed577c72cd`;
maximum three Qwen3.8 Flash calls, timeout 180 seconds, no new sampling/retry/
fallback/tuning. Provider/model/finish or Schema/source failure stops the batch.
All returned HTTP 200, configured model, finish_reason=stop and passed the
experimental Schema/source check. Detailed semantic comparison remains local;
competitor coverage/name-grounding limitations still prevent promotion. No new
held-out or actual customer-report evidence is claimed.

| Stage | New tokens | Previous 1.0.0 tokens | New latency | Previous latency |
| --- | --- | --- | --- | --- |
| 01 | 2,587 | 2,691 | 17,607 ms | 8,771 ms |
| 02 | 3,136 | 3,451 | 12,123 ms | 19,890 ms |
| 03 | 2,877 | 2,882 | 19,208 ms | 12,047 ms |

Total 8,600 versus 9,024 tokens, 48.938 versus 40.708 seconds. The lower token
count does not establish faster execution, lower billed cost or stable quality.
These are retained, non-contemporaneous, unseeded observations, not an independent
test set. New reasoning counts are 261/468/503; cached input is zero in each.

The [private IO Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/eb3334c90686c2ef342a8bb3f3727d83)
has root `159291e29a2eb8e4` plus exactly three generations. Readback verifies
actual messages, output, settings, usage and private visibility; no derived
observations or credentials. Protected local artifacts are retained under #42 at
`apps/backend/.provider-evidence/m4-customer-identity-N7kfgA/` (0700/0600).
The semantic review and restored diagnostic output are local-only. Existing
historical observations were not deleted or edited.

| Verification claim | Evidence | Result and boundary |
| --- | --- | --- |
| Smaller contract, null/source handoff | 41 focused Parser/reference tests | Passed; serialized diagnostic view only |
| Type and packaging compatibility | Backend typecheck/build | Passed; runtime imports unchanged |
| Approved scope and fixed diff | Independent review of `426e022..28933f3` | Ready for experiment only |
| IO-only logging | Private Trace readback, four observations | Passed; review/projection not exported |
| Report/held-out quality | Not exercised | Not verified; remains next bounded work |

Main was rechecked at `5157521` (#70 customer workspace); it does not change this
Parser/metric path or project methodology. No rebase, migration, activation,
production change, other-worktree write or #49 Prompt Management claim.

| Artifact | SHA-256 |
| --- | --- |
| Stage 01 result | 75195fbb2bfc7ebe1a0680009653c775cc3dfe62e1846cf429081c1c5a58910e |
| Stage 02 result | e157603bb5dcb0ad0220b0cec51edca692a25ff4288656fc1eecf5a2a5b57b1b |
| Stage 03 result | bfeacd6484d8ae9400a48a0eaae87a3a5c4c586bd845f2460bcb28795f02020d |
| Plan | c7597f6627015401c1f4df51dff84fe4101e6a470194db578438a2c5c0bcb82f |
| Summary | 42f17f0a7fdea68a53ca410cb9fc75fc4a3c8277eddb62bdb92de65d4db4bc5b |
| Runner | 18671fd61ecd83154000cf23a3d6f0807dbfce34d783cd26343b331aadbbb38a |

## Brand records and absence ownership — execution

At `7fe7b58`, experiment 1.2.0 removes generated `observedForms`; restored source
still carries actual wording. It moves model summary into non-null target and
derives a simple absence display when target is null. No mention inference,
semantic repair, alias lookup or legacy contract adapter is introduced.

Manifest `135fea342b1580ed2b2b6af66e00e45d3c80de3d584fda0c867995a92ad663a4`
froze at most five calls: retained coffee/absent candidates, one new natural
Qwen3.7 Flash acquisition using the existing route, then Qwen3.8 Flash low/strict
1.1.0/1.2.0 parses of the identical new answer. The target was fixed before
sampling and absent from the acquisition wire. Exact old Schema/wire equality
and fixed new-source recipes were verified before execution. No tuning, retry,
fallback, sixth call or runtime activation.

All five completed 2026-09-06 09:34:27–09:36:17 UTC, configured models and valid
acquisition/experimental Schema/source results. The natural answer is preserved,
not a statement of real-world brand or product accuracy. Detailed semantic review
remains protected locally. Useful structural simplification does not establish
overall quality gain; a raw shared-item eligibility/position residual remains.
An offline equality check confirms source restoration does not change those
identity/position/eligibility values. Do not promote this package on JSON success.

| Stage | Tokens | Recorded latency |
| --- | --- | --- |
| Retained coffee candidate | 3,541 | 12,600 ms |
| Retained absent candidate | 2,578 | 8,483 ms |
| Natural acquisition | 4,276 | 67,907 ms |
| New-answer 1.1.0 baseline | 2,323 | 7,851 ms |
| New-answer 1.2.0 candidate | 2,920 | 12,808 ms |

Total 15,638 tokens/109.649 seconds includes acquisition. Parser-only total is
11,362/41.742; the candidate did not reduce new-pair token usage or latency.
This is one matched, unseeded new-answer comparison, not a reliability, causal
architecture, or billed-cost conclusion. Reasoning/cache are already included
in provider totals and are not counted again.

42 focused tests, Backend typecheck/build, independent fixed-diff review,
framework/links/diff and private IO readback passed. The [private Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/9e6b5a348238f1f3a983ed6b734e6eb1)
contains root `6187eb08e5a81f3b` plus exactly five generations. Actual model
input/output/settings/usage match; trace is private, with no credentials,
derived observations or semantic-review upload. Local evidence remains at
`apps/backend/.provider-evidence/m4-brand-records-Xt8i2A/` (0700/0600), retained
by #42. No actual synthesis/report/DB/migration/production acceptance or #49
Prompt Management completion is claimed. Other worktrees remain untouched.

| Artifact | SHA-256 |
| --- | --- |
| Retained coffee result | 994db115ea94aed96691ac66566d22003a65eaa3b59d7e793a46f81edabc7511 |
| Retained absent result | aa381783e0c6c733263836a976701a5b5907656cb83f912530ce8107d93bff58 |
| Acquisition result | 4aedec96cfc081e8969aa2daa9ae75d66574e615d1a12255d6c141fb6adb44ca |
| New baseline result | 2ec2eac7a3435bf0a4bfa5bd449865882e4d9f9bdda7a82a2ecf0874d0eabdc8 |
| New candidate result | 14c326696fc9269bf1cde1d798f5a03bc587e0bf3f319b482d629ec71ce0cc3f |
| Plan | c23d28025ca35e6c733547111c0be1a2570d05172a5c3e1c7a793107ea4a5344 |
| Answer lineage | 156df6dafbf78dbc691ae70a556b7d6e30325a88fc3dc198d041c491632e96a8 |
| Summary | 9252eb24f3d88e584c283fd230c0fe4e503fd859dbe0a1e35799381d3c12bc57 |
| Runner | fa415abb1e454bf0dadf0347eeab5c5dd255a3432723e4ea4230c7612faf76ce |

## Owner-directed real analysis chain — execution

The owner supersedes hypothetical name replacement and asks to inspect a real
sampling/Parser/synthesis result. This run uses the three accepted Interaction
Pie open questions in the archived #26 [real-query review](../../archive/2026-09-04-implement-ai-query-generator/real-query-review.md#final-accepted-evidence),
not fabricated brands or manually rewritten sample text. Existing natural Qwen
acquisition, unchanged Parser 1.2.0 and one experiment-only synthesis 1.0.0 are
connected through actual outputs and restored source excerpts.

At `a75a5be`, manifest
`f60e1d5cc9d43a09d81dcfd0320e165d00f39f698ae0531bb9d511aadd2febd7`
freezes seven calls and concurrency at most two. Execution completes 2026-09-06
09:59:45–10:03:33 UTC. No retries, fallback, source rewriting, manual parse repair
or eighth call. All seven return the configured model and pass their bounded
stage/Schema/source/reference checks. Natural acquisition wire contains only the
accepted open query and objectivity instruction, without target-name injection.

| Stage | Calls | Tokens | Cumulative call time |
| --- | --- | --- | --- |
| Natural acquisition, Qwen3.7 Flash | 3 | 49,073 | 248,190 ms |
| Parser, Qwen3.8 Flash low | 3 | 6,698 | 21,510 ms |
| Synthesis, Qwen3.8 Flash medium | 1 | 4,041 | 26,865 ms |

Total 59,812 tokens. Wall time is 227.304 seconds because calls partly overlap;
do not add call durations and label them wall time. Two acquisition calls trigger
search (one and three searches respectively); the third reports `UNKNOWN`, so
no search-trigger conclusion is drawn for that call. Search and
cached-input usage stay in their provider-reported totals, without double-counting
reasoning, cache or nested usage details. This batch is acquisition-dominated;
it is not a multi-platform performance benchmark or billed-cost calculation.

The unedited local preview combines final synthesis, original answers and actual
parses. Independent local review verifies source hashes and field-by-field
handoff equality. Its result is useful for discussion but not final customer
action acceptance: the synthesis guidance still needs a grounded distinction
between platform descriptions, current brand facts and suggested next actions.
Detailed business-level review remains local. No strict minor-wording rubric is
reintroduced, and the superseded name counterfactual is not executed.

47 focused tests, Backend typecheck/build, framework/links/diff and independent
experimental code review pass. A generated-reference length edge found during
review is rejected before external execution; this batch uses short s1/s2/s3 IDs.
The [private IO Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/745622badd70eb32c2d576d7601d0eff)
has root `19482029305b3392` plus exactly seven generations. Readback confirms
actual model IO/settings/usage equality, private visibility and no credentials
or derived/review observations. The preview and independent review are local only.

Evidence owner #42 retains
`apps/backend/.provider-evidence/m4-live-open-chain-PmUTIk/` (0700/0600).
Three open questions on one platform cover analysis stages, not the direct
question, formal 4×5 readiness, official report UI/database/recovery or production.
No legacy role adapter or formal metric-policy change is introduced. #41 retains
final synthesis/report ownership; no #49 Prompt Management completion is claimed.
Main observed at start is `5fb4400` (#71 optimization workspace correction), and
other worktrees are not modified.

| Artifact | SHA-256 |
| --- | --- |
| Plan | f3017b693a950a24ceeccda7e56a3c395251a2a0d5cda7e2eb65c94a87679354 |
| Summary | 9bda921e98aa35e2de6d8a60251cba5a9eaea30c6b476835aa7591e84446615a |
| Actual synthesis handoff | e52683c25cf73b5c3b13fde9e81f74e001f94ddc3171a093d8b31a477862ddb7 |
| Preview | 8003d21be2a74ac16f438e88d538a8ba3d4a546c614b88857d6b621a65be5838 |
| Readable report | 944d29cb9edb57f0d0145d2f6e5f4231d62a3613df5592a12c452d57be9fd264 |
| Synthesis result | f04040ca90e46be4fcd5119bd22991304e391405d9d30488e41d7512ca2984f6 |
| Runner | a5a2c60476a3bf11ea224e4e24958ac78179b8343221ce67025f219cbcd4c634 |

## Owner-directed four-question merchant matrix — execution

The owner accepts practical directions, retains the historical shared-item case
for observation and explicitly approves real merchant four-question/five-platform
testing with reasonable concurrency. This supersedes mandatory fine-wording
calibration and further hypothetical name replacement. No earlier raw review is
rewritten as passing evidence.

At `9e62f8408d1b29f3e7d3200166905a8b9893bb8c`, manifest
`400eb8dc1bf4087b8112de30b23075f15adfd3213749745cee8a3794892c3c12`
freezes one owner-specified real restaurant, four ordinary consumer questions,
the existing five acquisition routes, current direct Parser, unchanged open
Parser 1.2.0 and experiment synthesis 1.1.0. The consumer needs do not establish
merchant facilities; withdrawn/manual POI fixtures are not promoted into accepted
Brand/Query truth. No business record is written.

The bounded pool permits five external requests globally. Each acquired answer
is parsed immediately within its slot; started calls settle on failure. Quota or
nonretryable access failure stops queued work at the affected boundary. The
reviewed runner permits at most 41 calls with no retries, fallback, billing
activation, route changes or second batch. Pool success/exception settlement is
checked offline before execution.

Execution completes 2026-09-06 12:46:24.863–12:52:16.877 UTC. All 41 Provider
calls return their configured models. All 20 acquisitions pass; 19 parses pass
stage checks, one direct parse is rejected for malformed generated name fields.
Four direct and fifteen open samples enter synthesis. Coverage preserves one
unavailable sample, not an absent target. No access gate fires. A previous
unavailable-route observation does not describe this batch's successful routes.

| Stage | Calls | Tokens | Cumulative call time |
| --- | --- | --- | --- |
| Natural acquisition, five existing platforms | 20 | 292,692 | 809,173 ms |
| Parser, Qwen3.8 Flash low | 20 | 44,000 | 210,082 ms |
| Synthesis, Qwen3.8 Flash medium | 1 | 23,026 | 109,705 ms |

Total 359,718 provider-reported tokens, peak concurrency five. Wall time is
352.014 seconds; sampling/parsing reaches its barrier at 240.829 seconds and
synthesis takes another 109.705 seconds. The small remainder includes local
processing and telemetry shutdown. This run misses the owner's three-to-five-
minute preference. It is neither a production SLA nor a linear scaling or billed
cost estimate. Eighteen acquisitions report triggered search; two report UNKNOWN,
not proof of either search success or failure. Nested/cache/reasoning totals are
not counted again.

Local practical-quality review finds mostly useful readable per-sample results,
but rejects final identity/statistics acceptance: target identity confusion,
unnamed descriptions counted as brands, category-based grouping of distinct
brands, and model prose contradicting program coverage. One direct Parser
malformed-name failure remains separate. These are material statistical errors,
not fine wording. The final suggestions remain useful for discussion. Detailed
business-level review and raw output stay protected locally, not copied here.

Offline replays verify all source hashes, every accepted parse, the complete
synthesis handoff and preview. The direct path uses the existing canonical
projector and can lose raw observations; it is not claimed to be unprocessed.
The open path retains actual parsed values and restored excerpts. Independent
review confirms the identity/grouping failures exist in raw model outputs, not
file transfer. Schema and valid member IDs do not establish same-brand identity.

34 focused tests across the synthesis handoff, customer Parser and canonical
Parser contracts pass, along with Backend typecheck/build, framework/links/diff
and scoped independent code/runner review. This is not a full runtime/UI/DB or
recovery test suite. The [private IO Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/b20ab4409bea560d66d2a29eda65464e)
contains root `bd1d29be2f40a57f` and exactly 41 generations. Readback confirms
actual model IO/settings/usage equality, private visibility and no credentials,
derived observations or independent semantic-review upload.

Next use the retained real failures and an unaffected control for a small
identity/statistics replay, frozen separately. Keep full source, single-call
parsing and broad directions; do not automatically introduce a critic, alias
database, extra tables or a mandatory one-call/two-call comparison. Another
merchant matrix follows discriminating repair evidence, with measured timing.
The current candidate is not accepted for runtime or formal 17/20 reporting.

Evidence owner #42 retains
`apps/backend/.provider-evidence/m4-merchant-matrix-LeoVP1/` (0700/0600).
#41 keeps synthesis/customer-report ownership, #32 remains completed, #39 stays
open and #43 awaits the stable execution projection. #49 Prompt Management
mirroring is not completed by call logging. Main observed at `5fb4400`; no rebase,
merge, production change or other-worktree mutation occurs in this package.

| Artifact | SHA-256 |
| --- | --- |
| Plan | 2b0b2aadc594012adaddbbe16153aaa3d5dd809243bd474ddfc9a96350a11c63 |
| Summary | f731131550b00524102f8394329c1933f2d085db62edf55c02a1fc05c084a9a6 |
| Sample lineage | eff67e4e0b4c55f7fc5d3bb35df28277dafcd5418b04c41bbea22517a8a17e81 |
| Actual synthesis handoff | 175266349b10465a00b35add4be6f6e180c80c5966d8f01d5927b4f2b932d91c |
| Preview | 956c384d6c3bb76c7cdfa85ee96b8af2b045f6656e3a959ba2ffafd09ebb20ac |
| Readable report | c81760a94a68c1644d7cd984be37f6c4be9636351cef8a0397da7f0110cf4a06 |
| Synthesis result | b39120e68509c3f9800b97365db64f45559de7f6c21b01bb2ae8efe913266351 |
| Runner | c9102fbc066d00f7606f988cd612428fbef20be2e6b873eb10b177830f1ab5f8 |

## Owner correction and practical Prompt replay — 2026-09-06

The owner confirms that the two target names behind the preceding local review
are one consumer-recognizable brand. Withdraw that target false-positive finding
and the corresponding literal-name-only conclusion. The original evidence is
unchanged; the review now has a visible correction. Brand meaning is not defined
by exact spelling, legal-entity identity or a newly invented alias registry.
This correction does not make thematic grouping of unrelated brands valid.

At `c22c02dd0e0ae9b4aa64ce7b4bbfd0f6c22ac490`, manifest
`607f051014bb154e4a27c682529476bd274c4648f9866e97826f84647c041ad1`
freezes seven calls on retained real answers. Parser 1.3.0 changes instructions
and supplies the owner's plain brand context; the matched synthesis pair changes
only the system instruction, keeping the same actual three new parses, remaining
retained records, input, JSON shape/name, model and effort. It is not a causal
Parser Prompt-only comparison. No source answer, old result or metric is patched.

Execution stops after five calls, 2026-09-06 13:32:14.972–13:33:39.094 UTC,
84.122 seconds wall time, 48,141 reported tokens, peak concurrency two.
All five Provider calls return successfully. Three parses pass stage checks;
both synthesis outputs pass JSON shape but reference nonexistent brand-record
IDs and fail the unchanged reference check. The baseline uses sample IDs where
brand-record IDs are needed; the candidate generates nonexistent record IDs.
The planned repetition and other-business candidate are **not run**, not passes.

| Stage | Tokens | Latency |
| --- | --- | --- |
| Retained Parser 1 | 2,000 | 9,903 ms |
| Retained Parser 2 | 2,375 | 10,227 ms |
| Retained Parser 3 | 2,426 | 9,853 ms |
| Synthesis baseline | 20,647 | 45,819 ms |
| Synthesis candidate | 20,693 | 63,698 ms |

Local review confirms more consistent handling of the owner-confirmed name in
two answers, but the broader Parser instruction also introduces unsupported
position shifts in another retained answer. Do not promote the 1.3.0 Parser
package or call shorter rejected synthesis results a successful speedup. Retain
the useful owner-context seam while restoring the earlier Parser instruction.

The next narrow repair is finite-choice reference wiring in the existing
synthesis Schema, rather than additional Agent layers or stricter brand identity.
The model should choose an already supplied record ID, not invent one. Semantic
grouping still requires actual output review; finite choices prove no legal or
consumer-brand relationship. A new four-call package is frozen separately in the
active design; the stopped package is never extended.

36 focused tests, Backend typecheck/build, framework/links/diff, fixed-diff and
runner review pass for this experimental slice. Three retained Parser inputs
are checked against their old full source/context and JSON shape. Six private
observations (root `38de4d3f30195b68` plus five generations) are read back with
matching actual model IO/settings/usage; no semantic-review or derived report
upload. [Private IO Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/d7e75fbef6bd4a22d4775fea647a6e8d).
Local-only evidence: `apps/backend/.provider-evidence/m4-practical-replay-tYx5fC/`.

| Artifact | SHA-256 |
| --- | --- |
| Plan | 520dcd46e1644a110eb3c2ee8a8c2f2d47dec34192b84c1ab5e1a5e69f42d1c2 |
| Summary | e877ec332679a337c4161b6831ff98625624d2e77342f284140cbc966b6705d2 |
| Actual handoff | c50baafc44329f50fe5926585a9134abaf1ccd576e11dd474b6df024754c7061 |
| Baseline result | aca9dd0acf006a14bcdd59c7c156e3c94bc86b1440466edf146ca715db46957e |
| Candidate result | 719b1342ba3e53790443361aaaa9c338b87eb4c3721578fc221008fda1723cde |
| Runner | eba83d44507a6a34e2a7cb0c1c3ad4e8cd1f81846ee6c6ec0ff9bdc772ecbbc7 |

## Finite reference choices — independent repeat

At `aee1de697de9a465e4bb18ff7f57176ea926a13c`, manifest
`8c019c55bcd70d9a404e2a489bcbf8c544aa6a14a541127e0e3727f2bd1e9e08`
freezes a new four-call package, not continuation of the stopped experiment.
Parser 1.4.0 restores the 1.2.0 instruction plus an explanation of optional owner
brand context. Synthesis 1.3.0 retains concise instructions and supplies separate
finite sample/brand-record choices in the wire JSON Schema. Counts, source text,
brand semantics and runtime remain unchanged by code. This is a contract package,
not a Prompt-only comparison or an automatic repair of retained model output.

Two retained open answers are parsed with actual outputs entering the same
19-available/20-expected handoff; two identical full-input synthesis requests run
independently. The original direct-Parser rejection remains unavailable. No new
sampling, fallback, automatic retry, model/effort/billing change or fifth call.

All four calls complete 2026-09-06 13:42:14.163–13:43:14.141 UTC, 59.978 seconds
wall time, peak concurrency two, 45,223 provider-reported tokens. Provider,
structure, source and reference checks pass. Wire readback confirms identical
repeat requests, including Schema and all model parameters.

| Stage | Tokens | Latency |
| --- | --- | --- |
| Retained Parser 1 | 1,934 | 8,033 ms |
| Retained Parser 2 | 2,600 | 11,345 ms |
| Synthesis candidate | 19,274 | 38,821 ms |
| Independent identical-input synthesis | 21,415 | 48,156 ms |

The second synthesis reports 15,360 cached input tokens; input total is 15,986
for each. Do not count cache twice, label batch wall time a full four-by-five
evaluation, or infer a causal speedup from earlier changed-input/failed results.
The earlier full-matrix 352.014-second measurement remains the only current
full-scope timing evidence.

Local review confirms useful Parser position/noise improvements and consistent
recognition of the owner-confirmed name. It also finds a further model-inferred
brand relation not established by the supplied context; this is not converted to
a fact or a legal-entity verification task. Both synthesis outputs now choose
existing IDs, but still attach mismatched brand records to a group. The second
output includes several useful groups, yet the overall grouping result remains
unaccepted. No semantic success rate or formal metric is claimed.

37 focused tests, Backend typecheck/build, framework/links/diff and scoped
independent implementation/runner review pass. Exact enum wiring to existing
sample/brand IDs is checked offline. Independent real-output review distinguishes
the verified reference fix from unverified semantic correctness. Five private
Langfuse observations (root `ba3865882a3b27e8` plus four generations) match actual
IO/settings/usage on readback. [Private IO Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/09332732de938ffb92528a8b65f7e852).
Raw output and business-level review remain local at
`apps/backend/.provider-evidence/m4-reference-choice-42Fa9Q/`.

Stop this turn's real calls here. Next make the grouping input's record/name
pairing and necessary context simpler; do not keep appending naming prohibitions
or select a new Agent topology from reference success. Keep the owner-confirmed
consumer brand meaning, the single Parser and all original results. No runtime,
official report/UI/recovery, second merchant, #49 mirror or main merge acceptance.
Main remains observed at `5fb4400`; other worktrees are unchanged.

| Artifact | SHA-256 |
| --- | --- |
| Plan | a6eacd9a819c8228220b6dcebb0d815d1e9adcdf2cc6f5602391bb4d75422da0 |
| Summary | 6924c57399bda81979f438b9d4291bc57a5d6178abc0d011c1a53f3e967e866d |
| Sample lineage | 9007e1fb7bbe762e03ac33b27122c8e07ad94372067f9e32d9dda62ca1e29ae6 |
| Actual handoff | a0d214ea8f2099568a755f17fe9053ddf7929198a9ced2c7bcee29c6923bf586 |
| Identical wire check | a81123529c3b415e26ed24e4d8306c71aece869f3f1bb1959513cd6028558ffb |
| Candidate result | ced37eae5d067b8f59f094780ba26abdbd462508daaf343b1f79c0fe0c5e7e3f |
| Repeat result | 97e06078f561de57f310e2f1b4bc9a363da8b098afc2590e20459d2a6aa6379e |
| Runner | e3c4195b50468739ca79c94c2368c02c005f8b42c39bc698b67b543fbc254651 |

## Lossless flat layout — rejected candidate

The owner confirms the observed store-name grouping is reasonable and the two
other-brand records assigned to the target are incorrect. This provides concrete
positive/negative checks without a stricter entity or spelling standard. The
owner approves testing input organization as a hypothesis, not a proven cause.

At `31b4df9fd94ea9a7c38bb339aa1159b9a0492c3e`, manifest
`29e177259ec37a20bd8a909151967e570ca5973bdad8c320db49585a1c6ea61e`
freezes two original/flat synthesis pairs, maximum four calls. Both arms use the
same retained 19 samples and 45 brand records, instruction, finite-reference
Schema/version, model and medium effort. A pure optional projection moves other
brands into a root list with ID/name adjacency and parent sample IDs, keeping all
record fields and excerpts. Target descriptions and question/platform information
remain separately in samples. Round-trip reconstruction proves no source clipping,
semantic alteration, renumbering or program-count change; default input is intact.

Execution stops after the first pair, 2026-09-06 14:25:17.776–14:26:18.644 UTC.
Both Providers return successfully. The baseline assigns some records twice and
fails the existing membership check. Flat layout passes references but puts all
45 records into one consumer-brand group, including the owner-confirmed wrong
members; the valid store-name grouping is not retained as its own group. This
candidate does not meet practical quality. The second pair is **not run** under
the frozen stop condition; no third pair or tuning is appended.

| Arm | Input tokens | Output tokens | Latency | Result |
| --- | --- | --- | --- | --- |
| Original layout | 15,986 | 7,854 | 60,203 ms | Repeated membership, quality rejected |
| Flat layout | 16,275 | 3,469 | 50,359 ms | Valid IDs, incorrect all-record grouping |

Total 43,584 reported tokens; 60.868-second batch wall time, concurrency two,
zero reported cached input in both arms. Flat context is 30,525 characters versus
29,777 in the original because parent IDs are explicit; token reduction was not
claimed. Shorter output/latency does not make incorrect grouping an improvement,
and this one incomplete pair establishes neither long-run quality nor a universal
claim about flat input. Reject adoption of this specific layout as the fix.

The raw request pair is checked offline after the stop: everything except the
user-context layout is identical, and source/count reconstruction remains exact.
38 focused tests, Backend typecheck/build, framework/links/diff and independent
fixed-diff/runner review pass for the projection, not the semantic candidate.
Three private observations (root `3334d6c1f33fc091` plus two generations) match
actual IO/settings/usage on readback. [Private IO Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/e921be522564307ef025a4787c716352).
Detailed raw output and business review stay local at
`apps/backend/.provider-evidence/m4-flat-layout-sLVXnw/`.

The next separately frozen two-call diagnostic removes target narrative/context
and asks only for grouping the same brand records. It changes task, context and
output scope together, rather than rerunning the layout hypothesis. It does not
select runtime topology or add an Agent/queue. No new sampling, Parser, retry,
fallback, model/effort change or production activation occurs.

| Artifact | SHA-256 |
| --- | --- |
| Plan | 414489b25f4c47b8d11383c7e76f9c642ac077a9dfd6c3d62b009ab67317a18c |
| Summary | d116f978b4b074022059334d430470659d74d1c0d3ec2f476c45bb92771fd256 |
| Actual handoff | 11063fc0be0786e09b82256915ea98888232e3710864db3dd53cfa68da1d8a47 |
| Original result | e96dacc02a324c78d9cc42a038d8eed3997f41fc9a1e8b7b9aed3e5575532bac |
| Flat result | f894b94d9bb81e4c45307636692098641671efe123dfb8bea8a753267bd1e4ca |
| Runner | eab999159a0129104ccd19fcf034953af6bfefc0b145374e533ca2e411192ba7 |

## Focused brand grouping — useful but incomplete transfer

After the stopped layout pair, `43eac1d9d8c80186a74c8f876b69c306c6eabe47`
records a separate final diagnostic with manifest
`6ff80b951f91410080c06af69b9ebd9ff0f8a835d16c8d6dd027ab1b2a8abfe6`.
Two identical requests receive the same 45 brand records, all record fields and
excerpts, but no target narrative/context or sample-theme generation task.
Output contains only name groups with the existing finite brand-ID shape.
The current Qwen3.8 Flash medium route, original record eligibility, membership
uniqueness and distinct-sample counts remain unchanged. This changes task,
context and output scope together, not only input layout. It adds no runtime
Agent or accepted topology and does not constitute a complete report.

Both calls complete 2026-09-06 14:36:09.498–14:36:53.616 UTC, with valid group
structure/references. Identical actual wire requests and equality of all 45
source records are checked. No acquisition/Parser call, automatic retry,
fallback, model/effort/billing change or follow-on batch occurs.

| Call | Input tokens | Output tokens | Latency |
| --- | --- | --- | --- |
| Group-only 1 | 11,413 | 3,951 | 42,651 ms |
| Group-only 2 | 11,413 | 3,890 | 38,226 ms |

Total 30,667 provider-reported tokens; wall time 44.118 seconds, concurrency two.
The first call reports 11,264 cached input tokens and the second zero. These are
grouping-only timings, not a complete synthesis or four-by-five evaluation.
Do not infer total-runtime savings, billed cost, or long-run stability.

Independent local review finds both outputs avoid the owner-confirmed erroneous
target assignment. The second returns seven broadly reasonable groups under
the supplied context and accepted consumer-brand meaning. The first still
misassigns one store-qualified member and leaves some repeated names separate.
Its leading preview counts happen to equal the second result, but this does not
make the memberships equivalent or establish formal ranking acceptance. Retain
both outputs rather than selecting the better repetition as proof of success.

This supports testing more focused responsibilities in the next minimal report
composition; it does not prove that target context alone caused the prior error,
accept a two-Agent architecture, fix source/Parser residuals, or complete #41.
Keep all successful per-sample facts and program statistics separate from model
name grouping. Check combined report consistency and total calls/time before
choosing execution or recovery changes; new workflow components are not implied.

The same 38 focused projection/contract tests, Backend typecheck/build and
framework/links/diff evidence remain applicable; no tracked executable code
changes after `31b4df9`. The focused runner has its own bounded read-only review
and offline group-membership/count checks. Three private observations (root
`c8b45826def8d540` plus two generations) match actual model IO/settings/usage on
readback. [Private IO Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/6d3f80f60dd86b7cbbba49b6d22270c8).
The raw results and business-level review remain local at
`apps/backend/.provider-evidence/m4-group-focus-gSak1w/`.
Main is observed at `5fb4400`; no formal report/UI/DB/recovery, #49 mirror,
production, merge or other-worktree change is claimed.

| Artifact | SHA-256 |
| --- | --- |
| Plan | 1f56233f2acad61ef6a2f77958eae69c7698a84946e2e2a5780f97bdbc30aab7 |
| Summary | dab67ff3cf824e169b995c84054f2cccfa90e745b469dc1fba342812e7955385 |
| Grouping handoff | 8173eb601c5b9b4451e192c8a0ae7f5ea59748323d1bc6e19f514e625e158fe0 |
| Identical wire check | 93f5158a90781fb43a6047202de20aa75394c1ce3a5cd6e8d18b2e1beb7be491 |
| Result 1 | 25f41300045d725ed3fdbdee686d09186d755aa47fbd0c1207f09c9bcba6ebac |
| Result 2 | 1a0ce7be67c62c20697237da21e82f13e5b5bf39bc9f6b0969aae58191e25cb6 |
| Runner | d9754bc5dc51f626108712fdc77cad6bcdb5efb18a18b153dbd49a106afc7d58 |

## Minimal report composition — one preview, repetition rejected

The owner approves continuing the focused-role experiment and assessing later
optimization against whole-evaluation time. At
`d17f01aa13dfa693245bcfbc55d2c049b469bf51`, manifest
`ca8c7240b85979eb8f00af52baef04274dfdc4a0e101c5709a57b3973c5ce3b8`
freezes two parallel grouping/narrative pairs, maximum four calls and concurrency
two. The retained 19-sample/45-brand handoff and all upstream ambiguities remain
unchanged; there is no acquisition, Parser call, retry, fallback or tuning.

The new experiment-only helper reuses the exact focused grouping instruction,
brand records/excerpts and finite member Schema. Its asset version is now
`experiment.m4.brand-grouping@1.0.0`; historical wire-name equality is not claimed.
Target narrative `experiment.m4.target-narrative@1.0.0` gets target evidence,
sample summaries, question/platform scope, owner context and program coverage,
without the other-brand list. It writes the existing overview/themes/directions,
not competitor grouping/ranking or numerical statistics. Both raw components
must pass existing structure/reference rules before an unchanged program preview
is assembled. Default synthesis, formal runtime and current contracts are intact.

Execution runs 2026-09-06 15:21:05.381–15:23:18.282 UTC. All four Providers succeed.

| Round | Grouping | Target narrative | Complete composition | Combined tokens |
| --- | --- | --- | --- | --- |
| 1 | 71,238 ms; 17,818 tokens | 19,754 ms; 7,015 tokens | 71,255 ms, preview produced | 24,833 |
| 2 | 61,357 ms; 18,284 tokens; rejected | 11,293 ms; 6,119 tokens | Not assembled | 24,403 |

Total 49,236 reported tokens and 132.901-second batch wall time, peak concurrency
two. Round one reports no cached input; round two reports 11,264 grouping and
4,096 narrative cached tokens. These are complete analysis-component costs,
not billed amounts or a new four-by-five run. The only full-evaluation timing
remains 352.014 seconds, with a 240.829-second acquisition/Parser barrier.
Do not add historical stages and present the result as a measured new runtime.

Local independent review accepts the first preview's seven concrete groups and
practical narrative/count agreement under the retained input. The second raw
grouping emits 30 groups and 40 repeated-membership occurrences, adding thematic
categories after concrete brands. Its early groups are also not an exact clean
copy of the first result. The ordinary membership validator rejects it before
assembly; no second report exists. Keep the failed output, not only the good
first preview, and do not trim its tail into an invented successful response.
Detailed business review and upstream identity/unnamed-record limitations remain
local, including their propagation into a target narrative. Neither semantic
identity correctness nor formal customer-report acceptance is established.

Offline replay confirms identical actual HTTP bodies for each component across
rounds. The duplication is in the original model return, not created by code
assembly or changed input. The model visibly expands name grouping into thematic
classification; the causal contribution of long context, free group-list shape
or nondeterminism remains unproven. Existing tests already reproduce duplicate
rejection, while valid references deliberately do not certify brand identity.

Next test only whether one assignment per supplied record is a better output
expression than a free list of member groups. This may remove duplicate
representation but cannot guarantee semantic identity. Keep the useful narrative
scope, original evidence and single Parser; do not add an Agent, critic, category
blacklist, strict alias store or runtime persistence. No fifth call is appended.
Bring the supported candidate to another merchant/full timing only after this
reachable report failure has a bounded resolution or an explicit disposition.

40 focused tests, Backend typecheck/build, framework/links/diff and independent
fixed-diff/runner review pass for the experiment. Independent semantic review
separately confirms one useful preview and the second failure. Five private
observations (root `0489f1b3b6368df7` plus four generations) match actual
IO/settings/usage on readback; root IO and derived review are absent.
[Private IO Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/0a89b77025df1f32eb8a0d89679c1753).
Raw artifacts, local reports and review are retained under
`apps/backend/.provider-evidence/m4-report-composition-LiCmha/`.
Main remains observed at `5fb4400`; no merge, rebase, production, other-worktree
change, #49 mirror, formal UI/DB/recovery or selected runtime is claimed.

| Artifact | SHA-256 |
| --- | --- |
| Plan | 667e38cd1bb079ed5d44a00f91ab08a81f878da7892bd04b6ca9b8c47d10f389 |
| Summary | 4f47d53358e72f24fb2beed0a04f9515b5a4808d0785f9d20d9b255b3c3e405c |
| Composition handoff | 92ceeb0409661d586a41896130dd93c5fe323ef37c5f06618fe3c64807b0624f |
| Grouping 1 | ae4cdaa03bb33f54a8d1d7bc8d604ce0f1e0bd87b132a6166267ef50b0489b5b |
| Narrative 1 | 9d371b6139770623223fe03bf572fbc5777cbefbc7f35729692bfa07b1e335b8 |
| Grouping 2 | 9967e9690e7c196119c13107c7a1f0c987a3a71d7c51cc3af5542a35dfd14ad8 |
| Narrative 2 | 4f9ea3dc7ba1595c207a3fc351547238dbbb5ab9574d55852131aeae90f3742b |
| Preview 1 | c5a2da959c7b9a7f0702fcc703e04c8ddfcfe420f9e178e208cc9d3d4f7c2d6a |
| Runner | 1f928f0c247cdef62eabba830193b046234a2963baf35fb943e17995cd2e426b |

## Grouping effort comparison — retain medium without contract expansion

The owner asks whether thinking level changes actual results and prefers
interpreting supplied answers without external correction. At
`d86d3fba603a45e163fd40f353cbe83b722b25cc`, manifest
`8f1b0bca570380d47a8e31928d99f50a336edf9d11cfd5d0455a5cc39b40101b`
freezes two grouping calls each at low, medium and xhigh. The existing Model
Studio adapter receives experiment-local copied route definitions; runtime
defaults/catalog, Prompt, Schema and model are unchanged. Offline capture and
all actual requests match the prior composition grouping wire except effort.
All 45 brand records and source excerpts remain. No search/tools, new sampling,
Parser/narrative calls, retry, fallback or mid-batch tuning are introduced.

The three concurrent pairs are low/medium, xhigh/low, medium/xhigh. Maximum
concurrency is two and request wait is 180 seconds. Known member-validation
failures would be measured outcomes, not triggers for extra calls; Provider,
finish or unexpected Schema failures would stop queued pairs. All six finish
successfully with valid structure/references and finish_reason=stop, without
triggering the stop condition. Time is 2026-09-07 02:49:41.917–02:55:55.693 UTC
(September 6 local), 373.776 seconds for the entire six-call comparison.

| Effort | Latency, repeat 1 / 2 | Reasoning tokens, repeat 1 / 2 | Combined total tokens | Local practical finding |
| --- | --- | --- | --- | --- |
| low | 58.898 / 54.755 s | 4,096 / 4,096 | 32,140 | Main named groups reasonable; one uncertain unnamed grouping, one omitted member |
| medium | 41.812 / 54.230 s | 4,320 / 6,009 | 34,086 | Same seven member partitions, consistent with retained context |
| xhigh | 158.858 / 155.727 s | 14,331 / 13,915 | 52,111 | One same partition as medium, one extra uncertain unnamed grouping; no added quality benefit |

Total 118,337 Provider-reported tokens. Every first repetition reports zero
cached input; each second repetition reports 11,264 cached input tokens. Input
usage is 11,439/11,413/11,451 for low/medium/xhigh despite only effort changing
in the visible request; do not invent an explanation of Provider accounting.
Reasoning is already included in output tokens. This is not a bill comparison,
a reliability estimate or a full-evaluation timing; fixed order, cache and small
sample size remain limitations. The prior full matrix's 352.014 seconds remains
the only complete four-question/five-platform wall-time observation.

Independent member-level review agrees with keeping medium for the next
controlled candidate, not selecting a new runtime default. Display-name
abbreviations and group order are not failures. No output has repeated members
or broad category groups in this batch, but the earlier identical-medium
repeated-member report failure remains unresolved. Neither this batch nor the
two good medium outputs establish that it has been repaired. Retain its raw
evidence, current rejection and an explicit disposition before formal delivery.

Next test a different real merchant's complete chain for transfer and total
elapsed time. Single-assignment output remains a candidate, not a mandatory
prerequisite to that controlled run; further evidence and delivery impact guide
its timing. Another reproduction is not required to acknowledge the known defect.
Keep the single Parser, useful target narrative and program-owned statistics;
do not introduce a search tool, critic, category blacklist or runtime table.
This closes the six-call package only; no seventh call or output-contract change
is appended this turn.

The current structured adapter has no search tool or enablement, consistent with
the [checked parameter source](prompt-context-source-brief.md#grouping-effort-and-search-boundary--2026-09-06).
No business web lookup was performed. Natural acquisition and current product
spec optional-search behavior remain unchanged. Interface research is not model
input and does not authorize correcting retained business evidence.

No tracked executable code changed, so the prior 40 focused tests and affected
runtime checks remain applicable. New evidence covers offline adapter capture,
wire-only effort change, existing data integrity, six-call/concurrency/stop
boundaries, independent fixed-diff/runner review and real semantic/timing review.
Framework/links/diff checks pass; latest repository CI is visible on PR #62.
Seven private observations (root `d6b2248846b5d176` plus six generations) match
actual IO/settings/usage on readback, with no root IO or derived review.
[Private IO Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/bc21e65866a76f38099179a6e6caf713).
Raw results and independent business review stay local in
`apps/backend/.provider-evidence/m4-group-effort-Aqp5z5/`.
No merge, rebase, production, runtime activation, #49 mirror or other-worktree
change occurred. #41/#42 ownership and #39/#43 ordering remain intact.

| Artifact | SHA-256 |
| --- | --- |
| Plan | d0d15c76eb13c13352e8d2f13a681b98d3ec5c0b6d46b20a6dcb3fea5305f4f9 |
| Summary | 12a1573466f81cfc50f74e20e1cc3ff62b1820d4d65ebf7a8e3458ce15eed48f |
| Grouping handoff | ff2570294c94597438a719a47b1f2abbad2d097780b7710c2fde3c46174b7432 |
| Wire comparison | 026b7894424173fb012326e310f7aadcfeb4c7515518017d83273535b572c3ff |
| Runner | 16094a3dc9905c217651148f23100c3390f17c9cdb6bb60e9be15a62fee0bcd6 |

## Second merchant matrix — grouping failure reproduced

The owner approves the planned cross-merchant full-chain test without further
Prompt/contract/effort changes. At `9c7893206f0973fde20fba8ff9d37de47c66d768`,
manifest `98dc9b3c5a6e836515072c17cfdadadf466b8e047416597bd9132446d1193478`
freezes a second public restaurant subject, four ordinary consumer questions and
the same five acquisition platforms. Name/area/needs are the selected test scope,
not newly verified business claims or saved Brand/Query records. Open queries do
not include the target name. No external business lookup or analysis search is
added; acquisition retains its ordinary configured tools.

Maximum 42 calls, global concurrency five and 180-second request wait: twenty
acquisitions feed twenty single Parser calls, followed by two parallel medium
synthesis components. Direct Parser and open 1.4.0 remain unchanged; grouping
and narrative reuse the exact 1.0.0 assets and current dynamic reference builder.
The runner freezes routes, recipes, assets and builder hash, checks pool draining
and both-required composition offline, and preserves all original outputs.
No retry, fallback, mid-batch tuning, runtime activation or database write occurs.

The run executes 2026-09-07 03:20:17.678–03:25:10.205 UTC (September 6 local).
All 42 Providers succeed and all twenty parses pass structure/source acceptance.
There are no access/quota gates, skipped samples or unavailable positions.
These twenty parses still contain the semantic residuals below; code acceptance
does not mean all twenty are correct.

| Stage | Actual result | Reported tokens |
| --- | --- | --- |
| Acquisition | 20/20 returned | 231,456 |
| Parser | 20/20 structure/source accepted | 55,657 |
| Grouping | 72.822 s; repeated members rejected | 18,377 |
| Target narrative | 39.666 s; structure accepted | 17,935 |

The acquisition/Parser barrier is 219.361 seconds; parallel synthesis is 72.828
seconds; full batch wall time is **292.527 seconds**. `previewReadyMs` is null
and no complete preview exists. This is the measured duration of a failed full
attempt, not a successful three-to-five-minute report or a measured recovery SLA.
Total usage is 323,425 reported tokens, not a bill. Preserve native cache/search/
reasoning accounting without counting reasoning twice. Different merchant
answers and task composition prevent a causal speed comparison with the earlier
352.014-second matrix; neither should be presented as formal report readiness.

The grouping input contains 72 retained brand records. Raw output has fourteen
groups; one group's members array reaches 100 entries with only 21 distinct IDs,
mixing already-used brands and repetitions. Across output there are 98 repeated
membership occurrences. Raw and normalized model output match and finish reason
is stop. The existing validator rejects it before assembly. This reproduces the
known failure on another merchant; do not salvage early groups or silently trim
the malformed array into a successful report. The role of the array boundary in
generation remains a hypothesis, not a proven decoder defect.

Independent local review identifies material but bounded upstream residuals:
one open sample omits two clearly recommended main-list brands; another shifts
the target and subsequent positions by one; a shared-heading position is lost.
One malformed direct-Parser name also leaks into readable accepted detail,
unlike a separate internal-only name anomaly. Actual Parser input preserves the
original answer and contains the missing names; raw output already has the
defects, so program filtering/assembly did not introduce them. The omitted case
uses one of ten available slots, finishes normally and uses 479 reasoning tokens;
do not claim proven truncation or budget exhaustion. Other examined open samples
do not show an equivalent major-brand whole-block omission.

The narrative's overview and main positive/negative signals remain useful, but
its proposed directions center on business-operation changes rather than the
GEO information/content work intended for the promotional-article consumer.
Clarifying that purpose follows current product meaning; it is not a new fine
wording, legal-identity or SEO-keyword gate. Business names, raw findings and
independent semantic detail stay in local review, not this engineering record.

Next use the two retained grouping handoffs to test one assignment per record,
then focused single-Parser regressions and the narrative's content purpose.
Do not raise concurrency, sweep effort, add an Agent/critic/table or resample
before these demonstrated failures have a bounded disposition. Keep program
counts, source records and good/bad raw outputs unchanged. The 42-call package
ends here; no extra repair call is appended this turn. Formal UI/DB/recovery and
success timing remain outstanding under #41/#42 and the #39 integration outcome.

Unchanged 40-test and runtime evidence is reused; new pool/recipe/composition
preflight and independent fixed-diff/runner review pass. Independent semantic
review confirms the failures, not a successful report. The tested commit's
framework and full CI pass. Forty-three private Langfuse observations (root
`68dc65b25949255a` and 42 generations) match actual IO/settings/usage on readback;
no derived review/program observation or root IO is uploaded.
[Private IO Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/db6749d5804f88046409b07e0ffc55d7).
Local source lineage, failed outputs and readable diagnostic report remain at
`apps/backend/.provider-evidence/m4-merchant-composition-y9YMgH/`.
Main is observed at `5fb4400`; no merge, rebase, production, #49 mirror or other-
worktree modification occurs. PR #62 remains Draft Partial and does not close #42.

| Artifact | SHA-256 |
| --- | --- |
| Plan | 153ee898e0d33010d444886e82ddb2bb3964bbcadc6bfe6ceca78fe9b87ec4cb |
| Summary | 61bc7e30ff096ca48b9597a7c628a32fdaf6d3196d9cafdb2ddb15540a4a8609 |
| Source lineage | 3a92e28ea0fe7c31cdf53a5086709b6903461d68f42f2ba9ac1634e3f24e75eb |
| Actual handoff | 9cf122559a9f6f20a094a89d9cfd1b187c18e496d344e5f07d3ba842cd0830f2 |
| Grouping output | 02b588bfb8f5ca899673b305997f81a28afb4b99f06f8bcc53403ea7c7fc4207 |
| Narrative output | f4e8dee6690f994b1b76320ba6b50fec18690384d174c14fa0708765d2b2ad00 |
| Runner | 8169bdd0cb441f9e0ec60eece3d88cc1f32e5681ee0afc05204feff4239f7fdf |

## Fixed-slot assignment — structural reliability with bounded semantic residuals

The owner approves testing per-record brand assignment, short GEO/media content
directions and failed-analysis-only recovery using retained acquisition. At
`548d4d21ee1151d94ecdb95a936d243a64814b85`, manifest
`bb7aafca4330e6e6854b0ca777bf8b1ba0d953d6ac32c32eeccef30289bd4bc0`
freezes six requests in three pairs, maximum concurrency two and 180-second wait.
Four assignment requests cover both retained merchant handoffs twice (45/72
records); two separate narrative requests use the second handoff. No acquisition,
Parser, automatic retry/fallback, search, effort sweep or runtime activation.
All pairs complete, so no queued request is skipped and no extra call is added.

The assignment helper keeps the exact existing brand context and replaces free
member arrays with one required name string per record ID. A strict object schema
rejects absent/unknown slots, and the existing program computes positive distinct
sample counts from retained eligibility. Equal filled names form groups; singleton
labels are preserved. Model identity is not repaired or inferred by program code.
The old grouping builder/default runtime path is unchanged. The new narrative
1.1.0 changes instruction and version only; actual context, Schema and request
settings match the retained narrative apart from that instruction/version name.
Offline and actual wire checks confirm these boundaries.

Run: 2026-09-07 06:02:04.634–06:04:25.520 UTC. All six Provider/finish/JSON and
structure/reference checks pass. Independent raw checks find every assignment
key exactly once and raw JSON equal to normalized output. Program counts match
an independent recomputation; no record, flag, position or excerpt is rewritten.

| Request | Latency | Reported tokens | Result |
| --- | --- | --- | --- |
| Merchant A assignment 1 | 55.348 s | 18,048 | All 45 slots; one unnamed-record inference remains |
| Merchant B assignment 1 | 41.580 s | 17,358 | All 72 slots; useful named groups and singletons |
| Merchant A assignment 2 | 55.153 s | 17,419 | All 45 slots; unnamed record kept separate |
| Merchant B assignment 2 | 44.357 s | 17,961 | All 72 assignments identical to B1 |
| Merchant B narrative 1 | 30.068 s | 17,327 | Publicity purpose restored, but over-expanded concrete example |
| Merchant B narrative 2 | 21.005 s | 16,792 | Two practical publicity/content directions |

The whole six-call batch takes 140.886 seconds and reports 104,905 tokens, not a
bill or one evaluation's latency. Assignment repetitions and one narrative call
use cached input. Historical free-group outputs are failure references, not a
simultaneous latency control. Grouping and narrative were tested in separate
pairs, so the two local composed previews do not measure concurrent report
readiness. Neither preview proves formal report/UI/DB/recovery or the owner's
three-to-five-minute complete-evaluation preference.

Local semantic review finds that B's 72 values and partitions agree exactly in
both outputs; the previous large cross-brand array no longer occurs. A's named
brand partitions agree despite harmless label shortening. Its sole member-level
disagreement assigns one explicitly unnamed record to a named brand in A1 but
keeps it separate in A2, changing that brand's positive count by one. The retained
context does not establish that identity. Do not erase this residual, rewrite old
Parser output or call four structurally valid outputs four perfect reports.
First-layer filtering/omissions remain distinct from fixed assignment structure.

Both narratives move from operational consultancy to publicity content, with
two directions each. One reply still over-expands into specific campaign wording,
including an inappropriate other-brand expression and unsupported convenience
example. The next change should reduce that action granularity to one or two
broad content priorities, not add a long prohibition list or stricter generic
wording review. Real details already present in shared sample context are not
automatically inventions; independent review remains local.

Retain the fixed-slot interface as the next candidate and stop grouping-only
repetition here. The next bounded package uses the observed Parser omissions,
shifted/shared positions, unnamed eligibility and visible malformed-name case.
The owner's deformatting suggestion is separately diagnosed: the malformed name
is absent from the actual input; Markdown influence remains unproven. A text view
must preserve full content, line/evidence identity, meaningful headings/lists and
table relations. Do not globally strip syntax or confound that candidate with
the assignment change. No Parser call or input normalization occurs this batch.

Failed-analysis-only recovery is the accepted outcome, but runtime boundaries and
dependent-result invalidation still need implementation under #41/#42. Original
acquisition and successful components must be reusable; the owner did not newly
approve partial-report presentation, and partial work is not complete. No new
table, Agent, critic or endless identity tuning follows. #32 remains completed;
#39/#43 ordering and #49's separate Prompt mirror boundary are unchanged.

Verification: 44 focused tests, backend typecheck/build, framework/link validation
and diff checks pass. Independent fixed-diff/runner review finds no blocker.
Seven private Langfuse observations (root `be466a0826bde077` and six generations)
match actual messages/output/settings/usage on readback; root IO and derived
review/program output are absent.
[Private IO Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/b6e96a5c4d9213bb2da0e9ad479fea4f).
Raw evidence and business-level review stay at
`apps/backend/.provider-evidence/m4-fixed-assignment-lEaDGB/`; formatting diagnosis
stays local alongside the evidence. PR #62 remains Draft Partial, worktree retained;
no merge, rebase, other-worktree edit, current-spec or production change.

| Artifact | SHA-256 |
| --- | --- |
| Plan | 881045535cc3d0a2476d7edd2e6934a0378e07ac29b97abb162f647c04bd138c |
| Summary | efaf6ff09c712065a0946d68a680b2eed829840fd3011f1db81174539fad3c3d |
| Handoff | 00b899f06615c1b950eab9f493e396897f43155bbd453831afae4ef538efe8e4 |
| Runner | 7b92224a79a5f143f5dcd36ab1b311707c4db62e207f742c264d3e2fe2c834b2 |

## Parser coverage and article directions — reject Parser package, retain direction scope

The owner confirms two boundaries: full answers are first-Parser input only;
synthesis keeps parsed records, summaries and necessary source excerpts. Its
directions are one or two valuable topics for subsequent promotional writing,
reinforcing existing strengths or addressing information gaps, not campaign plans.
No current internal-guidance/writer contract or runtime activation is inferred.

Tested revision `7b3ba0d018bd4715042707cfe7cbfb143613bdf2`, manifest
`df7c98bfcfc194fa1e5773130d67071e86cdd0f3b56656ede2ab3dedab0877c6`.
Ten requests, concurrency two, 180-second wait. First run narrative 1.2.0 twice
on the unchanged second-merchant parsed handoff; then four real open cases each
at Parser 1.4.0 and candidate 1.5.0. Input, Schema and low Parser/medium narrative
routes stay fixed. Instruction and wire version name change: this is a Prompt
version-package comparison, not a causal isolation of wording order. The first
merchant's historical 1.2.0 request is rebaselined to 1.4.0 for this comparison.

The candidate makes named-brand coverage and source-item order explicit before
target summarization. No source cleaning, quote-format change, grouping call,
acquisition, search, retry/fallback or in-batch tuning occurs. Narrative does not
consume the new Parser results; the two concerns are independently tested.
Every actual body matches its frozen wire; source lines and original hashes
match. Raw JSON and normalized output agree across all ten responses.

All ten Provider/finish/JSON/structure/source checks pass. Run interval:
2026-09-07 06:37:03.173–06:38:39.932 UTC, 96.759 seconds for the entire experiment,
56,997 reported tokens (23,443 Parser; 33,554 narrative). This is not one complete
evaluation's timing, a bill, successful component recovery or a stability rate.

| Case | Baseline / candidate latency | Actual semantic observation |
| --- | --- | --- |
| Main-list coverage | 14.107 / 14.924 s | Both cover the formerly omitted main brands; no candidate-only improvement |
| Unnumbered source order | 13.436 / 14.655 s | Baseline restarts category positions and repeats target as competitor; candidate removes that duplicate but still shifts the actual fourth brand to fifth |
| Shared numbered item | 14.584 / 24.449 s | Both omit two explicit co-listed brands; candidate also omits a supplementary brand retained by baseline |
| Unnamed description | 13.209 / 17.539 s | Baseline misattributes another brand to target; candidate restores absence but repeats the same unnamed description eight times |

The unnamed candidate returns ten other-brand records, including eight identical
copies of the unrecognized description. These are raw model records, not program
filtering or projection effects. Do not claim eightfold final statistics from
that fact: distinct-sample counting and later grouping have their own boundaries.
Both old and candidate outputs have material errors; restoring 1.4.0 means rejecting
an unsupported replacement, not declaring the baseline semantically reliable.

Decision: reject the 1.5.0 Parser package and restore the existing 1.4.0 asset.
Keep the actual candidate in tested Git history and protected evidence, not a
second active Prompt file. No result is trimmed or repaired. The retained input
already has the relevant names and source order, so adding full original answers
to synthesis is not the remedy. Next inspect the single-call output expression
for identity/source-item/position correspondence before choosing a small new
experiment; no new Agent, runtime Schema, model switch or instruction checklist
is selected. Earlier mode/effort probes remain completed evidence, not a sweep
to repeat. The precise model-generation cause remains unproven.

Narrative 1.2.0 takes 24.359/24.911 seconds; both give two practical writing topics
covering brand strengths and content/information needs. Retain this direction
scope. Independent review distinguishes real source-supported details from
invented facts. One overview still describes brand-directed content as ranked,
although that question has no ranking; the second overview avoids it. Keep this
visible residual for final report review without reopening generic stylistic
policing or claiming formal synthesis acceptance. Do not pass these experimental
directions directly into production article generation.

Verification: 44 focused tests, backend typecheck/build, framework/link/diff
checks and independent fixed-diff/runner review pass. New regression assertions
keep full-answer fields out of synthesis samples. Independent semantic review
agrees with rejecting Parser 1.5.0 while retaining the direction scope.
Eleven private Langfuse observations (root `c605b612896ff18d` and ten generations)
match actual messages/output/settings/usage on readback; no root IO, independent
review or program output is uploaded.
[Private IO Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/32780efa82da2273d52060cba713ade1).
Protected local evidence: `apps/backend/.provider-evidence/m4-parser-direction-LWRUZX/`.

This ten-call package ends here. Grouping assignment stays retained; direct
malformed text, real failure-only recovery and formal report/UI/DB/3–5-minute
acceptance remain unverified. Issue #42 stays In Progress, PR #62 Draft Partial,
#41 final report ownership, #32 completion and #39/#43/#49 boundaries unchanged.
Main observed at `5fb4400`; no merge/rebase, production, current-spec or other-
worktree change occurs. Worktree/branch and all evidence are retained.

| Artifact | SHA-256 |
| --- | --- |
| Plan | 71953c844e3151dcf201437339e902e740d898ee87bbec4114a7087d7de33c23 |
| Summary | 22da4f8d6d805b77c4171ea7280563cdee8cdad2a7e4c3c5f30b69e11457f633 |
| Handoff | 23906365820c4641a62899d865059c72d9ef742c1257a07c6f6795d84b580add |
| Matched wire check | fb11d3de8f256b144290430a010a48a4ac071a99a0d825f018450aaa3e588c52 |
| Runner | 90c23f440eb316f6a3a7c0fefb14ed31d9ddb86616db2add042ada62d44ca328 |

## Source-located brand rows — partial improvement with repeatability residuals

The owner approves continuing the single-Parser representation work. At
`329cc48c7bfbf4a229658bc1a5583a175e3f42b7`, manifest
`876651a6d4cfc2e4ba9812c649a2485c9f272baa8cdc7867f7cce694dbb26cab`
freezes eight candidate-only calls: two on each of the previous four retained
cases, maximum concurrency two, unchanged Qwen low and 180-second wait. Inputs
retain the exact full answer lines, brand context and question. No acquisition,
deformatting, synthesis/grouping, search, parameter sweep, retry or fallback.

One brand-row table co-locates identity, target membership, original-item line,
position, eligibility and evidence. Target prose remains a small separate
description. The program only projects into the existing customer-summary shape:
no sorting, position filling, identity normalization or deduplication. Shared
items may use the same source line and position. A valid pointer is not semantic
proof. Exact duplicate names, conflicting target rows, target-description
incoherence, old capacity limits and source validity are checked without repair.
Default Parser 1.4.0, fixed assignment and narrative 1.2.0 are unchanged.

Raw, old-shape projection and semantic review stay separate. Basic Schema/Provider
failure would stop queued pairs after settling already-started requests; expected
projection/coherence rejection is measured and allows the remaining preplanned
cases, never extra calls. This protocol was fixed before execution. All eight
basic checks pass, and all eight planned calls finish without a fatal boundary.
Raw Provider JSON matches normalized model output throughout.

Run: 2026-09-07 07:10:29.542–07:12:04.429 UTC, 94.887 seconds and 25,691 reported
tokens for eight experiments. Some repetitions use cached input. Historical 1.4.0
outputs are quality references, not same-time latency or causal controls. This
whole-interface change does not isolate the effect of sourceItemLine or prove a
full-evaluation SLA, billed cost, reliability rate or formal Parser acceptance.

| Case | First / second latency | Actual outcome |
| --- | --- | --- |
| Main-list coverage | 29.560 / 21.219 s | Both find the main brands; first repeats closing-summary brands and creates conflicting target rows, so projection rejects; second projects |
| Unnumbered source order | 27.642 / 16.305 s | Both correctly preserve six brands and target fourth, followed by fifth/sixth; no program renumbering |
| Shared numbered item | 21.809 / 21.885 s | First recovers both named co-listed brands at the shared third position; second omits both despite projection passing |
| Unnamed description | 16.587 / 10.788 s | Both retain target absence; first includes the unnamed description and repeats comparison-table brands, so rejects; second retains only the two named brands |

Six calls project successfully. This is not a 6/8 semantic success rate: the
shared-item repetition still loses two explicit brands. The two rejected outputs
contain real repeated rows and conflicting target position, not merely variant
spellings or store suffixes. Both raw failures remain intact. Do not trim the
closing/table rows or relax target consistency to manufacture success.

Independent semantic review confirms the repeat source-order improvement and the
one shared-item improvement. The remaining instability concerns one brand appearing
in several parts of an answer and complete coverage of co-listed names. Existing
target prose is broadly useful at the practical bar; names need not be legal or
word-for-word forms. The candidate is worth retaining, but cannot replace the
default Parser or justify another whole-matrix acquisition yet.

The proposed alternate-route comparison was subsequently superseded by the owner's
Prompt-first decision in the concise brand-subject package below. No alternate
call, default switch or new Agent was executed. Generation cause remains uncertain.

Verification: 50 focused tests, backend typecheck/build, framework/link/diff
checks and independent fixed-implementation/runner review pass. Tests preserve
incorrect model-authored position as incorrect rather than repairing it, permit
shared source lines/positions, exercise target and capacity boundaries, reuse
CR/LF/CRLF evidence restoration, and keep full source fields out of downstream
synthesis. Nine private Langfuse observations (root `78a5b34173cfd2a1` plus eight
generations) read back actual IO/settings/usage exactly, with no root IO or
independent review/program output uploaded.
[Private IO Trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/f6b585fb494285989d379c453673e3c4).
Protected local evidence: `apps/backend/.provider-evidence/m4-brand-rows-FpTe8H/`.

The eight-call package is finished. Formal source/Parser recovery, direct
malformed text, report/UI/DB and 3–5-minute completion evidence are still pending.
#42 remains In Progress/P1, PR #62 Draft Partial, #41 final report ownership and
#39/#43/#49 boundaries unchanged. Main observed at `5fb4400`; no merge, rebase,
production, current-spec or other-worktree change. Worktree/branch retained.

| Artifact | SHA-256 |
| --- | --- |
| Plan | ad3b16864068e098493295a39cc9f70413ef0340dace76f011e4210afbc02a32 |
| Summary | ecb711fa7423177764d94de7ef09dea5819be4d725df7095c4974e83d004fbf4 |
| Handoff | f07d421441435be8eb77ed022c704a3f958d5ceeae183df7add4a5a638638640 |
| Matched wire check | 15d849fccea76544d52ca15a1942ab2dedb69e285b9d4eb5cc0802ec8637681c |
| Runner | 201045d91662fbe1b88cdd73f1658a1e921e04b40d63214a6e0648ea4d28962f |

## Concise brand-subject rows — better coverage with position and absence residuals

The owner declines a model switch and approves a shorter, consistent Prompt:
one recognizable brand subject per row, first appearance position, no independent
sourceItemLine output. Evidence ranges remain solely for source-excerpt
restoration. companyName is matching context; the full answer is still raw input,
not an upstream-extracted list of brands or position answers. Existing synthesis
receives only parsed records, summaries and necessary excerpts.

Code `0f11208228d6798ea5bdf8c29d3a32cf68cd5aa6`, manifest
`22cb12cf0ed93af8fea24f868a779362e5c7fe8e9449f67e8960eaca5c34b2e9`,
freezes four retained cases twice (eight maximum, concurrency two), unchanged
Qwen3.8 Flash / low, strict output and 180-second request timeout. Experimental
brand-rows 1.1.0 removes the standalone pointer and its checks; instruction length
is 521 versus 696 characters. Existing evidence, capacity, target coherence and
exact-duplicate checks remain. The program projects shape only, without sorting,
identity repair, renumbering, clipping or deduplication. Experimental customer-
summary 1.4.0, fixed assignment, narrative 1.2.0 and formal runtime are unchanged.

No acquisition, deformatting, synthesis/grouping, search, retry, fallback or
parameter sweep. Provider/finish/JSON/basic-Schema failure stops queued pairs
after started calls settle; expected projection failures are retained outcomes.
Both repeats have identical actual HTTP bodies. All eight basic checks pass;
seven project successfully. Seven projections are not seven semantic approvals.

| Retained case | First / second latency | Actual result |
| --- | --- | --- |
| Main list plus repeated comparison/closing text | 12.947 / 15.623 s | Both retain the four main positions without duplicate rows; three supplemental positive brands are included with null position |
| Six unnumbered introductions across categories | 11.474 / 11.522 s | First outputs positions 1,2,3,4,4,5 rather than 1,2,3,4,5,6; second is correct; target remains fourth in both |
| Two explicit brands co-listed in the third numbered item | 15.440 / 14.402 s | Both now cover the named pair at shared third position; supplementary brand remains positive with null position |
| Named restaurants plus unnamed description, target absent | 5.433 / 6.712 s | First keeps only the two named subjects; second adds unsupported target=true row citing unnamed text but leaves targetDescription=null; projection rejects |

Target points and summaries are useful at the practical bar, including ordinary
drawbacks alongside positive recommendation. Some readable subject names retain
store qualifiers; that is not the same defect as wrong membership or position.
Supplemental positive brands with null positions are not omissions, but do not
prove complete position recovery. Their treatment remains visible, not silently
renumbered or excluded to inflate quality. Both raw failures remain intact.

Diagnostic hypotheses and evidence: (1) input drift or pre-extracted answers are
not supported: complete source/context and actual repeated wires match; (2)
program assembly is not the origin: all eight Provider message.contents parse
identically to result.output, and the projector preserves model decisions; (3)
ambiguity about target membership and distinct/shared items is a candidate for a
small wording test, not a proven generation cause. Both repeats differ on the
failure cases. The combined Prompt/field package does not isolate the effect of
sourceItemLine removal, and does not establish any model capability ceiling.

Run 2026-09-08 02:02:12.661–02:03:11.498 UTC: 58.837 seconds for eight experiments,
20,444 reported tokens. Single requests take 5.433–15.623 seconds; some input is
cached. Prior 94.887-second timing is non-contemporaneous historical reference,
not a causal speedup, bill, stable reliability rate or full-report SLA.

Verification: 50 focused tests, backend typecheck/build, framework/link/diff pass;
independent fixed-diff/runner review is ready and independent semantic review
confirms these findings. Tests reject the removed field, preserve full source
without brand/position answers, retain shared positions and model-authored wrong
positions, enforce target/capacity consistency and keep raw answers out of the
synthesis handoff. Nine private Langfuse observations (root `ca0144da531ab634`
and eight generations) match actual IO/settings/usage on readback, with no root
IO, program result or independent review uploaded.
[Private IO trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/0161f9302d9edaffe655bb958cddec8e).

Retain 1.1.0 as a smaller candidate, not as a selected runtime or replacement
baseline. The eight-call package is finished. Next only clarify actual target
membership and separate introductions versus co-listed names at fixed schema,
input and model; replay retained failures and a shared-item control in a separately
frozen small package. No renewed route audit, extra Agent, source-line slot table
or automatic repair. After a candidate clears the core checks, reuse the retained
full sampling matrix for chain validation rather than reacquiring it by default.
Formal report/UI/DB/recovery, direct malformed text and successful 3–5-minute
acceptance remain outstanding. #42 stays In Progress; PR #62 is Draft Partial.

Protected local evidence: `apps/backend/.provider-evidence/m4-brand-subject-T375nn/`;
business examples and review remain local. Main observed `0552aa7`; no merge,
rebase, production, current-spec or other-worktree change. Worktree retained.

| Artifact | SHA-256 |
| --- | --- |
| Plan | 5a9f4e9442955d812bc1227760c0ba6f1f7cfdc35eec76ee5e4c284df070cf5c |
| Summary | 81c6da3d75e276debc11b0e7eae1bb55cbbf90f1bef6da7c8b6cf7cbff57c4ad |
| Handoff | c37e52d89fefd6827152d332ec566beda44086c9d586a923513ec571a8deb0e0 |
| Matched wire check | 15d849fccea76544d52ca15a1942ab2dedb69e285b9d4eb5cc0802ec8637681c |
| Raw output check | 01b283d045ddee21a20d04052136e41f34c77eeb9fe04ef22c09ff54dd2edcd0 |
| Langfuse readback | 55335da26cdec142f3f81a9e59e6790147ece0b55cad093122386ce4c1bd5981 |
| Runner | 95facbd7e0098802ba0f52dc5c531591e333b2b4531ab1ea01414f2730121fbf |

## First-appearance order — retain meaning, reject the Prompt package

The owner simplifies open-answer position meaning: identify relevant distinct
merchant/product brands in first-appearance order, assign consecutive positions,
and do not share positions merely because names are co-listed. Repeats/aliases
reuse the first subject. This supersedes the previous experiment's shared-item
rule, not historical accepted data. Recommendation eligibility is independent.
Before calling, review identifies incidental payment/review-tool names in a
retained answer; Prompt/design/delta clarify that these are outside the compared
merchant subjects. The scope is not changed after observing output.

The existing brand-row schema, full source input and projector remain unchanged.
Prompt 1.2.0 makes targetDescription a required nullable slot: actual target
mention gets description, absent target gets null and no target row. This does
not implement the alternative single target object yet. Current product-definition,
glossary, formal Parser/report consumers and accepted histories remain unchanged;
their reconciliation is required before the new position meaning activates.

Initial preparation `89c2871` does not call Providers. Executed code
`8bfadc11310b0f334140a0b45c25445e174852f1`, manifest
`8510cc659bda55bfe796a57a747dcd96a544e81222918ed51e5d4e743f86c799`,
freezes eight calls (four retained real cases twice), Qwen3.8 Flash / low,
concurrency two, strict schema, 180-second wait. Input/schema are asserted equal
to the previous frozen handoff. Only instruction/version change. No acquisition,
synthesis/grouping, search, deformatting, retry, fallback or runtime activation.
Provider/finish/JSON/basic-Schema failure stops queued pairs after started work
settles; expected projection rejection remains a recorded outcome, not a retry.

| Case | First / second latency | Actual result under the new meaning |
| --- | --- | --- |
| Main list plus repeated closing text | 16.812 / 20.633 s | First has seven correct subjects/positions but null description despite target row; second starts correctly then adds four repeated closing brands and another target row; both reject |
| Six introductions across categories | 10.747 / 11.665 s | Both correctly output 1–6, including target fourth, but both leave targetDescription null and reject |
| Originally co-listed named pair | 11.014 / 21.041 s | First keeps only target and omits four other subjects despite projecting; second has all five subjects ordered 1–5 and useful summary, but a stated drawback point is NEUTRAL |
| Target absent from named and unnamed restaurants | 7.608 / 6.653 s | Both retain the two named subjects ordered 1,2 and null targetDescription, without inventing target presence |

All eight Provider/basic structures succeed, four project successfully. This is
not a 4/8 semantic success rate: a projected reply omits four competitors, and
another preserves drawback text but misclassifies its polarity. Three rejects
truly lack target prose; this is not overly strict validation. The repeated-brand
reply remains untrimmed. Do not adopt the 1.2 Prompt package. Retain the owner's
first-appearance meaning and the useful individual observations, without calling
this a stable Parser or restoring old ties as a silent rollback.

Diagnostic evidence: all eight raw Provider message.contents parse identically
to result.output; complete source and actual repeat HTTP bodies match the frozen
handoff. Input loss and program assembly are not supported as the observed cause.
Null-emphasis in the instruction and split target-state expression are hypotheses,
not proven root causes. This package changes several instruction clauses and the
evaluation meaning; it is not a same-rubric causal accuracy or latency comparison.

Run 2026-09-08 02:29:58.507–02:31:08.496 UTC, 69.989-second batch, 20,601 reported
tokens, single requests 6.653–21.041 seconds, with some cached input. These numbers
are not a successful full-evaluation SLA or billing calculation. 51 focused tests,
typecheck/build/framework pass; the pre-call scope clarification reruns seven
relevant tests and framework. Independent fixed-diff/runner review and actual
semantic review complete. Nine private Langfuse observations (root
`662ff77a484bb081` plus eight generations) match actual IO/settings/usage on readback,
without root IO, code projection or independent-review upload.
[Private IO trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/e6ff07911235d579fa08921d372bffbe).

The eight-call batch is finished. Next prefer the owner's fixed nullable target
candidate using the existing customer-summary schema: target owns its complete
result or null; otherBrands owns the other subjects. Avoid duplicate target-state
expression, but do not assume that removing a consistency check improves truth:
a known target-present source returned as target=null is still a semantic failure.
Keep missing/duplicate subjects and first-order cases in the next bounded review.
No extra Agent or formal/default change follows. Retain experimental baseline
customer-summary 1.4.0 and the failed 1.2 asset as distinct evidence, not new runtime
defaults. Full chain/report/UI/recovery and 3–5-minute successful acceptance remain
outstanding; #42 stays In Progress and PR #62 Draft Partial.

Local evidence: `apps/backend/.provider-evidence/m4-first-appearance-oA9JGa/`.
Business examples/review remain local. Current main observed `0552aa7`; no merge,
rebase, deployment, migration, current-spec or other-worktree change. Exit retain.

| Artifact | SHA-256 |
| --- | --- |
| Plan | 0d85d87c24839609251daef756decd5a23b83210c3078b32b43b253648de8857 |
| Summary | 6e0c2637e2d3bfc76cc3a7d8188ff6994d4ea7bf977e6b3667742ab7d260acbc |
| Handoff | 27e310b1aac7b5623051f48d6de897295fd56b60a9d88763857a2af2db122277 |
| Matched wire check | 15d849fccea76544d52ca15a1942ab2dedb69e285b9d4eb5cc0802ec8637681c |
| Raw output check | abb3d6eb76d7ff5a9be27fc05c677977d85d73629130288ab17f8d7f93e8c59f |
| Langfuse readback | 9ec6a4fda0c75f8cc49bf1e2e9eacc2f86ba3799e4979bbd0add2588cc366da8 |
| Runner | 12e534c7144d6ecfc2237c8b031bab094eb6f08ad1de595b1a8372367afa17bd |

## Nullable target — partial evidence and Provider stop

The owner approves the fixed nullable target and asks future reports to show
concrete actual input/output. Code `a1f3054439a9f7fcabb11900ebe71ff7e697cd90`
adds an explicit experiment builder/Prompt while reusing customer-summary's
existing target:null|object + otherBrands schema, full-source builder and
inspector. The baseline 1.4.0 and failed brand-row assets are unchanged. Target
and other brands retain one shared first-appearance sequence; output separation
must not renumber them. This is a Prompt/representation package, not an isolated
schema-variable test. Current runtime, specs, synthesis input and history stay
unchanged, with formal position reconciliation still required before activation.

Manifest `d0cbffc170a33274797d2e696eb0f2bb1ab83bedd07d17c96542156c2fedd41e`
freezes four retained real cases twice, max eight calls/concurrency two, unchanged
Qwen3.8 Flash / low, strict output, 180-second client timeout. Reconstructed full
input is asserted equal to retained userContext; the outgoing schema equals the
existing customer-summary schema. No acquisition, synthesis/grouping, search,
deformatting, retry, fallback or activation. A Provider/finish/JSON/basic-Schema
failure stops queued pairs after started work settles.

The first execution attempt is blocked by automatic safety review before process
start, so it sends no requests. The owner then explicitly authorizes the four
specific retained restaurant answers to the existing Qwen endpoint and actual
model IO to existing private Langfuse. The same frozen command executes after
that authorization, without channel changes or bypass.

Only the first pair runs:

| Case | Actual result | Latency |
| --- | --- | --- |
| Main list plus table/closing repeats | Valid full target object with position 2, four faithful points and readable summary; only one of six other brands is returned, omitting five explicit subjects | 21.901 s |
| Six introductions across categories | HTTP500, PROVIDER_UNAVAILABLE, Provider reports Inference engine abort / STOP_ENGINE_ABORT; no model output | 41.750 s |

The six remaining requests are not executed and no retry occurs. The successful
reply's omission already exists in the raw Provider JSON; inspector/storage do
not drop the records. The target object is useful in this one reply, not proof
of general quality, repeatability, target absence or first-order transfer. The
failure is a serving error, not client 180-second timeout, malformed model JSON
or local schema rejection. retryable=true is classification metadata, not an
executed retry. Its engine-level cause is not established; do not change the
model/route, client timeout or Prompt merely because of this one HTTP500.

Two actual request bodies match the frozen wires; the one successful raw
message.content matches normalized model output exactly. Three private Langfuse
observations (root `eed8245bc8e0d3a1` and two generations) read back actual IO,
settings and usage consistently, without root IO, derived reports or independent
review upload. The failed call has no model output/usage; it is not interpreted
as target absence or zero billing.
[Private IO trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/13964c6bedf6e86d046877f4a2430697).

Run 2026-09-08 03:15:30.636–03:16:12.955 UTC, 42.319-second interrupted batch.
The successful response reports 2,758 tokens; failed usage is unavailable. This
does not measure a completed evaluation, a full eight-call run, stable latency
or a bill. 53 focused tests, backend typecheck/build/framework and independent
fixed-diff/runner review pass. Independent semantic/error review confirms the
omissions and failure classification. No runtime/default or other-worktree changes.

Keep the current nullable-target candidate unselected; do not redesign its shape
again from this one response. A separately frozen continuation should check
complete otherBrands coverage and the unexecuted present/absent/repeat cases,
making the coverage task explicit at the existing Prompt seam if wording is
tested. Legal false-null targets, omitted other brands and duplicates remain
semantic failures; do not repair raw output to manufacture success. The ended
batch is not automatically resumed. Formal report/UI/recovery and successful
3–5-minute acceptance remain outstanding; #42 is In Progress, PR #62 Draft Partial.

Actual complete input/output and the error response are organized separately from
the review in protected local evidence:
`apps/backend/.provider-evidence/m4-nullable-target-nS0ca9/input-output-review.md`.
The earlier `m4-nullable-target-preflight-1gmcah` document is labelled an
authorization-before-execution historical snapshot, not current output. Business
IO/review remains local. Current main observed `0552aa7`; exit retain, no merge,
rebase, deployment, migration or current-spec write.

| Artifact | SHA-256 |
| --- | --- |
| Plan | b7314bf817272f16dbc12d145ed63b1dc9a8bb0e81e6d13de5a7a7330bca598f |
| Summary | 4127ad9370d91f200588e498f583c53c66fea2199ad1fba023875db7a9c86863 |
| Handoff | afd41a4e4944cc67bd781c4e744ed401cf88ea247b2a5c3434430b5d17e5b299 |
| Actual IO check | 58bba9ffd6cc14eac6a3af7a747620d628f23f1995c32a8689a4f7e706806775 |
| Langfuse readback | a3712edfe112f46f9cf04c37ac29fa1ef39f33ec0f1c1af1b07ff3c67983774d |
| Runner | 0c0a0db1b7851e019aa03a6b8639d209145cdae3c473005551a5041545b14753 |

## Matched complete coverage — gains and unnamed over-inclusion

The owner asks to emphasize complete other-brand coverage in Prompt before
attributing omissions to the model. Code `3f674cd1ed4a4bf5e85f6069771899d8e08617ad`
changes only the nullable-target asset's coverage paragraph and version (1.0.0
to 1.1.0), plus the test's version expectation. The added task definition makes
otherBrands a complete per-subject list including main and supplementary mentions,
with an omission/repetition check. Target semantics, first-appearance order,
related merchant scope, normal alias handling, schema, full input, inspector,
Qwen3.8 Flash / low and runtime are unchanged. The schema/program layer does not
generate, filter or repair brand records to satisfy the quality check.

Manifest `0392d3fc1f75be602a49454f80d8bcde02ec7c4a0f923d285cabf58cdcfaa3aa`
freezes four input-matched baseline/candidate pairs (eight maximum), concurrency
two and 180-second timeout. Baseline 1.0.0 comes from the hashed previous handoff.
Assertions permit actual HTTP bodies to differ only in system instruction and
output-contract name; pair start order alternates. The same four source answers
and destinations were explicitly authorized, and the owner requests this bounded
continuation. No sampling, synthesis/grouping, search, retries, fallback, old-batch
resumption or activation. All eight finish normally; the stop rule is not triggered.

| Retained input | Baseline 1.0.0 | Coverage candidate 1.1.0 | Baseline / candidate latency |
| --- | --- | --- | --- |
| Main list, comparison table and supplements | All three main other brands present; three supplemental brands omitted | All six other brands and positions correct; target second with useful description | 14.835 / 17.860 s |
| Six introductions across categories | All five other brands, target fourth and global sequence correct | Same coverage and correct order; target prose useful | 14.056 / 15.789 s |
| Co-listed named brands plus supplement | Four other brands and target first correct | Same complete coverage/order, useful positive/negative target points | 17.376 / 19.807 s |
| Absent target, two named merchants and an unnamed description | Correct target=null, but otherBrands=[] omits both named merchants | Both named merchants recovered at 1/2, target=null; adds unnamed description as a third positive brand | 5.396 / 8.914 s |

The candidate's observed gains are supplemental-brand coverage and recovery of
two named merchants in the absent-target case. Core brands missing in the earlier
historical reply already return in this batch's baseline; do not call those a
candidate-only improvement. Both arms also succeed on global order and co-listed
subjects. Store qualifiers, traditional/simplified writing and natural summaries
do not create new rejection criteria.

The unnamed-description addition is a real subject miscount: the source explicitly
says there is no unified store name. It is not a reasonable alias of one of the
named merchants. This residual prevents unconditional adoption of 1.1.0 even though
all eight structures/source references pass. Retain the coverage emphasis, nullable
target and model; next unify "complete already-named subjects" with the existing
unnamed exclusion in one clear instruction. Do not invent a master-brand registry,
source keyword filter, new Agent or program repair. Instruction framing remains a
testable contributor, not a proven exclusive root cause or model capability limit.

Run 2026-09-08 03:53:56.726–03:54:59.434 UTC, 62.708 seconds for eight calls.
Reported tokens total 20,528 (baseline 9,703; candidate 10,825). Candidate calls
take 8.914–19.807 seconds, about 1.7–3.5 seconds longer than their paired baseline;
none reports cached input. This four-pair observation is not a stable speed/cost
distribution, repeatability estimate, accuracy rate or full-evaluation SLA.

Verification: 53 focused tests and framework/link/diff checks pass. Production
TypeScript, dependencies and schema are unchanged, so prior typecheck/build
evidence is reused; final CI is tracked in Checks. Independent fixed-diff/runner
and semantic review complete. All eight original Provider JSON replies equal
saved/inspected outputs. Actual paired inputs/schema/route match and only the
permitted instruction/version fields differ. Nine private Langfuse observations
(root `1124e574fd53160d` plus eight generations) read back IO/settings/usage
consistently, without root IO, independent review or code-derived output upload.
[Private IO trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/10b1a1f97ea5d526d9de7b6fe3b9ae89).

Complete actual user inputs and both original outputs, with distinct review notes,
are retained locally in `apps/backend/.provider-evidence/m4-brand-coverage-MXlBXJ/input-output-comparison.md`.
No new calls are appended to this completed batch. Formal first-position
reconciliation, whole-chain/report/UI/recovery and successful 3–5-minute acceptance
remain pending. #42 is In Progress, PR #62 Draft Partial; #73 shared files untouched.
Main observed `0552aa7`; exit retain, no merge/rebase/deployment/current-spec write.

| Artifact | SHA-256 |
| --- | --- |
| Plan | 8eb23e5ab496dd55a30f1f11ce15353e54a135b199cf8af9195565f0f02e7433 |
| Summary | a6881b143afb091648d979158ab20204c8bc05d67b2a1dc643735c61ad8650ea |
| Handoff | cc6bd683f116300a06150da6cafa940795b07be99e31a61e0d01647e4cd36a5c |
| Matched wire check | 161d5fa5d25c45f81d87a8decd5c83edbbca1ef4ba8fdba8045fcc46124a76bb |
| Actual IO check | 3f188ee2475f56044c4c4137bd5cc97de10d816af92cd4d2b53b8966e019df9e |
| Langfuse readback | 425f73d1b7d1c4b0d0a1a7f3f162b94ecc977f74cce66b1887c470f95c6f4770 |
| Runner | d37e84f6c66ceadf0430d5758955fb86b51b03e4834b450c9b11ee259360bbed |

## Contextual brand scope — correct exclusions with related-option omissions

The owner excludes unnamed non-brand descriptions and off-topic incidental
merchants, while retaining same-question comparison options. This supersedes the
previous dessert/snack coverage gain; historical outputs remain intact under their
old goal. Target mention is still assessed over the full original answer, not
through the competitor filter. Relevant supplements and related negative/background
subjects remain eligible for identification; positiveRecommendation is separate.

Code `db4933e864621e93d1db10d02ac65d4dc275fa2c` revises only the nullable-target
experimental Prompt (1.1.0 to 1.2.0, 680 to 615 characters) and version expectation,
plus the approved change-local scope. It replaces maximal coverage with contextual
named subjects. Full original input, schema, program and Qwen3.8 Flash / low remain
unchanged. No generated source inventory, keyword filter, name repair, renumbering,
extra Agent, external search or runtime activation.

Manifest `5ccc8578aca8e298352ad8238288695caa404b35bf4c8b615500830e435cc793`
freezes the four explicitly authorized retained answers twice, eight maximum,
concurrency two and 180-second timeout. Repeated actual wires are identical; the
same input/schema and route are preserved from the previous hashed handoff. This
is repetition under a clarified goal, not a same-rubric or causal timing comparison
with 1.1.0. All eight finish normally; no sampling, synthesis, retry or fallback.

| Input role | First / second actual result | First / second latency |
| --- | --- | --- |
| Main-meal list with off-topic incidental snacks | Both retain the target at 2 and the three main other brands at 1/3/4; exclude the three off-topic extras. Different array order in repeat two does not change correct position fields. | 13.022 / 9.605 s |
| Six distinct introductions across categories | First correct; second retains all six subjects but sets target to 5 and later subjects to 6/7, leaving no position 4. This is a definite numeric error. | 9.576 / 11.945 s |
| Tea-room comparisons with co-listed subjects and a relevant supplement | First returns only one of four other brands; second adds the relevant supplemental brand but still omits both co-listed named options. | 14.106 / 14.612 s |
| Target absent, two named options and explicitly unnamed description | Both target=null, both named options at 1/2, no invented third brand. Normal short names are accepted. | 7.336 / 5.333 s |

The new exclusions work in both repeated cases; that does not establish general
stability. The co-listed subjects are presented by the source as the third class
of comparison options, not merely incidental names. Mixed food descriptions do
not by themselves erase that comparison role. The relevant supplement is also
an explicit same-question suggestion. Its shifted position in the second reply
follows the omitted subjects and is not counted as a second independent numeric
failure. The complete six-subject case above has a distinct numbering failure.
All omissions/errors already exist in raw Provider JSON, not program filtering.

Target prose generally conveys useful highlights. One repeat strengthens the
source into an unsupported scoring adjective, another into a superlative. One
reply puts mixed positive/negative details under POSITIVE points, though drawbacks
remain in the text. Retain these as light prose/polarity observations; do not
introduce word-specific bans, a Critic or an exact-quotation quality gate.

Keep contextual scope, nullable target and Qwen low, not unconditional adoption
of 1.2.0. Next test a narrower explanation of the comparison role assigned by the
original answer, including related supplements, and the distinct-subject counting
unit. Wording is a testable contributor, not a proven exclusive cause. Preserve
full input and raw failures; do not add fields, Agents, name lists or program
repairs. This batch is complete, with no further calls appended.

Run 2026-09-08 06:06:06.749–06:07:00.733 UTC, 53.984 seconds, 20,765 reported
tokens. Single calls take 5.333–14.612 seconds; some repeats report cached input.
These are not full-evaluation timing, stable latency, a success rate or billing.
53 focused tests and framework/link/diff checks pass. Production TypeScript,
dependencies and schema did not change, so previous typecheck/build evidence is
reused. Independent fixed-diff/runner and semantic review complete. All eight
actual wires match frozen requests; raw JSON equals saved/inspected output.

Nine private Langfuse observations (root `1fc5d6afb426fb01` and eight generations)
read back actual IO, settings and usage consistently, without root IO, derived
reports or independent review upload.
[Private IO trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/6e3c978b16f1c9990b59e0e7892f3b29).
Full actual inputs, both original outputs and separate review notes stay in
protected local `apps/backend/.provider-evidence/m4-contextual-brand-scope-cTrexQ/input-output-review.md`.
Formal position/relevance reconciliation, whole-chain/report/UI/recovery and
successful 3–5-minute acceptance remain pending. #42 In Progress, PR #62 Draft
Partial; #73 shared surfaces untouched. Main observed `0552aa7`; exit retain,
no merge, rebase, deployment, migration or current-spec change.

| Artifact | SHA-256 |
| --- | --- |
| Plan | 2c08fdf07dcfb49a9280e9409b986a861156eccdef8733f0b6cfa859ff9c3587 |
| Summary | 8c445ae3facf9579a5d82a9b57b25d31e346b91cc88cfdc81660ac8fe6b7d8ea |
| Handoff | be3bb7e30a0d22be57bca5587849bf1c33a6bc73dc12ad3402e36edd1f85a169 |
| Matched wire check | 15d849fccea76544d52ca15a1942ab2dedb69e285b9d4eb5cc0802ec8637681c |
| Actual IO check | c603488bca6ed1e0759e94c0aa96e10eff4442dd26d9bae38888dcaf9624e262 |
| Langfuse readback | bb96886089dc107de22a8f64aa0c8b8fa6c37c4de6dc37fbf6b0f6428c1bc336 |
| Runner | dc91c7f43457ae1b8a6cbedbf62bbb6929d798c61f45b2f82aa60760ff0417da |

## Query-category examples and array-owned order — mixed results

The owner confirms that query-category competitors, not all answer-related
merchants, are the selection unit, asks for question/answer/expected-selection
examples, and removes numeric model ranks. The first-layer wire already contains
the exact question, questionKind, companyName and complete answerLines. No brand
inventory or expected positions are supplied. Target mention remains assessed
over the complete answer even when other-category competitors are excluded.

Code `dd40a500aa5d87d3302fcda1c14d59f2ea0c3297` reuses the existing brand-row
experiment as 2.0.0, removing position from the strict wire schema. Its 820-character
Prompt adds three fictional examples of category inclusion/exclusion, ordinary
drawbacks versus rejection, and one record per repeated subject. No real test
merchant answers are placed in those examples. The model returns one ordered
list; code derives index + 1 before separating target/others or filtering positive
competitors. No sorting, deduplication, missing-brand inference or repair of old
numeric outputs. Existing isTarget/nullable targetDescription, source restoration
and downstream parsed-summary interface are retained. Baseline nullable-target
1.2.0/customer-summary 1.4.0 and formal runtime are unchanged.

Architecture and independent fixed-diff/runner review are ready for this bounded
probe, not runtime delivery. Tests prove absent/present target behavior, obsolete
position rejection, indexing before filtering, preservation of wrong raw order,
duplicate rejection and parsed-only synthesis handoff. All 53 focused tests,
backend typecheck/build and framework/link/diff checks pass.

Manifest `9ca9a6abb8684f5f08a0a28470bdb06ee397a3c39e90f4af20b2c36a8c25a40b`
freezes four authorized retained answers twice, eight maximum, concurrency two,
Qwen3.8 Flash low/strict and 180-second timeout. Input and repeated actual wires
match; Schema and Prompt change together, so this is not isolated few-shot causal
evidence. The new category rubric is frozen before calls: the main-meal case no
longer requires the extra breakfast-only other brands, whereas an actual breakfast
question keeps its tea-room options. No external category verification or keyword
filter. All eight Provider/basic-schema calls complete; four pass coherence/source
projection, four reject target-row/description disagreement. No sampling, search,
synthesis, retry, fallback or appended calls.

| Retained input | First / second raw result | First / second latency |
| --- | --- | --- |
| Cantonese restaurants plus incidental snacks | Both ordered main lists correct and incidental snacks excluded; first target description null, second complete and useful | 12.068 / 11.140 s |
| Family main meal plus breakfast section | Target fourth in both raw arrays, but both descriptions null; both still include two breakfast-only other brands outside the newly clarified scope | 12.451 / 9.771 s |
| Breakfast comparisons with co-listed names | First complete five-brand list and useful target prose; second combines two independent names into one row and omits the closing relevant supplement | 18.260 / 11.995 s |
| Absent target and unnamed description | Both promote the unnamed description to a positive brand; first also invents a target row with null description; second projects but is semantically wrong | 9.491 / 6.347 s |

The absence of numeric fields removes one redundant model responsibility, not
the need to recognize independent subjects in correct order. Do not advertise
four projections or continuous indices as semantic passes. Three actually
mentioned targets have no description; the separate absent-target reply invents
a target row even though its recommendation flag is false. Rejecting that
contradiction does not recover a valid sample. All errors already exist in raw
Provider JSON. No brand is split at punctuation, removed, renamed or supplied by
the program to manufacture success. Independent semantic review checks the new
category meaning, rather than treating old six-brand coverage as acceptance.

Keep array-owned order and query-aware category selection, not unconditional
adoption of this package. Reusing the older row structure re-exposes its known
target-state disagreement; list-only examples do not demonstrate the complete
target result. Next test one complete target-present output demonstration at the
unchanged contract/category/order, targeting missing descriptions rather than
appending numeric rules or word bans. Retain other cases as regressions, not
simultaneous new scope/structure adjustments.
If coherence remains unreliable, simplify the duplicate state before further
repetition. Prompt framing and representation are candidates, not a proven model
capability ceiling or justification for an added Agent. Minor prose is not a new
rejection gate. This ended batch is not extended.

Run 2026-09-08 06:48:13.919–06:49:08.212 UTC, 54.293 seconds, 21,381 reported
tokens, single calls 6.347–18.260 seconds with some cached repeated input. Not a
stable speed distribution, bill or successful full-evaluation 3–5-minute result.
Eight actual wires and original JSON replies match their frozen/saved outputs;
all emitted brand rows lack position, and the four projections preserve array
indices. Nine private Langfuse observations (root `96bd29df4320b941` plus eight
generations) read back IO/settings/usage consistently without independent review
or program projections uploaded.
[Private IO trace](https://us.cloud.langfuse.com/project/cmt8a7yah08gfad0en0kzckm8/traces/4db127302aad4e486076c60e1726f2bb).

Full actual input/output, separate program results and review stay in protected
local `apps/backend/.provider-evidence/m4-category-ordered-rows-KQb0As/input-output-review.md`.
Formal owner/position/category reconciliation, whole-chain/report/UI/recovery and
successful full timing remain pending. #42 In Progress / PR #62 Draft Partial;
#73 shared surfaces untouched. Exit retain; no merge, rebase, deployment,
migration or current-spec change.

| Artifact | SHA-256 |
| --- | --- |
| Plan | 749f9984c966fc2f3fd0318cc38208c30e2baea3157270b3b5bbaf0f514850f6 |
| Summary | e6829bb9497b72d01a71bccd83be6970b999f86f3a4ce651d6357c6ed6cf9d72 |
| Handoff | 0df5b8079077be4df6e98d0e0ffe0e10390e836677de471505d75abf74d0fd7e |
| Matched wire check | 69cbfade0e748ae210bc658225c7fdecccf5abb27b81a8b8a07d12c5f5ac239c |
| Actual IO check | c06202ed0829f7e0b5d3100224278c48f529b676f3210b57b8b7b623624a3f35 |
| Langfuse readback | 89209aca1324fbc9bac32a212a0ede135c1f32571f7b2f3baf4359e59728e98f |
| Runner | c5f92f264e61889a7a66351b05491be43beb2c915c80da4afdc9bf16f9226f9d |
