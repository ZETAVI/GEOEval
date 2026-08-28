import {
  collectSampleSemanticObservations,
  type SampleParserSemantic,
} from "./sample-parser.contract.js";
import type {
  EvaluationHighlightKind,
  EvaluationHighlightRange,
} from "./evaluation-report.view.js";

export type EvaluationHighlightProjection = {
  highlightUnavailable: boolean;
  highlights: EvaluationHighlightRange[];
};

export function buildEvaluationHighlightProjection(
  originalAnswer: string,
  semantic: SampleParserSemantic,
): EvaluationHighlightProjection {
  const observationKinds = new Map<string, Set<EvaluationHighlightKind>>();
  for (const observation of collectSampleSemanticObservations(semantic)) {
    const kind = polarityKind(observation.polarity);
    if (!kind) continue;
    for (const anchorId of observation.evidenceAnchorIds) {
      const kinds = observationKinds.get(anchorId) ?? new Set();
      kinds.add(kind);
      observationKinds.set(anchorId, kinds);
    }
  }

  const ranges = new Map<string, EvaluationHighlightRange>();
  for (const anchor of semantic.evidenceAnchors) {
    const kind = anchor.purposes.some(
      (purpose) =>
        purpose === "TARGET_MENTION" || purpose === "TARGET_POSITION",
    )
      ? "TARGET"
      : combinedKind(observationKinds.get(anchor.anchorId));
    if (!kind) continue;
    const range = findOccurrenceRange(
      originalAnswer,
      anchor.exactText,
      anchor.occurrence,
    );
    if (!range) return unavailableProjection();
    const key = `${range.start}:${range.end}`;
    const existing = ranges.get(key);
    ranges.set(key, {
      ...range,
      exactText: anchor.exactText,
      kind: existing ? mergeKind(existing.kind, kind) : kind,
    });
  }

  const highlights = [...ranges.values()].sort(
    (left, right) => left.start - right.start || left.end - right.end,
  );
  for (let index = 1; index < highlights.length; index += 1) {
    if (highlights[index]!.start < highlights[index - 1]!.end) {
      return unavailableProjection();
    }
  }
  return { highlightUnavailable: false, highlights };
}

function polarityKind(
  polarity: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED" | "UNCERTAIN",
): EvaluationHighlightKind | undefined {
  if (polarity === "POSITIVE") return "POSITIVE";
  if (polarity === "NEGATIVE") return "NEGATIVE";
  if (polarity === "MIXED") return "MIXED";
  return undefined;
}

function combinedKind(
  kinds: Set<EvaluationHighlightKind> | undefined,
): EvaluationHighlightKind | undefined {
  if (!kinds || kinds.size === 0) return undefined;
  if (kinds.has("MIXED") || (kinds.has("POSITIVE") && kinds.has("NEGATIVE"))) {
    return "MIXED";
  }
  return kinds.values().next().value;
}

function mergeKind(
  left: EvaluationHighlightKind,
  right: EvaluationHighlightKind,
): EvaluationHighlightKind {
  if (left === "TARGET" || right === "TARGET") return "TARGET";
  if (left === right) return left;
  return "MIXED";
}

function findOccurrenceRange(
  answer: string,
  exactText: string,
  occurrence: number,
): { start: number; end: number } | undefined {
  let found = 0;
  let offset = 0;
  while (offset <= answer.length - exactText.length) {
    const start = answer.indexOf(exactText, offset);
    if (start < 0) return undefined;
    found += 1;
    if (found === occurrence) return { start, end: start + exactText.length };
    offset = start + Math.max(1, exactText.length);
  }
  return undefined;
}

function unavailableProjection(): EvaluationHighlightProjection {
  return { highlightUnavailable: true, highlights: [] };
}
