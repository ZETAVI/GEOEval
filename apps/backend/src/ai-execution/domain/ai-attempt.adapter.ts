import type { AiAdapterResult, AiAttemptRequest } from "./ai-attempt.types.js";

export const AI_ATTEMPT_ADAPTER = Symbol("AI_ATTEMPT_ADAPTER");

export interface AiAttemptAdapter {
  execute(request: AiAttemptRequest): Promise<AiAdapterResult>;
}

export type DeterministicAttemptScenario = (
  request: AiAttemptRequest,
) => AiAdapterResult | undefined;

export class DeterministicAiAttemptAdapter implements AiAttemptAdapter {
  constructor(
    private readonly scenario: DeterministicAttemptScenario = () => undefined,
  ) {}

  async execute(request: AiAttemptRequest): Promise<AiAdapterResult> {
    const controlled = this.scenario(request);
    if (controlled) return controlled;

    if (request.purpose === "EVALUATION_ACQUISITION") {
      const companyName = requiredString(request.input, "companyName");
      const query = requiredString(request.input, "query");
      const platformLabel = requiredString(request.input, "platformLabel");
      const questionOrdinal = requiredNumber(request.input, "questionOrdinal");
      return {
        kind: "SUCCEEDED",
        output: {
          kind: "ACQUISITION",
          answerContent: [
            `## ${platformLabel} 的公开信息回答`,
            "",
            `针对“${query}”，可参考的对象包括 ${companyName} 及同类商家。`,
            "",
            "| 观察维度 | 客观信息 |",
            "| --- | --- |",
            `| 品牌信息 | ${companyName} 在公开资料中有可识别信息 |`,
            `| 问题序号 | ${questionOrdinal} |`,
            "",
            questionOrdinal === 2
              ? "本题按行业范围给出候选，没有明确推荐该品牌。"
              : `综合公开资料，${companyName} 的特点需要结合实际需求判断。`,
          ].join("\n"),
          answerFormat: "MARKDOWN",
          sourceMetadata: [
            {
              title: `${companyName} 公开资料`,
              url: `https://example.invalid/${request.sampleId}`,
            },
          ],
          searchUsed: true,
          returnedModel: request.requestedModel,
        },
        usage: { inputTokens: 128, outputTokens: 196 },
      };
    }

    const companyName = requiredString(request.input, "companyName");
    const answerContent = requiredString(request.input, "answerContent");
    const questionOrdinal = requiredNumber(request.input, "questionOrdinal");
    const mentioned = questionOrdinal !== 2;
    return {
      kind: "SUCCEEDED",
      output: {
        kind: "INTERPRETATION",
        mentioned,
        position: mentioned ? ((questionOrdinal - 1) % 3) + 1 : null,
        relevantDescription: mentioned
          ? `${companyName} 在回答中以候选对象出现，评价保持中性。`
          : null,
        characteristics: mentioned
          ? [
              { label: "信息可识别", sentiment: "POSITIVE" },
              { label: "公开依据有限", sentiment: "NEGATIVE" },
            ]
          : [],
        objectiveSummary: mentioned
          ? "回答明确提及品牌，并同时保留适用条件。"
          : "回答有效，但没有明确提及该品牌。",
        structuredEvidence: {
          answerLength: answerContent.length,
          evidenceVersion: "deterministic-evaluation-v1",
        },
      },
      usage: { inputTokens: 220, outputTokens: 96 },
    };
  }
}

function requiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Deterministic AI input is missing ${key}`);
  }
  return value;
}

function requiredNumber(input: Record<string, unknown>, key: string): number {
  const value = input[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Deterministic AI input is missing ${key}`);
  }
  return value;
}
