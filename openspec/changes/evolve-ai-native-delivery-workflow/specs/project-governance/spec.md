# Project Governance Delta

## Added requirements

### Requirement: Tracking artifacts have distinct contracts

Issues SHALL begin with problem overview, current actual behavior and evidence,
and expected outcome before scope, decisions, acceptance, and context. Sub-issues
SHALL represent independently verifiable vertical slices. Pull requests SHALL
explain concrete implementation, evidence, reconciliation, risk, and follow-up
without copying the diff or current specification. Commits SHALL remain coherent
revision checkpoints rather than project-status records.

### Requirement: Later adjustment preserves original history

Multiple coherent PRs MAY serve one open Issue. A closed Issue SHALL be reopened
only when original acceptance failed, regressed, or closed prematurely. Later
requirements and independently valuable adjustments SHALL use linked follow-up
Issues.

### Requirement: Installed Skills are pre-filtered locally

The project Router SHALL use the installed catalog, workflow group, phase,
trigger descriptions, and exclusions to return a bounded candidate set. It SHALL
NOT search for or install external Skills, and SHALL NOT bypass explicit gates
for state-changing workflows.
