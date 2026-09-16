import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../infrastructure/prisma.service.js";
import { Prisma } from "../generated/prisma/client.js";
import { PostgresOrderReturnAccess } from "../publishing-commerce/infrastructure/postgres-order-return-access.js";
import { OrderSettlementAccess } from "../publishing-commerce/infrastructure/order-settlement-access.js";
import { DeliverySupportAccess } from "../publication-delivery/infrastructure/delivery-support-access.js";
import { SupportSettlementAccess } from "../support/infrastructure/support-settlement-access.js";
import { orderSupportWindow } from "../publication-delivery/domain/order-support.js";
@Injectable()
export class FinalOrderSettlementService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(PostgresOrderReturnAccess)
    private readonly returns: PostgresOrderReturnAccess,
    @Inject(OrderSettlementAccess)
    private readonly settlements: OrderSettlementAccess,
    @Inject(DeliverySupportAccess)
    private readonly deliveries: DeliverySupportAccess,
    @Inject(SupportSettlementAccess)
    private readonly support: SupportSettlementAccess,
  ) {}
  async candidates(after: string | null, limit = 20) {
    return this.db.$queryRaw<
      Array<{ orderId: string }>
    >(Prisma.sql`SELECT d.order_id AS "orderId" FROM (${this.deliveries.settlementCandidates()}) d
    LEFT JOIN order_settlements s ON s.order_id=d.order_id WHERE s.order_id IS NULL AND d.ended_at + INTERVAL '72 hours'<=clock_timestamp()
    ${after ? Prisma.sql`AND d.order_id>${after}::uuid` : Prisma.empty} ORDER BY d.order_id LIMIT ${limit}`);
  }
  async settle(orderId: string) {
    return this.db.$transaction(async (tx) => {
      const old = await this.settlements.read(tx, orderId);
      if (old) return { kind: "settled" as const, receipt: old };
      // Wallet before Delivery, even if the current agreement is zero: the amount can change before the lock.
      const commerce = await this.returns.bind(tx, orderId);
      const { delivery, now } = await this.deliveries.lock(tx, orderId);
      const prior = await this.settlements.read(tx, orderId);
      if (prior) return { kind: "settled" as const, receipt: prior };
      const end = orderSupportWindow(delivery);
      if (!end.ended || !end.deadline || now < end.deadline)
        return { kind: "waiting" as const };
      if (await this.support.hasOpen(tx, orderId))
        return { kind: "waiting" as const };
      let ledgerId = delivery.settledLedgerId;
      if (delivery.agreedReturnPoints > 0 && !ledgerId) {
        const receipt = await commerce.credit(
          null,
          {
            idempotencyKey: orderId,
            expectedAgreementRevision: delivery.agreementRevision,
          },
          delivery.agreedReturnPoints,
        );
        ledgerId = receipt.ledgerId;
      }
      await this.deliveries.markSettled(tx, orderId, ledgerId);
      const receipt = await this.settlements.record(tx, {
        orderId,
        points: delivery.agreedReturnPoints,
        agreementRevision: delivery.agreementRevision,
        ledgerId,
      });
      return { kind: "settled" as const, receipt };
    });
  }
}
