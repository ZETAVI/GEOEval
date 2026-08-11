# Design

## Chosen approach

Use ownership and lifecycle instead of document volume as the control model:

1. Executable facts remain in code, schemas, tokens, tests, and generated references.
2. Current design documents describe durable boundaries and are edited in place.
3. OpenSpec change artifacts describe only the proposed delta.
4. ADRs preserve durable decision history and are superseded rather than rewritten.
5. Issues, PRs, handoffs, and archived changes remain evidence and history, not current design truth.

Add one general design-contract template rather than separate templates for modules, components, APIs, data, and design systems. Specialize only after repeated real use proves a stable need.

## Lightweight controls

- Require a design-document admission test in the workflow and existing Skills.
- Add a small PR reconciliation section.
- Require the policy and template in the existing standard-library validator.
- Reject only obvious version-copy filenames in canonical design directories.

## Alternatives rejected

### Central document registry

Rejected for the pilot. It creates a second structure that can drift and would need maintenance before the project has enough design assets to justify it.

### Metadata on every Markdown file

Rejected for the pilot. Mandatory IDs, owners, review dates, and status fields add ceremony and false confidence without checking semantic accuracy.

### New document-governance Skill

Rejected. Starting, reviewing, verifying, and handing off changes already provide the correct lifecycle seams. A new Skill would overlap them and worsen routing.

### Automated semantic duplicate detection

Rejected. It is expensive, probabilistic, and likely to create noisy gates. Humans and agents should use repository search and ownership review first.

## Revisit when

Reconsider a registry or stronger automation only when the project repeatedly cannot locate canonical design ownership, maintains many independent modules, or experiences duplicate active documents despite this workflow.
