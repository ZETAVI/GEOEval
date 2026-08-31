# Framework Adoption Record

## Baseline

- Framework: `ai-native-engineering-framework`
- Source repository: `/Users/lucien/OrbStack/falcon-cppgo/home/lucien/depContents/ai-native-engineering-framework`
- Adopted source commit: `95dcda3`
- Adoption date: 2026-08-11
- Mode: Project-owned snapshot with explicit upstream reconciliation

## Adopted surfaces

- The eight operating principles
- Scaled trivial, standard, and architectural change paths
- OpenSpec-compatible current-spec and change-delta separation
- Document lifecycle and source-of-truth map
- Human-agent and multi-agent collaboration boundaries
- Skill taxonomy and authoring standard
- A project-owned, cataloged Skill set under `.agents/skills/`
- GitHub Issue, pull request, changelog, handoff, ADR, and source-brief templates
- Deterministic framework validation in CI

## Ownership rule

GEOEval owns the adopted copy. The framework repository remains the reusable upstream, but future upstream changes do not apply automatically. Reconcile an upstream change only through a reviewed GEOEval change that explains its local impact.

Do not edit a generated or adapter copy of a Skill independently. In this project, `.agents/skills/` is the authoritative repository-scoped Skill source.

## Initial exclusions

- No plugin package
- No global Skill installation
- No mandatory OpenSpec CLI
- No external tracker in addition to GitHub
- No autonomous write hooks
- No default multi-agent implementation team

These may be introduced only when a concrete project need justifies them.

## Project-owned evolution

The 2026-08-31 methodology iteration keeps the adopted framework architecture
and adds project-owned change-tracking contracts, installed-Skill routing,
domain and codebase design disciplines, defect diagnosis, code review,
reconciliation, architecture maintenance, conflict resolution, and bounded
onboarding. These additions are GEOEval-owned adaptations; they do not imply an
upstream framework update or automatic external Skill discovery.

### AI Hero Skill influence

- Source: `https://github.com/mattpocock/skills`
- Reviewed source revision: `6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`
- License at review: MIT
- Adoption mode: project-owned adaptation of routing, writing-for-agents,
  domain-modeling, codebase-design, wayfinding, diagnosis, review,
  reconciliation, architecture maintenance, conflict resolution, and onboarding
  principles

No upstream Skill file is vendored unchanged and no external package is
installed. GEOEval's catalog, trigger boundaries, authority rules, and
validation remain canonical for this project.
