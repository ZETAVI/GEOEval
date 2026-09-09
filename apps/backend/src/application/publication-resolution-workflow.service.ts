import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../infrastructure/prisma.service.js";
import { PostgresOperationsIdentityReader } from "../identity/infrastructure/postgres-operations-identity-reader.js";
import type { AuthenticatedPrincipal } from "../identity/domain/identity.types.js";
import { PublishingOrderService } from "../publishing-commerce/application/publishing-order.service.js";
import { PostgresOrderReturnAccess } from "../publishing-commerce/infrastructure/postgres-order-return-access.js";
import { PointAccountError } from "../publishing-commerce/domain/point-account.js";
import { OrderPointReturnError } from "../publishing-commerce/domain/order-point-return.js";
import { PostgresDeliveryResolutionRepository } from "../publication-delivery/infrastructure/postgres-delivery-resolution.repository.js";
import { NegotiatedResolutionError } from "../publication-delivery/domain/negotiated-resolution.js";

const settlementSchema = z
  .object({
    expectedAgreementRevision: z.number().int().min(1).max(2_147_483_647),
    idempotencyKey: z
      .string()
      .uuid()
      .transform((v) => v.toLowerCase()),
  })
  .strict();

/** Two owner-bound adapters commit together; no provider or human waiting inside the transaction. */
@Injectable()
export class PublicationResolutionWorkflowService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PostgresOperationsIdentityReader)
    private readonly identities: PostgresOperationsIdentityReader,
    @Inject(PublishingOrderService)
    private readonly orders: PublishingOrderService,
    @Inject(PostgresOrderReturnAccess)
    private readonly returns: PostgresOrderReturnAccess,
    @Inject(PostgresDeliveryResolutionRepository)
    private readonly resolutions: PostgresDeliveryResolutionRepository,
  ) {}
  private async facts(id: string) {
    const [order] = await this.orders.forDelivery([id]);
    if (!order) throw new NotFoundException("未找到原购买订单");
    return {
      quantity: order.agreement.quantity,
      originalConsumedPoints: order.agreement.totalPoints,
    };
  }
  async save(actor: AuthenticatedPrincipal, id: string, input: unknown) {
    return this.resolutions.save(actor, id, input, await this.facts(id));
  }
  exception(actor: AuthenticatedPrincipal, id: string, input: unknown) {
    return this.resolutions.exception(actor, id, input);
  }
  async settle(actor: AuthenticatedPrincipal, id: string, raw: unknown) {
    const parsed = settlementSchema.safeParse(raw);
    if (!parsed.success)
      throw new BadRequestException(
        "请核对准确协商版本与操作标识，不能覆盖客户或退点金额",
      );
    const facts = await this.facts(id);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const [current] = await this.identities.lockAccounts(tx, [
          actor.accountId,
        ]);
        if (current?.status !== "ACTIVE" || current.role !== "ADMINISTRATOR")
          throw new ForbiddenException("当前账号无权执行退点");
        // Identity -> wallet -> Delivery. Zero closure never acquires the wallet.
        const commerce = await this.returns.bind(tx, id);
        const prior = await commerce.replay(actor.accountId, parsed.data);
        if (prior) return prior;
        const delivery = await this.resolutions.prepareSettlement(
          tx,
          { accountId: current.id, role: current.role, status: current.status },
          id,
          facts.quantity,
          parsed.data.expectedAgreementRevision,
        );
        const receipt = await commerce.credit(
          actor.accountId,
          parsed.data,
          delivery.points,
        );
        await delivery.complete(receipt.ledgerId, parsed.data);
        return receipt;
      });
    } catch (error) {
      if (
        error instanceof PointAccountError ||
        error instanceof OrderPointReturnError ||
        error instanceof NegotiatedResolutionError
      )
        throw new ConflictException({
          code: error.code,
          message: error.message,
        });
      throw error;
    }
  }
}
