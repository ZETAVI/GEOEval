import { AgencyPurchaseChanged } from "../../agency/domain/commission-terms.js";
import { PostgresAgencyPurchaseReader } from "../../agency/infrastructure/postgres-agency-purchase-reader.js";
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import {
  Prisma,
  type PublishingOrder as StoredOrder,
} from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import { PostgresArticlePurchaseReaderFactory } from "../../geo-optimization/infrastructure/postgres-article-purchase-reader.js";
import { PostgresMediaPurchaseReaderFactory } from "../../media-supply/infrastructure/postgres-media-purchase-reader.js";
import {
  commercialTerms,
  commercialTermsSchema,
  PurchaseError,
  samePurchaseValue,
  spendPoints,
  type PublishingOrderRepository,
  type PublishingOrderView,
  type SubmitPurchase,
} from "../domain/publishing-order.js";
import {
  publishingIntentSchema,
  quoteSelection,
} from "../domain/publishing-selection.js";
import {
  includeScope,
  present as packageView,
} from "./postgres-publishing-package.repository.js";
import { lockPointAccount } from "./point-account-lock.js";
import {
  checkPointCapacity,
  PointAccountError,
} from "../domain/point-account.js";
import { PostgresDeliveryPurchaseAccess } from "../../publication-delivery/infrastructure/postgres-delivery-purchase-access.js";
import type { DeliveryStatus } from "../../publication-delivery/domain/delivery-assignment.js";

