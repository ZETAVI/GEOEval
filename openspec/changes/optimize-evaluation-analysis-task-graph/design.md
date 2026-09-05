# Design: Evidence-led Evaluation Analysis

## Decision state and owners

Status: experimental alignment, no selected runtime topology. The owner's
2026-09-05 feedback supersedes selection of two tasks before real comparison.
Baseline: `main@ddadf77`; PR #48 at `2905937` is an unaccepted reference.

#39 owns end-to-end acceptance. #41 owns synthesis semantics and customer
quality. #42 owns the bounded comparison needed to choose task boundaries,
then execution, recovery, timing and progress. #32 remains completed; Parser
experiments here do not activate changes. Route a new Parser implementation
to an explicitly owned follow-up; reopen #32 only for failed original acceptance.

## Observed chain and falsifiable hypotheses

| Stage and executable owner | Observed seam | Discriminating check |
| --- | --- | --- |
| Sampling: objectivity profile and acquisition adapters | Natural answers are the measurement | Freeze query, answer and policy; extraction instructions must not contaminate sampling |
| Parser: policy, model contract, process coordinator | Prompt combines extraction, classification, quote copying and prose; input still uses two compatibility characteristics | Compare positive staged Prompt with identical input and Schema first |
| Accepted evidence: projector/canonical contract | Recovery can discard detail or replace unreadable prose | Assess raw output separately from projection, including lost useful evidence |
| Main synthesis: policy | Full frozen Brand and canonical samples expose irrelevant storage identities and mixed field roles | Compare a purpose-specific projection preserving source evidence |
| PR #48: model reference projection | Findings and observations omit original evidence spans; brand candidates contain names without adjacent source context | Restore minimal source context before attributing failure to topology |

These are code facts and hypotheses, not proof that one field caused a historical
failure. Missing Brand fields do not justify giving extraction every customer
claim: the answer stays the fact source; profile facts identify the subject.

## Prompt and context contract

Each task states role, reader, input authority, decision sequence, output field
purpose, uncertainty behavior and completion criteria. Schema owns structure;
instructions explain semantic work. Examples illustrate proven ambiguities and
never copy a holdout answer. Raw answers/excerpts are data, not task instructions.

Parser extracts supported facts first, then writes a concise reading from those
same facts. It distinguishes what the platform says from verified business truth.
The experiment requests no exposed chain-of-thought, critic or metric change.

Synthesis receives deterministic performance, distinct question/platform scope,
observed claims with short resolvable source excerpts, and brand-name candidates
with context. Generated card prose cannot replace evidence. Compression preserves
negation, attribution, qualifiers and contradictions; token reduction is not a Gate.

## Staged comparison

See [protocol](research/chain-quality-experiment.md) and
[primary-source implications](research/prompt-context-source-brief.md).

1. P0/P1 Parser: same four fixtures, input, Schema, model, effort and acceptance;
   change only instruction. Review raw quality and projection separately.
2. S0/S1 synthesis: current-main versus coherent improved-context one-call
   packages. Explicitly report Prompt/context changes as a package comparison.
3. S1/S2 topology: same accepted evidence and narrative criteria, one-call versus
   relationship/narrative tasks. Test whether prose needs the grouping output.
   If so, evaluate the dependency rather than assume parallel independence.
   Analysis-then-writing remains available for an evidenced grounding failure.

Freeze each batch and its authority. No automatic Cartesian sweep or tuning
until a fixture passes. Examples are not holdouts. Small successes establish a
candidate, not reliability statistics or a production SLA.

## Runtime choice after evidence

| Candidate | Benefit to verify | Cost or failure to verify |
| --- | --- | --- |
| One synthesis call with adequate evidence | Lowest call count and integration change | Coupled semantic failure and full-request retry |
| Parallel relationship and narrative | Focus, independent retry, overlapping latency | Two calls, prose/group consistency and component persistence |
| Dependent analysis then writing | Explicit evidence-to-prose handoff | Serial latency, information loss and another contract |

If split wins, task-kind attempts and one GEO-owned component table remain
candidates. Before implementation settle input identity, accepted-result reuse,
duplicate/late delivery, task-local retry, atomic assembly and staged uniqueness
migration. Schema-aware legacy mode is the rollback candidate; an arbitrary old
binary is unsafe after parallel rows exist. If one call wins, add no such tables.

Reuse Product Outbox and current delivery initially. Prior global concurrency
five, low/medium split, 90/120-second timeouts and four-call cycle ceiling are not
selected policies. Quota and Hy3 entitlement require current evidence. The
twelve-minute historical run is not a matched control for new queries or models.
The existing BullMQ source brief informs later design, not an instruction to split.

## Delivery and truthful progress

Offline contracts and model probes can precede integration; they do not close
#41. #41 and #42 deliver compatible slices through main, or a true linear stack
if needed. Close customer quality only after the selected contracts reach the
actual report path. No reverse native blockers or extra Performance Issue.

#43 consumes a stable server-owned projection. Accepted answers, successful
analyses and terminally unavailable positions remain distinguishable. A failed
position cannot imply successful analysis. Exact names remain a later contract
decision. Metrics, 17/20, immutable v3 history and Notification ownership stay fixed.

## Evidence-first Parser experiment after the P0/P1 failure

Both frozen instructions returned readable prose but empty extraction fields on
P01. Prompt-only revision has not demonstrated a repair. The next candidate is
an experimental model contract, not a production change or reopening of #32.

The [candidate](../../../apps/backend/src/ai-execution/controlled-validation/m4-parser-evidence-first.ts)
represents an unmentioned target as null, and a mentioned target as one object
containing displayed forms, nonempty mention/position evidence, position, role
and observations. Customer prose follows the records. This removes the specific
representable combination of mentioned=true/position=2 with empty proof, while
preserving valid no-mention behavior. It cannot prevent false absence, omitted
competitors or fabricated quote content by structure alone.

The experiment reuses current field semantics and maps only names and known
constants into current model @5, then invokes the unchanged projector/domain
acceptance. No program-supplied quote, rank, new runtime guard, migration or
application import is introduced. Unknown exact evidence still fails. Coverage
is intentionally limited to open questions; no direct-question support is claimed.

This is a Prompt plus interface package comparison, not proof of a schema-only
effect. JSON Schema structure support is documented, but this nested object/null
candidate's real acceptance remains a Provider test. Unit tests exercise both
branches, absent proof, invented proof and current fixture fidelity.

The real-chain package, if authorized, starts from the exact public-business
Query accepted in #26, obtains one new natural Qwen answer, and compares current
P0 with this evidence-first candidate against that identical immutable answer.
Keep the acquisition response, parser task, raw parser output and projection
linked by content hashes. This is not a new Brand/Query verification or a full
4x5 run. The maximum is one acquisition and two Parser requests; no other platform,
business database or synthesis call. Transport/auth failures stop the package;
semantic rejection is reviewed per arm without automatic retries.
