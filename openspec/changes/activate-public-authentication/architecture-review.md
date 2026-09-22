# Architecture review

Review date: 2026-09-22. Scope: Issue #156 public authentication activation.

## Verdict

Approved for integration after the findings below were resolved. Provider
formalization, RAM restriction, credential rotation and production activation
remain release operations, not code-completion claims.

## Boundary assessment

- **Identity ownership stays cohesive.** The aggregate budget is admission
  control for the existing Challenge lifecycle. It does not become a provider
  delivery ledger, billing source or cross-module rate-limit service.
- **The provider seam stays narrow.** CAPTCHA verification and SMS delivery
  ports and adapters are unchanged; the application owns when a paid call is
  permitted, while the adapters still own external protocol translation only.
- **The public edge stays coarse.** Nginx owns an IP-keyed pressure limit; the
  application owns exact global and per-mobile invariants. No client IP is
  added to business persistence.
- **Product authentication remains authoritative.** Removing Basic Auth does
  not add authority to CAPTCHA. Session, current account, fixed-role, Origin,
  CSRF and owner checks retain their existing owners.
- **Non-product surfaces are removed at composition.** Swagger and F0
  Foundation routes are omitted in production rather than hidden behind a
  shared password or undocumented URL.
- **Payment stays independent.** Callback locations and application payment
  state machines are unchanged and remain regression surfaces only.

## Findings and disposition

1. **Critical — Basic Auth masked Swagger and F0 validation surfaces.**
   Resolved by production-only composition omission plus route tests and a Web
   not-found boundary.
2. **High — CAPTCHA alone did not bound distributed SMS cost.** Resolved with a
   transactionally locked singleton budget, exact concurrent test and edge
   throttle. The existing manual sending switch remains the emergency stop.
3. **High — test CAPTCHA mode was not a public risk decision.** The release
   sequence now requires formal/default mode before public routing changes.
4. **High — runtime credentials were not yet fixed-egress constrained.** The
   accepted release gate adds `acs:SourceIp=8.138.100.3`, proves allowed and
   denied sources, rotates the key and revokes its predecessor.
5. **Medium — the existing entry notice did not explain Alibaba risk-data
   processing.** Resolved with a linked public notice before CAPTCHA/SMS.
6. **Medium — Prisma formatting touched unrelated payment and support models.**
   Resolved by removing every unrelated schema diff before integration.

## Rejected expansion

No generalized quota platform, second provider, custom risk engine, full CSP,
application IP store or payment rewrite is introduced. Those would add new
owners and failure modes without changing this release decision.

## Residual risks and gates

- One singleton row serializes Challenge issuance. This is deliberate for the
  expected 1,000–2,000 monthly volume; replica-count or traffic-order changes
  trigger redesign.
- Nginx sees the direct client address only in the current no-untrusted-proxy
  topology. A CDN or load balancer requires a reviewed real-IP boundary.
- The notice records current implementation facts but is not a claim of full
  legal-program review.
- Formal CAPTCHA risk challenge is provider-controlled. Ordinary formal pass
  and invalid/replay denial are required; a forced real-risk popup is not.

