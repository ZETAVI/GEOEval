import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { IdentityGovernanceError } from "../domain/identity.errors.js";
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from "../domain/identity.repository.js";
import type {
  AccountListPage,
  AccountRole,
  AccountStatus,
  AccountView,
  IdentityGovernanceAuditView,
  InternalAccountRole,
} from "../domain/identity.types.js";
import { InvalidMobileError, normalizeMobile } from "../domain/mobile.js";

const accountRoles: AccountRole[] = [
  "TERMINAL_CUSTOMER",
  "OPERATIONS",
  "ADMINISTRATOR",
  "AGENT",
];
const internalRoles: InternalAccountRole[] = [
  "OPERATIONS",
  "ADMINISTRATOR",
  "AGENT",
];
const accountStatuses: AccountStatus[] = ["ACTIVE", "INACTIVE"];

@Injectable()
export class AccountGovernanceService {
  constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
  ) {}

  listAccounts(input: {
    search?: unknown;
    role?: unknown;
    status?: unknown;
    cursor?: unknown;
    limit?: unknown;
  }): Promise<AccountListPage> {
    const search = parseOptionalSearch(input.search);
    return this.repository.listAccounts({
      ...(search ? { search } : {}),
      ...(input.role !== undefined ? { role: parseRole(input.role) } : {}),
      ...(input.status !== undefined
        ? { status: parseStatus(input.status) }
        : {}),
      ...(input.cursor !== undefined
        ? { cursor: parseCursor(input.cursor) }
        : {}),
      limit: parseLimit(input.limit),
      now: new Date(),
    });
  }

  listAudits(input: {
    targetAccountId?: unknown;
    cursor?: unknown;
    limit?: unknown;
  }): Promise<{
    items: IdentityGovernanceAuditView[];
    nextCursor: string | null;
  }> {
    return this.repository.listGovernanceAudits({
      ...(input.targetAccountId !== undefined
        ? { targetAccountId: parseAccountId(input.targetAccountId) }
        : {}),
      ...(input.cursor !== undefined
        ? { cursor: parseCursor(input.cursor) }
        : {}),
      limit: parseLimit(input.limit),
    });
  }

  async createInternalAccount(input: {
    actorAccountId: string;
    mobile: unknown;
    role: unknown;
    reason: unknown;
  }): Promise<AccountView> {
    try {
      return await this.repository.createInternalAccount({
        actorAccountId: input.actorAccountId,
        mobile: normalizeMobileForHttp(input.mobile),
        role: parseInternalRole(input.role),
        reason: parseReason(input.reason),
        now: new Date(),
      });
    } catch (error) {
      throwGovernanceHttpError(error);
    }
  }

  async changeAccount(input: {
    actorAccountId: string;
    targetAccountId: string;
    expectedRevision: unknown;
    reason: unknown;
    mutation:
      | { kind: "STATUS"; status: unknown }
      | { kind: "ROLE"; role: unknown }
      | { kind: "REVOKE_SESSIONS" };
  }): Promise<AccountView> {
    if (
      typeof input.expectedRevision !== "number" ||
      !Number.isInteger(input.expectedRevision) ||
      input.expectedRevision < 1
    ) {
      throw new BadRequestException("expectedRevision 必须是正整数");
    }
    const mutation =
      input.mutation.kind === "ROLE"
        ? {
            kind: "ROLE" as const,
            role: parseInternalRole(input.mutation.role),
          }
        : input.mutation.kind === "STATUS"
          ? {
              kind: "STATUS" as const,
              status: parseStatus(input.mutation.status),
            }
          : input.mutation;
    try {
      return await this.repository.changeGovernedAccount({
        actorAccountId: input.actorAccountId,
        targetAccountId: parseAccountId(input.targetAccountId),
        expectedRevision: input.expectedRevision,
        reason: parseReason(input.reason),
        now: new Date(),
        mutation,
      });
    } catch (error) {
      throwGovernanceHttpError(error);
    }
  }
}

function parseRole(value: unknown): AccountRole {
  if (accountRoles.includes(value as AccountRole)) return value as AccountRole;
  throw new BadRequestException("role 不受支持");
}

function normalizeMobileForHttp(value: unknown): string {
  try {
    return normalizeMobile(value);
  } catch (error) {
    if (error instanceof InvalidMobileError) {
      throw new BadRequestException("请输入有效的手机号");
    }
    throw error;
  }
}

function parseInternalRole(value: unknown): InternalAccountRole {
  if (internalRoles.includes(value as InternalAccountRole)) {
    return value as InternalAccountRole;
  }
  throw new BadRequestException("内部账号角色不受支持");
}

function parseStatus(value: unknown): AccountStatus {
  if (accountStatuses.includes(value as AccountStatus)) {
    return value as AccountStatus;
  }
  throw new BadRequestException("status 不受支持");
}

function parseReason(value: unknown): string {
  if (typeof value !== "string") throw new BadRequestException("必须填写原因");
  const reason = value.trim();
  if (reason.length < 3 || reason.length > 320) {
    throw new BadRequestException("原因长度必须为 3 到 320 个字符");
  }
  return reason;
}

function parseOptionalSearch(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new BadRequestException("search 必须是单个字符串");
  }
  const search = value.trim();
  if (!search) return undefined;
  if (search.length > 20) {
    throw new BadRequestException("search 长度不能超过 20 个字符");
  }
  return search;
}

function parseLimit(value: unknown): number {
  if (value === undefined) return 20;
  if (typeof value !== "string") {
    throw new BadRequestException("limit 必须是单个整数");
  }
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new BadRequestException("limit 必须是 1 到 100 的整数");
  }
  return limit;
}

function parseCursor(value: unknown): string {
  if (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return value;
  }
  throw new BadRequestException("cursor 格式不正确");
}

function parseAccountId(value: unknown): string {
  try {
    return parseCursor(value);
  } catch {
    throw new BadRequestException("accountId 格式不正确");
  }
}

function throwGovernanceHttpError(error: unknown): never {
  const databaseCode =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : undefined;
  if (databaseCode === "P2002") {
    throw new ConflictException({
      code: "ACCOUNT_ALREADY_EXISTS",
      message: "该手机号已存在账号",
    });
  }
  if (databaseCode === "P2034") {
    throw new ConflictException({
      code: "CONCURRENT_GOVERNANCE_CONFLICT",
      message: "账号治理发生并发冲突，请刷新后重试",
    });
  }
  if (!(error instanceof IdentityGovernanceError)) throw error;
  if (
    error.code === "ACTOR_FORBIDDEN" ||
    error.code === "SELF_GOVERNANCE_FORBIDDEN" ||
    error.code === "ROLE_FAMILY_CONVERSION_FORBIDDEN" ||
    error.code === "LAST_ADMINISTRATOR_FORBIDDEN"
  ) {
    throw new ForbiddenException({ code: error.code, message: error.message });
  }
  if (error.code === "ACCOUNT_NOT_FOUND") {
    throw new NotFoundException({ code: error.code, message: error.message });
  }
  throw new ConflictException({ code: error.code, message: error.message });
}
