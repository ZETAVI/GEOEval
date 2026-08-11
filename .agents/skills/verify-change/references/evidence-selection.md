# Evidence Selection

Choose evidence that exercises the boundary named in the claim.

| Claim | Strong Evidence | Weak Proxy |
| --- | --- | --- |
| Local rule is correct | Focused unit or property tests including edge cases | Linter passes |
| Two modules interoperate | Contract or integration test at their public boundary | Both modules compile |
| External API works for this account | Controlled call with expected semantic response | Configuration exists or HTTP 200 alone |
| UI matches intended behavior | Browser flow plus visual and accessibility inspection | Component test alone |
| Refactor preserves behavior | Existing behavioral tests plus targeted regression test | Diff looks equivalent |
| Migration is safe | Rehearsal on representative data plus rollback evidence | Migration file parses |
| Deployment is live | Named environment revision, health, and user-path check | Branch merged |
| Document is usable | Rendered or linked artifact inspected against requirements | Source file generated |

## Verification Depth

- **Trivial:** targeted static or focused behavioral check.
- **Standard:** focused tests plus affected boundary checks and build.
- **Architectural:** standard evidence plus migration, compatibility, operational, and rollback checks.

Increase depth for security, data loss, external cost, or difficult rollback. Reduce scope only by explicitly recording what remains unverified.
