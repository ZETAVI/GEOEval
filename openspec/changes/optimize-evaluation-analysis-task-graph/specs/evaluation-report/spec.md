# Evaluation Report Delta

## ADDED Requirements

### Requirement: Controlled name-level competitor resolution

The controlled candidate SHALL group readable observed names before composing
the report while keeping source-record identity internal to the program.

#### Scenario: Parsed competitor names are resolved

- **WHEN** accepted open-answer records reach resolution
- **THEN** exact repeated names and their contexts are aggregated
- **AND** every observed name appears exactly once in a brand group or ignored set
- **AND** unknown, missing, repeated or focus-brand results are rejected
- **AND** validated names expand back to all original sample occurrences
- **AND** the program does not infer an alias or silently repair a model group.

### Requirement: Controlled report composition

The controlled candidate SHALL keep deterministic performance facts separate
from model-written customer interpretation.

#### Scenario: A report is composed

- **WHEN** enough parsed samples and a valid name-resolution result are available
- **THEN** the program supplies mention counts, positions and competitor statistics
- **AND** the Agent receives target content rather than all raw answers or all
  competitor descriptions
- **AND** it produces performance assessment, brand perception, positive and
  negative themes and at most two GEO article directions
- **AND** all content-point and sample references are locally validated
- **AND** customer prose does not expose internal identifiers.

#### Scenario: A competitor occurrence is counted

- **WHEN** a resolved group has positive, neutral or negative source occurrences
- **THEN** positive and neutral occurrences contribute at most once per sample
- **AND** the earliest stored position is retained
- **AND** negative occurrences remain evidence but do not contribute to the
  competitor count.
