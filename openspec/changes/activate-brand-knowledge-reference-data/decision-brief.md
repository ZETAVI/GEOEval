# Decision Brief: Brand Knowledge Reference-Data Activation

## Outcome

Activate controlled industry and mainland-region selection in Brand Knowledge
without changing Query Generator ownership or manufacturing a new evaluation
opportunity from a representation migration.

## Recommended decisions

| Decision | Proposed choice | Main tradeoff | Owner |
| --- | --- | --- | --- |
| First-release geography | Mainland China only | Matches the complete current official source; Hong Kong, Macao, and Taiwan need another source and product boundary | Product owner |
| Special-city terminal level | Use official township/town/street nodes for Dongguan, Zhongshan, Danzhou, and Jiayuguan | More precise local context and consistent `district or town` meaning; requires nine-digit township data | Product owner |
| Official source | MCA 2025-12-31 annual four-level publication, normalized into one offline project snapshot | Strong authority and stable code lifecycle; commercial reuse is not explicitly licensed | Product and legal/risk owner |
| Release gate | Permit private development only after approval; block commercial release until written source clarification or legal clearance | Lets architecture and migration proceed without misrepresenting data rights | Product and legal/risk owner |
| Initial Web control | Three native dependent selects; presentation groups only where the official tree skips a tier | Small, responsive, accessible baseline; no initial search/autocomplete | Product owner for behavior, engineering for reversible UI detail |
| Persisted Brand identity | Store secondary industry ID, conditional `Other` phrase, and official terminal-region ID; derive ancestors from Brand-owned sources | Small write contract and no redundant path drift; current labels require the retained source | Architecture owner |
| Fingerprint | Version-2 semantic hash over stable IDs and customer semantic fields; exclude labels, versions, UI groups, and non-semantic recommendation-subject edits | Correct revision meaning; requires exact migration across Brand/Definition/Run keys | Product and architecture owners |
| Exact legacy mapping | Transactionally move equivalent Brand, Definition, and Run keys to v2 while leaving immutable snapshot JSON unchanged | Preserves eligibility and report continuity; migration must abort on collision | Product and architecture owners |
| Unmatched legacy data | Preserve old text, assign an evaluation-ineligible unresolved fingerprint, mark current Brand incomplete, and require customer-controlled selection | No guessing or old-Definition bypass; later confirmation may form a normal new semantic revision | Product owner |
| Snapshot compatibility | Treat current unversioned shape as legacy-v1; create structured v2 only for new Definitions and centralize the decoder | Historical truth stays intact; implementation must remove four duplicated snapshot parsers | Architecture owner |
| #26 boundary | Merge #27 first; #26 rebases and consumes only the Brand evaluation-purpose projection | One writer and source owner; Query implementation waits for a stable contract | Product and architecture owners |

## Customer-visible behavior

- Registration and Brand editing show the same dependent industry and region
  controls.
- `Other` asks for a concrete product or service only when selected.
- Parent changes clear incompatible child values.
- Exact migrated selections continue normally without a changed-information
  notice or new free opportunity.
- Unresolved legacy values show a concise request to reselect; the product does
  not pretend they are valid controlled choices.
- Query preparation and evaluation remain unavailable until the current Brand
  is honestly ready.

## Evidence boundary

- Official source and code lifecycle: `research/administrative-region-source-brief.md`.
- Current code path: Brand free-text mutation, text fingerprint, GEO Definition
  uniqueness, and legacy snapshot readers at `main@a1d3d57`.
- Query consumer: #26 design checkpoint `33b2972`, read-only.
- No Provider call, schema migration, generated contract, or runtime behavior
  has been implemented or verified by this proposal.

## Confirmation and next gate

- Current status: `Awaiting product-owner confirmation`.
- Confirm before: schema, executable data, API, generated client, Web, migration,
  or test implementation.
- After confirmation: run the deterministic implementation and migration slice,
  verify it without Provider calls, perform fixed-diff reviews, then request the
  separate PR merge decision.
- After #27 merge: rebase #26 and verify the projection contract before any
  Query Provider call.
