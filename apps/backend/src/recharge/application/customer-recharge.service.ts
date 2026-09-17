import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { z } from "zod";
import {
  createRechargeSchema,
  RechargeError,
  type RechargeOrder,
} from "../domain/recharge-order.js";
import {
  RECHARGE_CUSTOMER_OPTIONS,
  RECHARGE_CUSTOMER_QUERIES,
  RECHARGE_CUSTOMER_RUNTIME,
  type RechargeCustomerOptions,
  type RechargeCustomerQueries,
  type RechargeCustomerRuntime,
} from "./customer-recharge.js";

const status = z.enum([
  "PENDING_PAYMENT",
  "CONFIRMING",
  "SUCCESSFUL",
  "CLOSED",
]);
const querySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    status: status.optional(),
    cursor: z
      .string()
      .min(1)
      .max(512)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
  })
  .strict();
const cursorSchema = z
  .object({
    accountId: z.uuid(),
    status: status.nullable(),
    id: z.uuid(),
    at: z.iso.datetime(),
  })
  .strict();
const messages: Record<string, string> = {
  INVALID_INPUT: "请核对整数元金额、支付方式和请求标识。",
  AMOUNT_NOT_ALLOWED: "充值金额不在当前允许范围内，请重新选择。",
  ACCOUNT_NOT_ACTIVE: "当前账号无法发起充值，请重新核验账号状态。",
  ACTIVE_ORDER_LIMIT: "还有未结束的充值，请先从充值记录中继续查看或取消。",
  IDEMPOTENCY_CONFLICT: "该请求已有不同的充值内容，请恢复原充值，勿重复支付。",
  POINT_LIMIT_EXCEEDED: "当前积分容量不足，暂时无法新建充值，请联系客服核查。",
  CREATION_DISABLED: "暂时无法新建充值；已有订单仍可继续查询。",
  CASHIER_UNAVAILABLE: "支付宝收银台暂不可用，请保留原订单并稍后重试。",
};

