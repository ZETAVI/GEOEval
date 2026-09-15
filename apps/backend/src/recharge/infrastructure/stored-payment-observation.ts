import { createHash } from "node:crypto";
import type { RechargePaymentObservation } from "../../generated/prisma/client.js";
import { paymentFactsSha256 } from "../application/payment-facts.js";
import type {
  AuthenticatedPaymentNotification,
  PaymentFacts,
  PaymentProof,
} from "../application/payment-gateway.js";
import type {
  ProviderNotification,
  ProviderPaymentFacts,
  ProviderProof,
  ProviderTradeObservation,
} from "../application/provider-payment.js";

export type AcceptedPaymentNotification =
  AuthenticatedPaymentNotification | ProviderNotification;

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function safe(value: number, minimum: number) {
  return Number.isSafeInteger(value) && value >= minimum;
}
function identifier(value: unknown) {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 128 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}
function sha(value: unknown) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function providerProof(proof: PaymentProof | ProviderProof): ProviderProof {
  return "kind" in proof ? proof : { kind: "WECHAT_V3", ...proof };
}

function providerFacts(
  facts: PaymentFacts | ProviderPaymentFacts,
): ProviderPaymentFacts {
  if ("factsVersion" in facts) return { ...facts };
  return {
    factsVersion: 1,
    ...facts,
    sellerTransferAt: null,
    factsSha256: paymentFactsSha256(facts),
  };
}

function proofColumns(proof: ProviderProof) {
  if (!identifier(proof.verificationKeyId))
    throw new Error("RECHARGE_OBSERVATION_INVARIANT");
  const receivedAt = canonicalDate(proof.receivedAt);
  if (proof.kind === "WECHAT_V3") {
    if (!safe(proof.signedAtSeconds, 0) || !sha(proof.bodySha256))
      throw new Error("RECHARGE_OBSERVATION_INVARIANT");
    return {
      proofKind: proof.kind,
      verificationKeyId: proof.verificationKeyId,
      signedAtSeconds: BigInt(proof.signedAtSeconds),
      receivedAt,
      bodySha256: proof.bodySha256,
      sdkVersion: null,
      requestSha256: null,
      responseDataSha256: null,
    };
  }
  if (proof.kind === "ALIPAY_FORM_RSA2") {
    if (!sha(proof.bodySha256))
      throw new Error("RECHARGE_OBSERVATION_INVARIANT");
    return {
      proofKind: proof.kind,
      verificationKeyId: proof.verificationKeyId,
      signedAtSeconds: null,
      receivedAt,
      bodySha256: proof.bodySha256,
      sdkVersion: null,
      requestSha256: null,
      responseDataSha256: null,
    };
  }
  if (
    proof.sdkVersion !== "4.14.0" ||
    !sha(proof.requestSha256) ||
    !sha(proof.responseDataSha256)
  )
    throw new Error("RECHARGE_OBSERVATION_INVARIANT");
  return {
    proofKind: proof.kind,
    verificationKeyId: proof.verificationKeyId,
    signedAtSeconds: null,
    receivedAt,
    bodySha256: null,
    sdkVersion: proof.sdkVersion,
    requestSha256: proof.requestSha256,
    responseDataSha256: proof.responseDataSha256,
  };
}

