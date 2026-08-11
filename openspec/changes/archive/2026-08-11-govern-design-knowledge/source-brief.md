# Source Brief: Lightweight Design-Knowledge Governance

- Accessed: 2026-08-11
- Recommendation: Adopt a small docs-as-code lifecycle around the existing OpenSpec-compatible workflow; do not install additional tooling.

## Evidence

| Claim | Primary source | Design implication |
| --- | --- | --- |
| OpenSpec treats `specs/` as current truth and each change as one scoped unit | https://github.com/Fission-AI/OpenSpec/blob/main/docs/overview.md | Keep current behavior separate from proposed design |
| Delta specs describe only the change, not the whole destination | https://github.com/Fission-AI/OpenSpec/blob/main/docs/overview.md | Avoid copying complete current designs into every change |
| Archive merges accepted deltas into current specs and moves completed changes out of the active set | https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md | Reconciliation and archiving close the knowledge loop |
| OpenSpec artifacts are enablers rather than rigid gates | https://github.com/Fission-AI/OpenSpec/blob/main/docs/overview.md | Scale documentation effort with ambiguity and consequence |
| Docs-as-code uses version control, plain text, review, and automated tests | https://www.writethedocs.org/guide/docs-as-code/ | Manage design knowledge in the normal engineering workflow |
| Broken-link checking is a useful, simple first documentation test | https://www.writethedocs.org/guide/tools/testing/ | Keep validation cheap and deterministic |

## Rejected additions

- Mandatory OpenSpec CLI
- Document platform or wiki
- Document registry and freshness scores
- Prose or style linter
- AI semantic duplicate gate

## Unknowns

Whether stronger indexing or module-specific templates are needed can only be learned after GEOEval has real product and architecture artifacts.
