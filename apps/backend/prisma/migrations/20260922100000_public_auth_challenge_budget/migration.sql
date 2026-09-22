CREATE TABLE "mobile_challenge_budgets" (
  "id" VARCHAR(16) NOT NULL,
  "day_key" VARCHAR(10) NOT NULL,
  "day_count" INTEGER NOT NULL DEFAULT 0,
  "month_key" VARCHAR(7) NOT NULL,
  "month_count" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mobile_challenge_budgets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mobile_challenge_budgets_singleton_check"
    CHECK ("id" = 'GLOBAL'),
  CONSTRAINT "mobile_challenge_budgets_counts_check"
    CHECK ("day_count" >= 0 AND "month_count" >= 0)
);

WITH local_now AS (
  SELECT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai' AS value
)
INSERT INTO "mobile_challenge_budgets" (
  "id",
  "day_key",
  "day_count",
  "month_key",
  "month_count",
  "updated_at"
)
SELECT
  'GLOBAL',
  to_char(local_now.value, 'YYYY-MM-DD'),
  count(*) FILTER (
    WHERE (challenge.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')::date
      = local_now.value::date
  )::integer,
  to_char(local_now.value, 'YYYY-MM'),
  count(*) FILTER (
    WHERE to_char(
      challenge.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai',
      'YYYY-MM'
    ) = to_char(local_now.value, 'YYYY-MM')
  )::integer,
  CURRENT_TIMESTAMP
FROM local_now
LEFT JOIN mobile_challenges challenge ON TRUE
GROUP BY local_now.value;
