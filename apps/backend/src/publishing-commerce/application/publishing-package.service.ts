import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MediaSupplyService } from "../../media-supply/application/media-supply.service.js";
import {
  PUBLISHING_PACKAGE_REPOSITORY,
  PackageConflictError,
  PackageNotFoundError,
  packageFieldsSchema,
  packageUpdateSchema,
  type PublishingPackageRepository,
} from "../domain/publishing-package.js";

@Injectable()
export class PublishingPackageService {
  constructor(
    @Inject(PUBLISHING_PACKAGE_REPOSITORY)
    private readonly repository: PublishingPackageRepository,
    @Inject(MediaSupplyService) private readonly media: MediaSupplyService,
  ) {}

  listAdmin() {
    return this.repository.list(false);
  }

  async listCustomer() {
    const packages = await this.repository.list(true);
    const ids = [...new Set(packages.flatMap((item) => item.platformIds))];
    const quotes = new Map(
      (await this.media.quotePlatforms(ids)).map((quote) => [
        quote.platformId,
        quote,
      ]),
    );
    return packages.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      pointPrice: item.pointPrice,
      revision: item.revision,
      buyable: item.platformIds.some((id) => quotes.get(id)?.buyable),
      scope: item.platformIds.flatMap((id) => {
        const quote = quotes.get(id);
        return quote
          ? [{ platformId: id, displayName: quote.displayName }]
          : [];
      }),
    }));
  }

  create(actorAccountId: string, input: unknown) {
    const parsed = packageFieldsSchema.safeParse(input);
    if (!parsed.success)
      throw new BadRequestException(
        "请填写有效套餐名称、正整数数量/积分与不重复的媒体范围（最多 200 项）",
      );
    return this.execute(() =>
      this.repository.create(actorAccountId, parsed.data),
    );
  }

  update(actorAccountId: string, id: string, input: unknown) {
    const parsed = packageUpdateSchema.safeParse(input);
    if (!parsed.success)
      throw new BadRequestException(
        "套餐输入不正确：请检查完整资料、版本和修改原因",
      );
    const { expectedRevision, reason, ...fields } = parsed.data;
    return this.execute(() =>
      this.repository.update(
        actorAccountId,
        id,
        fields,
        expectedRevision,
        reason,
      ),
    );
  }

  audits(id: string) {
    return this.execute(() => this.repository.audits(id));
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof PackageConflictError)
        throw new ConflictException(error.message);
      if (error instanceof PackageNotFoundError)
        throw new NotFoundException(error.message);
      throw error;
    }
  }
}
