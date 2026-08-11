# GEOEval Agent Guidance

## Mission and current phase

Build the GEO optimization product from an agreed product definition toward small, verifiable releases. The current phase is **product discovery**: clarify users, problems, outcomes, product boundaries, and evaluation semantics before choosing implementation architecture or technology.

Do not treat historical prompts as approved requirements. They are research input.

## Read order

1. `docs/product/vision.md`
2. `openspec/changes/define-product-foundation/`
3. `docs/process/operating-principles.md`
4. `docs/process/design-knowledge.md` when creating or changing durable design
5. The nearest relevant product, architecture, spec, contract, or ADR document
6. `GEO-Eval-Prompts.md` only when historical context is needed

Keep always-loaded guidance short. Load detailed process documents and Skill references only when the task needs them.

## Sources of truth

- Product direction and shared language: `docs/product/`
- Current accepted behavior: code, schemas, tests, and `openspec/specs/`
- Proposed behavior: `openspec/changes/<change-id>/`
- Architecture rationale: `docs/architecture/adr/`
- Execution status and evidence: GitHub Issues, pull requests, CI, and runtime evidence
- Continuation state: `docs/handoffs/current.md` only while a real handoff is needed
- Released value: `CHANGELOG.md` and GitHub Releases

One durable fact has one canonical home. Other artifacts link to it rather than maintaining a copy.

Current design evolves in place. Before creating a durable design document, search existing executable sources, specs, ADRs, product language, and owner-local contracts. Do not create version-copy files such as `v2`, `new`, `final`, or `latest`; update, move, merge, or delete the current owner and let Git preserve history. Follow `docs/process/design-knowledge.md`.

## Change workflow

Classify each change as trivial, standard, or architectural.

- Trivial: implement directly with focused verification.
- Standard: use an OpenSpec-compatible proposal, behavior delta, and tasks.
- Architectural: add design, impact, migration or rollback, an ADR when the decision is durable, and explicit human approval.

Follow `Explore → Align → Propose → Approve → Implement → Verify → Reconcile → Close`.

## Skill routing

- Use `$requirement-grill` when consequential product or engineering ambiguity remains.
- Invoke `$start-change` explicitly after intent is clear and a durable change record is warranted.
- Use `$source-research` before relying on an external API, library, platform, license, version, or operational constraint.
- Use `$architecture-review` for cross-module work, public contracts, shared components, data ownership, or significant refactors.
- Use `$verify-change` before any completion claim.
- Invoke `$task-handoff` when work crosses an agent, session, branch, worktree, or owner boundary.

Skills are project-scoped under `.agents/skills/` and governed by `.agents/skill-catalog.yaml`. Do not add or broaden a Skill without updating the catalog and validating its trigger boundaries.

## Project commands

The application stack has not been selected. Do not invent setup, test, lint, typecheck, or build commands.

The only verified repository command is:

```bash
python3 scripts/validate_project_framework.py
```

Add application commands here only after they have been executed successfully in this repository.

## Working agreement

- Clarify materially different interpretations before implementation.
- During product discovery, discuss product meaning before technical solutions.
- Search existing terms, components, contracts, and capabilities before creating new ones.
- Keep uncertain design in the active change; create a durable contract only after its owner and boundary are stable.
- Reconcile accepted design into its canonical or executable owner and remove obsolete active explanations before closing a change.
- Prefer the smallest coherent design; reuse must be earned by stable semantics.
- Refactor locally at the seam exposed by a change; avoid unrelated cleanup and large rewrites.
- Research external technology from current primary sources and record uncertainty.
- Match each completion claim to task-appropriate evidence and disclose skipped checks.
- Keep one writer for shared specs, public contracts, design primitives, ADRs, and release records.
- Use separate worktrees for concurrent implementation after interfaces and ownership are fixed.

## Human decision boundaries

The human owner decides product meaning, scope tradeoffs, risk acceptance, consequential architecture, external cost, destructive operations, and production changes. Agents may execute autonomously inside an approved, reversible boundary but must stop before changing that boundary.

## Code review rules

- Flag behavior that diverges from the approved change or current spec.
- Flag duplicated sources of truth, speculative abstractions, and unrelated refactors.
- Flag new design documents that lack a stable owner or duplicate an executable or canonical source.
- Flag completed changes whose accepted design remains only in a change folder, PR, or handoff.
- Flag external interface assumptions without primary-source or controlled runtime evidence.
- Flag completion claims without discriminating verification.
- Flag parallel-write plans without fixed interfaces and disjoint ownership.
