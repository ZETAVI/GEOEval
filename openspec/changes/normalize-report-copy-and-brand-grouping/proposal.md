# Change: Normalize Report Copy and Brand Grouping

- Status: Approved for implementation
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
- Make the overall-synthesis instruction and strict model contract explicitly
  own formal, concise customer copy and semantic grouping of obvious aliases,
  abbreviations, store formats, and subordinate brand lines.
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

The existing seam is sufficient. The model receives stable request-local
references and compact brand candidates; the model decides semantic name
relationships; GEO Intelligence expands accepted proposals to canonical
mention identities and calculates all counts. A program-only brand resolver
would duplicate semantic judgment, while preserving raw UUID-based input would
leave the proven leakage path open. Neither alternative changes ownership as
cleanly as the compact projection at the current model-contract boundary.

## Control State

- Workspace: branch `codex/issue-41-report-copy-brand-grouping` from
  `main@af72ba5`; Issue #41 is `In Progress`, Priority `P0`.
- Evidence: the original local database no longer contains the retained run;
  #39/#41 remain the durable evidence entry for its run identity and observed
  output. A deterministic focused replay protects that failure shape. After
  explicit authorization, one controlled three-request synthesis batch exercised
  Prompt `3.0.0` and model contract v3: two Qwen cases were accepted, while the
  Hy3 case failed because the account had exhausted free quota without postpaid
  billing. The first Qwen result exposed sample/question/platform count ambiguity
  and directly produced the Prompt `3.0.1` and explicit evidence-scope repair.
- Exit: focused replay, model-contract, report-document, deterministic end-to-
  end, type, build, formatting, and framework evidence; Draft PR and Issue
  update. Additional Provider calls, billing activation, merge, production, and
  deployment remain separate gates.
