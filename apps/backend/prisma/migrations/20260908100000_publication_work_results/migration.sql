BEGIN;
ALTER TYPE "PublicationDeliveryStatus" ADD VALUE 'COMPLETED';
ALTER TABLE publication_deliveries
  ADD COLUMN published_quantity INTEGER NOT NULL DEFAULT 0 CHECK (published_quantity >= 0),
  DROP CONSTRAINT publication_delivery_responsibility;
-- Compare text so the newly added enum label is not consumed before commit.
ALTER TABLE publication_deliveries ADD CONSTRAINT publication_delivery_responsibility CHECK (
  (status::text='PENDING_HANDLING' AND assignee_account_id IS NULL AND started_at IS NULL AND published_quantity=0)
  OR (status::text='PUBLISHING' AND assignee_account_id IS NOT NULL)
  OR (status::text='COMPLETED' AND assignee_account_id IS NOT NULL AND started_at IS NOT NULL AND published_quantity>0)
);
CREATE TABLE publication_work_items (
  order_id UUID NOT NULL REFERENCES publication_deliveries(order_id) ON DELETE RESTRICT,
  slot INTEGER NOT NULL CHECK (slot>0),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision>0),
  platform_id UUID NOT NULL,
  started_at TIMESTAMP(3),
  preparation JSONB,
  result JSONB,
  PRIMARY KEY (order_id,slot),
  CONSTRAINT publication_work_result_shape CHECK (result IS NULL OR
    (jsonb_typeof(result)='object' AND result ?& ARRAY['platformId','displayName','title','url','publishedAt'] AND started_at IS NOT NULL))
);
-- The URL is owned once, inside the result. A fragment cannot create another
-- publication; request normalization removes it before reaching this index.
CREATE UNIQUE INDEX publication_work_result_url_unique
  ON publication_work_items(order_id,(result->>'url')) WHERE result IS NOT NULL;
CREATE TABLE publication_work_audits (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES publication_deliveries(order_id) ON DELETE RESTRICT,
  slot INTEGER NOT NULL CHECK (slot>0),
  revision INTEGER NOT NULL CHECK (revision>0),
  order_revision INTEGER NOT NULL CHECK (order_revision>1),
  actor_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  idempotency_key UUID NOT NULL,
  request JSONB NOT NULL,
  before_state JSONB,
  after_state JSONB NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (order_id,idempotency_key),
  UNIQUE (order_id,slot,revision)
);
COMMIT;
