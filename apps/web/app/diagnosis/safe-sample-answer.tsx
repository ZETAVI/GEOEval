import { Fragment, type ReactNode } from "react";
import type { EvaluationReport } from "@geoeval/api-client";
import { SafeMarkdown } from "./safe-markdown.js";
import "./sample-rich-answer.css";

type Highlight =
  EvaluationReport["questions"][number]["samples"][number]["highlights"][number];
type Inline = {
  type: "text" | "link" | "image" | "citation";
  text?: string;
  marks?: string[];
  href?: string;
  sourceId?: string;
  id?: string;
  alt?: string;
};
type ListItem = { inlines: Inline[]; children?: List[] };
type List = { ordered: boolean; items: ListItem[] };
type Cell = { text: string; header: boolean; inlines?: Inline[] };
type Block = {
  type: "paragraph" | "heading" | "quote" | "list" | "table" | "code" | "image";
  text?: string;
  inlines?: Inline[];
  level?: number;
  ordered?: boolean;
  items?: ListItem[];
  rows?: Cell[][];
  id?: string;
  alt?: string;
};
type Image = { id: string; alt: string; src: string | null };
type RichAnswer = { version: 2; blocks: Block[]; images: Image[] };
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// The API already projects this shape. This second bounded boundary prevents a
// malformed/stale response from crashing the report or injecting arbitrary HTML.
function isRichAnswer(value: unknown): value is RichAnswer {
  let nodes = 0;
  let chars = 0;
  const visit = () => ++nodes <= 8_000;
  const text = (value: unknown, max = 64_000) =>
    typeof value === "string" &&
    value.length <= max &&
    (chars += value.length) <= 250_000;
  const optional = (value: unknown, max?: number) =>
    value === undefined || text(value, max);
  const array = (value: unknown, max: number): value is unknown[] =>
    Array.isArray(value) && value.length <= max;
  const inlines = (value: unknown): boolean =>
    array(value, 1_024) &&
    value.every((part) => {
      if (!visit() || !record(part)) return false;
      if (part.type === "citation") return optional(part.label, 300);
      if (part.type === "image")
        return text(part.id, 160) && optional(part.alt, 300);
      return (
        (part.type === "text" || part.type === "link") &&
        text(part.text) &&
        optional(part.href, 4_000) &&
        optional(part.sourceId, 160) &&
        (part.marks === undefined ||
          (array(part.marks, 8) &&
            part.marks.every(
              (mark) => mark === "strong" || mark === "emphasis",
            )))
      );
    });
  const list = (value: unknown, depth: number): boolean =>
    visit() &&
    depth <= 8 &&
    record(value) &&
    typeof value.ordered === "boolean" &&
    array(value.items, 256) &&
    value.items.every(
      (item) =>
        visit() &&
        record(item) &&
        inlines(item.inlines) &&
        (item.children === undefined ||
          (array(item.children, 16) &&
            item.children.every((child) => list(child, depth + 1)))),
    );
  if (
    !record(value) ||
    value.version !== 2 ||
    !array(value.blocks, 256) ||
    !array(value.images, 32)
  )
    return false;
  return (
    value.blocks.every((block) => {
      if (!visit() || !record(block)) return false;
      if (block.type === "list") return list(block, 0);
      if (block.type === "image")
        return text(block.id, 160) && optional(block.alt, 300);
      if (block.type === "code") return text(block.text);
      if (block.type === "table")
        return (
          array(block.rows, 256) &&
          block.rows.every(
            (row) =>
              array(row, 64) &&
              row.every(
                (cell) =>
                  visit() &&
                  record(cell) &&
                  text(cell.text) &&
                  typeof cell.header === "boolean" &&
                  (cell.inlines === undefined || inlines(cell.inlines)),
              ),
          )
        );
      if (
        block.type !== "paragraph" &&
        block.type !== "heading" &&
        block.type !== "quote"
      )
        return false;
      return (
        (block.inlines === undefined
          ? text(block.text)
          : inlines(block.inlines)) &&
        (block.level === undefined ||
          (typeof block.level === "number" &&
            Number.isInteger(block.level) &&
            block.level >= 1 &&
            block.level <= 6))
      );
    }) &&
    value.images.every(
      (image) =>
        visit() &&
        record(image) &&
        text(image.id, 160) &&
        text(image.alt, 300) &&
        (image.src === null || text(image.src, 4_000)),
    )
  );
}

function safeUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 4_000) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

const bodyText = (block: { inlines?: Inline[]; text?: string }) =>
  block.inlines?.map((part) => part.text ?? "").join("") || block.text || "";
const label = (text: string) =>
  text
    .replace(/[\u200b-\u200d\uFE0F\u00ad]/g, "")
    .trim()
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/^(?:[一二三四五六七八九十]+|\d+)[、.．]\s*/, "");
const sourceHeading = (text: string) =>
  /^(?:实际)?(?:参考(?:网页|资料|文献|信源|来源|链接)|网页信源|信源|来源|信息来源|引用来源|sources|references|citations)(?:来源|及完整链接|及链接|完整链接|链接|说明|清单|列表)?\s*[：:。]?$/i.test(
    label(text),
  );
const sourceField = (text: string) =>
  /^(?:来源|信源|参考来源|参考资料|资料来源|参考网页)\s*[：:]/.test(
    label(text),
  );

