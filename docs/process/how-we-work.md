# How We Work in GEOEval

This is the practical operating guide for humans and agents. Use the smallest process that keeps intent, ownership, and evidence clear.

## 1. Discuss and explore

Use this mode when the product question or problem is still open.

- Inspect current product truth and source inputs.
- Use `$requirement-grill` for ambiguity that could produce materially different products.
- Ask one to three root questions per round.
- Record decisions, non-goals, assumptions, and open owners—not the transcript.
- Do not create implementation code or choose architecture during product discovery.

For the current project phase, work from [`define-product-foundation`](../../openspec/changes/define-product-foundation/proposal.md).

## 2. Start a durable change

When intent is stable enough and the work changes behavior, invoke `$start-change`.

Classify the work:

- **Trivial:** direct implementation and focused verification.
- **Standard:** proposal, behavior delta, and tasks.
- **Architectural:** standard artifacts plus design, impact, rollback or migration, ADR when durable, and explicit approval.

GitHub Issues track owner and status. They link to the change folder rather than copying it.

Before adding a durable design document, follow the [design-knowledge admission test](design-knowledge.md). Record the documentation impact as `none`, `update`, `add`, `move`, `merge`, `delete`, `generate`, or `supersede`.

## 3. Research before external design

Use `$source-research` before selecting or integrating external libraries, APIs, models, services, standards, or platforms.

The output should distinguish:

- documented official capability;
- configured account access;
- controlled runtime evidence;
- remaining assumption.

Search results and community articles may discover options but do not define interfaces.

## 4. Approve consequential decisions

The product owner approves product meaning, scope, irreversible architecture, material external cost, security or privacy tradeoffs, destructive operations, and production changes.

Agents may continue without another ceremony when execution remains inside an approved, reversible boundary.

## 5. Implement in a small vertical slice

- Trace changed lines to the approved outcome.
- Search existing capabilities before creating reusable abstractions.
- Refactor locally when the change exposes a weak seam.
- Keep unrelated cleanup out of the change.
- Add tests and contracts with the behavior, not afterward.
- Use a separate Git worktree for each concurrent implementation package.

Use multi-agent work first for independent research, code mapping, testing, and review. Parallel writes require fixed interfaces, disjoint files, and one lead agent responsible for reconciliation.

## 6. Review architecture and behavior

Use `$architecture-review` for module boundaries, shared components, public contracts, data ownership, external dependencies, or significant refactors.

Review findings should distinguish:

- `must-fix` before merge;
- `should-fix` in the scoped change when practical;
- `consider` as a tradeoff or follow-up;
- pre-existing debt from regressions introduced by the change.

## 7. Verify before claiming completion

Use `$verify-change` to map every material claim to evidence. Evidence may include focused tests, contracts, builds, runtime state, logs, browser or visual inspection, migration rehearsal, and rollback checks.

A check is `passed`, `failed`, `blocked`, or `not run`. Only the first is a pass. Local verification, merge, and production delivery are different states.

## 8. Reconcile and close

After approval and verification:

1. merge accepted behavior into `openspec/specs/`;
2. add or supersede ADRs for durable tradeoffs;
3. update the canonical glossary, contract, component, or design-system owner once;
4. remove, move, merge, regenerate, or supersede obsolete design material;
5. put user-visible release value in `CHANGELOG.md` through the release workflow;
6. archive the change record after its delta is reconciled;
7. ensure unresolved work has an owner and durable location.

Use `$task-handoff` only when work crosses an agent, session, worktree, branch, or owner boundary. The handoff is a compact current snapshot; it is not a permanent session diary.

## Suggested prompt patterns

```text
Use $requirement-grill to help us define GEOEval's primary user and first valuable outcome. Stay at product level and ask no more than three root questions per round.
```

```text
Use $start-change to classify and document this approved behavior change. Create only the minimum artifacts required by its risk.
```

```text
Use $source-research to verify the official API, version, permissions, quotas, failure model, and licensing before we design this integration.
```

```text
Use $architecture-review to review this change against the approved spec, module ownership, dependency direction, data boundaries, and earned reuse.
```

```text
Use $verify-change to map every completion claim to concrete evidence and report anything not run.
```

```text
Use $task-handoff to preserve the exact current state, evidence, risks, promoted knowledge, and next actions for the next session.
```
