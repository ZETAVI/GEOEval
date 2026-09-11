# Change: Normalize Report Copy and Brand Grouping

- Status: Prompt `4.0.0` rejected by controlled evidence; #42 decision reopened
- Class: Standard bug fix
- Decision owner: Product owner
- Owning Issue: #41 under M4 parent #39
- Product confirmation: accepted M4 decisions and delegated implementation on
  2026-09-02

## Why

The retained run `69c8e518-cddb-41c9-a2f9-e31981ae5b44` completed a real
twenty-position evaluation, but its customer summary repeated internal question
families, model-field names, UUID fragments, and observation identifiers. The
same accepted synthesis proposed no brand-name grouping, so obvious variants
such as “好酒好蔡工作室” and “好酒好蔡研发工作室” remained separate. The current
overall-synthesis request gives the model the complete semantic payload and
raw identifiers, while the public report document trusts every generated
narrative field.

## Scope

- Replace the complete synthesis payload with a compact projection of customer-
  meaningful brand context, deterministic performance facts, concise evidence,
  local evidence references, and deduplicated other-brand candidates.
- Give the overall-synthesis Agent one positive task model for evidence
  comparison, prioritization, customer reporting, and semantic grouping rather
  than a list of observed failure strings.
- Make the strict model-facing JSON Schema the single owner of output fields,
  quantities, section responsibilities, and required structure.
- Require an explicit decision for every compact brand candidate: either place
  it in a semantic merge group or identify it as independent.
- Resolve model-local references back to owner-local sample, observation, and
  brand-mention identities before canonical validation.
- Add a final backend report-document guard for the observed internal enum,
  field-name, UUID, and structural-fragment failures. Unsafe generated copy is
  omitted or replaced with restrained deterministic copy rather than exposed.
- Add a focused replay shaped from the retained 头家顺 failure evidence,
  including the two 好酒好蔡 name variants and a high-volume competitor payload.

## Non-goals

- No brand master data, knowledge graph, external entity investigation, or
  default web search.
- No parser, Brand, Query Generator, Worker concurrency, multi-Agent task graph,
  recommendation-index, provider-route, report-layout, or frontend masking
  change.
- No production activation, deployment, historical report rewrite, or
  unbounded Provider experimentation. Any controlled real validation requires
  an exact manifest, request ceiling, stop conditions, and explicit authority.

## Impact

GEO Intelligence remains the owner of synthesis meaning, reference integrity,
deterministic metrics, and the immutable public report. AI Execution continues
to execute one versioned structured-output request without interpreting it.
The existing overall-synthesis seam gains a smaller model-facing contract; the
canonical synthesis and report contracts remain stable. Existing stored reports
remain readable, while their read projection applies the same customer boundary
that already suppresses legacy implementation notes.

## Architecture Boundary

The compact projection, request-local references, deterministic metrics, and
public-document guard remain the correct GEO Intelligence seam. Short local
references are machine-checkable handles placed next to semantic content; the
Agent does not infer identity, counts, or meaning from them. GEO Intelligence
owns exact calculation, reference resolution, and candidate-decision coverage,
while the Agent owns evidence comparison, semantic relationships,
prioritization, and language. The Prompt owns the analysis workflow, while the
provider-facing JSON Schema owns the output form and field-level purpose so the
same instruction does not compete with a second prose schema.

The earlier Prompt `3.0.1` result did not prove that synthesis must be split. Its
output contract treated an omitted candidate exactly like an explicit
keep-separate decision, so the observed missing merge could be either a semantic
judgment or an unfinished subtask. Model contract v4 removes that ambiguity by
requiring every candidate to appear exactly once in either a merge group or the
independent list. Prompt `4.0.0` then expresses one positive analysis workflow
and four proportional quality expectations: faithful, complete, prioritized,
and customer-readable.

Before controlled execution, #42 remained a conditional performance and
architecture option. The Prompt `4.0.0` result now satisfies the decision gate
to reopen #42: despite positive task framing, self-described strict output, and
explicit candidate coverage, the first Y02 response omitted both brand
candidates, referenced observations that did not exist in their samples, and
introduced unsupported tactical specifics and outcome targets. It did preserve
the deterministic count and platform facts and produced readable prose.

This evidence rejects the current single-call contract; it does not by itself
approve a particular task graph. #42 must select the smallest decomposition and
its latency/cost boundary. This Change stops before implementing a persistent
workflow split.

## Control State

- Workspace: branch `codex/issue-41-report-copy-brand-grouping`, rebased through
  the locally verified `main@d6d490d`; Issue #41 is `Review / Decision`,
  Priority `P0`.
- Evidence: the original local database no longer contains the retained run;
  #39/#41 remain the durable evidence entry for its run identity and observed
  output. A deterministic focused replay protects that failure shape. After
  explicit authorization, one controlled three-request synthesis batch exercised
  Prompt `3.0.0` and model contract v3: two Qwen cases were accepted, while the
  Hy3 case failed because the account had exhausted free quota without postpaid
  billing. The first Qwen result exposed sample/question/platform count ambiguity
  and directly produced the Prompt `3.0.1` and explicit evidence-scope repair.
- A separately authorized Prompt `3.0.1` rerun used one request before its stop
  condition: Y02 expressed counts correctly but omitted the only obvious
  Chinese/English candidate group and was semantically rejected. Y03 did not run.
  This rejects Prompt `3.0.1`; it does not by itself establish an architecture
  split.
- Prompt `4.0.0` and model contract v4 have focused offline evidence only. They
  replace symptom-led prohibitions with a positive analysis workflow and make
  candidate coverage checkable, but customer quality remains unverified until a
  separately authorized controlled Provider comparison is inspected.
- The prepared `synthesis-quality-probe` manifest contains four Qwen requests:
  complex and sparse fixtures interleaved twice, zero automatic retries, and
  stop on the first structural or semantic failure. After explicit authority,
  the batch executed one Y02 request in `46.996s` and stopped as required. The
  response was structurally valid and used the deterministic metrics correctly,
  but semantic validation rejected omitted `b01` and `b02`; inspection also
  found invalid observation references and unsupported operational specifics.
  Y03 and the second repeats did not run.
- Exit: focused replay, model-contract, report-document, deterministic end-to-
  end, type, build, formatting, and framework evidence; Draft PR and Issue
  update. PR #48 remains Draft and must not close #41. #42 now owns the next
  architecture decision; additional Provider calls, any task-split
  implementation, billing activation, merge, production, and deployment remain
  separate gates.
