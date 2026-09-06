# Delivery tasks

## 0. Contract and decision

- [x] Reconcile #57 and verify latest main, #65 ownership and independent #39 scope.
- [x] Review existing article/quote/Identity seams and prepare the minimum proposal,
      behavior delta, transaction/failure matrix, migration and recovery design.
- [x] Obtain owner approval for atomic purchase, article/price reconfirmation,
      stage-specific granted-only administration and the normal purchase journey.

## 1. Maintained offers and account points reach the customer

- [x] Add package schema/constraints and verify fresh migration plus isolated
      backup/restore; extend Media deletion gates for current package references.
- [x] Deliver administrator package maintenance and customer-safe package cards
      using shared shell/styles, with revisions, audit, role/HTTP and browser evidence.
- [x] Deliver zero-initialized point account, idempotent grant/correction and
      customer unified balance/history, with atomicity and cross-account tests.

## 2. Confirmed article to paid pending order

- [ ] Extend the existing deletion gate and restrictive references for paid orders.
- [ ] Add transaction-bound article and media readers and verify their shared
      connection/locking against actual concurrent edits before purchase activation.
- [ ] Deliver saved selection, server quote and both publishing modes as one
      customer path; preserve intent through article changes and shortage.
- [ ] Deliver atomic submit/debit/freeze and same-key recovery, plus pending order
      list/detail and safe projections. Verify every failure-matrix row.
- [ ] Verify full customer/admin browser paths at desktop/narrow widths without
      hand-editing business data; use dedicated database/Redis and no paid Provider.

## 3. Integration and closure

- [ ] Promote activated behavior into owner-local current specs, update existing
      architecture and the accepted atomic-purchase ADR, execute the applicable
      Product Definition marker and retain unactivated commercial scenarios.
- [ ] Review the fixed diff, run required tests/build/generated-contract checks,
      archive this Change only at full acceptance, and use Partial/Final PR semantics.
- [ ] Integrate only under applicable authorization; reconcile exact tree,
      Issue/Project, test-resource shutdown and workspace exit independently.

Continue on this branch within approval. Each implementation slice includes its
own API/UI/permissions/evidence; do not create horizontal layer-only Issues or
reopen the completed #57. Tracker/PR own live status and evidence, not this file.
