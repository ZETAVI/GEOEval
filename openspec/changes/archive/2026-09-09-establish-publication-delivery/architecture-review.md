# Architecture review and scoped simplification

Archived review history. The dated draft/slice dispositions below retain their original scope. Final bounded verification and accepted-owner reconciliation are indexed in [tasks](tasks.md); actual integration state belongs to PR #81, not the old recommendation text.

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
rehearsal were separate slice acceptance follow-through, not implicitly delivered by
adding result storage. Their implementation and bounded evidence now reside in
the current Delivery spec, owner-local query/schedule and verification record.
The deadline review keeps one derived seven-day schedule and immutable-pair
pagination; it introduces no urgency persistence, background timer or workflow
engine. A real purchase test disproved equal independent timestamp defaults;
admission now explicitly takes original purchase time and migration corrects
the existing sort projection, not paid facts. #77 points-module extraction is coordinated after a
stable results checkpoint and before return implementation; recharge behavior
does not enter this results diff.

## Order-side continuation after points assembly

At integrated `main@bcb81db`, independent order-side review and lead reconciliation
confirm that normal fulfilment and points assembly are not reopened. The fixed
[C1 producer handoff](https://github.com/ZETAVI/GEOEval/pull/82#issuecomment-5588365460)
has now returned the accounting/schema window. Consumer inspection confirms the
explicit reservation-aware capacity check, account-first transaction binding
and recharge-specific actor/uniqueness rules; it is not a full review of the
payment slice or proof of order-return behavior. No second accounting policy or
unconsumed refund interface is needed.

The next activation must cover negotiated effective targets, stopped/Closed
preservation during correction/reassignment, and terminal-aware active lists.
Existing normal-slice code is not incorrectly labeled a current defect merely
because it does not yet implement those future states. Acceptance scenarios now
live in design §4.1 and will be exercised through actual persistence/HTTP/pages
once their actual transaction/HTTP/page adapters exist, not counted as passing
runtime tests. The current #73 slice explicitly stacks on fixed C1 `59930dd`
through PR #82 under the agreed write window; lower payment PRs remain unmerged.

The lead does not adopt the review suggestion to prebuild stopped-slot ranges:
the confirmed first-release sequence finishes retained work before one stop of
the remainder. Such a range/partial-stop planner has no required caller today.
The human owner now confirms zero-point termination by the current responsible
operator, without administrator confirmation or a ledger entry. Incremental
review finds no new owner or approval engine necessary. An existing positive
agreement must be explicitly revised, not reset by a new-form default; its
revision competes with administrator settlement under the same Delivery lock.
Closed and Completed remain distinct and corrections/reassignment preserve both.
Review status: ready for the approved bounded implementation after the explicit
C1 stack/write-window alignment. Zero-close audit rollback, stale authority,
positive-to-zero settlement race and terminal projections are targeted evidence,
not a reason to repeat unaffected normal-delivery review.
