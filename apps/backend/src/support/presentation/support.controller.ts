import {
  Body,
  Controller,
  Get,
  Post,
  Header,
  Headers,
  Inject,
  Param,
  ParseUUIDPipe,
  Query,
  ConflictException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiQuery,
  ApiParam,
  ApiHeader,
} from "@nestjs/swagger";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import {
  parseSupport,
  supportCreateSchema,
  supportCommandSchema,
  supportListSchema,
  supportMessagesSchema,
} from "../domain/support.js";
import { PostgresSupportRepository } from "../infrastructure/postgres-support.repository.js";
import {
  SupportCreateRequest,
  SupportCommandRequest,
  SupportReceiptResponse,
  SupportPageResponse,
  SupportDetailResponse,
} from "./support.dto.js";
@ApiTags("support")
@ApiHeader({
  name: "x-geoeval-account",
  required: true,
  description: "Expected signed-in account",
})
@RequireAccountRoles("TERMINAL_CUSTOMER", "OPERATIONS", "ADMINISTRATOR")
@Controller("support/tickets")
export class SupportController {
  constructor(
    @Inject(PostgresSupportRepository)
    private readonly repo: PostgresSupportRepository,
  ) {}
  private actor(p: AuthenticatedPrincipal, expected: string | undefined) {
    if (expected?.toLowerCase() !== p.accountId)
      throw new ConflictException({
        code: "ACCOUNT_CHANGED",
        message: "登录账号已变化，请重新进入客服",
      });
    return p.accountId;
  }
  @Post()
  @RequireAccountRoles("TERMINAL_CUSTOMER", "OPERATIONS")
  @Header("Cache-Control", "private, no-store")
  @ApiBody({ type: SupportCreateRequest })
  @ApiCreatedResponse({ type: SupportReceiptResponse })
  create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Body() body: unknown,
  ) {
    return this.repo.create(
      this.actor(p, expected),
      parseSupport(supportCreateSchema, body),
    );
  }
  @Get()
  @Header("Cache-Control", "private, no-store")
  @ApiQuery({
    name: "publishingOrderId",
    required: false,
    type: String,
    format: "uuid",
  })
  @ApiQuery({ name: "scope", required: false, enum: ["mine", "pool", "all"] })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["PROCESSING", "RESOLVED"],
  })
  @ApiQuery({ name: "before", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiOkResponse({ type: SupportPageResponse })
  list(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Query() query: unknown,
  ) {
    return this.repo.list(
      this.actor(p, expected),
      parseSupport(supportListSchema, query),
    );
  }
  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  @ApiParam({ name: "id", format: "uuid" })
  @ApiQuery({ name: "after", required: false, type: Number })
  @ApiOkResponse({ type: SupportDetailResponse })
  detail(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: unknown,
  ) {
    return this.repo.detail(
      this.actor(p, expected),
      id.toLowerCase(),
      parseSupport(supportMessagesSchema, query).after,
    );
  }
  @Post(":id/actions")
  @Header("Cache-Control", "private, no-store")
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ type: SupportCommandRequest })
  @ApiCreatedResponse({ type: SupportReceiptResponse })
  command(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.repo.command(
      this.actor(p, expected),
      id.toLowerCase(),
      parseSupport(supportCommandSchema, body),
    );
  }
}
