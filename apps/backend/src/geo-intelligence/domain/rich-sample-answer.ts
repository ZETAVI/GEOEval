/** Public, presentation-only projection of a completed browser answer. */
export type RichSampleInline = {
  type: "text" | "link" | "image";
  text?: string;
  marks?: Array<"strong" | "emphasis">;
  href?: string;
  id?: string;
  alt?: string;
};
export type RichSampleList = { ordered: boolean; items: RichSampleListItem[] };
export type RichSampleListItem = {
  inlines: RichSampleInline[];
  children?: RichSampleList[];
};
export type RichSampleCell = {
  text: string;
  header: boolean;
  inlines?: RichSampleInline[];
};
export type RichSampleBlock = {
  type: "paragraph" | "heading" | "quote" | "list" | "table" | "code" | "image";
  text?: string;
  inlines?: RichSampleInline[];
  level?: number;
  ordered?: boolean;
  items?: RichSampleListItem[];
  rows?: RichSampleCell[][];
  id?: string;
  alt?: string;
};
export type RichSampleImage = {
  id: string;
  alt: string;
  src: string | null;
  width?: number;
  height?: number;
  role: "content" | "thumbnail";
  availability: "remote_url" | "unavailable";
};
export type RichSampleAnswer = {
  version: 2;
  blocks: RichSampleBlock[];
  images: RichSampleImage[];
};

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
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

export function safeRichAnswerUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 4_000) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** Invalid optional rich metadata falls back to the unchanged original answer. */
export function projectRichSampleAnswer(
  content: unknown,
  media: unknown,
): RichSampleAnswer | null {
  let nodes = 0;
  let characters = 0;
  const node = () => {
    if (++nodes > 8_000) throw new Error("Rich node budget");
  };
  const text = (value: unknown, max = 64_000): string => {
    if (
      typeof value !== "string" ||
      value.length > max ||
      (characters += value.length) > 250_000
    )
      throw new Error("Rich text budget");
    return value;
  };
  const array = (value: unknown, max: number): unknown[] => {
    if (!Array.isArray(value) || value.length > max)
      throw new Error("Rich array budget");
    return value;
  };
  const inlines = (value: unknown): RichSampleInline[] =>
    array(value, 1_024).flatMap<RichSampleInline>((part) => {
      node();
      if (!record(part)) throw new Error("Rich inline");
      if (part.type === "citation") {
        text(part.label, 300);
        return [];
      }
      if (part.type === "image")
        return [
          {
            type: "image",
            id: text(part.id, 160),
            alt: text(part.alt ?? "", 300),
          },
        ];
      if (part.type !== "text" && part.type !== "link")
        throw new Error("Rich inline type");
      const body = text(part.text);
      if (
        part.type === "link" &&
        typeof part.sourceId === "string" &&
        /^[-•·]\s*\S{1,16}$/.test(body.trim())
      )
        return [];
      const marks =
        part.marks === undefined
          ? undefined
          : array(part.marks, 8).flatMap<"strong" | "emphasis">((mark) =>
              mark === "strong" || mark === "emphasis" ? [mark] : [],
            );
      return [
        {
          type: part.type,
          text: body.replace(/\[citation:\d+\]/gi, ""),
          ...(marks?.length ? { marks: [...new Set(marks)] } : {}),
          ...(part.type === "link" && safeRichAnswerUrl(part.href)
            ? { href: safeRichAnswerUrl(part.href)! }
            : {}),
        },
      ];
    });
  const list = (value: unknown, depth: number): RichSampleList => {
    node();
    if (!record(value) || depth > 8 || typeof value.ordered !== "boolean")
      throw new Error("Rich list");
    return {
      ordered: value.ordered,
      items: array(value.items, 256)
        .map((item): RichSampleListItem => {
          node();
          if (!record(item)) throw new Error("Rich list item");
          return {
            inlines: inlines(item.inlines),
            ...(item.children === undefined
              ? {}
              : {
                  children: array(item.children, 16).map((child) =>
                    list(child, depth + 1),
                  ),
                }),
          };
        })
        .filter(
          (item) =>
            !sourceField(
              item.inlines.map((part) => part.text ?? "").join(""),
            ) &&
            !sourceHeading(
              item.inlines.map((part) => part.text ?? "").join(""),
            ),
        ),
    };
  };
  try {
    if (!record(content) || content.version !== 2) return null;
    const blocks = array(content.blocks, 256).map((value): RichSampleBlock => {
      node();
      if (!record(value)) throw new Error("Rich block");
      if (value.type === "image")
        return {
          type: "image",
          id: text(value.id, 160),
          alt: text(value.alt ?? "", 300),
        };
      if (value.type === "list") return { type: "list", ...list(value, 0) };
      if (value.type === "table")
        return {
          type: "table",
          rows: array(value.rows, 256).map((row) =>
            array(row, 64).map((cell): RichSampleCell => {
              node();
              if (!record(cell) || typeof cell.header !== "boolean")
                throw new Error("Rich table cell");
              const originalText = text(cell.text ?? "");
              const parts =
                cell.inlines === undefined ? undefined : inlines(cell.inlines);
              return {
                text:
                  parts === undefined
                    ? originalText
                    : parts.map((part) => part.text ?? part.alt ?? "").join(""),
                header: cell.header,
                ...(parts === undefined ? {} : { inlines: parts }),
              };
            }),
          ),
        };
      if (value.type === "code")
        return { type: "code", text: text(value.text) };
      if (!["paragraph", "heading", "quote"].includes(String(value.type)))
        throw new Error("Rich block type");
      const type = value.type as "paragraph" | "heading" | "quote";
      if (value.inlines === undefined && typeof value.text !== "string")
        throw new Error("Rich block body");
      return {
        type,
        ...(value.inlines === undefined
          ? { text: text(value.text) }
          : { inlines: inlines(value.inlines) }),
        ...(type === "heading"
          ? {
              level:
                Number.isInteger(value.level) &&
                Number(value.level) >= 1 &&
                Number(value.level) <= 6
                  ? Number(value.level)
                  : 3,
            }
          : {}),
      };
    });
    let sourceSection = false;
    const visible = blocks.filter((block) => {
      const body =
        block.inlines?.map((part) => part.text ?? "").join("") ||
        block.text ||
        "";
      if (
        ["heading", "paragraph"].includes(block.type) &&
        sourceHeading(body)
      ) {
        sourceSection = true;
        return false;
      }
      if (block.type === "heading") sourceSection = false;
      if (sourceSection) {
        if (
          block.type === "paragraph" &&
          !/https?:\/\//i.test(body) &&
          !sourceField(body) &&
          !block.inlines?.some((part) => part.type === "link")
        )
          sourceSection = false;
        else return false;
      }
      return !(
        ["paragraph", "heading"].includes(block.type) && sourceField(body)
      );
    });
    const images = array(media ?? [], 32).map((value): RichSampleImage => {
      node();
      if (!record(value)) throw new Error("Rich image");
      const src = safeRichAnswerUrl(value.src);
      const dimension = (name: string) =>
        typeof value[name] === "number" &&
        Number.isFinite(value[name]) &&
        value[name] >= 0 &&
        value[name] <= 100_000
          ? { [name]: value[name] }
          : {};
      return {
        id: text(value.id, 160),
        alt: text(value.alt ?? "", 300),
        src,
        role: value.role === "thumbnail" ? "thumbnail" : "content",
        availability: src ? "remote_url" : "unavailable",
        ...dimension("width"),
        ...dimension("height"),
      };
    });
    return { version: 2, blocks: visible, images };
  } catch {
    return null;
  }
}
