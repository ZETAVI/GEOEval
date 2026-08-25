CREATE TYPE "FoundationRecordStatus" AS ENUM ('ACCEPTED', 'PROCESSED');
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'DISPATCHED', 'COMPLETED');

CREATE TABLE "foundation_records" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "FoundationRecordStatus" NOT NULL DEFAULT 'ACCEPTED',
    "correlation_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "foundation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "record_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "correlation_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_effects" (
    "id" UUID NOT NULL,
    "business_key" TEXT NOT NULL,
    "outbox_event_id" UUID NOT NULL,
    "record_id" UUID NOT NULL,
    "result" TEXT NOT NULL,
    "correlation_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_effects_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outbox_events_status_updated_at_idx" ON "outbox_events"("status", "updated_at");
CREATE UNIQUE INDEX "work_effects_business_key_key" ON "work_effects"("business_key");
CREATE UNIQUE INDEX "work_effects_outbox_event_id_key" ON "work_effects"("outbox_event_id");

ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_record_id_fkey"
  FOREIGN KEY ("record_id") REFERENCES "foundation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_effects" ADD CONSTRAINT "work_effects_outbox_event_id_fkey"
  FOREIGN KEY ("outbox_event_id") REFERENCES "outbox_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_effects" ADD CONSTRAINT "work_effects_record_id_fkey"
  FOREIGN KEY ("record_id") REFERENCES "foundation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
