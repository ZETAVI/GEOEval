# OpenSpec-Compatible Change Workspace

- `specs/` contains approved current capability behavior.
- `changes/` contains in-flight standard or architectural changes.
- GitHub Issues track coordination; pull requests carry implementation and verification evidence.

The OpenSpec CLI is optional. The artifact model is the contract.

## Minimum artifacts

- Trivial change: Issue or PR note plus verification; no change folder required.
- Standard change: `proposal.md`, capability delta specs, and `tasks.md`; add `design.md` only when design choices need review.
- Architectural change: standard artifacts plus design, impact, migration or rollback, and an ADR when the decision should outlive the change.

On completion, reconcile accepted behavior into `specs/`, promote durable decisions to ADRs, then archive or close the change. Do not leave accepted product behavior only in a completed change folder.
