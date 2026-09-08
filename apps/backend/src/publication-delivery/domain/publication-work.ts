// Quantity is the immutable purchased count, not a count of persisted work rows.
export const MAX_PUBLICATION_QUANTITY = 2_147_483_647;
export const MAX_WORK_PAGE_SIZE = 50;
const MAX_PRECISE_LINES = 200;

export type PublicationCommitment =
  | { readonly mode: "RANDOM"; readonly quantity: number }
  | {
      readonly mode: "PRECISE";
      readonly quantity: number;
      readonly lines: readonly {
        readonly platformId: string;
        readonly quantity: number;
      }[];
    };

export type PublicationSlot = {
  slot: number;
  // Null means the package does not promise a particular platform.
  purchasedPlatformId: string | null;
};

export type PublicationWorkPage = {
  items: PublicationSlot[];
  nextAfterSlot: number | null;
};

export class PublicationWorkError extends Error {
  constructor(
    readonly code: "INVALID_COMMITMENT" | "INVALID_WORK_PAGE",
    message: string,
  ) {
    super(message);
  }
}

const whole = (value: number, minimum: number, maximum: number) =>
  Number.isSafeInteger(value) && value >= minimum && value <= maximum;

type PlatformInterval = { through: number; platformId: string };

function platformIntervals(
  commitment: PublicationCommitment,
): PlatformInterval[] {
  if (!whole(commitment.quantity, 1, MAX_PUBLICATION_QUANTITY))
    throw new PublicationWorkError(
      "INVALID_COMMITMENT",
      "已购发布数量超出支持范围",
    );
  if (commitment.mode === "RANDOM") return [];
  if (
    commitment.mode !== "PRECISE" ||
    !Array.isArray(commitment.lines) ||
    commitment.lines.length < 1 ||
    commitment.lines.length > MAX_PRECISE_LINES
  )
    throw new PublicationWorkError(
      "INVALID_COMMITMENT",
      "已购精确发布项目不完整",
    );

  const platforms = new Set<string>();
  const intervals: PlatformInterval[] = [];
  let through = 0;
  for (const line of commitment.lines) {
    if (
      !whole(line.quantity, 1, MAX_PUBLICATION_QUANTITY) ||
      typeof line.platformId !== "string" ||
      !line.platformId.trim() ||
      platforms.has(line.platformId)
    )
      throw new PublicationWorkError(
        "INVALID_COMMITMENT",
        "已购精确发布项目的媒体或数量不正确",
      );
    platforms.add(line.platformId);
    through += line.quantity;
    if (through > commitment.quantity)
      throw new PublicationWorkError(
        "INVALID_COMMITMENT",
        "已购精确发布项目与总数量不一致",
      );
    intervals.push({ through, platformId: line.platformId });
  }
  if (through !== commitment.quantity)
    throw new PublicationWorkError(
      "INVALID_COMMITMENT",
      "已购精确发布项目与总数量不一致",
    );
  return intervals;
}

/**
 * Expand only the requested logical page. Stored work/results are overlaid by
 * the owning reader later; this function never invents progress or admission.
 * Precise intervals follow the frozen agreement order, never a live catalog.
 */
export function publicationWorkPage(
  commitment: PublicationCommitment,
  afterSlot: number,
  limit: number,
): PublicationWorkPage {
  if (
    !whole(afterSlot, 0, MAX_PUBLICATION_QUANTITY) ||
    !whole(limit, 1, MAX_WORK_PAGE_SIZE)
  )
    throw new PublicationWorkError(
      "INVALID_WORK_PAGE",
      "发布工作分页参数不正确",
    );
  const intervals = platformIntervals(commitment);
  const through = Math.min(commitment.quantity, afterSlot + limit);
  const items: PublicationSlot[] = [];
  let interval = 0;
  for (let slot = afterSlot + 1; slot <= through; slot += 1) {
    while (intervals[interval] && intervals[interval]!.through < slot)
      interval += 1;
    items.push({
      slot,
      purchasedPlatformId: intervals[interval]?.platformId ?? null,
    });
  }
  return {
    items,
    nextAfterSlot: through < commitment.quantity ? through : null,
  };
}
