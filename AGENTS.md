# GEOEval Agent Guidance

## Mission and current phase

Build the GEO optimization product from its approved foundation through small,
verifiable releases. Treat the current protected `main` as accepted engineering
truth, and read live Issue, pull-request, and `GEOEval Delivery` state before
describing the active phase; do not pin a changing milestone in this file.
Preserve confirmed product meaning while retiring completed changes and opening
later outcomes at their own decision boundary. F0 runtime code remains
non-product validation code.

Do not treat historical prompts as approved requirements. They are research input.

The live coordination repository is `https://github.com/ZETAVI/GEOEval`.
Create or identify the owning Issue before a standard or architectural write,
and deliver changes to protected `main` through a pull request.

## Read order

1. `docs/product/vision.md`
2. `docs/product/glossary.md`
3. `openspec/specs/product-definition/spec.md`
4. `docs/process/operating-principles.md`
5. `docs/process/core-workflow.md` before standard or architectural module work
6. `docs/process/change-tracking.md` when creating or changing Issues, pull
   requests, commits, or branch exit state
7. `docs/process/human-agent-collaboration.md` when work crosses agents,
   branches, Worktrees, Stacked PRs, or an Integration Branch
8. `docs/process/design-knowledge.md` when creating or changing durable design
9. The nearest relevant active change, architecture, spec, contract, or ADR
10. `GEO-Eval-Prompts.md` only when historical context is needed

Keep always-loaded guidance short. Load detailed process documents and Skill references only when the task needs them.

## Sources of truth

- Product direction and shared language: `docs/product/`
- Current accepted behavior: code, schemas, tests, and `openspec/specs/`
- Proposed behavior: `openspec/changes/<change-id>/`
- Architecture rationale: `docs/architecture/adr/`
- Execution status and evidence: GitHub Issues, pull requests, CI, and runtime evidence
- Planning status, priority, and ordering: the repository-linked `GEOEval Delivery`
  GitHub Project; it never owns requirements, design, implementation, or evidence
- Continuation state: one task handoff created lazily only while a real handoff
  is needed; the Issue, PR, branch, and current owners replace it at close
- Released value: `CHANGELOG.md` and GitHub Releases

One durable fact has one canonical home. Other artifacts link to it rather than maintaining a copy.

Current design evolves in place. Before creating a durable design document, search existing executable sources, specs, ADRs, product language, and owner-local contracts. Do not create version-copy files such as `v2`, `new`, `final`, or `latest`; update, move, merge, or delete the current owner and let Git preserve history. Follow `docs/process/design-knowledge.md`.

## Change workflow

Classify each change as trivial, standard, or architectural.

- Trivial: implement directly with focused verification.
- Standard: use an OpenSpec-compatible proposal, behavior delta, and tasks.
- Architectural: add design, impact, migration or rollback, an ADR when the decision is durable, and explicit human approval.

Follow `Explore → Align → Propose → Approve → Implement → Verify → Reconcile → Close`.

## Proportionality and stopping

- These rules constrain proposed work; never suppress a reachable defect.
- Before adding a check, artifact, abstraction, guard, or review round, name the
  live uncertainty, reachable failure, and changed action.
- Reuse equivalent passing evidence when relevant code, configuration,
  dependency, data, and environment are unchanged.
- Stop when the approved outcome and smallest discriminating evidence are met;
  keep optional confidence-building or speculative hardening outside the task.
- Security, privacy, money, migration, external-cost, destructive, and
  production boundaries remain mandatory.

## Skill routing

- Use `$project-router` when the task lane, change class, current phase, or
  relevant installed Skills are not already obvious. It filters only the
  project catalog; it also reads live Issue/Project state and does not search or
  install external Skills.
- Use `$requirement-grill` when consequential product or engineering ambiguity remains.
- Invoke `$start-change` explicitly after intent is clear and a durable change record is warranted.
- Use `$source-research` before relying on an external API, library, platform, license, version, or operational constraint.
- Use `$domain-modeling` when business language, capability ownership, or a
  durable boundary is changing.
- Use `$codebase-design` when a module interface, seam, dependency direction,
  or deepening decision needs focused design.
- Invoke `$wayfinder` explicitly only for a multi-session outcome whose route
  remains materially unclear after bounded alignment.
- Use `$diagnosing-bugs` for a plausible defect before proposing a fix when the
  root cause is not already established.
- Use `$architecture-review` as the engineering architecture steward before
  implementing a module with material lifecycle, persistence, asynchronous work,
  AI, external effects, shared contracts, or significant refactoring.
- Use `$code-review` for a fixed diff against both its approved intent and the
  repository's engineering standards.
