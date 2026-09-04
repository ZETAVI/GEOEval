# Evaluation Report Delta

## MODIFIED Requirements

### Requirement: Model output does not become report truth

GEO Intelligence SHALL accept model output only after deterministic projection
into task-local semantic contracts and SHALL create one immutable report only
after every required synthesis component is accepted.

#### Scenario: Parallel semantic components are assembled

- **WHEN** accepted sample interpretations are ready for synthesis
- **THEN** one brand-relationship task decides every compact other-brand
  candidate and one report-narrative task writes current-brand conclusions
- **AND** the two tasks may execute in parallel without consuming each other's
  model output
- **AND** program logic resolves references, preserves deterministic metrics and
  rejects incomplete or unsupported meaning independently for each task
- **AND** only deterministic assembly combines both accepted components into the
  existing canonical synthesis, protected guidance and public report
- **AND** no intermediate component is customer-visible or rewrites an accepted
  sample, metric, historical synthesis or report.
