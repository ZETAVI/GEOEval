# Design: First Evaluation Slice

## S1 Boundary

Identity and Access owns account role, mobile challenge, and revocable session.
Brand Knowledge owns brand profiles, evaluation readiness and fingerprint, and
the account's current-brand selection. The Web consumes generated REST/OpenAPI
types and never imports backend or Prisma types.

## Identity Design

- Public entry uses request-challenge and complete-challenge use cases behind a
  challenge-delivery port.
- The first implementation supplies a deterministic local/test adapter only.
  Configuration rejects that adapter in a production environment; selecting and
  validating a real SMS provider remains a later external-integration change.
- Mobile numbers are normalized before uniqueness checks. One public mobile
  entry can create only a terminal-customer account.
- Challenge values are stored as a keyed digest, expire, are single-use, and
  stop after a bounded number of failed attempts.
- Sessions use random opaque bearer material stored only as a digest. The browser
  receives it in an HttpOnly, SameSite cookie; logout revokes the durable session.

## Brand Design

- Brand records use additive optional fields so incomplete drafts can be saved.
- Evaluation readiness is owner-derived from the complete required basic field
  set. The evaluation fingerprint includes normalized company/store name,
  industry, two characteristics, and region; contact-only edits do not change it.
- Current-brand selection is a Brand Knowledge record keyed by account, not an
  account-role field. Creating the first brand and selecting another brand are
  Brand Knowledge transactions.
- Every command and query is scoped by the authenticated account. Database
  foreign keys support ownership but do not replace application authorization.

## Web Design

- `/` becomes the simple public product entry and the F0 browser page moves to
  an explicitly non-product route.
- `/enter` owns the passwordless entry flow, including the optional first-brand
  handoff.
- `/brands` is the initial terminal-customer service home with the agreed left
  navigation, current-brand utility area, real brand cards, and honest capability
  previews for not-yet-implemented modules.
- Layout is responsive and keyboard-operable. Exact final illustration, motion,
  and full design-system extraction remain outside S1.
- Customer-facing copy uses concise Chinese except for established product terms
  such as GEO and AI. The current interface fixes the journey and information
  structure only; final visual language, typography, motion, and detailed polish
  belong to a later independently reviewed frontend-design task and must not
  silently change accepted product behavior.

## Migration, Failure, and Rollback

- The migration is additive: new account, challenge, session, brand, and current
  selection tables. Existing F0 tables and records remain untouched.
- Invalid or expired challenges return a concise correction outcome. Missing or
  foreign sessions and brand IDs return authorization-safe outcomes without
  exposing account existence.
- Application rollback can stop using the new routes while retaining additive
  tables. A later destructive removal requires a separately reviewed migration.

## Evolution Markers

- The validation-harness objectivity profile is not touched in S1. Its move into
  GEO Intelligence is triggered by S2, when the first production evaluation
  owner exists.
- The deterministic challenge adapter must be replaced or disabled before any
  production release; this trigger is owned by the future authentication
  integration change.
