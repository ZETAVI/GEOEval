import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  ADMIN_RECHARGE_QUERIES,
  type AdminRechargeQueries,
  type AdminRechargePosition,
} from "./admin-recharge.js";
const query = z
  .object({
    accountId: z.uuid().optional(),
    orderId: z.uuid().optional(),
    status: z
      .enum(["PENDING_PAYMENT", "CONFIRMING", "SUCCESSFUL", "CLOSED"])
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
    id: z.uuid(),
    createdAt: z.iso.datetime(),
    scope: z.string().length(64),
  })
  .strict();
@Injectable()
export class AdminRechargeService {
  constructor(
    @Inject(ADMIN_RECHARGE_QUERIES)
    private readonly queries: AdminRechargeQueries,
  ) {}
  assertActor(actor: string, expected: string | undefined) {
    if (!expected || expected.toLowerCase() !== actor)
      throw new ConflictException({
        code: "ACCOUNT_CHANGED",
        message: "登录账号已变化，请重新进入充值记录。",
      });
  }
  async list(actor: string, raw: unknown) {
    const parsed = query.safeParse(raw);
    if (!parsed.success) throw new BadRequestException("充值查询条件不正确");
    const { limit, cursor, ...filter } = parsed.data;
    const scope = createHash("sha256")
      .update(JSON.stringify({ actor, ...filter }))
      .digest("hex");
    let before: AdminRechargePosition | undefined;
    if (cursor) {
      try {
        const p = position.parse(
          JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
        );
        if (p.scope !== scope) throw new Error("CURSOR_SCOPE");
        before = { id: p.id, createdAt: p.createdAt };
      } catch {
        throw new BadRequestException("筛选条件已变化，请重新查询");
      }
    }
    const page = await this.queries.list(filter, limit, before);
    return {
      items: page.items,
      nextCursor: page.next
        ? Buffer.from(JSON.stringify({ ...page.next, scope })).toString(
            "base64url",
          )
        : null,
    };
  }
  async detail(id: string) {
    const order = await this.queries.detail(id);
    if (!order) throw new NotFoundException("未找到这笔充值");
    return order;
  }
}
