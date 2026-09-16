import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { z } from "zod";
import { AccountDirectoryService } from "../../identity/application/account-directory.service.js";
import {
  adjustmentSchema,
  MAX_POINTS,
  POINT_ACCOUNT_REPOSITORY,
  PointAccountError,
  type PointAccountRepository,
  type PointChangeRecord,
} from "../domain/point-account.js";

const pageSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    beforeSequence: z.coerce.number().int().min(1).max(MAX_POINTS).optional(),
  })
  .strict();

@Injectable()
export class PointAccountService {
  constructor(
    @Inject(POINT_ACCOUNT_REPOSITORY)
    private readonly repository: PointAccountRepository,
    @Inject(AccountDirectoryService)
    private readonly directory: AccountDirectoryService,
  ) {}

  async customerBalance(accountId: string) {
    const wallet = await this.repository.balance(accountId);
    return {
      balance: wallet.grantedBalance + wallet.fundedBalance,
      revision: wallet.revision,
    };
  }
  async adminBalance(accountId: string) {
    const customer = await this.customer(accountId);
    const wallet = await this.repository.balance(accountId);
    return {
      customer,
      ...wallet,
      balance: wallet.grantedBalance + wallet.fundedBalance,
    };
  }
  async history(accountId: string, query: unknown) {
    const parsed = pageSchema.safeParse(query);
    if (!parsed.success)
      throw new BadRequestException("积分流水分页参数不正确");
    const { limit, beforeSequence } = parsed.data;
    const rows = await this.repository.changes(
      accountId,
      limit + 1,
      beforeSequence,
    );
    const items = rows.slice(0, limit);
    return {
      items: items.map(customerChange),
      nextBeforeSequence: rows.length > limit ? items.at(-1)!.sequence : null,
    };
  }
  async adminHistory(accountId: string, query: unknown) {
    await this.customer(accountId);
    const parsed = pageSchema.safeParse(query);
    if (!parsed.success)
      throw new BadRequestException("积分流水分页参数不正确");
    const { limit, beforeSequence } = parsed.data;
    const rows = await this.repository.changes(
      accountId,
      limit + 1,
      beforeSequence,
    );
    const items = rows.slice(0, limit);
    return {
      items: items.map(adminChange),
      nextBeforeSequence: rows.length > limit ? items.at(-1)!.sequence : null,
    };
  }
  async adjust(accountId: string, actorAccountId: string, raw: unknown) {
    const parsed = adjustmentSchema.safeParse(raw);
    if (!parsed.success)
      throw new BadRequestException(
        "请填写非零整数积分、客户可见原因和有效请求标识；不接受余额或来源覆盖",
      );
    const customer = await this.customer(accountId);
    try {
      return adminChange(
        await this.repository.adjust(
          accountId,
          actorAccountId,
          parsed.data,
          customer.status === "ACTIVE",
        ),
      );
    } catch (error) {
      if (error instanceof PointAccountError)
        throw new ConflictException({
          code: error.code,
          message: error.message,
        });
      throw error;
    }
  }
  private async customer(accountId: string) {
    const customer = await this.directory.terminalCustomer(accountId);
    if (!customer) throw new NotFoundException("未找到终端客户账号");
    return customer;
  }
}

function customerChange(row: PointChangeRecord) {
  return {
    id: row.id,
    sequence: row.sequence,
    kind: row.kind,
    publishingOrderId: row.publishingOrderId,
    ...(row.kind === "ORDER_RETURN"
      ? { returnedOrderId: row.returnedOrderId }
      : {}),
    ...(row.kind === "RECHARGE"
      ? { rechargeOrderId: row.rechargeOrderId }
      : {}),
    amount: row.grantedDelta + row.fundedDelta,
    balanceAfter: row.balanceAfter,
    reason: row.reason,
    createdAt: row.createdAt,
  };
}
export function adminChange(row: PointChangeRecord) {
  return {
    ...customerChange(row),
    accountId: row.accountId,
    actorAccountId: row.actorAccountId,
    actorKind: row.actorKind,
    grantedDelta: row.grantedDelta,
    fundedDelta: row.fundedDelta,
    idempotencyKey: row.idempotencyKey,
    internalNote: row.internalNote,
    businessReference: row.businessReference,
  };
}
