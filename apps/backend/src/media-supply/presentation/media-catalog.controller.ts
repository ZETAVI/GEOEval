import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { AccountSessionGuard } from "../../identity/presentation/account-session.guard.js";
import { MediaSupplyService } from "../application/media-supply.service.js";
import {
  MediaCatalogRevisionResponse,
  MediaCategoryResponse,
  MediaPlatformCustomerResponse,
  MediaPlatformPageResponse,
} from "./media-supply.dto.js";

@ApiTags("media-catalog")
@UseGuards(AccountSessionGuard)
@Controller("media-catalog")
export class MediaCatalogController {
  constructor(
    @Inject(MediaSupplyService) private readonly media: MediaSupplyService,
  ) {}

  @Get("revision")
  @ApiOkResponse({ type: MediaCatalogRevisionResponse })
  async revision(): Promise<MediaCatalogRevisionResponse> {
    return { revision: await this.media.catalogRevision() };
  }

  @Get("categories")
  @ApiOkResponse({ type: [MediaCategoryResponse] })
  categories(): MediaCategoryResponse[] {
    return this.media.categories();
  }

  @Get("platforms")
  @ApiOkResponse({ type: MediaPlatformPageResponse })
  platforms(
    @Query("category") category?: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ): Promise<MediaPlatformPageResponse> {
    return this.media.listCustomerPlatforms({
      ...(category ? { category } : {}),
      ...(limit ? { limit } : {}),
      ...(cursor ? { cursor } : {}),
    });
  }

  @Get("platforms/:platformId")
  @ApiOkResponse({ type: MediaPlatformCustomerResponse })
  platform(
    @Param("platformId") platformId: string,
  ): Promise<MediaPlatformCustomerResponse> {
    return this.media.customerPlatform(platformId);
  }
}
