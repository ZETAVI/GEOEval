ALTER TABLE "mobile_challenges"
  ADD COLUMN "superseded_at" TIMESTAMP(3);

CREATE TABLE "mobile_challenge_rate_limits" (
  "mobile" VARCHAR(20) NOT NULL,
  "window_started_at" TIMESTAMP(3) NOT NULL,
  "request_count" INTEGER NOT NULL DEFAULT 0,
  "last_issued_at" TIMESTAMP(3) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mobile_challenge_rate_limits_pkey" PRIMARY KEY ("mobile"),
  CONSTRAINT "mobile_challenge_rate_limits_request_count_check"
    CHECK ("request_count" >= 0)
);

CREATE INDEX "mobile_challenge_rate_limits_last_issued_at_idx"
  ON "mobile_challenge_rate_limits"("last_issued_at");
