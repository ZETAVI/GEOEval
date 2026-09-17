import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import {
  ApiBody,
  ApiHeader,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { AgencyWithdrawalService } from "../application/agency-withdrawal.service.js";
import {
  PayoutProfileRequest,
  PayoutProfileResponse,
  PayoutProfileStateResponse,
  PayoutRevealRequest,
  PayoutRevealResponse,
  WithdrawalCommandRequest,
  WithdrawalPageResponse,
  WithdrawalPolicyRequest,
  WithdrawalPolicyResponse,
  WithdrawalPolicyStateResponse,
  WithdrawalResponse,
  WithdrawalSubmitRequest,
  WithdrawalSummaryResponse,
} from "./agency-withdrawal.dto.js";

@ApiTags("agency-withdrawal")
@ApiHeader({ name: "x-geoeval-account", required: true })
@RequireAccountRoles("AGENT")
@Controller("agency/withdrawals")
export class AgencyWithdrawalController {
  constructor(
    @Inject(AgencyWithdrawalService)
    private readonly service: AgencyWithdrawalService,
  ) {}

  @Get("summary")
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: WithdrawalSummaryResponse })
  summary(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected?: string,
  ) {
    return this.service.summary(actor, expected);
  }

  @Get("payout-profile")
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: PayoutProfileStateResponse })
  profile(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected?: string,
  ) {
    return this.service
      .profile(actor, expected)
      .then((profile) => ({ profile }));
  }

  @Put("payout-profile")
  @ApiBody({ type: PayoutProfileRequest })
  @ApiOkResponse({ type: PayoutProfileResponse })
  saveProfile(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Body() body: PayoutProfileRequest,
  ) {
    return this.service.saveProfile(actor, expected, body);
  }

  @Get()
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: WithdrawalPageResponse })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "cursor", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  list(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Query() query: unknown,
  ) {
    return this.service.list(actor, expected, query);
  }

  @Post()
  @ApiBody({ type: WithdrawalSubmitRequest })
  @ApiOkResponse({ type: WithdrawalResponse })
  submit(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Body() body: WithdrawalSubmitRequest,
  ) {
    return this.service.submit(actor, expected, body);
  }

  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: WithdrawalResponse })
  detail(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.detail(actor, expected, id);
  }

  @Post(":id/actions")
  @ApiBody({ type: WithdrawalCommandRequest })
  @ApiOkResponse({ type: WithdrawalResponse })
  command(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: WithdrawalCommandRequest,
  ) {
    return this.service.command(actor, expected, id, body);
  }
}

@ApiTags("admin-agency-withdrawal")
@ApiHeader({ name: "x-geoeval-account", required: true })
@RequireAccountRoles("ADMINISTRATOR")
@Controller("admin/agency-withdrawals")
export class AdminAgencyWithdrawalController {
  constructor(
    @Inject(AgencyWithdrawalService)
    private readonly service: AgencyWithdrawalService,
  ) {}

  @Get("policy")
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: WithdrawalPolicyStateResponse })
  policy(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected?: string,
  ) {
    return this.service.policy(actor, expected).then((policy) => ({ policy }));
  }

  @Put("policy")
  @ApiBody({ type: WithdrawalPolicyRequest })
  @ApiOkResponse({ type: WithdrawalPolicyResponse })
  savePolicy(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Body() body: WithdrawalPolicyRequest,
  ) {
    return this.service.savePolicy(actor, expected, body);
  }

  @Get()
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: WithdrawalPageResponse })
  @ApiQuery({ name: "agentId", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "cursor", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  list(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Query() query: unknown,
  ) {
    return this.service.list(actor, expected, query);
  }

  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: WithdrawalResponse })
  detail(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.detail(actor, expected, id);
  }

  @Post(":id/actions")
  @ApiBody({ type: WithdrawalCommandRequest })
  @ApiOkResponse({ type: WithdrawalResponse })
  command(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: WithdrawalCommandRequest,
  ) {
    return this.service.command(actor, expected, id, body);
  }

  @Post(":id/reveal-payout")
  @ApiBody({ type: PayoutRevealRequest })
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: PayoutRevealResponse })
  reveal(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: PayoutRevealRequest,
  ) {
    return this.service.reveal(actor, expected, id, body);
  }
}
