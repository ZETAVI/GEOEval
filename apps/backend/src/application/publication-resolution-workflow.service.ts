import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AuthenticatedPrincipal } from "../identity/domain/identity.types.js";
import { PublishingOrderService } from "../publishing-commerce/application/publishing-order.service.js";
import { PostgresDeliveryResolutionRepository } from "../publication-delivery/infrastructure/postgres-delivery-resolution.repository.js";
import { OrderSettlementAccess } from "../publishing-commerce/infrastructure/order-settlement-access.js";
import { OrderSupportReader } from "../publishing-commerce/infrastructure/order-support-reader.js";
import { OrderHandlingAccess } from "../support/infrastructure/order-handling-access.js";
@Injectable()
export class PublicationResolutionWorkflowService {
  constructor(
    @Inject(PublishingOrderService)
    private readonly orders: PublishingOrderService,
    @Inject(PostgresDeliveryResolutionRepository)
    private readonly resolutions: PostgresDeliveryResolutionRepository,
    @Inject(OrderSettlementAccess)
    private readonly settlements: OrderSettlementAccess,
    @Inject(OrderSupportReader)
    private readonly orderOwners: OrderSupportReader,
    @Inject(OrderHandlingAccess) private readonly support: OrderHandlingAccess,
  ) {}
  async save(actor: AuthenticatedPrincipal, id: string, input: unknown) {
    const [order] = await this.orders.forDelivery([id]);
    if (!order) throw new NotFoundException("未找到原购买订单");
    return this.resolutions.save(
      actor,
      id,
      input,
      {
        quantity: order.agreement.quantity,
        originalConsumedPoints: order.agreement.totalPoints,
      },
      {
        finalized: async (tx, id) =>
          Boolean(await this.settlements.read(tx, id)),
        replay: (tx, key) =>
          this.support.handledTicket(tx, actor.accountId, key),
        record: async (tx, row, now, command) =>
          this.support.record(
            tx,
            actor.accountId,
            (await this.orderOwners.read(tx, id)).accountId,
            row,
            now,
            command,
          ),
      },
    );
  }
  exception(actor: AuthenticatedPrincipal, id: string, input: unknown) {
    return this.resolutions.exception(actor, id, input);
  }
}
