import { z } from "zod";
import type { NotificationIdentity } from "./notification-inbox.js";
import type { PaymentFacts, PaymentProof } from "./payment-gateway.js";
import {
  createRechargeSchema,
  rechargeConfigSchema,
  RechargeError,
  type RechargeConfig,
  type RechargeRepository,
} from "../domain/recharge-order.js";

/** Unregistered core. The future HTTP host supplies its authenticated account, not a body override. */
export class RechargeCoreService {
  readonly #config: RechargeConfig;
  constructor(
    private readonly repository: RechargeRepository,
    config: RechargeConfig,
  ) {
    this.#config = Object.freeze(rechargeConfigSchema.parse(config));
  }
  create(accountId: string, raw: unknown) {
    const result = createRechargeSchema.safeParse(raw);
    if (!result.success || !z.string().uuid().safeParse(accountId).success)
      throw new RechargeError("INVALID_INPUT");
    // New policy/active-account checks belong after the repository's durable replay check.
    return this.repository.create(accountId, result.data, this.#config);
  }
  findOwned(accountId: string, orderId: string) {
    this.identifiers(accountId, orderId);
    return this.repository.findOwned(accountId, orderId);
  }
  cancelUnsent(accountId: string, orderId: string) {
    this.identifiers(accountId, orderId);
    return this.repository.cancelUnsent(accountId, orderId);
  }
  applyNotification(identity: NotificationIdentity) {
    return this.repository.applyNotification(identity);
  }
  /** Internal use after A0 authentication; never map a client body to this method. */
  applyAuthenticatedQuery(
    orderId: string,
    facts: PaymentFacts,
    proof: PaymentProof,
  ) {
    this.identifiers(orderId);
    return this.repository.applyAuthenticatedQuery(orderId, facts, proof);
  }
  private identifiers(...values: string[]) {
    if (values.some((v) => !z.string().uuid().safeParse(v).success))
      throw new RechargeError("INVALID_INPUT");
  }
}
