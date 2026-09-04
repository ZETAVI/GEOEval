import { describe, expect, it, vi } from "vitest";

import { prewarmEvaluationQuestions } from "../app/brands/evaluation-question-prewarm.js";

describe("evaluation question prewarm", () => {
  it("ensures durable preparation for a current evaluation-ready Brand", async () => {
    const prepare = vi.fn().mockResolvedValue(undefined);

    await prewarmEvaluationQuestions(
      "http://127.0.0.1:3300",
      { id: "brand-ready", isCurrent: true, readyForEvaluation: true },
      prepare,
    );

    expect(prepare).toHaveBeenCalledOnce();
    expect(prepare).toHaveBeenCalledWith(
      "http://127.0.0.1:3300",
      "brand-ready",
    );
  });

  it.each([
    { isCurrent: false, readyForEvaluation: true },
    { isCurrent: true, readyForEvaluation: false },
  ])("does not prewarm an ineligible Brand", async (state) => {
    const prepare = vi.fn().mockResolvedValue(undefined);

    await prewarmEvaluationQuestions(
      "http://127.0.0.1:3300",
      { id: "brand-ineligible", ...state },
      prepare,
    );

    expect(prepare).not.toHaveBeenCalled();
  });

  it("does not turn a successful Brand mutation into a failure", async () => {
    const prepare = vi
      .fn()
      .mockRejectedValue(new Error("temporarily unavailable"));

    await expect(
      prewarmEvaluationQuestions(
        "http://127.0.0.1:3300",
        { id: "brand-ready", isCurrent: true, readyForEvaluation: true },
        prepare,
      ),
    ).resolves.toBeUndefined();
  });
});
