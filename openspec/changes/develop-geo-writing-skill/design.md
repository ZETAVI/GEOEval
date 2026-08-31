# Design: GEO Professional Writing Skill

## Boundary and ownership

The branch owns an editorial capability, not an application workflow.

| Concern | Owner | Boundary |
| --- | --- | --- |
| Current brand facts and material meaning | Brand Knowledge | Supplies approved current facts and the latest valid prepared digest; the Skill cannot mutate them |
| Evaluation findings and reusable optimization guidance | GEO Intelligence | Supplies protected guidance; raw answers, scores, attempts, and provider traces are not writing context |
| Core article lifecycle | Future Optimization Studio change | Owns generation requests, current article, edits, replacement warning, confirmation, and order snapshot |
| Writing method and editorial quality | `geo-content-writer` Skill | Owns planning, style application, drafting, factual review, editing, and output quality rules |
| Model call, retry, usage, cost, and telemetry | AI Execution after S6 | Executes a later purpose request; does not decide article meaning or quality acceptance |
| Platform publication variants | Publication Delivery | Adapts a confirmed core article during fulfilment; this branch does not own them |

## Research model

Research separates three evidence classes:

1. **Professional editorial practice:** clarity, structure, evidence, voice,
   pacing, revision, and reader testing that generalize across platforms.
2. **GEO evidence:** content properties supported by primary research or
   controlled evaluation, with domain and metric limitations retained.
3. **Platform packaging:** titles, paragraph density, first-person posture,
   tags, emoji, calls to action, and other channel conventions that must not
   redefine the core article.

Public articles are research inputs, not templates. Retain URL, publisher,
date, content purpose, structural observations, and only short necessary
excerpts. Do not store complete copies or train a local corpus from material the
project does not own.

## Pilot corpus

Begin with sixty publicly accessible Chinese examples across five source
families, balanced so popularity does not substitute for editorial quality:

- official brand or organization editorial pages;
- long-form public-account articles;
- professional question-and-answer content;
- experience-led lifestyle or local-service content;
- mainstream or vertical-media explanatory content.

Tag every example by audience, intent, topic, opening, outline, evidence type,
claim strength, voice, cadence, conclusion, channel packaging, and observed
editorial strengths or risks. Seek coverage of six provisional archetypes:

- professional explainer;
- evidence-led authority article;
- problem-and-solution guide;
- brand or founder narrative;
- service-selection or comparison guide;
- answer-first FAQ or knowledge article.

The corpus gate closes when each retained style has several strong examples,
common editorial traits and platform packaging are distinguishable, and new
examples no longer change the proposed style dimensions or quality rubric.
Sixty is a pilot ceiling, not a quota that justifies weak sources.

## Mature-Skill review

Review candidates for provenance, license, maintenance, trigger boundary,
context intake, progressive disclosure, factual safeguards, revision workflow,
quality evaluation, failure behavior, and GEOEval fit. Initial primary
candidates include official OpenAI Skill guidance, Anthropic's skill-creator
and doc-coauthoring workflows, Microsoft's brand-voice pass, and the MIT-
licensed marketingskills copywriting, copy-editing, content-strategy, and AI-SEO
Skills.

Adopt concepts only when they solve a GEOEval failure mode. Do not import a
generic conversion-copy goal, emotional-pressure technique, unverifiable proof
formula, or platform-growth tactic merely because it appears in a mature Skill.

## Candidate Skill shape

After research convergence, initialize one project-local sandbox Skill:

```text
.agents/skills/geo-content-writer/
|-- SKILL.md
|-- agents/openai.yaml
`-- references/
    |-- editorial-principles.md
    |-- style-profiles.md
    |-- geo-evidence-rules.md
    `-- quality-rubric.md
```

Keep the entrypoint focused on intake, style routing, drafting, factual audit,
editorial passes, and final checks. Load only the selected style reference and
the quality or evidence references required by the current task. Add scripts
only after repeated fixture work demonstrates a deterministic operation worth
automating.

## Writing workflow

1. Validate the brief and separate supported, uncertain, conflicting, and
   unavailable claims.
2. Choose the supplied internal style profile; never infer that the customer
   selected one.
3. Build an article thesis, reader promise, evidence plan, and section outline.
4. Draft one title and one complete article body.
5. Audit every material claim against the brief and retain unresolved gaps.
6. Edit in focused passes for structure, clarity, specificity, voice, rhythm,
   repetition, GEO answerability, and professional finish.
7. Return the copy-ready article plus protected review notes appropriate to the
   later integration boundary.

## Quality model

Hard gates:

- no invented fact, quote, statistic, credential, customer, source, or outcome;
- no contradiction of current brand facts or optimization guidance;
- no prohibited guarantee of AI mention, ranking, or business effect;
- exactly one title and one complete core article;
- no platform-specific publication bundle or customer-visible style menu.

Scored dimensions use a five-point anchored rubric: reader usefulness,
editorial structure, specificity and evidence, professional polish, style
fidelity, GEO clarity, brand differentiation, and originality. Human blind
pairwise review compares the candidate Skill with an instruction-only baseline.
Numeric promotion thresholds remain proposed until the pilot exposes score
variance and reviewer calibration.

## Integration and reversal

The sandbox Skill can merge independently because it introduces no runtime
contract. After S6 stabilizes, a separate Optimization Studio change defines the
versioned writing brief, execution purpose, protected review evidence, accepted
article output, persistence, retries, and cost gate. Removing or revising the
sandbox Skill is a normal Git change and cannot alter product data.
