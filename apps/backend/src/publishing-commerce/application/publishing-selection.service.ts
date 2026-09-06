import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { GeoOptimizationService } from "../../geo-optimization/application/geo-optimization.service.js";
import { MediaSupplyService } from "../../media-supply/application/media-supply.service.js";
import { PointAccountService } from "./point-account.service.js";
import {
  PUBLISHING_PACKAGE_REPOSITORY,
  type PublishingPackageRepository,
} from "../domain/publishing-package.js";
import {
  PUBLISHING_SELECTION_REPOSITORY,
  quoteSelection,
  saveSelectionSchema,
  SelectionRevisionConflict,
  type PublishingArticle,
  type PublishingSelection,
  type PublishingSelectionRepository,
} from "../domain/publishing-selection.js";

@Injectable()
export class PublishingSelectionService {
  constructor(
    @Inject(GeoOptimizationService)
    private readonly articles: GeoOptimizationService,
    @Inject(MediaSupplyService) private readonly media: MediaSupplyService,
    @Inject(PointAccountService) private readonly points: PointAccountService,
    @Inject(PUBLISHING_PACKAGE_REPOSITORY)
    private readonly packages: PublishingPackageRepository,
    @Inject(PUBLISHING_SELECTION_REPOSITORY)
    private readonly selections: PublishingSelectionRepository,
  ) {}
  async workspace(accountId: string) {
    const [context, wallet] = await Promise.all([
      this.articles.publishingContext(accountId),
      this.points.customerBalance(accountId),
    ]);
    const state = context.brand
      ? await this.selections.find(accountId, context.brand.id)
      : { revision: 0, selection: null };
    const selection = state.selection;
    return {
      ...context,
      balance: wallet.balance,
      selectionRevision: state.revision,
      selection,
      quote: selection
        ? await this.quote(selection, context.article, wallet.balance)
        : null,
    };
  }
  async save(accountId: string, brandId: string, raw: unknown) {
    const parsed = saveSelectionSchema.safeParse(raw);
    if (!parsed.success)
      throw new BadRequestException(
        "请选择套餐或 1–200 项不重复的媒体与正整数数量，并提供正确的文章/选择版本",
      );
    const input = parsed.data;
    const context = await this.articles.publishingContext(accountId);
    if (context.brand?.id !== brandId)
      throw new NotFoundException("请在当前品牌下保存发布选择");
    if (
      !context.article ||
      context.article.id !== input.articleId ||
      context.article.revision !== input.articleRevision ||
      context.article.status !== "CONFIRMED" ||
      context.article.confirmedRevision !== input.articleRevision
    )
      throw new ConflictException({
        code: "ARTICLE_UNCONFIRMED",
        message: "文章已变化或尚未确认，请先保存并确认文章，再保存发布选择",
      });
    const proposed: PublishingSelection = {
      brandId,
      articleId: input.articleId,
      articleRevision: input.articleRevision,
      revision: input.expectedRevision + 1,
      intent: input.intent,
    };
    const quote = await this.quote(proposed, context.article, 0);
    if (quote.problems.includes("TOTAL_OUT_OF_RANGE"))
      throw new BadRequestException(
        "发布数量或积分总额超出支持范围，请减少数量",
      );
    if (quote.problems.includes("OFFER_UNAVAILABLE"))
      throw new ConflictException({
        code: "OFFER_UNAVAILABLE",
        message:
          "所选套餐或媒体已不可用，请刷新并调整选择；原来保存的内容不受影响",
      });
    try {
      return await this.selections.save(accountId, brandId, input);
    } catch (error) {
      if (error instanceof SelectionRevisionConflict)
        throw new ConflictException({
          code: "SELECTION_CHANGED",
          message: "发布选择已在其他页面保存，请重新加载后核对，未覆盖已有选择",
        });
      throw error;
    }
  }
  private async quote(
    selection: PublishingSelection,
    article: PublishingArticle | null,
    balance: number,
  ) {
    const offer =
      selection.intent.mode === "RANDOM"
        ? await this.packages.find(selection.intent.packageId)
        : null;
    const ids =
      selection.intent.mode === "RANDOM"
        ? (offer?.platformIds ?? [])
        : selection.intent.lines.map((line) => line.platformId);
    return quoteSelection(
      selection,
      article,
      offer,
      await this.media.quotePlatforms(ids),
      balance,
    );
  }
}
