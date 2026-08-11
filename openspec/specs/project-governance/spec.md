# Project Governance Specification

## Purpose

Keep project intent, current behavior, design knowledge, decision history, execution evidence, and release communication distinct and maintainable during AI-native delivery.

This spec is the normative governance contract. The operational admission, update, retirement, and reconciliation procedure lives in [Design Knowledge](../../../docs/process/design-knowledge.md).

## Requirements

### Requirement: Design knowledge has an explicit authority

The project SHALL distinguish executable facts, current design documents, change designs, durable decision history, and execution evidence so that one concept does not acquire multiple active authorities.

#### Scenario: An agent needs an existing design

- **WHEN** an agent needs to understand or extend a product, module, component, API, data, or design-system boundary
- **THEN** it SHALL search the owning executable source and current design contract before creating a new design artifact
- **AND** it SHALL treat change folders, PRs, and handoffs as supporting context rather than current authority

### Requirement: Durable design documents pass an admission test

A new durable design document SHALL be created only when the knowledge has a clear owner, scope, and lifetime and cannot be represented more reliably by an existing canonical or executable source.

#### Scenario: A proposed document duplicates current truth

- **WHEN** the same fact already belongs to code, schema, tests, generated references, or an active design contract
- **THEN** the existing owner SHALL be updated or linked
- **AND** a second maintained copy SHALL NOT be created

### Requirement: Current design evolves in place

Current design documents SHALL be updated, moved, merged, or deleted as their owned design changes; Git history SHALL carry previous versions.

#### Scenario: A design is replaced

- **WHEN** an accepted change replaces an existing current design
- **THEN** the canonical document SHALL be updated in place or moved to its new owner
- **AND** obsolete active explanations SHALL be removed
- **AND** durable decision history SHALL be preserved through an ADR when needed

### Requirement: Change closure reconciles design knowledge

A standard or architectural change SHALL NOT close until accepted behavior and durable design knowledge are reconciled into their current owners or explicitly determined to have no documentation impact.

#### Scenario: Implementation is complete

- **WHEN** verification succeeds
- **THEN** the change SHALL record whether canonical design sources were updated, moved, merged, deleted, regenerated, or unaffected
- **AND** accepted truth SHALL NOT remain only in a change design, PR, or handoff

### Requirement: Governance remains proportional

The project SHALL add design documents and automated controls only when they address a concrete ownership, continuity, or drift risk.

#### Scenario: A trivial or self-explanatory change is proposed

- **WHEN** existing executable and canonical sources already make the design clear
- **THEN** the change SHALL proceed without creating a new durable design document
- **AND** it SHALL still receive task-appropriate verification