- Use `$verify-change` before any completion claim.
- Invoke `$reconcile-change` explicitly before closing a standard or
  architectural change or declaring a PR complete.
- Invoke `$task-handoff` when work crosses an agent, session, branch, worktree, or owner boundary.
- Invoke `$improve-codebase-architecture` for evidence-backed maintenance
  candidates, not as a mandatory calendar review.
- Invoke `$resolving-merge-conflicts` only when a merge or rebase conflict
  actually exists and its intent is known.
- Invoke `$project-onboarding` when a new contributor needs a bounded context
  path for an Issue or capability.
- Use `$writing-for-agents` when writing or pruning AGENTS, Skills, prompts,
  Issue/PR templates, or other agent-consumed instructions.

Skills are project-scoped under `.agents/skills/` and governed by `.agents/skill-catalog.yaml`. Do not add or broaden a Skill without updating the catalog and validating its trigger boundaries.

## Project commands

Verified repository commands are:

```bash
pnpm install --frozen-lockfile
pnpm infra:up
pnpm db:migrate
pnpm openapi:generate
pnpm e0:plan
pnpm typecheck
pnpm test
pnpm build
./scripts/foundation/rehearse-backup.sh
pnpm infra:down
python3 scripts/validate_project_framework.py
```

`pnpm test`, migrations, and the recovery rehearsal require the project-named
PostgreSQL services. `pnpm infra:down` retains volumes; never add `--volumes` to
a normal stop. No command above authorizes E0 provider calls or product work.

## Working agreement

- Clarify materially different interpretations before implementation.
- During product evolution, do not let interaction or technical solutions
  silently redefine approved product meaning or accepted current behavior.
- Search existing terms, components, contracts, and capabilities before creating new ones.
- Keep uncertain design in the active change; create a durable contract only after its owner and boundary are stable.
- Reconcile accepted design into its canonical or executable owner and remove obsolete active explanations before closing a change.
- Follow `docs/process/change-tracking.md`; do not keep appending later outcomes
  to a completed Issue or active change.
- When discussing an Issue or pull request with the human owner, use its current
  title with the number on first mention, for example
  `Issue #<number>《<current title>》` or `PR #<number>《<current title>》`;
  abbreviate to the number only after the context is clear.
- Keep at most one primary product-delivery parent Issue in progress and one
  non-conflicting research or maintenance Issue; a verified urgent Bug may
  preempt them. Project Status is the planning authority: Backlog Issues do not
  justify branches or worktrees, and `blocked` requires a named dependency.
- Every open Issue has an Assignee, Project Status, and Priority. Set `Ready`
  only after outcome and acceptance are actionable, `In Progress` only for an
  active bounded package, and `Review / Decision` when a review or human gate
  remains.
- Resolve, update, or explicitly retain any touched document's `Evolution
  marker`; split by stable ownership or activation, not line count alone.
- Prefer the smallest coherent design; reuse must be earned by stable semantics.
- Refactor locally at the seam exposed by a change; avoid unrelated cleanup and large rewrites.
- Research external technology from current primary sources and record uncertainty.
- Match each completion claim to task-appropriate evidence and disclose skipped checks.
- Keep one writer for shared specs, public contracts, design primitives, ADRs, and release records.
- Reuse the current Issue branch for the same outcome. Direct-to-`main` is the
  default; use a linear Stacked PR or a parent-scoped Integration Branch only
  under the topology rules in `docs/process/human-agent-collaboration.md`.
  Name a new branch `codex/issue-<number>-<slug>` and create a separate worktree
  only for an independently mergeable concurrent write after interfaces and
  ownership are fixed; record the workspace exit state at handoff or close.

## Human decision boundaries

The human owner decides product meaning, scope tradeoffs, risk acceptance, consequential architecture, external cost, destructive operations, and production changes. Agents may execute autonomously inside an approved, reversible boundary but must stop before changing that boundary.

## Code review rules

- Flag behavior that diverges from the approved change or current spec.
- Flag duplicated sources of truth, speculative abstractions, and unrelated refactors.
- Flag new design documents that lack a stable owner or duplicate an executable or canonical source.
- Flag completed changes whose accepted design remains only in a change folder, PR, or handoff.
- Flag stable changes kept active as general backlogs, or touched `Evolution
  marker`s with no explicit disposition.
- Flag external interface assumptions without primary-source or controlled runtime evidence.
- Flag completion claims without discriminating verification.
- Flag branch or worktree creation without an independently mergeable outcome
  and exit state, and parallel-write plans without fixed interfaces and disjoint
  ownership.