function visibleBlocks(blocks: Block[]): Block[] {
  let sourceSection = false;
  return blocks.filter((block) => {
    const text = bodyText(block);
    if (["paragraph", "heading"].includes(block.type) && sourceHeading(text)) {
      sourceSection = true;
      return false;
    }
    if (block.type === "heading") sourceSection = false;
    if (sourceSection) {
      if (
        block.type === "paragraph" &&
        !/https?:\/\//i.test(text) &&
        !sourceField(text) &&
        !block.inlines?.some((part) => part.type === "link")
      )
        sourceSection = false;
      else return false;
    }
    return !(
      ["paragraph", "heading"].includes(block.type) && sourceField(text)
    );
  });
}

export function SafeSampleAnswer({
  originalAnswer,
  richAnswer,
  highlights,
}: {
  originalAnswer: string | null;
  richAnswer?: unknown;
  highlights: Highlight[];
}) {
  if (!isRichAnswer(richAnswer))
    return (
      <SafeMarkdown markdown={originalAnswer ?? ""} highlights={highlights} />
    );
  const images = new Map(richAnswer.images.map((image) => [image.id, image]));
  const image = (part: { id?: string; alt?: string }): ReactNode => {
    const metadata = part.id ? images.get(part.id) : undefined;
    const alt = metadata?.alt || part.alt || "回答中的图片";
    const src = safeUrl(metadata?.src);
    return src ? (
      <img
        className="sample-rich-image"
        src={src}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    ) : (
      <span
        className="sample-rich-image-placeholder"
        role="img"
        aria-label={`图片：${alt}`}
      >
        {alt}（图片暂不可用）
      </span>
    );
  };
  const inlines = (parts: Inline[] = []): ReactNode =>
    parts.map((part, index) => {
      if (
        part.type === "citation" ||
        (part.type === "link" &&
          part.sourceId &&
          /^[-•·]\s*\S{1,16}$/.test((part.text ?? "").trim()))
      )
        return null;
      if (part.type === "image")
        return <Fragment key={index}>{image(part)}</Fragment>;
      let body: ReactNode = (part.text ?? "")
        .replace(/\[citation:\d+\]/gi, "")
        .split("\n")
        .map((line, lineIndex) => (
          <Fragment key={lineIndex}>
            {lineIndex > 0 && <br />}
            {line}
          </Fragment>
        ));
      if (part.marks?.includes("strong")) body = <strong>{body}</strong>;
      if (part.marks?.includes("emphasis")) body = <em>{body}</em>;
      const href = part.type === "link" ? safeUrl(part.href) : null;
      return href ? (
        <a key={index} href={href} target="_blank" rel="noopener noreferrer">
          {body}
        </a>
      ) : (
        <Fragment key={index}>{body}</Fragment>
      );
    });
  const list = (items: ListItem[] = [], ordered = false): ReactNode => {
    const Tag = ordered ? "ol" : "ul";
    return (
      <Tag>
        {items
          .filter(
            (item) =>
              !sourceField(bodyText(item)) && !sourceHeading(bodyText(item)),
          )
          .map((item, index) => (
            <li key={index}>
              {inlines(item.inlines)}
              {item.children?.map((child, childIndex) => (
                <Fragment key={childIndex}>
                  {list(child.items, child.ordered)}
                </Fragment>
              ))}
            </li>
          ))}
      </Tag>
    );
  };
  const block = (value: Block, index: number): ReactNode => {
    if (value.type === "list")
      return (
        <Fragment key={index}>{list(value.items, value.ordered)}</Fragment>
      );
    if (value.type === "image")
      return <figure key={index}>{image(value)}</figure>;
    if (value.type === "code")
      return (
        <pre key={index}>
          <code>{value.text}</code>
        </pre>
      );
    if (value.type === "table") {
      const rows = value.rows ?? [];
      const header = rows[0]?.some((cell) => cell.header) === true;
      const row = (cells: Cell[], rowIndex: number, headerRow: boolean) => (
        <tr key={rowIndex}>
          {cells.map((cell, cellIndex) =>
            cell.header ? (
              <th key={cellIndex} scope={headerRow ? "col" : "row"}>
                {cell.inlines !== undefined ? inlines(cell.inlines) : cell.text}
              </th>
            ) : (
              <td key={cellIndex}>
                {cell.inlines !== undefined ? inlines(cell.inlines) : cell.text}
              </td>
            ),
          )}
        </tr>
      );
      return (
        <div
          className="sample-rich-table"
          key={index}
          tabIndex={0}
          role="region"
          aria-label="回答中的表格"
        >
          <table>
            {header && <thead>{row(rows[0]!, 0, true)}</thead>}
            <tbody>
              {rows
                .slice(header ? 1 : 0)
                .map((cells, rowIndex) => row(cells, rowIndex, false))}
            </tbody>
          </table>
        </div>
      );
    }
    const body = value.inlines
      ? inlines(value.inlines)
      : value.text?.split("\n").map((line, lineIndex) => (
          <Fragment key={lineIndex}>
            {lineIndex > 0 && <br />}
            {line}
          </Fragment>
        ));
    if (value.type === "heading") {
      const Tag =
        value.level === 4
          ? "h4"
          : value.level === 5
            ? "h5"
            : value.level === 6
              ? "h6"
              : "h3";
      return <Tag key={index}>{body}</Tag>;
    }
    return value.type === "quote" ? (
      <blockquote key={index}>{body}</blockquote>
    ) : (
      <p key={index}>{body}</p>
    );
  };
  return (
    <div className="safe-markdown sample-rich-answer">
      {visibleBlocks(richAnswer.blocks).map(block)}
    </div>
  );
}