/** Structural persistence invariants; provider authentication must already have happened. */
export function paymentObservationData(
  inputFacts: PaymentFacts | ProviderPaymentFacts,
  inputProof: PaymentProof | ProviderProof,
  providerState?: string,
) {
  const facts = providerFacts(inputFacts),
    proof = providerProof(inputProof);
  const expectedHash =
    facts.factsVersion === 1
      ? paymentFactsSha256(facts as PaymentFacts)
      : hash({
          factsVersion: 2,
          provider: facts.provider,
          merchantId: facts.merchantId,
          appId: facts.appId,
          merchantOrderNo: facts.merchantOrderNo,
          transactionId: facts.transactionId,
          orderTotalFen: facts.orderTotalFen,
          currency: facts.currency,
        });
  if (
    !["WECHAT", "ALIPAY"].includes(facts.provider) ||
    facts.currency !== "CNY" ||
    ![null, "NATIVE", "ALIPAY_PC"].includes(facts.tradeType) ||
    ![null, "CNY"].includes(facts.payerCurrency) ||
    !safe(facts.orderTotalFen, 1) ||
    (facts.payerTotalFen !== null &&
      (!safe(facts.payerTotalFen, 0) ||
        facts.payerTotalFen > facts.orderTotalFen)) ||
    ![
      facts.merchantId,
      facts.appId,
      facts.merchantOrderNo,
      facts.transactionId,
    ].every(identifier) ||
    !sha(facts.factsSha256) ||
    facts.factsSha256 !== expectedHash ||
    (facts.provider === "WECHAT" &&
      (facts.factsVersion !== 1 ||
        proof.kind !== "WECHAT_V3" ||
        !facts.successAt)) ||
    (facts.provider === "ALIPAY" &&
      (facts.factsVersion !== 2 ||
        facts.tradeType !== "ALIPAY_PC" ||
        proof.kind === "WECHAT_V3"))
  )
    throw new Error("RECHARGE_OBSERVATION_INVARIANT");
  return {
    provider: facts.provider,
    merchantId: facts.merchantId,
    appId: facts.appId,
    merchantOrderNo: facts.merchantOrderNo,
    transactionId: facts.transactionId,
    tradeType: facts.tradeType,
    factsVersion: facts.factsVersion,
    factsSha256: facts.factsSha256,
    observationState: "SUCCESS",
    providerState:
      providerState ??
      (facts.provider === "WECHAT" ? "SUCCESS" : "TRADE_SUCCESS"),
    orderTotalFen: BigInt(facts.orderTotalFen),
    currency: facts.currency,
    payerTotalFen:
      facts.payerTotalFen === null ? null : BigInt(facts.payerTotalFen),
    payerCurrency: facts.payerCurrency,
    successAt: facts.successAt ? canonicalDate(facts.successAt) : null,
    sellerTransferAt: facts.sellerTransferAt
      ? canonicalDate(facts.sellerTransferAt)
      : null,
    ...proofColumns(proof),
  };
}

function normalizedNotification(
  notification: AcceptedPaymentNotification,
): ProviderNotification {
  if ("observation" in notification) return notification;
  const facts = {
    ...providerFacts(notification.facts),
    factsSha256: notification.factsSha256,
  };
  return {
    notificationId: notification.notificationId,
    createdAt: notification.createdAt,
    observation: {
      state: "SUCCESS",
      providerState: "SUCCESS",
      facts,
      proof: providerProof(notification.proof),
    },
  };
}

