import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { z } from "zod";
import { MAX_POINTS } from "../domain/point-account.js";
import {
  PUBLISHING_ORDER_REPOSITORY,
  PurchaseError,
  submitPurchaseSchema,
  type PublishingOrderRepository,
} from "../domain/publishing-order.js";
const querySchema = z
  .object({
    brandId: z.string().uuid().optional(),
    beforeNumber: z.coerce.number().int().min(1).max(MAX_POINTS).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
@Injectable()
export class PublishingOrderService {
  constructor(
    @Inject(PUBLISHING_ORDER_REPOSITORY)
    private readonly orders: PublishingOrderRepository,
  ) {}
  async submit(accountId: string, raw: unknown) {
    const input = submitPurchaseSchema.safeParse(raw);
    if (!input.success)
      throw new BadRequestException(
        "购买请求格式不正确，请核对准确文章版本、发布选择与完整报价；不能覆盖账号或余额",
      );
    try {
      return await this.orders.runPurchase(accountId, input.data);
    } catch (error) {
      if (error instanceof PurchaseError)
        throw new ConflictException({
          code: error.code,
          message: error.message,
        });
      throw error;
    }
  }
  async detail(accountId: string, id: string) {
    const order = await this.orders.find(accountId, id);
    if (!order) throw new NotFoundException("未找到该发布订单");
    return order;
  }
  list(accountId: string, raw: unknown) {
    const query = querySchema.safeParse(raw);
    if (!query.success) throw new BadRequestException("订单查询参数不正确");
    return this.orders.list(accountId, {
      limit: query.data.limit,
      ...(query.data.brandId ? { brandId: query.data.brandId } : {}),
      ...(query.data.beforeNumber
        ? { beforeNumber: query.data.beforeNumber }
        : {}),
    });
  }
}
