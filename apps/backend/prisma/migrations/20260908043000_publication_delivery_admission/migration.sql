BEGIN;
-- Only real, internally consistent paid orders may enter the operations pool.
DO $$
DECLARE bad_order UUID;
BEGIN
  SELECT o.id INTO bad_order FROM publishing_orders o
  LEFT JOIN point_changes c ON c.publishing_order_id=o.id AND c.account_id=o.account_id AND c.kind='PUBLISHING_ORDER'
  WHERE c.id IS NULL
    OR jsonb_typeof(o.agreement->'totalPoints') IS DISTINCT FROM 'number'
    OR COALESCE((o.agreement->>'totalPoints')::numeric, 0) NOT BETWEEN 1 AND 2147483647
    OR -(c.granted_delta::bigint+c.funded_delta::bigint) <> (o.agreement->>'totalPoints')::numeric
  LIMIT 1;
  IF bad_order IS NOT NULL THEN
    RAISE EXCEPTION 'Original purchase consumption is missing or inconsistent for order %', bad_order;
  END IF;
END $$;
CREATE TYPE "PublicationDeliveryStatus" AS ENUM ('PENDING_HANDLING', 'PUBLISHING');
CREATE TABLE "publication_deliveries" (
  "order_id" UUID PRIMARY KEY REFERENCES "publishing_orders"("id") ON DELETE RESTRICT,
  "sequence" SERIAL NOT NULL UNIQUE,
  "status" "PublicationDeliveryStatus" NOT NULL DEFAULT 'PENDING_HANDLING',
  "assignee_account_id" UUID REFERENCES "accounts"("id") ON DELETE RESTRICT,
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "started_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "publication_delivery_responsibility" CHECK (
    ("status" = 'PENDING_HANDLING' AND "assignee_account_id" IS NULL AND "started_at" IS NULL)
    OR ("status" = 'PUBLISHING' AND "assignee_account_id" IS NOT NULL)
  )
);
CREATE INDEX "publication_deliveries_assignee_account_id_sequence_idx" ON "publication_deliveries"("assignee_account_id", "sequence");
CREATE TABLE "publication_delivery_audits" (
  "id" UUID PRIMARY KEY,
  "order_id" UUID NOT NULL REFERENCES "publication_deliveries"("order_id") ON DELETE RESTRICT,
  "revision" INTEGER NOT NULL CHECK ("revision" > 1),
  "actor_account_id" UUID NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
  "idempotency_key" UUID NOT NULL,
  "request" JSONB NOT NULL,
  "previous_assignee_id" UUID,
  "next_assignee_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("order_id", "revision"),
  UNIQUE ("order_id", "idempotency_key")
);

-- The old runtime had only pending orders. Admit them in bounded batches before
-- replacing its placeholder status; no repricing, debit or fabricated result.
DO $$
DECLARE admitted INTEGER;
BEGIN
  LOOP
    INSERT INTO "publication_deliveries" ("order_id", "created_at")
    SELECT o."id", o."created_at" FROM "publishing_orders" o
    WHERE NOT EXISTS (SELECT 1 FROM "publication_deliveries" d WHERE d."order_id" = o."id")
    ORDER BY o."number" LIMIT 500
    ON CONFLICT ("order_id") DO NOTHING;
    GET DIAGNOSTICS admitted = ROW_COUNT;
    EXIT WHEN admitted = 0;
  END LOOP;
  IF EXISTS (SELECT 1 FROM "publishing_orders" o WHERE NOT EXISTS
    (SELECT 1 FROM "publication_deliveries" d WHERE d."order_id" = o."id")) THEN
    RAISE EXCEPTION 'Historical publishing order admission incomplete';
  END IF;
END $$;

-- Deploy in the documented coordinated window: old pending-only code cannot
-- serve this schema after the placeholder is retired.
ALTER TABLE "publishing_orders" DROP COLUMN "status";
DROP TYPE "PublishingOrderStatus";
COMMIT;