export function notificationObservationData(
  input: AcceptedPaymentNotification,
) {
  if (
    !("observation" in input) &&
    (input.factsVersion !== 1 ||
      input.facts.tradeType !== "NATIVE" ||
      input.facts.payerCurrency !== "CNY" ||
      input.facts.payerTotalFen === null)
  )
    throw new Error("RECHARGE_NOTIFICATION_INVARIANT");
  const notification = normalizedNotification(input),
    observation = notification.observation;
  if (
    typeof notification.notificationId !== "string" ||
    notification.notificationId.length < 1 ||
    Buffer.byteLength(notification.notificationId, "utf8") > 128 ||
    /[\u0000-\u001f\u007f]/.test(notification.notificationId)
  )
    throw new Error("RECHARGE_NOTIFICATION_INVARIANT");
  const common = {
    sourceKind: "NOTIFICATION",
    notificationId: notification.notificationId,
    notificationCreatedAt: canonicalDate(notification.createdAt),
  };
  if (observation.state === "SUCCESS")
    return {
      ...paymentObservationData(
        observation.facts,
        observation.proof,
        observation.providerState,
      ),
      ...common,
    };
  if (
    !["NOTPAY", "CLOSED_UNRESOLVED"].includes(observation.state) ||
    !identifier(observation.identity.merchantId) ||
    !identifier(observation.identity.appId) ||
    !identifier(observation.identity.merchantOrderNo) ||
    !safe(observation.orderTotalFen, 1) ||
    observation.identity.amountFen !== observation.orderTotalFen ||
    (observation.transactionId !== null &&
      !identifier(observation.transactionId)) ||
    (observation.payerTotalFen !== null &&
      (!safe(observation.payerTotalFen, 0) ||
        observation.payerTotalFen > observation.orderTotalFen)) ||
    observation.proof.kind !== "ALIPAY_FORM_RSA2"
  )
    throw new Error("RECHARGE_NOTIFICATION_INVARIANT");
  const factsSha256 = hash({
    factsVersion: 2,
    provider: "ALIPAY",
    merchantId: observation.identity.merchantId,
    appId: observation.identity.appId,
    merchantOrderNo: observation.identity.merchantOrderNo,
    transactionId: observation.transactionId,
    observationState: observation.state,
    providerState: observation.providerState,
    orderTotalFen: observation.orderTotalFen,
    currency: "CNY",
  });
  return {
    ...common,
    provider: "ALIPAY",
    merchantId: observation.identity.merchantId,
    appId: observation.identity.appId,
    merchantOrderNo: observation.identity.merchantOrderNo,
    transactionId: observation.transactionId,
    tradeType: "ALIPAY_PC",
    factsVersion: 2,
    factsSha256,
    observationState: observation.state,
    providerState: observation.providerState,
    orderTotalFen: BigInt(observation.orderTotalFen),
    currency: "CNY",
    payerTotalFen:
      observation.payerTotalFen === null
        ? null
        : BigInt(observation.payerTotalFen),
    payerCurrency: observation.payerTotalFen === null ? null : "CNY",
    successAt: null,
    sellerTransferAt: null,
    ...proofColumns(observation.proof),
  };
}

export function canonicalDate(value: string): Date {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value)
    throw new Error("RECHARGE_OBSERVATION_INVARIANT");
  return date;
}

export function storedPaymentFacts(
  row: RechargePaymentObservation,
): PaymentFacts | ProviderPaymentFacts {
  if (
    row.observationState !== "SUCCESS" ||
    row.transactionId === null ||
    !safe(Number(row.orderTotalFen), 1)
  )
    throw new Error("RECHARGE_OBSERVATION_INVARIANT");
  if (row.provider === "WECHAT") {
    if (
      row.factsVersion !== 1 ||
      row.successAt === null ||
      row.proofKind !== "WECHAT_V3"
    )
      throw new Error("RECHARGE_OBSERVATION_INVARIANT");
    return {
      provider: "WECHAT",
      merchantId: row.merchantId,
      appId: row.appId,
      merchantOrderNo: row.merchantOrderNo,
      transactionId: row.transactionId,
      tradeType: row.tradeType === null ? null : "NATIVE",
      orderTotalFen: Number(row.orderTotalFen),
      currency: "CNY",
      payerTotalFen:
        row.payerTotalFen === null ? null : Number(row.payerTotalFen),
      payerCurrency: row.payerCurrency === null ? null : "CNY",
      successAt: row.successAt.toISOString(),
    };
  }
  if (row.provider !== "ALIPAY" || row.factsVersion !== 2)
    throw new Error("RECHARGE_OBSERVATION_INVARIANT");
  return {
    factsVersion: 2,
    provider: "ALIPAY",
    merchantId: row.merchantId,
    appId: row.appId,
    merchantOrderNo: row.merchantOrderNo,
    transactionId: row.transactionId,
    tradeType: "ALIPAY_PC",
    orderTotalFen: Number(row.orderTotalFen),
    currency: "CNY",
    payerTotalFen:
      row.payerTotalFen === null ? null : Number(row.payerTotalFen),
    payerCurrency: row.payerCurrency === null ? null : "CNY",
    successAt: row.successAt?.toISOString() ?? null,
    sellerTransferAt: row.sellerTransferAt?.toISOString() ?? null,
    factsSha256: row.factsSha256,
  };
}

