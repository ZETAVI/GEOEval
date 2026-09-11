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
  private readonly channel: NativeChannel;
  constructor(
    private readonly core: RechargeCoreService,
    private readonly repository: NativeRecoveryRepository,
    channel: NativeChannel,
    policy: NativeRecoveryPolicy,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.channel = Object.freeze({ ...channel });
    this.policy = Object.freeze(policySchema.parse(policy));
  }
  create(accountId: string, input: unknown) {
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
  async runOrders(limit: number, stop?: AbortSignal) {
    this.limit(limit);
    if (stop?.aborted) return { claimed: 0, failed: 0 };
    const ids = await this.repository.dueOrderIds(this.clock(), limit);
    let claimed = 0,
      failed = 0;
    for (const orderId of ids) {
      // Stop taking new work; an already started claim/call/commit must finish.
      if (stop?.aborted) break;
      try {
        const claim = await this.repository.claim(
          orderId,
          this.channel,
          this.policy,
          this.clock(),
        );
        if (!claim) continue;
        claimed++;
        const result = await this.perform(claim);
        // A commit failure deliberately leaves a lease and uncertain operation for recovery.
        await this.repository.complete(
          claim,
          result,
          this.policy,
          this.clock(),
        );
        if (!result.response.ok) failed++;
      } catch {
        failed++;
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
      }
    }
    return { claimed, failed };
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
  private async perform(claim: NativeClaim): Promise<NativeOperationResult> {
    try {
      if (claim.kind === "INITIATE") {
        if (!claim.description || !claim.notifyUrl)
          throw new Error("NATIVE_SNAPSHOT_MISSING");
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
