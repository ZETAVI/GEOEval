# Document Lifecycle

## Source-of-truth map

| Information | Canonical home | What must not duplicate it |
| --- | --- | --- |
| Product direction | `docs/product/vision.md` | Roadmap prose in handoffs or AGENTS files |
| Shared business language | `docs/product/glossary.md` and domain code names | Private agent synonyms and repeated glossaries |
| Current behavior | Code, schemas, tests, `openspec/specs/` | In-flight proposal language |
| Module boundary | Code structure, public interface, short domain contract | A central encyclopedia of every internal detail |
| Architecture rationale | ADR | PR discussion copied into multiple design documents |
| Proposed change | `openspec/changes/<id>/` | Issue and PR bodies repeating the full design |
| Execution status and evidence | Issue, PR, CI, runtime evidence | Long-lived status documents |
| Continuation state | Current handoff when ownership changes | Append-only session diaries |
| Released value | `CHANGELOG.md` and release record | Commit-by-commit history rewritten as release notes |

## Lifecycle classes

### Current truth

Current truth is actively maintained and may be rewritten when the system changes. Keep it concise, capability-oriented, and linked to executable evidence.

### Decision history

ADRs are immutable records. Supersede an old ADR with a new ADR; do not rewrite history to make the decision look obvious in retrospect.

### Change delta

A change folder is temporary working truth. It may evolve during discovery and implementation. On completion, reconcile it into current specs and archive or close it.

### Execution evidence

Issues, PRs, CI output, logs, screenshots, and test results prove what happened. They are not the canonical explanation of the system.

### Handoff state

A handoff is a compact recovery snapshot. Update or replace it while a task is active. Once work is complete, the PR summary and canonical documents replace it.

## Promote; do not copy

When a transient artifact reveals durable knowledge:

1. identify the canonical owner;
2. update that owner once;
3. link to it from the transient artifact;
4. remove or expire the duplicate explanation.

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

