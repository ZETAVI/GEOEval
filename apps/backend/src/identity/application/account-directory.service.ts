import { Inject, Injectable } from "@nestjs/common";
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from "../domain/identity.repository.js";

/** Read-only identity facts for account-owned business capabilities. */
@Injectable()
export class AccountDirectoryService {
  constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
  ) {}

  async terminalCustomer(accountId: string) {
    const account = await this.repository.findAccount(accountId);
    if (!account || account.role !== "TERMINAL_CUSTOMER") return undefined;
    return { id: account.id, mobile: account.mobile, status: account.status };
  }
}
