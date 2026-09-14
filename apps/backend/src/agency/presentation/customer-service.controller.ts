import {
  Body,
  Controller,
  Get,
  Post,
  Header,
  Inject,
  Param,
  Query,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  ApiParam,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBody,
  ApiQuery,
} from "@nestjs/swagger";
import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { AgencyCustomerService } from "../application/customer-service.js";
import { PostgresCustomerServiceRepository } from "../infrastructure/postgres-customer-service.repository.js";
import {
  customerId,
  parseTransfer,
  pageCursor,
} from "../domain/customer-service.js";
import { ACQUISITION_ENABLED } from "./acquisition.controller.js";
import {
  CurrentEvaluationReportResponse,
  EvaluationReportHistoryResponse,
  EvaluationReportResponse,
} from "../../geo-intelligence/presentation/evaluation.dto.js";
import {
  AgencyCustomerListResponse,
  AgencyCustomerDetailResponse,
  AgencyAdminCustomerResponse,
  AgencyTransferResponse,
  AgencyTransferRequest,
} from "./customer-service.dto.js";
@ApiTags("agency-customers")
@RequireAccountRoles("AGENT")
@Controller("agency")
export class AgencyCustomerController {
  constructor(
    @Inject(AgencyCustomerService)
    private readonly service: AgencyCustomerService,
    @Inject(PostgresCustomerServiceRepository)
    private readonly relations: PostgresCustomerServiceRepository,
    @Inject(ACQUISITION_ENABLED) private readonly enabled: boolean,
  ) {}
  private check() {
    if (!this.enabled)
      throw new ServiceUnavailableException("客户服务尚未开放");
  }
  @Get("customers")
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: AgencyCustomerListResponse })
  @ApiQuery({ name: "cursor", required: false, type: String })
  list(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query("cursor") cursor?: string,
  ): Promise<AgencyCustomerListResponse> {
    this.check();
    return this.service.list(p.accountId, pageCursor(cursor));
  }
  @Get("customers/:customerId/brands")
  @ApiParam({ name: "customerId", type: String, format: "uuid" })
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: AgencyCustomerDetailResponse })
  detail(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param("customerId") id: string,
  ): Promise<AgencyCustomerDetailResponse> {
    this.check();
    return this.service.detail(p.accountId, customerId(id));
  }
  @Get("customers/:customerId/brands/:brandId/report")
  @ApiParam({ name: "customerId", type: String, format: "uuid" })
  @ApiParam({ name: "brandId", type: String, format: "uuid" })
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: CurrentEvaluationReportResponse })
  current(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param("customerId") id: string,
    @Param("brandId") brand: string,
  ): Promise<CurrentEvaluationReportResponse> {
    this.check();
    return this.service.current(p.accountId, customerId(id), customerId(brand));
  }
  @Get("customers/:customerId/brands/:brandId/reports")
  @ApiParam({ name: "customerId", type: String, format: "uuid" })
  @ApiParam({ name: "brandId", type: String, format: "uuid" })
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: EvaluationReportHistoryResponse })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: String })
  history(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param("customerId") id: string,
    @Param("brandId") brand: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ): Promise<EvaluationReportHistoryResponse> {
    this.check();
    return this.service.history(
      p.accountId,
      customerId(id),
      customerId(brand),
      limit,
      cursor,
    );
  }
  @Get("customers/:customerId/brands/:brandId/reports/:reportId")
  @ApiParam({ name: "customerId", type: String, format: "uuid" })
  @ApiParam({ name: "brandId", type: String, format: "uuid" })
  @ApiParam({ name: "reportId", type: String, format: "uuid" })
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: EvaluationReportResponse })
  report(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param("customerId") id: string,
    @Param("brandId") brand: string,
    @Param("reportId") report: string,
  ): Promise<EvaluationReportResponse> {
    this.check();
    return this.service.report(
      p.accountId,
      customerId(id),
      customerId(brand),
      customerId(report),
    );
  }
  @Get("admin/customers/:customerId")
  @ApiParam({ name: "customerId", type: String, format: "uuid" })
  @RequireAccountRoles("ADMINISTRATOR")
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: AgencyAdminCustomerResponse })
  adminState(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param("customerId") id: string,
  ): Promise<AgencyAdminCustomerResponse> {
    this.check();
    return this.service.adminState(p.accountId, customerId(id));
  }
  @Post("admin/customers/:customerId/reassign")
  @ApiParam({ name: "customerId", type: String, format: "uuid" })
  @RequireAccountRoles("ADMINISTRATOR")
  @Header("Cache-Control", "private, no-store")
  @ApiBody({ type: AgencyTransferRequest })
  @ApiCreatedResponse({ type: AgencyTransferResponse })
  transfer(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param("customerId") id: string,
    @Body() body: unknown,
  ): Promise<AgencyTransferResponse> {
    this.check();
    return this.relations.transfer(
      p.accountId,
      customerId(id),
      parseTransfer(body),
    );
  }
}
