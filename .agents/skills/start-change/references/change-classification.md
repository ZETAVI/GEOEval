# Change Classification

Classify by consequence and reversibility, not by estimated lines of code.

| Signal | Trivial | Standard | Architectural |
| --- | --- | --- | --- |
| Observable behavior | None or obvious correction | Bounded behavior change | Broad or foundational behavior change |
| Contract | Unchanged | Existing boundary extended | Public boundary introduced or redefined |
| Data | No durable change | Compatible local change | Ownership, schema migration, or consistency model changes |
| Dependencies | Local implementation | Bounded integration | Dependency direction or platform choice changes |
| Rollback | Immediate | Normal application rollback | Migration, compatibility, or staged rollout required |
| Decision lifetime | Short | Feature lifetime | Expected to constrain future design |

Escalate one level when security, privacy, destructive migration, significant external cost, or regulatory obligations are material.

Examples:

- Copy correction: trivial.
- New filtered list using an existing endpoint: standard.
- A small field that changes the public event schema: architectural.
- Refactoring a private helper behind complete tests: trivial or standard, even if the diff is large.
