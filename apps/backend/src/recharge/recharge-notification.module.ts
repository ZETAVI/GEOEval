import { Module, type DynamicModule } from "@nestjs/common";
import type { PaymentNotificationVerifier } from "./application/payment-gateway.js";
import {
  WechatRechargePaymentGateway,
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
    verifier: PaymentNotificationVerifier | ProviderNotificationVerifier,
  ): DynamicModule {
    const normalized: ProviderNotificationVerifier =
      "provider" in verifier
        ? verifier
        : new WechatRechargePaymentGateway(
            verifier as PaymentNotificationVerifier &
              import("./application/payment-gateway.js").PaymentGateway,
          );
    return {
      module: RechargeNotificationModule,
      controllers: [
        normalized.provider === "WECHAT"
          ? WechatNotificationController
          : AlipayNotificationController,
      ],
      providers: [
        {
          provide: PAYMENT_NOTIFICATION_VERIFIER,
          useValue: new Map([[normalized.provider, normalized]]),
        },
        PrismaNotificationInbox,
        { provide: NOTIFICATION_INBOX, useExisting: PrismaNotificationInbox },
        ReceivePaymentNotificationService,
      ],
      exports: [NOTIFICATION_INBOX],
    };
  }
}
