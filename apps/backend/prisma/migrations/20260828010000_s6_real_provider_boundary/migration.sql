CREATE TYPE "EvaluationSearchObservation" AS ENUM (
  'TRIGGERED',
  'NOT_TRIGGERED',
  'UNKNOWN'
);

ALTER TABLE "evaluation_sample_evidence"
ADD COLUMN "search_observation" "EvaluationSearchObservation";

UPDATE "evaluation_sample_evidence"
SET "search_observation" = CASE
  WHEN "search_used" THEN 'TRIGGERED'::"EvaluationSearchObservation"
  ELSE 'UNKNOWN'::"EvaluationSearchObservation"
END;

ALTER TABLE "evaluation_sample_evidence"
ALTER COLUMN "search_observation" SET NOT NULL;

ALTER TABLE "evaluation_sample_evidence"
DROP COLUMN "search_used";

ALTER TABLE "evaluation_definitions"
ADD COLUMN "objectivity_profile_content" TEXT NOT NULL DEFAULT $objectivity$【客观评价准则】
当回答涉及具体品牌、产品或服务的评价、比较或推荐时，请保持真实、客观、中肯。只根据可获得的信息作答，不因用户点名某个品牌而默认肯定或优先推荐；有依据时再说明相关优点或局限，信息不足时如实说明不确定。不要编造事实、优缺点、来源或引用，并保持普通用户问答的自然表达。$objectivity$;

ALTER TABLE "evaluation_definitions"
ALTER COLUMN "objectivity_profile_content" DROP DEFAULT;
