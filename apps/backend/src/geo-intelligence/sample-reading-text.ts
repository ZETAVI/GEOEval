import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";

export const SAMPLE_READING_TEXT_PROFILE = "markdown-emphasis@1";

type PositionedNode = {
  type: string;
  position?: ReturnType<typeof fromMarkdown>["position"];
  children?: PositionedNode[];
};

/**
 * Produce a parser reading view without changing the canonical answer.
 * Only recognised emphasis delimiters are removed; document structure and
 * business content remain byte-for-byte in their original order.
 */
export function buildSampleReadingText(originalAnswer: string): string {
  const tree = fromMarkdown(originalAnswer, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  const removals: Array<[number, number]> = [];
  const visit = (node: PositionedNode) => {
    if (node.type === "strong" || node.type === "emphasis") {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      const innerStart = node.children?.[0]?.position?.start.offset;
      const innerEnd = node.children?.at(-1)?.position?.end.offset;
      if (
        start !== undefined &&
        end !== undefined &&
        innerStart !== undefined &&
        innerEnd !== undefined
      ) {
        const opening = originalAnswer.slice(start, innerStart);
        const closing = originalAnswer.slice(innerEnd, end);
        const allowed = node.type === "strong" ? ["**", "__"] : ["*", "_"];
        if (allowed.includes(opening) && opening === closing) {
          removals.push([start, innerStart], [innerEnd, end]);
        }
      }
    }
    node.children?.forEach(visit);
  };
  visit(tree);
  removals.sort((left, right) => left[0] - right[0]);

  let cursor = 0;
  const parts: string[] = [];
  for (const [start, end] of removals) {
    if (start < cursor)
      throw new Error("Overlapping Markdown delimiter ranges");
    parts.push(originalAnswer.slice(cursor, start));
    cursor = end;
  }
  parts.push(originalAnswer.slice(cursor));
  return parts.join("");
}
