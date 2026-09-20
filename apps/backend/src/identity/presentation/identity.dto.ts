import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import type {
  IdentityGovernanceAction,
  SessionAuthenticationFailureCode,
} from "../domain/identity.types.js";

export class RequestChallengeRequest {
  @ApiPropertyOptional({
    type: String,
    description:
      "Opaque Alibaba Cloud CAPTCHA result; required when human verification is enabled",
  })
  captchaVerifyParam?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: "Restricts this challenge to an already registered account",
  })
  existingAccountOnly?: boolean;
  @ApiPropertyOptional({
    type: String,
    description: "Opaque acquisition visit credential; not account authority",
  })
  acquisitionVisitToken?: string;
  @ApiProperty({ type: String, example: "13800138000" })
  mobile!: string;
}

export class ChallengeResponse {
  @ApiProperty({ type: String })
  challengeId!: string;

  @ApiProperty({ type: String })
  expiresAt!: string;

  @ApiPropertyOptional({
    type: String,
    description: "Only returned by the local/test adapter",
  })
  developmentCode?: string;
}

export class CompleteSessionRequest extends RequestChallengeRequest {
  @ApiProperty({ type: String })
  challengeId!: string;

  @ApiProperty({ type: String, example: "246810" })
  code!: string;
}

export class AccountResponse {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  mobile!: string;

  @ApiProperty({
    type: String,
    enum: ["TERMINAL_CUSTOMER", "OPERATIONS", "ADMINISTRATOR", "AGENT"],
  })
  role!: string;

  @ApiProperty({ type: String, enum: ["ACTIVE", "INACTIVE"] })
  status!: string;

  @ApiProperty({ type: Number })
  revision!: number;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  createdAt?: Date;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  updatedAt?: Date;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    nullable: true,
  })
  lastAuthenticatedAt?: Date | null;
}

export class SessionAuthenticationErrorResponse {
  @ApiProperty({
    type: String,
    enum: [
      "AUTHENTICATION_REQUIRED",
      "ACCOUNT_INACTIVE",
      "SESSION_REVOKED",
      "SESSION_EXPIRED",
    ],
  })
  code!: SessionAuthenticationFailureCode;

  @ApiProperty({ type: String })
  message!: string;
}

export class CreateInternalAccountRequest {
  @ApiProperty({ type: String, example: "13800138000" })
  mobile!: string;

  @ApiProperty({
    type: String,
    enum: ["OPERATIONS", "ADMINISTRATOR", "AGENT"],
  })
  role!: string;

  @ApiProperty({ type: String, minLength: 3, maxLength: 320 })
  reason!: string;
}

export class GovernedAccountMutationRequest {
  @ApiProperty({ type: Number, minimum: 1 })
  expectedRevision!: number;

  @ApiProperty({ type: String, minLength: 3, maxLength: 320 })
  reason!: string;
}

export class ChangeAccountStatusRequest extends GovernedAccountMutationRequest {
  @ApiProperty({ type: String, enum: ["ACTIVE", "INACTIVE"] })
  status!: string;
}

export class ChangeAccountRoleRequest extends GovernedAccountMutationRequest {
  @ApiProperty({
    type: String,
    enum: ["OPERATIONS", "ADMINISTRATOR", "AGENT"],
  })
  role!: string;
}

export class AccountSummaryResponse extends AccountResponse {
  @ApiProperty({ type: Number })
  activeSessionCount!: number;
}

export class AccountListResponse {
  @ApiProperty({ type: [AccountSummaryResponse] })
  items!: AccountSummaryResponse[];

  @ApiPropertyOptional({ type: String, nullable: true })
  nextCursor!: string | null;
}

export class IdentityGovernanceAuditResponse {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String, enum: ["ACCOUNT", "BOOTSTRAP"] })
  actorKind!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  actorAccountId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  actorKeyId!: string | null;

  @ApiProperty({ type: String })
  targetAccountId!: string;

  @ApiProperty({
    type: String,
    enum: [
      "BOOTSTRAP_ADMINISTRATOR",
      "CREATE_INTERNAL_ACCOUNT",
      "ACTIVATE_ACCOUNT",
      "DEACTIVATE_ACCOUNT",
      "CHANGE_INTERNAL_ROLE",
      "REVOKE_ACCOUNT_SESSIONS",
    ],
  })
  action!: IdentityGovernanceAction;

  @ApiProperty({ type: String })
  reason!: string;

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: true,
    nullable: true,
  })
  beforeState!: unknown;

  @ApiProperty({ type: "object", additionalProperties: true })
  afterState!: unknown;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;
}

export class IdentityGovernanceAuditListResponse {
  @ApiProperty({ type: [IdentityGovernanceAuditResponse] })
  items!: IdentityGovernanceAuditResponse[];

  @ApiPropertyOptional({ type: String, nullable: true })
  nextCursor!: string | null;
}
