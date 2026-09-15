import type { PaymentOrder } from "./payment-gateway.js";
import type {
  ProviderCheckoutAction,
  ProviderResult,
  ProviderTradeObservation,
  RechargeMethod,
  RechargePaymentGateway,
  RechargeProvider,
} from "./provider-payment.js";
import type { NotificationIdentity } from "./notification-inbox.js";
import type {
  RechargeOrder,
  SettlementResult,
} from "../domain/recharge-order.js";
import type { NativeOperationKind } from "../domain/native-recovery.js";

export type NativePreparation = Readonly<{
  description: string;
  notifyUrl: string;
  createEnabled: boolean;
  actionKind?: "QR_CODE" | "CASHIER_PAGE";
}>;

/** Explicit operator policy; never defaults to merchant activation. */
export type NativeRecoveryPolicy = Readonly<{
  initiationEnabled: boolean;
  minimumDispatchWindowMs: number;
  leaseMs: number;
  queryIntervalMs: number;
  retryDelayMs: number;
  /** Short retry threshold; transient failures continue on the slower schedule. */
  maxFailures: number;
  slowRetryDelayMs: number;
}>;

/** Safe routing metadata must be assembled with this gateway, never supplied by a browser. */
export type NativeChannel = Readonly<{
  provider?: RechargeProvider;
  method?: RechargeMethod;
  merchantId: string;
  appId: string;
  notifyUrl: string;
  gateway: RechargePaymentGateway;
}>;

export type NativeClaim = Readonly<{
  id: string;
  orderId: string;
  generation: number;
  kind: NativeOperationKind;
  startedAt: Date;
  order: PaymentOrder;
  description: string | null;
  notifyUrl: string | null;
  paymentExpiresAt: string;
}>;

export type NativeOperationResult =
  | {
      kind: "INITIATE";
      response: ProviderResult<
        Extract<ProviderCheckoutAction, { kind: "QR_CODE" }>
      >;
    }
  | { kind: "QUERY"; response: ProviderResult<ProviderTradeObservation> }
  | {
      kind: "CLOSE";
      response: ProviderResult<{
        kind: "CLOSE_ACKNOWLEDGED";
        identity: PaymentOrder;
        transactionId: string | null;
        proof: import("./provider-payment.js").ProviderProof;
      }>;
    };

export type NativeCheckoutSnapshot = Readonly<{
  order: RechargeOrder;
  cancelRequested: boolean;
  canCancel: boolean;
  qr: { value: string; expiresAt: string } | null;
  cashier: { path: string; expiresAt: string } | null;
  nextActionAt: string | null;
  reviewRequired: boolean;
}>;

/** Persistence owns claims/result commit and trusted closure; the caller only runs I/O. */
export interface NativeRecoveryRepository {
  dueOrderIds(
    now: Date,
    limit: number,
    channel: Omit<NativeChannel, "gateway">,
  ): Promise<string[]>;
  claim(
    orderId: string,
    channel: Omit<NativeChannel, "gateway">,
    policy: NativeRecoveryPolicy,
    now: Date,
  ): Promise<NativeClaim | null>;
  deferOrder(orderId: string, now: Date, until: Date): Promise<void>;
  complete(
    claim: NativeClaim,
    result: NativeOperationResult,
    policy: NativeRecoveryPolicy,
    now: Date,
  ): Promise<void>;
  readOwned(
    accountId: string,
    orderId: string,
    now: Date,
  ): Promise<NativeCheckoutSnapshot | null>;
  cancelOwned(accountId: string, orderId: string, now: Date): Promise<void>;
  verifyOwned(
    accountId: string,
    orderId: string,
    now: Date,
    minimumIntervalMs: number,
  ): Promise<void>;
  grantCashierOwned(
    accountId: string,
    orderId: string,
    channel: Omit<NativeChannel, "gateway">,
    policy: NativeRecoveryPolicy,
    now: Date,
  ): Promise<{ path: string; expiresAt: string }>;
  readCashierGrantOwned(
    accountId: string,
    orderId: string,
    channel: Omit<NativeChannel, "gateway">,
    now: Date,
  ): Promise<{
    order: PaymentOrder;
    description: string;
    expiresAt: string;
  }>;
  dueSettlements(
    now: Date,
    limit: number,
  ): Promise<
    Array<
      | { kind: "NOTIFICATION"; identity: NotificationIdentity }
      | { kind: "QUERY"; attemptId: string }
    >
  >;
  settleQuery(attemptId: string): Promise<SettlementResult>;
  deferSettlement(
    item:
      | { kind: "NOTIFICATION"; identity: NotificationIdentity }
      | { kind: "QUERY"; attemptId: string },
    until: Date,
  ): Promise<void>;
}
