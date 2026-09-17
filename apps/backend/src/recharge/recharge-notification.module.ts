import { Module, type DynamicModule } from "@nestjs/common";
import type { PaymentNotificationVerifier } from "./application/payment-gateway.js";
import {
  WechatRechargeNotificationVerifier,
  type ProviderNotificationVerifier,
} from "./application/provider-payment.js";
import {
  NOTIFICATION_INBOX,
  PAYMENT_NOTIFICATION_VERIFIER,
} from "./application/notification-inbox.js";
import { ReceivePaymentNotificationService } from "./application/receive-payment-notification.service.js";
import { PrismaNotificationInbox } from "./infrastructure/prisma-notification-inbox.js";
import { WechatNotificationController } from "./presentation/wechat-notification.controller.js";
import { AlipayNotificationController } from "./presentation/alipay-notification.controller.js";

/**
 * Opt-in only. Host supplies PersistenceModule and existing IdentityModule guards.
 * NestFactory must use rawBody:true with its built-in parser enabled, followed by
 * useBodyParser('json', { limit:'2mb', inflate:false }) before listening.
 * No environment loading, worker processing or current ApiModule registration.
 */
@Module({})
export class RechargeNotificationModule {
  static register(
    verifier:
      | PaymentNotificationVerifier
      | ProviderNotificationVerifier
      | readonly (PaymentNotificationVerifier | ProviderNotificationVerifier)[],
  ): DynamicModule {
    const supplied = Array.isArray(verifier) ? verifier : [verifier];
    if (supplied.length < 1)
      throw new Error("RECHARGE_NOTIFICATION_VERIFIERS_REQUIRED");
    const normalized = supplied.map((value) =>
      "provider" in value
        ? value
        : new WechatRechargeNotificationVerifier(
            value as PaymentNotificationVerifier,
          ),
    );
    const verifiers = new Map(
      normalized.map((value) => [value.provider, value] as const),
    );
    if (verifiers.size !== normalized.length)
      throw new Error("RECHARGE_NOTIFICATION_PROVIDER_DUPLICATE");
    return {
      module: RechargeNotificationModule,
      controllers: [
        ...(verifiers.has("WECHAT") ? [WechatNotificationController] : []),
        ...(verifiers.has("ALIPAY") ? [AlipayNotificationController] : []),
      ],
      providers: [
        {
          provide: PAYMENT_NOTIFICATION_VERIFIER,
          useValue: verifiers,
        },
        PrismaNotificationInbox,
        { provide: NOTIFICATION_INBOX, useExisting: PrismaNotificationInbox },
        ReceivePaymentNotificationService,
      ],
      exports: [NOTIFICATION_INBOX],
    };
  }
}
