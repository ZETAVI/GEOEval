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
