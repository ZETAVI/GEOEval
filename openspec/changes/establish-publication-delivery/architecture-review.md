# Architecture review and scoped simplification

Scope: Issue #73 proposed Delivery/Commerce seam at `main@0552aa7`, not application implementation or a completed Change.
Review method: independent read-only reviewer first inspected the existing candidate and current code/ADR/Identity rules, then performed a bounded check against this draft. Lead reconciled the remaining exact findings below; no broad repeat review or runtime claim.

| Finding                                        | Initial consequence                                                                                    | Resolution in current draft                                                                                                                                                | Status                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| One return without an execution/freeze point   | Early replacement compensation could consume the only settlement before another item needs termination | Design §4 finalizes after remaining work finishes/stops, then one order-level exact settlement; pending money never blocks publishing                                      | Resolved for proposal                                               |
| Unclear agreement owner/linearization          | Administrator pays v1 while an operator changes v2; wrong agreement gets marked paid                   | Delivery owns revisioned intention, Commerce owns actual return; composition transaction locks wallet then Delivery, checks exact version/eligibility and unique execution | Resolved for proposal                                               |
| Finalized-only administrator queue             | Completed order with recorded but unfinalized compensation disappears from pending list                | Design §4 query includes ALL recorded unpaid intentions; not-finalized items visible but not executable; matching Delivery scenario and task                               | Resolved by lead after limited re-review                            |
| Inactive target inherited from grant-only gate | Existing debt becomes invisible or impossible to fulfil after customer/operator status changes         | Design §5 proposes original-order return by active administrator without reactivating customer; pending query independent of customer/Brand/operator status                | Explicit security decision included for human architecture approval |

Recommendation: minimal synchronous receipt, sparse Delivery work and separate one-time Commerce settlement; no new Outbox or generic approval framework. Ready for human architecture approval after the above draft corrections; not approved for implementation, runtime verified, merged or deployed.

The human owner subsequently approved the architecture, original-order return boundary and non-conflicting #39 parallel implementation. The #39/#42 owner confirmed no current/next-slice Prisma, migration, API assembly, generated-client or Web ownership conflict at `6a7515a`; future shared writes require a new explicit window. Integration/real-money/production remain unapproved. DB concurrency, migration, HTTP, browser and module-wiring tests remain implementation tasks.

## Approved-direction simplification before implementation

A second bounded independent review, requested by the human, identified three concrete implementation reductions without changing business meaning:

- The receipt is the initial Delivery aggregate, not a second entity/state machine/log.
- One explicit save of the negotiated result plus its revision and current settlement eligibility replaces a separate submit/finalize/approval workflow. All unpaid saved agreements remain visible.
- Slice 1 persists only what its real caller uses; settlement structures belong to slice 2, and real-Writer orchestration tables remain outside the Issue.

These reductions are adopted in the design and deltas. Status: ready for the approved bounded implementation, not a feature-completion or merge verdict.

## Results-slice retrospective

At the verified responsibility baseline `2658295`, the Issue was not complete:
no per-publication result, completion or settlement existed. Existing 340-test
backend, 91-test Web and browser evidence covered responsibility, not these new
claims. Repeating that review would not establish result correctness.

The bounded continuation keeps Delivery ownership, sparse work and a single
transactional result count; there is no new workflow/queue/approval engine or
payment adapter. Independent seam review identified async Identity changes as
an additional save-time fence, and confirmed the required old/new interactions:
direct work establishes startedAt; reassignment cannot reopen Completed. Lead
also checked preparation limits against the accepted core article contract.
These are concrete correctness adjustments, not a broader redesign.

Result HTTP/DB and UI implementation evidence belongs in the PR and its results
verification record. Full page submission and narrow-screen confirmation remain
separate from automated tests, and the parent retains exception/settlement work.
The workbench deadline-priority presentation and final operational recovery
rehearsal are still slice acceptance follow-through, not implicitly delivered by
adding result storage. #77 points-module extraction is coordinated after a
stable results checkpoint and before return implementation; recharge behavior
does not enter this results diff.
