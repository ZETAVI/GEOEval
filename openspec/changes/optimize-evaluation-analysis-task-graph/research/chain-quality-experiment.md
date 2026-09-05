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
