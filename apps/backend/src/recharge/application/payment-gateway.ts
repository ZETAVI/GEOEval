/** Frozen by Recharge before dispatch. This port never owns a wallet or retry. */
export type PaymentOrder = Readonly<{
  merchantId: string;
  appId: string;
  merchantOrderNo: string;
  amountFen: number;
}>;

export type PaymentProof = Readonly<{
  verificationKeyId: string;
  signedAtSeconds: number;
  receivedAt: string;
  bodySha256: string;
}>;

export type PaymentFacts = Readonly<{
  provider: "WECHAT";
  merchantId: string;
  appId: string;
  merchantOrderNo: string;
  transactionId: string;
  tradeType: "NATIVE" | null;
  orderTotalFen: number;
  currency: "CNY";
  payerTotalFen: number | null;
  payerCurrency: "CNY" | null;
  successAt: string;
}>;

export type TradeObservation =
  | { state: "SUCCESS"; facts: PaymentFacts; proof: PaymentProof }
  | {
      state:
        "NOTPAY" | "USERPAYING" | "CLOSED" | "REVOKED" | "PAYERROR" | "REFUND";
      identity: PaymentOrder;
      proof: PaymentProof;
    };

export type GatewayFailureCode =
  | "INVALID_INPUT"
  | "AUTH_HEADERS"
  | "AUTH_TIMESTAMP"
  | "AUTH_KEY"
  | "AUTH_SIGNATURE"
  | "DECRYPTION"
  | "INVALID_RESPONSE"
  | "INCOMPLETE_PAYMENT"
  | "IDENTITY_MISMATCH"
  | "AMOUNT_MISMATCH"
  | "UNSUPPORTED_TRADE_TYPE"
  | "HTTP_ERROR"
  | "REDIRECT"
  | "TIMEOUT"
  | "TRANSPORT"
  | "RESPONSE_SIZE"
  | "RESPONSE_INTERRUPTED"
  | "CONTENT_ENCODING";

/** INVALID_REQUEST describes this invocation only; it never clears prior MAY_EXIST. */
export type GatewayResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      error: {
        kind: "INVALID_REQUEST" | "UNRESOLVED" | "INVALID_NOTIFICATION";
        code: GatewayFailureCode;
        httpStatus?: number;
      };
    };

export type NativePaymentAction = {
  kind: "QR_CODE";
  url: string;
  /** Frozen payment deadline; not a renewed guarantee of QR-code validity. */
  paymentExpiresAt: string;
  proof: PaymentProof;
};

export type AuthenticatedPaymentNotification = {
  notificationId: string;
  createdAt: string;
  factsVersion: 1;
  factsSha256: string;
  facts: PaymentFacts;
  proof: PaymentProof;
};

export interface PaymentGateway {
  initiate(
    order: PaymentOrder,
    input: Readonly<{ description: string; expiresAt: string }>,
  ): Promise<GatewayResult<NativePaymentAction>>;
  query(order: PaymentOrder): Promise<GatewayResult<TradeObservation>>;
  close(order: PaymentOrder): Promise<
    GatewayResult<{
      kind: "CLOSE_ACKNOWLEDGED";
      identity: PaymentOrder;
      proof: PaymentProof;
    }>
  >;
}

/** Protocol ingress. The caller must persist acceptance before ACK and match local orders. */
export interface PaymentNotificationVerifier {
  verifyNotification(input: {
    headers: Readonly<Record<string, readonly string[] | undefined>>;
    rawBody: Buffer;
  }): GatewayResult<AuthenticatedPaymentNotification>;
}
