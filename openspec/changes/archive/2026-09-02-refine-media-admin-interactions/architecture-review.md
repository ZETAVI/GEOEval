# Architecture Review

- Result: `ready`
- Boundary: Media Supply domain vocabulary, generated administrator contract,
  owner-local Web components, current spec/glossary/overview/ADR

## Findings

1. `must-fix` — platform and supplier deletion is conditionally omitted in the
   Web. A correct backend capability therefore appears absent and the user
   cannot discover its prerequisites. Keep the action visible, disable it when
   blocked, and explain the exact prerequisite; retain backend rechecks.
2. `should-fix` — resource edit/delete controls are sibling buttons without a
   grouping or shared styling boundary, producing the native-looking control in
   review. Group them in an owner-local action container and use one visual
   hierarchy for neutral versus destructive actions.
3. `should-fix` — field hints such as `可空 · 填整数` are independent grid
   children, so paired controls begin at different vertical positions. Wrap
   label and hint in one field-heading row; inputs remain full-width below it.
4. `should-fix` — `MANUAL_INACTIVE` has leaked from the internal source-of-state
   distinction into API and canonical product language. Rename the derived
   projection to `RESOURCE_INACTIVE` and present it simply as `停用`; do not
   change persistence or supplier-restoration behavior.

## Boundary assessment

The backend lifecycle, transactions, concurrency, and deletion guards remain
cohesive and require no new service or abstraction. The proposed two owner-local
components remove repeated interaction complexity without moving business
rules into a UI framework. No new ADR is required; ADR 0003 evolves in place.

## Implementation review

- The generated administrator contract, domain projection, canonical spec,
  glossary, overview, ADR, tests, and UI now use `RESOURCE_INACTIVE`; the Web
  presents it only as `停用`.
- Platform, resource, and supplier delete controls remain visible while the
  repository retains authoritative transactional guards and revision checks.
- `DeleteConfirmDialog` and `FieldHeading` remain Media Supply owner-local and
  introduce no generic command, form-schema, or state framework.
- Final diff review found and corrected one dangling CSS selector left by the
  obsolete Listing-style cleanup and one audit-display key that would have
  exposed `effectiveStatus` in English. No material findings remain.
