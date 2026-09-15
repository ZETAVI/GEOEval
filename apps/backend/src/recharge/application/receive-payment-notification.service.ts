import { Inject, Injectable } from "@nestjs/common";
import {
  NOTIFICATION_INBOX,
  PAYMENT_NOTIFICATION_VERIFIER,
  type NotificationInbox,
} from "./notification-inbox.js";
import type {
  ProviderNotificationVerifier,
  RechargeProvider,
} from "./provider-payment.js";
import { WechatRechargePaymentGateway } from "./provider-payment.js";
import type {
  PaymentGateway,
  PaymentNotificationVerifier,
} from "./payment-gateway.js";

export type ReceiveNotificationResult =
  "ACCEPTED" | "UNAUTHENTICATED" | "INVALID" | "RETRY";

function isVerifierMap(
  value:
    | ReadonlyMap<RechargeProvider, ProviderNotificationVerifier>
    | (PaymentGateway & PaymentNotificationVerifier),
): value is ReadonlyMap<RechargeProvider, ProviderNotificationVerifier> {
  return typeof (value as { get?: unknown }).get === "function";
}

@Injectable()
export class ReceivePaymentNotificationService {
  private readonly verifiers: ReadonlyMap<
    RechargeProvider,
    ProviderNotificationVerifier
  >;
  constructor(
    @Inject(PAYMENT_NOTIFICATION_VERIFIER)
    verifiers:
      | ReadonlyMap<RechargeProvider, ProviderNotificationVerifier>
      | (PaymentGateway & PaymentNotificationVerifier),
    @Inject(NOTIFICATION_INBOX) private readonly inbox: NotificationInbox,
  ) {
    this.verifiers = isVerifierMap(verifiers)
      ? verifiers
      : new Map([
          ["WECHAT", new WechatRechargePaymentGateway(verifiers)] as const,
        ]);
  }

  receive(
    input: Parameters<PaymentNotificationVerifier["verifyNotification"]>[0],
  ): Promise<ReceiveNotificationResult>;
  receive(
    provider: RechargeProvider,
    input: Parameters<ProviderNotificationVerifier["verifyNotification"]>[0],
  ): Promise<ReceiveNotificationResult>;
  async receive(
    providerOrInput:
      | RechargeProvider
      | Parameters<ProviderNotificationVerifier["verifyNotification"]>[0],
    suppliedInput?: Parameters<
      ProviderNotificationVerifier["verifyNotification"]
    >[0],
  ): Promise<ReceiveNotificationResult> {
    const provider =
        typeof providerOrInput === "string" ? providerOrInput : "WECHAT",
      input =
        typeof providerOrInput === "string" ? suppliedInput : providerOrInput;
    if (!input) return "INVALID";
    const startedAt = performance.now();
    let verified;
    try {
      const verifier = this.verifiers.get(provider);
      if (!verifier) return "INVALID";
      verified = verifier.verifyNotification(input);
    } catch {
      return "RETRY";
    }
    if (!verified.ok)
      return verified.error.code.startsWith("AUTH_")
        ? "UNAUTHENTICATED"
        : "INVALID";
    const remainingMs = 3500 - (performance.now() - startedAt);
    if (remainingMs <= 0) return "RETRY";
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // Expiry bounds the response, not the database commit. Late commits are deduplicated.
      return await Promise.race([
        this.inbox.accept(verified.value).then(() => "ACCEPTED" as const),
        new Promise<"RETRY">((resolve) => {
          timer = setTimeout(() => resolve("RETRY"), remainingMs);
        }),
      ]);
    } catch {
      return "RETRY";
    } finally {
      clearTimeout(timer);
    }
  }
}
