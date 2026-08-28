import type { EvaluationReport } from "@geoeval/api-client";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

type ReportQuestion = EvaluationReport["questions"][number];
type ReportHighlight = ReportQuestion["samples"][number]["highlights"][number];

type PositionedNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: PositionedNode[];
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};

type HighlightPluginOptions = {
  markdown: string;
  highlights: ReportHighlight[];
};

export function SafeMarkdown({ markdown, highlights }: HighlightPluginOptions) {
  return (
    <div className="safe-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSanitize,
          [rehypeEvidenceHighlights, { markdown, highlights }],
        ]}
        components={{
          a: ({ node: _node, children, ...properties }) => (
            <a {...properties} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
          img: ({ node: _node, alt }) => (
            <span
              className="markdown-image-placeholder"
              role="img"
              aria-label={alt ? `图片：${alt}` : "回答中的图片"}
            >
              图片：{alt || "未命名图片"}
            </span>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function rehypeEvidenceHighlights(options: HighlightPluginOptions) {
  return (tree: PositionedNode) => {
    if (!canApplyHighlights(options.markdown, options.highlights)) return;
    const placements = locateHighlights(tree, options.highlights);
    if (!placements) return;
    for (const [node, highlights] of placements) {
      replaceTextNode(node, highlights);
    }
  };
}

function canApplyHighlights(
  markdown: string,
  highlights: ReportHighlight[],
): boolean {
  const ordered = [...highlights].sort(
    (left, right) => left.start - right.start || left.end - right.end,
  );
  return ordered.every((highlight, index) => {
    const previous = ordered[index - 1];
    return (
      highlight.start >= 0 &&
      highlight.end > highlight.start &&
      highlight.end <= markdown.length &&
      markdown.slice(highlight.start, highlight.end) === highlight.exactText &&
      (!previous || highlight.start >= previous.end)
    );
  });
}

function locateHighlights(
  tree: PositionedNode,
  highlights: ReportHighlight[],
): Map<PositionedNode, ReportHighlight[]> | undefined {
  const textNodes: PositionedNode[] = [];
  visitTextNodes(tree, textNodes);
  const placements = new Map<PositionedNode, ReportHighlight[]>();
  for (const highlight of highlights) {
    const node = textNodes.find((candidate) =>
      nodeContainsHighlight(candidate, highlight),
    );
    if (!node) return undefined;
    const nodeStart = node.position!.start!.offset!;
    const localStart = highlight.start - nodeStart;
    if (
      node.value!.slice(localStart, localStart + highlight.exactText.length) !==
      highlight.exactText
    ) {
      return undefined;
    }
    const nodeHighlights = placements.get(node) ?? [];
    nodeHighlights.push(highlight);
    placements.set(node, nodeHighlights);
  }
  return placements;
}

function visitTextNodes(node: PositionedNode, output: PositionedNode[]): void {
  if (node.type === "text" && typeof node.value === "string") {
    output.push(node);
  }
  for (const child of node.children ?? []) visitTextNodes(child, output);
}

function nodeContainsHighlight(
  node: PositionedNode,
  highlight: ReportHighlight,
): boolean {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  return start !== undefined && end !== undefined
    ? highlight.start >= start && highlight.end <= end
    : false;
}

function replaceTextNode(
  node: PositionedNode,
  highlights: ReportHighlight[],
): void {
  const nodeStart = node.position!.start!.offset!;
  const originalValue = node.value!;
  const ordered = [...highlights].sort(
    (left, right) => left.start - right.start || left.end - right.end,
  );
  const children: PositionedNode[] = [];
  let cursor = 0;
  for (const highlight of ordered) {
    const localStart = highlight.start - nodeStart;
    const localEnd = highlight.end - nodeStart;
    if (localStart > cursor) {
      children.push({
        type: "text",
        value: originalValue.slice(cursor, localStart),
      });
    }
    children.push({
      type: "element",
      tagName: "mark",
      properties: {
        className: [
          "evidence-highlight",
          `evidence-${highlight.kind.toLowerCase()}`,
        ],
        dataHighlightKind: highlight.kind,
      },
      children: [
        { type: "text", value: originalValue.slice(localStart, localEnd) },
      ],
    });
    cursor = localEnd;
  }
  if (cursor < originalValue.length) {
    children.push({ type: "text", value: originalValue.slice(cursor) });
  }
  node.type = "element";
  node.tagName = "span";
  node.properties = {};
  node.children = children;
  delete node.value;
}
