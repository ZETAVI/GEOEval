# Change: Develop the GEO Professional Writing Skill

- Status: Approved for research, sandbox Skill development, and local quality
  fixtures; runtime integration and paid external calls remain separate gates
- Class: Standard
- Decision owner: Product owner
- Product confirmation: 2026-08-28

## Why

The deterministic evaluation slice already owns one protected optimization-
guidance output, and the approved product definition says later article
generation will combine that guidance with current brand facts and prepared
materials. The project does not yet own a writing capability that can reliably
produce distinct, professional editorial styles while preserving factual and
product boundaries.

Waiting for S6 to finish is unnecessary for editorial research, corpus design,
Skill review, and quality-fixture preparation. Mixing that work into S6 would
instead couple subjective writing iteration to provider retry, cost, telemetry,
and sampling-contract work.

## Scope

- In: a copyright-bounded public-content corpus; current primary research on
  GEO writing evidence; provenance and license review of mature writing Skills;
  editorial-style profiles; factual, structural, GEO, and style quality rules;
  one project-local sandbox Skill; realistic fixtures; blind editorial review;
  and an eventual integration contract for Optimization Studio.
- Out: copying complete public articles; popularity scraping; installing an
  external Skill as a dependency; changing evaluation metrics or guidance;
  customer-facing style choice; platform-specific publication variants;
  database, API, Web, Worker, provider, telemetry, payment, publishing, or
  production implementation.

## Impact

The change may add one project-scoped Skill and its catalog entry after the
research gate. It adds change-local research and quality fixtures. It does not
change current product behavior, persistent data, runtime dependencies, or S6.

## Control State

- Documentation: keep hypotheses, source briefs, corpus design, and candidate
  quality rules in this active change. Promote only the accepted Skill and its
  catalog metadata. Do not duplicate Brand, GEO Intelligence, Optimization
  Studio, AI Execution, or Publication Delivery contracts.
- Workspace: branch `codex/develop-geo-writing-skill`, worktree
  `/private/tmp/GEOEval-geo-writing-skill`, based on `main@aa48e96`; current
  Codex task is the single writer; merge destination is `main` after local
  verification and product review. Exit requires a clean checkpoint, evidence
  summary, explicit remaining S6 integration gate, and no provider or production
  claim.

## Approval Boundary

The product owner authorized the research-first writing-Skill direction and an
isolated worktree. Public-source browsing, change-local artifacts, a sandbox
Skill, and local fixtures are authorized. External Skill installation, bulk
content copying, authenticated scraping, paid model calls, runtime integration,
deployment, and publication remain unauthorized.
