import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { z } from "zod";
import { PrismaService } from "../infrastructure/prisma.service.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  CommissionSourceAccess,
  type CommissionSource,
} from "../publishing-commerce/infrastructure/commission-source-access.js";
import { CommissionLedgerAccess } from "../agency/infrastructure/commission-ledger-access.js";
import { DeliveryCommissionAccess } from "../publication-delivery/infrastructure/delivery-commission-access.js";
import { PostgresOperationsIdentityReader } from "../identity/infrastructure/postgres-operations-identity-reader.js";
import { commissionFen } from "../agency/domain/commission.js";
import type { AuthenticatedPrincipal } from "../identity/domain/identity.types.js";
const query = z
  .object({
    agentId: z.uuid().optional(),
    orderId: z.uuid().optional(),
    state: z.enum(["PENDING", "BOOKED"]).optional(),
    cursor: z
      .string()
      .min(1)
      .max(1024)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
const position = z
  .object({
    orderId: z.uuid(),
    number: z.number().int().positive().max(2147483647),
    scope: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
type Row = CommissionSource & {
  status: string;
  agreedReturnPoints: number;
  amountFen: bigint | null;
  bookedAt: Date | null;
};
@Injectable()
export class AgencyCommissionService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(CommissionSourceAccess)
    private readonly sources: CommissionSourceAccess,
    @Inject(CommissionLedgerAccess)
    private readonly ledger: CommissionLedgerAccess,
    @Inject(DeliveryCommissionAccess)
    private readonly deliveries: DeliveryCommissionAccess,
    @Inject(PostgresOperationsIdentityReader)
    private readonly identities: PostgresOperationsIdentityReader,
  ) {}
  private projection() {
    return Prisma.sql`SELECT c.*,d.status,d.agreed_return_points AS "agreedReturnPoints",l.amount_fen AS "amountFen",l.created_at AS "bookedAt" FROM (${this.sources.projection()}) c JOIN (${this.deliveries.projection()}) d ON d.order_id=c."orderId" LEFT JOIN (${this.ledger.projection()}) l ON l.order_id=c."orderId"`;
  }
  private view(row: Row) {
    const split = row.settledAt
      ? { fundedDelta: row.returnedFunded, grantedDelta: row.returnedGranted }
      : this.sources.split(
          row.grantedPoints,
          row.fundedPoints,
          row.agreedReturnPoints,
        );
    const fundedPoints = row.fundedPoints - split.fundedDelta;
    return {
      orderId: row.orderId,
      number: row.number,
      title: row.title,
      agentId: row.agentId,
      customerId: row.customerId,
      brandId: row.brandId,
      createdAt: row.createdAt,
      status: row.status,
      rateBps: row.rateBps,
      originalFundedPoints: row.fundedPoints,
      originalGrantedPoints: row.grantedPoints,
      returnFundedPoints: split.fundedDelta,
      returnGrantedPoints: split.grantedDelta,
      eligibleFundedPoints: fundedPoints,
      returnConfirmed: Boolean(row.settledAt),
      settledAt: row.settledAt,
      bookedAt: row.bookedAt,
      state: row.bookedAt ? ("BOOKED" as const) : ("PENDING" as const),
      amountFen: (
        row.amountFen ?? commissionFen(fundedPoints, row.rateBps)
      ).toString(),
    };
  }
  async candidates(after: string | null, limit = 20) {
    return this.db.$queryRaw<Array<{ orderId: string }>>(
      Prisma.sql`SELECT c."orderId" FROM (${this.sources.projection()}) c LEFT JOIN (${this.ledger.projection()}) l ON l.order_id=c."orderId" WHERE c."settledAt" IS NOT NULL AND l.order_id IS NULL ${after ? Prisma.sql`AND c."orderId">${after}::uuid` : Prisma.empty} ORDER BY c."orderId" LIMIT ${limit}`,
    );
  }
  async accrue(orderId: string) {
    return this.db.$transaction(async (tx) => {
      const prior = await this.ledger.read(tx, orderId);
      if (prior) return prior;
      const [facts] = await tx.$queryRaw<CommissionSource[]>(
        Prisma.sql`SELECT * FROM (${this.sources.projection()}) c WHERE c."orderId"=${orderId}::uuid`,
      );
      if (!facts?.settledAt) return null;
      const fundedPoints = facts.fundedPoints - facts.returnedFunded;
      return this.ledger.record(tx, {
        orderId,
        agentAccountId: facts.agentId,
        rateBps: facts.rateBps,
        fundedPoints,
        amountFen: commissionFen(fundedPoints, facts.rateBps),
      });
    });
  }
  async list(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    raw: unknown,
  ) {
    if (!expected || expected.toLowerCase() !== actor.accountId)
      throw new ConflictException("登录账号已变化，请重新查询");
    const parsed = query.safeParse(raw);
    if (!parsed.success) throw new BadRequestException("佣金查询条件不正确");
    return this.db.$transaction(
      async (tx) => {
        const [current] = await this.identities.lockAccounts(tx, [
          actor.accountId,
        ]);
        if (
          !current ||
          current.status !== "ACTIVE" ||
          (current.role !== "AGENT" && current.role !== "ADMINISTRATOR") ||
          current.role !== actor.role
        )
          throw new ForbiddenException("当前账号不能查看佣金");
        const { cursor, limit, ...filter } = parsed.data;
        if (
          current.role === "AGENT" &&
          filter.agentId &&
          filter.agentId !== actor.accountId
        )
          throw new ForbiddenException("只能查看自己的佣金");
        const agentId =
          current.role === "AGENT" ? actor.accountId : filter.agentId;
        const scope = createHash("sha256")
          .update(
            JSON.stringify({ actor: actor.accountId, agentId, ...filter }),
          )
          .digest("hex");
        let before: z.infer<typeof position> | undefined;
        if (cursor) {
          try {
            before = position.parse(
              JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
            );
            if (before.scope !== scope) throw new Error("SCOPE");
          } catch {
            throw new BadRequestException("查询条件已变化，请重新读取");
          }
        }
        const conditions = Prisma.sql`WHERE TRUE ${agentId ? Prisma.sql`AND c."agentId"=${agentId}::uuid` : Prisma.empty} ${filter.orderId ? Prisma.sql`AND c."orderId"=${filter.orderId}::uuid` : Prisma.empty} ${filter.state ? (filter.state === "BOOKED" ? Prisma.sql`AND c."bookedAt" IS NOT NULL` : Prisma.sql`AND c."bookedAt" IS NULL`) : Prisma.empty}`;
        const rows = await tx.$queryRaw<Row[]>(
          Prisma.sql`SELECT * FROM (${this.projection()}) c ${conditions} ${before ? Prisma.sql`AND c.number<${before.number}` : Prisma.empty} ORDER BY c.number DESC LIMIT ${limit + 1}`,
        );
        const items = rows.slice(0, limit).map((row) => this.view(row));
        // Bounded reads share the same snapshot and pure calculation; totals are never a second writable balance.
        let afterNumber = 0,
          pending = 0n,
          booked = 0n,
          pendingCount = 0,
          bookedCount = 0;
        while (true) {
          const batch = await tx.$queryRaw<Row[]>(
            Prisma.sql`SELECT * FROM (${this.projection()}) c ${conditions} AND c.number>${afterNumber} ORDER BY c.number LIMIT 200`,
          );
          if (!batch.length) break;
          for (const row of batch) {
            const value = this.view(row);
            if (value.state === "BOOKED") {
              booked += BigInt(value.amountFen);
              bookedCount++;
            } else {
              pending += BigInt(value.amountFen);
              pendingCount++;
            }
            afterNumber = row.number;
          }
        }
        const last = items.at(-1);
        return {
          items,
          summary: {
            pendingFen: pending.toString(),
            bookedFen: booked.toString(),
            pendingCount,
            bookedCount,
          },
          nextCursor:
            rows.length > limit && last
              ? Buffer.from(
                  JSON.stringify({
                    orderId: last.orderId,
                    number: last.number,
                    scope,
                  }),
                ).toString("base64url")
              : null,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 10000,
      },
    );
  }
  async detail(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    orderId: string,
  ) {
    const page = await this.list(actor, expected, { orderId });
    const item = page.items[0];
    if (!item) throw new NotFoundException("未找到可访问的佣金记录");
    return item;
  }
}