export function storedProviderProof(
  row: RechargePaymentObservation,
): ProviderProof {
  if (
    row.proofKind === "WECHAT_V3" &&
    row.signedAtSeconds !== null &&
    row.bodySha256 !== null
  )
    return {
      kind: "WECHAT_V3",
      verificationKeyId: row.verificationKeyId,
      signedAtSeconds: Number(row.signedAtSeconds),
      receivedAt: row.receivedAt.toISOString(),
      bodySha256: row.bodySha256,
    };
  if (row.proofKind === "ALIPAY_FORM_RSA2" && row.bodySha256 !== null)
    return {
      kind: "ALIPAY_FORM_RSA2",
      verificationKeyId: row.verificationKeyId,
      receivedAt: row.receivedAt.toISOString(),
      bodySha256: row.bodySha256,
    };
  if (
    row.proofKind === "ALIPAY_V3_SDK" &&
    row.sdkVersion === "4.14.0" &&
    row.requestSha256 !== null &&
    row.responseDataSha256 !== null
  )
    return {
      kind: "ALIPAY_V3_SDK",
      sdkVersion: "4.14.0",
      verificationKeyId: row.verificationKeyId,
      receivedAt: row.receivedAt.toISOString(),
      requestSha256: row.requestSha256,
      responseDataSha256: row.responseDataSha256,
    };
  throw new Error("RECHARGE_OBSERVATION_INVARIANT");
}

export function storedNotification(
  row: RechargePaymentObservation,
): AcceptedPaymentNotification {
  if (
    row.sourceKind !== "NOTIFICATION" ||
    row.notificationId === null ||
    row.notificationCreatedAt === null
  )
    throw new Error("RECHARGE_NOTIFICATION_INVARIANT");
  if (row.provider === "WECHAT") {
    const facts = storedPaymentFacts(row),
      verified = storedProviderProof(row);
    if (
      facts.provider !== "WECHAT" ||
      verified.kind !== "WECHAT_V3" ||
      row.tradeType === null ||
      row.payerCurrency === null ||
      row.payerTotalFen === null
    )
      throw new Error("RECHARGE_NOTIFICATION_INVARIANT");
    return {
      notificationId: row.notificationId,
      createdAt: row.notificationCreatedAt.toISOString(),
      factsVersion: 1,
      factsSha256: row.factsSha256,
      facts: facts as PaymentFacts,
      proof: verified,
    };
  }
  const proof = storedProviderProof(row);
  let observation: ProviderTradeObservation;
  if (row.observationState === "SUCCESS") {
    const facts = storedPaymentFacts(row);
    if (facts.provider !== "ALIPAY")
      throw new Error("RECHARGE_NOTIFICATION_INVARIANT");
    observation = {
      state: "SUCCESS",
      providerState: row.providerState,
      facts,
      proof,
    };
  } else {
    observation = {
      state: row.observationState as "NOTPAY" | "CLOSED_UNRESOLVED",
      providerState: row.providerState,
      identity: {
        merchantId: row.merchantId,
        appId: row.appId,
        merchantOrderNo: row.merchantOrderNo,
        amountFen: Number(row.orderTotalFen),
      },
      transactionId: row.transactionId,
      orderTotalFen: Number(row.orderTotalFen),
      payerTotalFen:
        row.payerTotalFen === null ? null : Number(row.payerTotalFen),
      proof,
    };
  }
  return {
    notificationId: row.notificationId,
    createdAt: row.notificationCreatedAt.toISOString(),
    observation,
  };
}

export function queryObservationKey(orderId: string, factsSha256: string) {
  return createHash("sha256")
    .update(`QUERY\n${orderId}\n${factsSha256}`)
    .digest("hex");
}
