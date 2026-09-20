import { z } from "zod";
import { RechargeError } from "../domain/recharge-order.js";
import type { RechargeCoreService } from "./recharge-core.service.js";
import type {
  NativeChannel,
  NativeClaim,
  NativeOperationResult,
  NativeRecoveryPolicy,
  NativeRecoveryRepository,
} from "./native-recovery.js";
import {
  providerForMethod,
  type RechargeMethod,
  type RechargeProvider,
} from "./provider-payment.js";

const policySchema = z
  .object({
    initiationEnabled: z.boolean(),
    minimumDispatchWindowMs: z.number().int().min(70_000),
    leaseMs: z.number().int().min(1000),
    queryIntervalMs: z.number().int().min(1000),
    retryDelayMs: z.number().int().min(1000),
    maxFailures: z.number().int().min(1).max(100),
    slowRetryDelayMs: z.number().int().min(1000).max(86_400_000),
  })
  .strict()
  .refine((p) => p.slowRetryDelayMs >= p.retryDelayMs);

/** Explicitly driven worker lanes; no environment lookup, timer or public HTTP route. */
export class NativeRecoveryService {
  private readonly policy: NativeRecoveryPolicy;
  private readonly channel: NativeChannel & {
    provider: RechargeProvider;
    method: RechargeMethod;
  };
  constructor(
    private readonly core: RechargeCoreService,
    private readonly repository: NativeRecoveryRepository,
    channel: NativeChannel,
    policy: NativeRecoveryPolicy,
    private readonly clock: () => Date = () => new Date(),
  ) {
    const method = channel.method ?? "WECHAT_NATIVE";
    const provider = channel.provider ?? providerForMethod(method);
    if (
      provider !== providerForMethod(method) ||
      (channel.gateway?.provider !== undefined &&
        channel.gateway.provider !== provider) ||
      (channel.gateway?.method !== undefined &&
        channel.gateway.method !== method)
    )
      throw new Error("PAYMENT_CHANNEL_CONFIGURATION");
    this.channel = Object.freeze({ ...channel, provider, method });
    this.policy = Object.freeze(policySchema.parse(policy));
  }
  supports(method: RechargeMethod) {
    return method === this.channel.method;
  }
  create(accountId: string, input: unknown) {
    if (
      !input ||
      typeof input !== "object" ||
      (input as { method?: unknown }).method !== this.channel.method
    )
      throw new RechargeError("INVALID_INPUT");
    return this.core.create(accountId, input);
  }
  read(accountId: string, orderId: string) {
    this.identifiers(accountId, orderId);
    return this.repository.readOwned(accountId, orderId, this.clock());
  }
  async cancel(accountId: string, orderId: string) {
    this.identifiers(accountId, orderId);
    await this.repository.cancelOwned(accountId, orderId, this.clock());
    return this.read(accountId, orderId);
  }
  async verify(accountId: string, orderId: string) {
    this.identifiers(accountId, orderId);
    await this.repository.verifyOwned(
      accountId,
      orderId,
      this.clock(),
      this.policy.queryIntervalMs,
    );
    return this.read(accountId, orderId);
  }
  async grantCashier(accountId: string, orderId: string) {
    this.identifiers(accountId, orderId);
    if (this.channel.gateway.actionKind !== "CASHIER_PAGE")
      throw new RechargeError("INVALID_INPUT");
    return this.repository.grantCashierOwned(
      accountId,
      orderId,
      this.channel,
      this.policy,
      this.clock(),
    );
  }
  async cashierPage(accountId: string, orderId: string) {
    this.identifiers(accountId, orderId);
    const prepare = this.channel.gateway.prepareCashier;
    if (this.channel.gateway.actionKind !== "CASHIER_PAGE" || !prepare)
      throw new RechargeError("INVALID_INPUT");
    const grant = await this.repository.readCashierGrantOwned(
      accountId,
      orderId,
      this.channel,
      this.clock(),
    );
    const result = prepare.call(this.channel.gateway, grant.order, {
      description: grant.description,
      expiresAt: grant.expiresAt,
    });
    if (!result.ok) throw new RechargeError("CASHIER_UNAVAILABLE");
    return result.value.html;
  }
  async runOrders(limit: number, stop?: AbortSignal) {
    this.limit(limit);
    if (stop?.aborted) return { claimed: 0, failed: 0 };
    const ids = await this.repository.dueOrderIds(
      this.clock(),
      limit,
      this.channel,
    );
    let claimed = 0,
      failed = 0;
    for (const orderId of ids) {
      // Stop taking new work; an already started claim/call/commit must finish.
      if (stop?.aborted) break;
      const result = await this.runOrderId(orderId, stop);
      claimed += result.claimed;
      failed += result.failed;
    }
    return { claimed, failed };
  }
  /** Exact operator/recovery seam; never scans or advances another order. */
  runOrder(orderId: string, stop?: AbortSignal) {
    this.identifiers(orderId);
    return this.runOrderId(orderId, stop);
  }
  async runSettlements(limit: number, stop?: AbortSignal) {
    this.limit(limit);
    if (stop?.aborted) return { applied: 0, reviewed: 0, failed: 0 };
    const items = await this.repository.dueSettlements(this.clock(), limit);
    let applied = 0,
      reviewed = 0,
      failed = 0;
    for (const item of items) {
      if (stop?.aborted) break;
      try {
        const result =
          item.kind === "QUERY"
            ? await this.repository.settleQuery(item.attemptId)
            : await this.core.applyNotification(item.identity);
        if (result.kind === "APPLIED" || result.kind === "ALREADY_APPLIED")
          applied++;
        else if (result.kind === "REVIEW_REQUIRED") reviewed++;
        else throw new Error("RECHARGE_WORK_MISSING");
      } catch {
        failed++;
        // The durable scan remains authoritative if even deferring fails.
        try {
          await this.repository.deferSettlement(
            item,
            new Date(this.clock().getTime() + this.policy.retryDelayMs),
          );
        } catch {
          /* surfaced as failed work; do not mark applied */
        }
      }
    }
    return { applied, reviewed, failed };
  }
  onApplicationShutdown() {
    return this.channel.gateway.dispose?.();
  }
  private async runOrderId(orderId: string, stop?: AbortSignal) {
    if (stop?.aborted) return { claimed: 0, failed: 0 };
    let claimed = 0;
    try {
      const claim = await this.repository.claim(
        orderId,
        this.channel,
        this.policy,
        this.clock(),
      );
      if (!claim) return { claimed: 0, failed: 0 };
      claimed = 1;
      const result = await this.perform(claim);
      // A commit failure deliberately leaves a lease and uncertain operation for recovery.
      await this.repository.complete(claim, result, this.policy, this.clock());
      return { claimed, failed: result.response.ok ? 0 : 1 };
    } catch {
      try {
        const now = this.clock();
        await this.repository.deferOrder(
          orderId,
          now,
          new Date(now.getTime() + this.policy.retryDelayMs),
        );
      } catch {
        /* durable due work remains; report this failed item */
      }
      return { claimed, failed: 1 };
    }
  }
  private async perform(claim: NativeClaim): Promise<NativeOperationResult> {
    try {
      if (claim.kind === "INITIATE") {
        if (!claim.description || !claim.notifyUrl)
          throw new Error("NATIVE_SNAPSHOT_MISSING");
        if (!this.channel.gateway.initiate)
          throw new Error("PAYMENT_INITIATION_UNAVAILABLE");
        return {
          kind: "INITIATE",
          response: await this.channel.gateway.initiate(claim.order, {
            description: claim.description,
            expiresAt: claim.paymentExpiresAt,
          }),
        };
      }
      if (claim.kind === "QUERY")
        return {
          kind: "QUERY",
          response: await this.channel.gateway.query(claim.order),
        };
      return {
        kind: "CLOSE",
        response: await this.channel.gateway.close(claim.order),
      };
    } catch {
      return {
        kind: claim.kind,
        response: {
          ok: false,
          error: { kind: "UNRESOLVED", code: "TRANSPORT" },
        },
      };
    }
  }
  private identifiers(...ids: string[]) {
    if (ids.some((id) => !z.string().uuid().safeParse(id).success)) {
      throw new RechargeError("INVALID_INPUT");
    }
  }
  private limit(limit: number) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("NATIVE_BATCH_LIMIT_INVALID");
    }
  }
}
