import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";

export const M4_READING_TEXT_PROFILE = "markdown-emphasis@1";

type PositionedNode = {
  type: string;
  position?: ReturnType<typeof fromMarkdown>["position"];
  children?: PositionedNode[];
};

// Produce one derived reading string, never overwrite canonical sampling data.
// AST positions remove only recognised emphasis delimiters. Keeping the rest of
// the source avoids reserializing/reordering lists, tables, links or code. Strike
// marks remain because they can express withdrawal, not merely decoration.
export function buildM4ReadingText(originalAnswer: string): string {
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
  removals.sort((a, b) => a[0] - b[0]);
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
