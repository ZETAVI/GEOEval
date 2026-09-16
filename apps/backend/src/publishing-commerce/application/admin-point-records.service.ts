import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { z } from "zod";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { adminChange } from "./point-account.service.js";
const uuid = z.uuid().transform((v) => v.toLowerCase());
const query = z
  .object({
    accountId: uuid.optional(),
    mobile: z
      .string()
      .trim()
      .regex(/^\+?\d{3,16}$/)
      .optional(),
    referenceId: uuid.optional(),
    kind: z
      .enum([
        "ADMIN_ADJUSTMENT",
        "PUBLISHING_ORDER",
        "RECHARGE",
        "ORDER_RETURN",
      ])
      .optional(),
    createdFrom: z.iso.datetime().optional(),
    createdBefore: z.iso.datetime().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z
      .string()
      .min(1)
      .max(1024)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
  })
  .strict()
  .refine(
    (v) =>
      !v.createdFrom ||
      !v.createdBefore ||
      new Date(v.createdFrom) < new Date(v.createdBefore),
  );
const position = z
  .object({
    id: uuid,
    createdAt: z.iso.datetime(),
    scope: z.string().length(64),
  })
  .strict();
/** Commerce-owned read model over actual ledger entries. It never infers a payment-to-purchase allocation. */
@Injectable()
export class AdminPointRecordsService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async list(actor: string, expected: string | undefined, raw: unknown) {
    if (!expected || expected.toLowerCase() !== actor)
      throw new ConflictException("登录账号已变化，请重新查询");
    const parsed = query.safeParse(raw);
    if (!parsed.success)
      throw new BadRequestException("积分流水筛选条件不正确");
    const { cursor, limit, ...filter } = parsed.data;
    const scope = createHash("sha256")
      .update(JSON.stringify({ actor, ...filter }))
      .digest("hex");
    let before: z.infer<typeof position> | undefined;
    if (cursor) {
      try {
        before = position.parse(
          JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
        );
        if (before.scope !== scope) throw new Error("SCOPE");
      } catch {
        throw new BadRequestException("筛选条件已变化，请重新查询");
      }
    }
    const and: Prisma.PointChangeWhereInput[] = [];
    if (filter.referenceId)
      and.push({
        OR: [
          { id: filter.referenceId },
          { publishingOrderId: filter.referenceId },
          { returnedOrderId: filter.referenceId },
          { rechargeOrderId: filter.referenceId },
        ],
      });
    if (before)
      and.push({
        OR: [
          { createdAt: { lt: new Date(before.createdAt) } },
          { createdAt: new Date(before.createdAt), id: { lt: before.id } },
        ],
      });
    const rows = await this.db.pointChange.findMany({
      where: {
        ...(filter.accountId ? { accountId: filter.accountId } : {}),
        ...(filter.mobile
          ? { wallet: { account: { mobile: { contains: filter.mobile } } } }
          : {}),
        ...(filter.kind ? { kind: filter.kind } : {}),
        ...(filter.createdFrom || filter.createdBefore
          ? {
              createdAt: {
                ...(filter.createdFrom
                  ? { gte: new Date(filter.createdFrom) }
                  : {}),
                ...(filter.createdBefore
                  ? { lt: new Date(filter.createdBefore) }
                  : {}),
              },
            }
          : {}),
        AND: and,
      },
      include: {
        wallet: { select: { account: { select: { mobile: true } } } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });
    const selected = rows.slice(0, limit),
      last = selected.at(-1);
    return {
      items: selected.map((row) => ({
        ...adminChange(row),
        accountMobile: row.wallet.account.mobile,
      })),
      nextCursor:
        rows.length > limit && last
          ? Buffer.from(
              JSON.stringify({
                id: last.id,
                createdAt: last.createdAt.toISOString(),
                scope,
              }),
            ).toString("base64url")
          : null,
    };
  }
}
