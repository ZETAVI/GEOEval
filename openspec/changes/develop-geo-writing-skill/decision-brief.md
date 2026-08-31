# Decision Brief: GEO Professional Writing Skill

## Outcome

Give the GEOEval project one reusable, project-owned writing capability that can
turn approved brand facts, optimization guidance, and prepared material context
into one professionally edited core promotional article in a deliberately
selected editorial style.

## Scope

- In: public-content corpus research, mature writing-Skill review, GEO evidence
  research, a curated editorial-style system, a sandbox project Skill, quality
  fixtures, and offline or separately authorized evaluation.
- Out: Optimization Studio persistence or UI, S6 provider integration, paid
  model calls, customer-facing style selection, publication-platform variants,
  media fulfilment, and production activation.

## Decisions

| Decision | Choice | Rationale | Owner |
| --- | --- | --- | --- |
| Parallel outcome | Research and build the writing capability before the product article workflow | S6 still owns the changing real-execution boundary, while editorial research and Skill quality can progress independently | Product owner |
| Product boundary | Produce one core article per invocation; do not produce publication variants | Preserves Optimization Studio and Publication Delivery ownership | Product and architecture owners |
| Style selection | Support a small curated internal style set; do not expose a customer style picker in the first release | Matches the approved product definition while allowing measurable editorial variety | Product owner |
| Evidence use | Learn from public examples through metadata, structural analysis, and short necessary excerpts; do not mirror complete articles | Preserves provenance, copyright boundaries, and original project ownership | Research owner |
| External Skill reuse | Review provenance, license, maintenance, and project fit; adapt principles rather than installing or copying a candidate wholesale | Avoids importing a competing workflow or hidden dependency | Skill owner |

## Acceptance Boundaries

- The research distinguishes common editorial quality from platform-only
  packaging conventions.
- The sandbox Skill can produce one title and one complete article body in each
  accepted style without inventing facts, quotes, statistics, credentials, or
  outcomes.
- A reviewer can trace every material claim to approved input, identify the
  intended style, and distinguish a strong draft from a hard-gate failure.
- No S6 runtime file, database model, public API, customer UI, external account,
  or paid provider is changed by this branch.

## Assumptions and Open Questions

- Assumption: a sixty-example pilot corpus is enough to expose the first stable
  style dimensions; expand only when new examples change the rubric or style
  system.
- Assumption: one Skill with selectively loaded style references is simpler
  than one Skill per style until real evaluations demonstrate independent
  workflows.
- Open: exact accepted styles and numeric quality thresholds remain proposed
  until corpus review and blind editorial evaluation provide evidence.
- Open: the later runtime request and response envelope is owned by the
  Optimization Studio integration change after S6 stabilizes.

## Confirmation and Next Gate

- Confirmation: product owner selected the writing-capability-first option on
  2026-08-28.
- Next action: complete the bounded corpus and mature-Skill evidence briefs,
  then confirm the first style and quality matrix before initializing the
  sandbox Skill.
- Confirmation required before: any paid model call, third-party Skill
  installation, runtime integration, or production use.
