# Source Brief: GEO Writing Skill Research Landscape

- Researched: 2026-08-28
- Decision: Which external writing, Skill-design, GEO, and platform sources are
  credible inputs to the project-owned writing capability
- Status: Initial source ladder established; corpus and candidate review remain
  open

## Recommendation

Build the project Skill from four evidence layers rather than copying one
external copywriting Skill: official Skill-design guidance, professional
editorial workflows, primary GEO research, and controlled analysis of public
Chinese content. Treat platform popularity and community Skill collections as
discovery signals only.

The strongest reusable patterns found in the initial scan are explicit input
and output contracts, progressive disclosure, context gathering before
drafting, reader testing, truth-preserving voice passes, and focused editing
passes. Conversion-oriented formulas and GEO visibility heuristics require
project-specific review because they can reward unsupported claims, emotional
pressure, or metric gaming that conflicts with GEOEval's product promise.

## Decision Constraints

- Professional quality and factual fidelity outrank virality or conversion.
- GEO claims must retain the paper's metric, corpus, domain, and transfer limits.
- Public examples may inform structure and quality but cannot be copied as Skill
  instructions or retained as complete text without rights.
- The core writer must remain separate from platform publication variants.
- A third-party Skill must have attributable source and reviewed license before
  any direct adaptation; installation is not required for review.

## Evidence

| Claim | Primary source | Version/date | Design implication |
| --- | --- | --- | --- |
| Skills work best as reusable workflows with explicit inputs, outputs, guardrails, and final checks; complex work benefits from smaller composable blocks | https://openai.com/academy/skills/ | Accessed 2026-08-28 | Keep one focused writer with selectively loaded references rather than a marketing mega-skill |
| OpenAI's maintained skill creator recommends concise, discriminating metadata, progressive disclosure, realistic use cases, validation, and iteration from observed failures | https://github.com/openai/skills/blob/main/skills/.system/skill-creator/SKILL.md | Accessed 2026-08-28 | Follow the repository's existing Skill lifecycle and avoid generic advice |
| Anthropic's doc-coauthoring workflow separates context gathering, refinement and structure, and reader testing | https://github.com/anthropics/skills/blob/main/skills/doc-coauthoring/SKILL.md | Accessed 2026-08-28 | Treat drafting and reader validation as different gates |
| Microsoft's brand-voice pass preserves truth and argument, adapts cadence to channel, and checks meaning drift | https://github.com/microsoft/cat-agent-skills/blob/main/submissions/brand-voice-pass/SKILL.md | Accessed 2026-08-28; repository MIT | Make factual and meaning preservation hard gates while treating channel fit as bounded packaging |
| The marketingskills repository separates writing, editing, content strategy, and AI-SEO concerns and uses context-first and focused editing passes | https://github.com/coreyhaines31/marketingskills | Accessed 2026-08-28; MIT | Reuse separation and review-pass ideas, but reject unverified conversion statistics and generic persuasion pressure |
| The original GEO work reports domain-dependent visibility changes and provides an Apache-2.0 benchmark implementation | https://arxiv.org/abs/2311.09735 and https://github.com/GEO-optim/GEO | KDD 2024 paper; accessed 2026-08-28 | Test citation, quotation, evidence, and statistics as bounded hypotheses; do not promise transfer to GEOEval's five platforms |
| Current Chinese platform rules emphasize originality, truthfulness, useful or professional content, and avoidance of misleading or manipulative promotion | https://pgy.xiaohongshu.com/help/detail?id=1eda0a065dd894063c2e029a49e8f6a1&userType=4 and https://www.zhihu.com/org_use_norm | Accessed 2026-08-28 | Make authenticity and claim discipline cross-platform gates, while keeping platform-specific packaging outside the core article |

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| Copy one mature copywriting Skill | Reject | Its audience, conversion objective, evidence policy, and output boundary do not match GEOEval |
| One project Skill with routed style references | Pilot | Shares one factual and editorial core while keeping styles independently testable |
| One Skill per style immediately | Defer | Adds trigger and maintenance complexity before styles prove separate workflows |
| Train on or retain full public articles | Reject | Unnecessary for a workflow Skill and creates provenance, rights, and maintenance risk |
| Learn only from viral posts | Reject | Engagement can reward exaggeration, novelty, or platform mechanics rather than professional editorial quality |

## Unknowns and Validation

- Complete the sixty-example pilot and test whether the six provisional
  archetypes collapse, split, or fail to transfer across industries.
- Inspect exact candidate Skill files and notices before adapting any text or
  example; a repository license does not automatically settle third-party
  embedded material.
- Define a Chinese professional-editor review panel or owner and calibrate
  anchored scores on the same drafts before setting promotion thresholds.
- Validate GEO-specific writing changes through the project's later evaluation
  and feedback loop rather than assuming benchmark visibility transfers to
  commercial providers.

## Reuse and Refresh Boundary

- Reusable while: the cited Skill revisions, licenses, platform policies, and
  project core-article boundary remain materially unchanged.
- Refresh when: a candidate is directly adapted, a license or policy changes,
  the style system gains a new owner, or controlled output contradicts a
  research-derived rule.
