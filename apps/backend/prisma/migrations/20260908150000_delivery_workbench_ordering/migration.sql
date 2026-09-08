BEGIN;
-- Earlier admission used an independent default time. Align the existing local
-- ordering projection with the immutable purchase, without changing paid facts.
UPDATE "publication_deliveries" d SET "created_at" = o."created_at"
FROM "publishing_orders" o
WHERE d."order_id" = o."id" AND d."created_at" <> o."created_at";
CREATE INDEX "publication_deliveries_assignee_deadline_idx"
  ON "publication_deliveries" ("assignee_account_id", "created_at", "sequence");
CREATE INDEX "publication_deliveries_deadline_idx"
  ON "publication_deliveries" ("created_at", "sequence");
DROP INDEX "publication_deliveries_assignee_account_id_sequence_idx";
COMMIT;
