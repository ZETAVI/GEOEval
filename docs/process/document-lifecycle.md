# Document Lifecycle

## Source-of-truth map

| Information | Canonical home | What must not duplicate it |
| --- | --- | --- |
| Product direction | `docs/product/vision.md` | Roadmap prose in handoffs or AGENTS files |
| Shared business language | `docs/product/glossary.md` and domain code names | Private agent synonyms and repeated glossaries |
| Current behavior | Code, schemas, tests, `openspec/specs/` | In-flight proposal language |
| Current design boundary | Code structure, public interface, current spec, short owner-local design contract | A central encyclopedia or version-copy document |
| Architecture rationale | ADR | PR discussion copied into multiple design documents |
| Proposed change | `openspec/changes/<id>/` | Issue and PR bodies repeating the full design |
| Execution status and evidence | Issue, PR, CI, runtime evidence | Long-lived status documents |
| Continuation state | Current handoff when ownership changes | Append-only session diaries |
| Released value | `CHANGELOG.md` and release record | Commit-by-commit history rewritten as release notes |

## Lifecycle classes

### Current truth

Current truth is actively maintained and may be rewritten when the system changes. Keep it concise, capability-oriented, and linked to executable evidence.

For the admission, ownership, update, and retirement rules of current design documents, follow [Design Knowledge](design-knowledge.md).

### Decision history

ADRs are immutable records. Supersede an old ADR with a new ADR; do not rewrite history to make the decision look obvious in retrospect.

### Change delta

A change folder is temporary working truth. It may evolve during discovery and implementation. On completion, reconcile it into current specs and archive or close it.

When one stage is stable but later work has a different decision boundary, close
the completed change. Do not keep appending future implementation, integration,
or release work to it as a general backlog. Follow the progressive decomposition
and evolution-marker rules in [Design Knowledge](design-knowledge.md).

### Execution evidence

Issues, PRs, CI output, logs, screenshots, and test results prove what happened. They are not the canonical explanation of the system.

PR and CI links are the default evidence; do not copy them into a permanent
registry. When sensitive, ignored, paid-call, or large runtime evidence cannot
enter Git, keep one short Manifest in the active Change or Issue containing:

- purpose and execution date;
- bounded input/route scope and sanitized result;
- local or protected locator plus content hash;
- owner, `0700` directory / `0600` file permissions, and retention reason;
- the merge, decision, or expiry event that deletes or deliberately retains it.

At reconciliation, verify the locator still exists, then delete or explicitly
retain the raw evidence. A Manifest proves provenance and continuity; it does
not make the raw content a second current-design authority.

### Handoff state

A handoff is a compact recovery snapshot. Update or replace it while a task is active. Once work is complete, the PR summary and canonical documents replace it.

## Promote; do not copy

When a transient artifact reveals durable knowledge:

1. identify the canonical owner;
2. update that owner once;
3. link to it from the transient artifact;
4. remove or expire the duplicate explanation.

Git is the version history for current documents. Do not preserve obsolete active copies by adding `v2`, `new`, `final`, or `latest` filenames.

Examples:

- A recurring API failure becomes a Gotcha in the relevant skill or integration reference.
- A durable module tradeoff becomes an ADR.
- A newly stable business term becomes part of the glossary.
- A one-time implementation sequence stays in the closed change record.

## Changelog policy

Use four audience-facing groups:

- Added capabilities
- Behavior and workflow changes
- Experience, performance, and reliability improvements
- Fixes

Mark breaking changes, security changes, and required migrations prominently. Omit empty sections. Internal refactors and tests receive no changelog entry unless they change observable behavior or operational risk.