@Injectable()
export class PostgresPublishingOrderRepository implements PublishingOrderRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PostgresAgencyPurchaseReader)
    private readonly agency: PostgresAgencyPurchaseReader,
    @Inject(PostgresArticlePurchaseReaderFactory)
    private readonly articleReaders: PostgresArticlePurchaseReaderFactory,
    @Inject(PostgresMediaPurchaseReaderFactory)
    private readonly mediaReaders: PostgresMediaPurchaseReaderFactory,
    @Inject(PostgresDeliveryPurchaseAccess)
    private readonly delivery: PostgresDeliveryPurchaseAccess,
  ) {}

  async runPurchase(accountId: string, input: SubmitPurchase) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.purchaseAttempt(accountId, input);
      } catch (error) {
        if (!(error instanceof AgencyPurchaseChanged)) throw error;
      }
    }
    throw new ConflictException(
      "购买信息正在更新，请使用原请求重试，未重复扣分",
    );
  }
  private purchaseAttempt(accountId: string, input: SubmitPurchase) {
    return this.prisma.$transaction(
      async (tx) => {
        const key = { accountId, idempotencyKey: input.idempotencyKey };
        const prior = await tx.publishingOrder.findUnique({
          where: { accountId_idempotencyKey: key },
        });
        if (prior) {
          if (!samePurchaseValue(prior.submissionRequest, input))
            throw new PurchaseError(
              "IDEMPOTENCY_CONFLICT",
              "该请求标识已对应另一笔购买，请核对原订单",
            );
          const statuses = await this.delivery.bind(tx).statuses([prior.id]);
          return orderView(prior, statuses.get(prior.id)!);
        }
        const agencyTerms = await this.agency.bind(tx).capture(accountId);
        const wallet = await lockPointAccount(tx, accountId);
        // Recover a concurrent success after waiting for the wallet.
        const concurrent = await tx.publishingOrder.findUnique({
          where: { accountId_idempotencyKey: key },
        });
        if (concurrent) {
          if (!samePurchaseValue(concurrent.submissionRequest, input))
            throw new PurchaseError(
              "IDEMPOTENCY_CONFLICT",
              "该请求标识已对应另一笔购买，请核对原订单",
            );
          const statuses = await this.delivery
            .bind(tx)
            .statuses([concurrent.id]);
          return orderView(concurrent, statuses.get(concurrent.id)!);
        }
        if (
          await tx.pointChange.findUnique({
            where: { accountId_idempotencyKey: key },
          })
        )
          throw new PurchaseError(
            "IDEMPOTENCY_CONFLICT",
            "该请求标识已用于其他积分操作，请先核对记录",
          );
        await tx.$queryRaw`SELECT brand_id FROM publishing_selections WHERE brand_id=CAST(${input.brandId} AS UUID) AND account_id=CAST(${accountId} AS UUID) FOR UPDATE`;
        const saved = await tx.publishingSelection.findFirst({
          where: { accountId, brandId: input.brandId },
        });
        if (
          !saved ||
          saved.intent === null ||
          saved.revision !== input.selectionRevision ||
          saved.articleId !== input.articleId ||
          saved.articleRevision !== input.articleRevision
        )
          throw new PurchaseError(
            "SELECTION_CHANGED",
            "发布选择已变化或已提交，请重新核对，未再次扣分",
          );
        const selection = {
          brandId: saved.brandId,
          revision: saved.revision,
          articleId: saved.articleId,
          articleRevision: saved.articleRevision,
          intent: publishingIntentSchema.parse(saved.intent),
        };
        const article = await this.articleReaders.bind(tx).confirmed({
          accountId,
          brandId: input.brandId,
          articleId: input.articleId,
          revision: input.articleRevision,
        });
        if (!article)
          throw new PurchaseError(
            "ARTICLE_CHANGED",
            "文章已变化或尚未确认，请重新核对文章，未扣分",
          );
        let offer = null;
        if (selection.intent.mode === "RANDOM") {
          await tx.$queryRaw`SELECT id FROM publishing_packages WHERE id=CAST(${selection.intent.packageId} AS UUID) FOR SHARE`;
          const row = await tx.publishingPackage.findUnique({
            where: { id: selection.intent.packageId },
            include: includeScope,
          });
          offer = row ? packageView(row) : null;
        }
        const ids =
          selection.intent.mode === "RANDOM"
            ? (offer?.platformIds ?? [])
            : selection.intent.lines.map((line) => line.platformId);
        const platforms = await this.mediaReaders.bind(tx).platforms(ids);
        const agreement = commercialTerms(
          quoteSelection(
            selection,
            article,
            offer,
            platforms,
            wallet.grantedBalance + wallet.fundedBalance,
          ),
        );
        if (!samePurchaseValue(agreement, input.acceptedTerms))
          throw new PurchaseError(
            "QUOTE_CHANGED",
            "文章发布价格或范围已变化，请查看最新报价后重新确认，未扣分",
          );
        const spent = spendPoints(wallet, agreement.totalPoints);
        try {
          checkPointCapacity(spent.balance, wallet);
        } catch (error) {
          if (error instanceof PointAccountError)
            throw new PurchaseError("POINT_LIMIT_EXCEEDED", error.message);
          throw error;
        }
        await tx.pointAccount.update({
          where: { accountId },
          data: spent.balance,
        });
        const order = await tx.publishingOrder.create({
          data: {
            accountId,
            agencyTerms: { create: agencyTerms },
            brandId: input.brandId,
            articleId: article.id,
            articleRevision: article.revision,
            selectionRevision: selection.revision,
            idempotencyKey: input.idempotencyKey,
            submissionRequest: input,
            title: article.title,
            bodyMarkdown: article.bodyMarkdown,
            agreement,
            packageId:
              selection.intent.mode === "RANDOM"
                ? selection.intent.packageId
                : null,
            platforms: { create: ids.map((platformId) => ({ platformId })) },
          },
        });
        await this.delivery.bind(tx).admit(order.id, order.createdAt);
        await tx.pointChange.create({
          data: {
            accountId,
            sequence: spent.balance.revision,
            kind: "PUBLISHING_ORDER",
            grantedDelta: spent.grantedDelta,
            fundedDelta: spent.fundedDelta,
            balanceAfter:
              spent.balance.grantedBalance + spent.balance.fundedBalance,
            actorAccountId: accountId,
            idempotencyKey: input.idempotencyKey,
            publishingOrderId: order.id,
            reason: "发布服务购买",
            businessReference: orderNumber(order.number),
          },
        });
        await tx.publishingSelection.update({
          where: { brandId: input.brandId },
          data: { intent: Prisma.DbNull, revision: { increment: 1 } },
        });
        return orderView(order, "PENDING_HANDLING");
      },
      { timeout: 10000, maxWait: 10000 },
    );
  }
  async find(accountId: string, id: string) {
    const order = await this.prisma.publishingOrder.findFirst({
      where: { id, accountId },
    });
    if (!order) return null;
    const statuses = await this.delivery.bind(this.prisma).statuses([order.id]);
    return orderView(order, statuses.get(order.id)!);
  }
  async list(
    accountId: string,
    query: { brandId?: string; beforeNumber?: number; limit: number },
  ) {
    const rows = await this.prisma.publishingOrder.findMany({
      where: {
        accountId,
        ...(query.brandId ? { brandId: query.brandId } : {}),
        ...(query.beforeNumber ? { number: { lt: query.beforeNumber } } : {}),
      },
      orderBy: { number: "desc" },
      take: query.limit + 1,
    });
    const statuses = await this.delivery
      .bind(this.prisma)
      .statuses(rows.map((row) => row.id));
    return {
      items: rows.slice(0, query.limit).map((row) => {
        const {
          bodyMarkdown: _body,
          agreement,
          ...summary
        } = orderView(row, statuses.get(row.id)!);
        return {
          ...summary,
          mode: agreement.mode,
          quantity: agreement.quantity,
          totalPoints: agreement.totalPoints,
        };
      }),
      nextBeforeNumber:
        rows.length > query.limit ? rows[query.limit - 1]!.number : null,
    };
  }
  async readPaidOrders(ids: string[]) {
    if (ids.length > 50)
      throw new Error("Delivery order read must remain bounded");
    const rows = await this.prisma.publishingOrder.findMany({
      where: { id: { in: ids } },
    });
    return rows.map(orderFacts);
  }
}
function orderNumber(number: number) {
  return `GEO-${String(number).padStart(8, "0")}`;
}
function orderFacts(row: StoredOrder): Omit<PublishingOrderView, "status"> {
  return {
    id: row.id,
    number: orderNumber(row.number),
    brandId: row.brandId,
    articleId: row.articleId,
    articleRevision: row.articleRevision,
    title: row.title,
    bodyMarkdown: row.bodyMarkdown,
    agreement: commercialTermsSchema.parse(row.agreement),
    createdAt: row.createdAt,
  };
}
function orderView(
  row: StoredOrder,
  status: DeliveryStatus,
): PublishingOrderView {
  return { ...orderFacts(row), status };
}