@Injectable()
export class CustomerRechargeService {
  constructor(
    @Inject(RECHARGE_CUSTOMER_QUERIES)
    private readonly queries: RechargeCustomerQueries,
    @Inject(RECHARGE_CUSTOMER_RUNTIME)
    private readonly runtime: RechargeCustomerRuntime | null,
    @Inject(RECHARGE_CUSTOMER_OPTIONS)
    private readonly publicOptions: RechargeCustomerOptions,
  ) {}
  /** A stale browser identity is a fence, never the authority selecting an account. */
  assertAccount(accountId: string, expected: string | undefined) {
    if (!expected || expected.toLowerCase() !== accountId)
      throw new ConflictException({
        code: "ACCOUNT_CHANGED",
        message: "登录账号已变化，请重新进入充值页面。",
      });
  }
  options() {
    return this.publicOptions;
  }
  async create(accountId: string, raw: unknown) {
    const parsed = createRechargeSchema.safeParse(raw);
    if (!parsed.success)
      throw new BadRequestException({
        code: "INVALID_INPUT",
        message: messages.INVALID_INPUT,
      });
    try {
      // Recovery remains available even when the merchant host has been unconfigured.
      const prior = await this.queries.findRequest(accountId, parsed.data);
      if (prior) return this.detail(accountId, prior.id);
      if (
        !this.runtime ||
        !this.publicOptions.available ||
        !this.publicOptions.methods.includes(parsed.data.method)
      )
        throw new RechargeError("CREATION_DISABLED");
      const order = await this.runtime.create(accountId, parsed.data);
      return this.detail(accountId, order.id);
    } catch (error) {
      throw publicError(error);
    }
  }
  async detail(accountId: string, id: string) {
    const sampledAt = new Date();
    const found = await this.queries.readOwned(accountId, id, sampledAt);
    if (!found) throw new NotFoundException("未找到这笔充值");
    const responseAt = new Date();
    const runtimeAvailable = !!this.runtime?.supports(found.order.method);
    return {
      order: {
        ...summary(found.order),
        cancelRequested: found.cancelRequested,
        canCancel: runtimeAvailable && found.canCancel,
        supportRequired: found.reviewRequired,
        qr:
          runtimeAvailable &&
          found.qr &&
          new Date(found.qr.expiresAt) > responseAt
            ? found.qr
            : null,
        ...(found.order.method === "ALIPAY_PC"
          ? {
              cashier:
                runtimeAvailable &&
                found.cashier &&
                new Date(found.cashier.expiresAt) > responseAt
                  ? found.cashier
                  : null,
            }
          : {}),
        canVerify:
          runtimeAvailable &&
          !found.reviewRequired &&
          ["PENDING_PAYMENT", "CONFIRMING"].includes(found.order.status),
      },
      serverTime: responseAt.toISOString(),
    };
  }
  async list(accountId: string, raw: unknown) {
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success)
      throw new BadRequestException("充值记录查询参数不正确");
    let before: { id: string; createdAt: Date } | undefined;
    if (parsed.data.cursor) {
      try {
        const cursor = cursorSchema.parse(
          JSON.parse(
            Buffer.from(parsed.data.cursor, "base64url").toString("utf8"),
          ),
        );
        if (
          cursor.accountId !== accountId ||
          cursor.status !== (parsed.data.status ?? null)
        )
          throw new Error("CURSOR_SCOPE");
        before = { id: cursor.id, createdAt: new Date(cursor.at) };
      } catch {
        throw new BadRequestException(
          "充值记录游标已失效，请重新查询当前筛选范围。",
        );
      }
    }
    const page = await this.queries.listOwned(accountId, {
      limit: parsed.data.limit,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(before ? { before } : {}),
    });
    return {
      items: page.items.map(summary),
      nextCursor: page.next
        ? Buffer.from(
            JSON.stringify({
              accountId,
              status: parsed.data.status ?? null,
              id: page.next.id,
              at: page.next.createdAt.toISOString(),
            }),
          ).toString("base64url")
        : null,
    };
  }
  async command(
    accountId: string,
    id: string,
    command: "verify" | "cancel",
    raw: unknown,
  ) {
    if (!z.object({}).strict().safeParse(raw).success)
      throw new BadRequestException("操作请求不接受支付结果、金额或账号覆盖。");
    // Ownership is checked before availability so an unavailable host never reveals another account's order.
    const current = await this.detail(accountId, id);
    if (!this.runtime?.supports(current.order.method))
      throw new ServiceUnavailableException(
        "暂时无法处理此操作，请保留原订单并稍后重试。",
      );
    try {
      await this.runtime[command](accountId, id, current.order.method);
      return { accepted: true as const };
    } catch (error) {
      throw publicError(error);
    }
  }
  async grantCashier(accountId: string, id: string, raw: unknown) {
    if (!z.object({}).strict().safeParse(raw).success)
      throw new BadRequestException("操作请求不接受支付结果、金额或账号覆盖。");
    const current = await this.detail(accountId, id);
    if (!this.runtime?.supports(current.order.method))
      throw new ServiceUnavailableException(messages.CASHIER_UNAVAILABLE);
    try {
      return await this.runtime.grantCashier(
        accountId,
        id,
        current.order.method,
      );
    } catch (error) {
      throw publicError(error);
    }
  }
  async cashierPage(accountId: string, id: string) {
    const current = await this.detail(accountId, id);
    if (!this.runtime?.supports(current.order.method))
      throw new ServiceUnavailableException(messages.CASHIER_UNAVAILABLE);
    try {
      return await this.runtime.cashierPage(
        accountId,
        id,
        current.order.method,
      );
    } catch (error) {
      throw publicError(error);
    }
  }
}
function summary(o: RechargeOrder) {
  return {
    id: o.id,
    amountYuan: o.amountYuan,
    points: o.fundedPoints,
    method: o.method,
    status: o.status,
    createdAt: o.createdAt,
    paymentExpiresAt: o.expiresAt,
    paidAt: o.paidAt,
    closedAt: o.closedAt,
  };
}
function publicError(error: unknown) {
  if (!(error instanceof RechargeError)) return error;
  if (error.code === "NOT_FOUND")
    return new NotFoundException("未找到这笔充值");
  const body = {
    code: error.code,
    message: messages[error.code] ?? "请保留原充值订单并稍后核验，勿重复支付。",
  };
  if (error.code === "INVALID_INPUT") return new BadRequestException(body);
  if (error.code === "CREATION_DISABLED")
    return new ServiceUnavailableException(body);
  if (error.code === "CASHIER_UNAVAILABLE")
    return new ServiceUnavailableException(body);
  return new ConflictException(body);
}
