import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

import { RequireAccountRoles } from "../access/access.metadata.js";
import { CurrentPrincipal } from "../access/current-principal.js";
import { AccountGovernanceService } from "../application/account-governance.service.js";
import type { AuthenticatedPrincipal } from "../domain/identity.types.js";
import {
  AccountListResponse,
  AccountResponse,
  ChangeAccountRoleRequest,
  ChangeAccountStatusRequest,
  CreateInternalAccountRequest,
  GovernedAccountMutationRequest,
  IdentityGovernanceAuditListResponse,
} from "./identity.dto.js";

@ApiTags("identity-governance")
@RequireAccountRoles("ADMINISTRATOR")
@Controller("admin/accounts")
export class AccountGovernanceController {
  constructor(
    @Inject(AccountGovernanceService)
    private readonly governance: AccountGovernanceService,
  ) {}

  @Get()
  @ApiOkResponse({ type: AccountListResponse })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "role", required: false, type: String })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  list(
    @Query("search") search?: string,
    @Query("role") role?: string,
    @Query("status") status?: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ): Promise<AccountListResponse> {
    return this.governance.listAccounts({
      ...(search ? { search } : {}),
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(cursor ? { cursor } : {}),
      ...(limit ? { limit } : {}),
    });
  }

  @Post()
  @ApiBody({ type: CreateInternalAccountRequest })
  @ApiCreatedResponse({ type: AccountResponse })
  create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: CreateInternalAccountRequest,
  ): Promise<AccountResponse> {
    return this.governance.createInternalAccount({
      actorAccountId: principal.accountId,
      mobile: input.mobile,
      role: input.role,
      reason: input.reason,
    });
  }

  @Patch(":accountId/status")
  @ApiBody({ type: ChangeAccountStatusRequest })
  @ApiOkResponse({ type: AccountResponse })
  changeStatus(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("accountId") accountId: string,
    @Body() input: ChangeAccountStatusRequest,
  ): Promise<AccountResponse> {
    return this.governance.changeAccount({
      actorAccountId: principal.accountId,
      targetAccountId: accountId,
      expectedRevision: input.expectedRevision,
      reason: input.reason,
      mutation: { kind: "STATUS", status: input.status },
    });
  }

  @Patch(":accountId/role")
  @ApiBody({ type: ChangeAccountRoleRequest })
  @ApiOkResponse({ type: AccountResponse })
  changeRole(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("accountId") accountId: string,
    @Body() input: ChangeAccountRoleRequest,
  ): Promise<AccountResponse> {
    return this.governance.changeAccount({
      actorAccountId: principal.accountId,
      targetAccountId: accountId,
      expectedRevision: input.expectedRevision,
      reason: input.reason,
      mutation: { kind: "ROLE", role: input.role },
    });
  }

  @Delete(":accountId/sessions")
  @ApiBody({ type: GovernedAccountMutationRequest })
  @ApiOkResponse({ type: AccountResponse })
  revokeSessions(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("accountId") accountId: string,
    @Body() input: GovernedAccountMutationRequest,
  ): Promise<AccountResponse> {
    return this.governance.changeAccount({
      actorAccountId: principal.accountId,
      targetAccountId: accountId,
      expectedRevision: input.expectedRevision,
      reason: input.reason,
      mutation: { kind: "REVOKE_SESSIONS" },
    });
  }

  @Get("audits")
  @ApiOkResponse({ type: IdentityGovernanceAuditListResponse })
  @ApiQuery({ name: "targetAccountId", required: false, type: String })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  audits(
    @Query("targetAccountId") targetAccountId?: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ): Promise<IdentityGovernanceAuditListResponse> {
    return this.governance.listAudits({
      ...(targetAccountId ? { targetAccountId } : {}),
      ...(cursor ? { cursor } : {}),
      ...(limit ? { limit } : {}),
    });
  }
}
