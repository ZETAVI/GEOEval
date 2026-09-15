import {
  Body,
  Controller,
  Get,
  Post,
  Header,
  Inject,
  Param,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  ApiParam,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBody,
} from "@nestjs/swagger";
import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { customerId } from "../domain/customer-service.js";
import { parseCommissionTerms } from "../domain/commission-terms.js";
import { PostgresCommissionTermsRepository } from "../infrastructure/postgres-commission-terms.repository.js";
import { ACQUISITION_ENABLED } from "./acquisition.controller.js";
import {
  CommissionTermsRequest,
  CommissionTermsResponse,
  CommissionTermsDetailResponse,
} from "./commission-terms.dto.js";
@ApiTags("agency-commission-settings")
@RequireAccountRoles("ADMINISTRATOR")
@Controller("agency/admin/agents/:agentId/commission")
export class CommissionTermsController {
  constructor(
    @Inject(PostgresCommissionTermsRepository)
    private readonly repo: PostgresCommissionTermsRepository,
    @Inject(ACQUISITION_ENABLED) private readonly enabled: boolean,
  ) {}
  private check() {
    if (!this.enabled)
      throw new ServiceUnavailableException("代理商管理尚未开放");
  }
  @Get()
  @Header("Cache-Control", "private, no-store")
  @ApiParam({ name: "agentId", type: String, format: "uuid" })
  @ApiOkResponse({ type: CommissionTermsDetailResponse })
  read(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param("agentId") id: string,
  ): Promise<CommissionTermsDetailResponse> {
    this.check();
    return this.repo.read(p.accountId, customerId(id));
  }
  @Post()
  @Header("Cache-Control", "private, no-store")
  @ApiParam({ name: "agentId", type: String, format: "uuid" })
  @ApiBody({ type: CommissionTermsRequest })
  @ApiCreatedResponse({ type: CommissionTermsResponse })
  update(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param("agentId") id: string,
    @Body() body: unknown,
  ): Promise<CommissionTermsResponse> {
    this.check();
    return this.repo.update(
      p.accountId,
      customerId(id),
      parseCommissionTerms(body),
    );
  }
}
