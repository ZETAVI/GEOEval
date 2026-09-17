import { RechargeError } from "../domain/recharge-order.js";
import type { RechargeCustomerRuntime } from "./customer-recharge.js";
import type { NativeRecoveryService } from "./native-recovery.service.js";
import type { RechargeMethod } from "./provider-payment.js";

/** Routes customer commands without exposing provider credentials or protocol details. */
export class RoutedRechargeCustomerRuntime implements RechargeCustomerRuntime {
  private readonly runtimes: ReadonlyMap<RechargeMethod, NativeRecoveryService>;

  constructor(runtimes: readonly NativeRecoveryService[]) {
    const indexed = new Map<RechargeMethod, NativeRecoveryService>();
    for (const runtime of runtimes) {
      const method = (["ALIPAY_PC", "WECHAT_NATIVE"] as const).find((value) =>
        runtime.supports(value),
      );
      if (!method || indexed.has(method))
        throw new Error("RECHARGE_CHANNEL_DUPLICATE");
      indexed.set(method, runtime);
    }
    if (indexed.size < 1) throw new Error("RECHARGE_CHANNELS_REQUIRED");
    this.runtimes = indexed;
  }

  supports(method: RechargeMethod) {
    return this.runtimes.has(method);
  }

  create(accountId: string, input: unknown) {
    const method =
      input && typeof input === "object"
        ? (input as { method?: unknown }).method
        : undefined;
    if (method !== "WECHAT_NATIVE" && method !== "ALIPAY_PC")
      throw new RechargeError("INVALID_INPUT");
    return this.runtime(method).create(accountId, input);
  }

  cancel(accountId: string, orderId: string, method?: RechargeMethod) {
    return this.runtime(method).cancel(accountId, orderId);
  }

  verify(accountId: string, orderId: string, method?: RechargeMethod) {
    return this.runtime(method).verify(accountId, orderId);
  }

  grantCashier(accountId: string, orderId: string, method?: RechargeMethod) {
    return this.runtime(method).grantCashier(accountId, orderId);
  }

  cashierPage(accountId: string, orderId: string, method?: RechargeMethod) {
    return this.runtime(method).cashierPage(accountId, orderId);
  }

  async onApplicationShutdown() {
    await Promise.all(
      [...this.runtimes.values()].map((runtime) =>
        runtime.onApplicationShutdown(),
      ),
    );
  }

  private runtime(method?: RechargeMethod) {
    const runtime = method ? this.runtimes.get(method) : undefined;
    if (!runtime) throw new RechargeError("CREATION_DISABLED");
    return runtime;
  }
}
