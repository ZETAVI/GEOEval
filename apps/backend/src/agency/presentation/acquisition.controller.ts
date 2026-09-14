import {
  Header,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from "@nestjs/swagger";
import {
  PublicAccess,
  RequireAccountRoles,
} from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { parseEntryInput } from "../domain/acquisition.js";
import { PostgresAcquisitionRepository } from "../infrastructure/postgres-acquisition.repository.js";

export const ACQUISITION_ENABLED = Symbol("ACQUISITION_ENABLED");
export class ResolveEntryRequest {
  @ApiPropertyOptional({ type: String }) entryKey?: string;
  @ApiPropertyOptional({ type: String }) visitToken?: string;
}
export class ResolveEntryResponse {
  @ApiProperty({ type: String }) entryKey!: string;
  @ApiProperty({ type: String, nullable: true }) visitToken!: string | null;
  @ApiProperty({ type: String, nullable: true }) expiresAt!: string | null;
}
export class AgencyLinkResponse {
  @ApiProperty({ type: String, nullable: true }) entryKey!: string | null;
}

@ApiTags("agency")
@Controller("agency")
export class AcquisitionController {
  constructor(
    @Inject(PostgresAcquisitionRepository)
    private readonly repository: PostgresAcquisitionRepository,
    @Inject(ACQUISITION_ENABLED) private readonly enabled: boolean,
  ) {}
  private requireEnabled() {
    if (!this.enabled)
      throw new ServiceUnavailableException("入口服务尚未开放");
  }
  @Header("Cache-Control", "private, no-store")
  @PublicAccess()
  @Post("entry/resolve")
  @ApiBody({ type: ResolveEntryRequest })
  @ApiCreatedResponse({ type: ResolveEntryResponse })
  resolve(@Body() input: unknown) {
    this.requireEnabled();
    return this.repository.resolve(parseEntryInput(input));
  }

  @Header("Cache-Control", "private, no-store")
  @RequireAccountRoles("ADMINISTRATOR")
  @Post("agents/:accountId/entry")
  @ApiCreatedResponse({ type: AgencyLinkResponse })
  issue(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Param("accountId", new ParseUUIDPipe()) accountId: string,
  ) {
    this.requireEnabled();
    return this.repository.issueLink(actor.accountId, accountId);
  }

  @Header("Cache-Control", "private, no-store")
  @RequireAccountRoles("AGENT")
  @Get("entry")
  @ApiOkResponse({ type: AgencyLinkResponse })
  own(@CurrentPrincipal() actor: AuthenticatedPrincipal) {
    this.requireEnabled();
    return this.repository.ownLink(actor.accountId);
  }
}
