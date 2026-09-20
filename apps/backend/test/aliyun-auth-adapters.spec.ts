import type {
  VerifyIntelligentCaptchaRequest,
  VerifyIntelligentCaptchaResponse,
} from "@alicloud/captcha20230305";
import type {
  SendSmsRequest,
  SendSmsResponse,
} from "@alicloud/dysmsapi20170525";
import type { RuntimeOptions } from "@darabonba/typescript";
import { describe, expect, it } from "vitest";

import type { ApiConfig } from "../src/config/runtime-config.js";
import { ChallengeDeliveryRejectedError } from "../src/identity/domain/challenge-delivery.port.js";
import type {
  AliyunCaptchaClient,
  AliyunSmsClient,
} from "../src/identity/infrastructure/aliyun-auth-clients.js";
import {
  createAliyunCaptchaClient,
  createAliyunSmsClient,
} from "../src/identity/infrastructure/aliyun-auth-clients.js";
import { AliyunCaptchaVerifier } from "../src/identity/infrastructure/aliyun-captcha-verifier.js";
import { AliyunSmsChallengeDelivery } from "../src/identity/infrastructure/aliyun-sms-challenge-delivery.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const base = loadIntegrationApiConfig();
const config: ApiConfig = {
  ...base,
  authChallengeMode: "aliyun",
  authHumanVerificationMode: "aliyun",
  authAliyun: {
    accessKeyId: "test-access-key",
    accessKeySecret: "test-access-secret",
    requestTimeoutMs: 2500,
    captchaSceneId: "18hnihr4",
    captchaEndpoint: "captcha.cn-shanghai.aliyuncs.com",
    smsSignName: "approved-sign",
    smsTemplateCode: "SMS_123456",
    smsEndpoint: "dysmsapi.aliyuncs.com",
  },
};

describe("Alibaba authentication adapters", () => {
  it("constructs both pinned official SDK clients without running a postinstall build", () => {
    expect(
      createAliyunCaptchaClient(config).verifyIntelligentCaptchaWithOptions,
    ).toBeTypeOf("function");
    expect(createAliyunSmsClient(config).sendSmsWithOptions).toBeTypeOf(
      "function",
    );
  });

  it("forwards the opaque CAPTCHA value unchanged with the fixed server scene", async () => {
    const fake = new FakeCaptchaClient({
      statusCode: 200,
      body: {
        success: true,
        code: "Success",
        requestId: "captcha-request",
        result: { verifyResult: true, verifyCode: "T005" },
      },
    });
    const verifier = new AliyunCaptchaVerifier(fake, config);

    await expect(
      verifier.verify({ captchaVerifyParam: "opaque==value" }),
    ).resolves.toEqual({
      outcome: "verified",
      providerRequestId: "captcha-request",
    });
    expect(fake.request).toMatchObject({
      captchaVerifyParam: "opaque==value",
      sceneId: "18hnihr4",
    });
    expect(fake.runtime).toMatchObject({
      autoretry: false,
      maxAttempts: 1,
      connectTimeout: 2500,
      readTimeout: 2500,
    });
  });

  it("rejects missing and replayed CAPTCHA evidence without an availability fallback", async () => {
    const missingClient = new FakeCaptchaClient({});
    await expect(
      new AliyunCaptchaVerifier(missingClient, config).verify({}),
    ).resolves.toEqual({ outcome: "rejected", reason: "MISSING" });
    expect(missingClient.calls).toBe(0);

    const replayClient = new FakeCaptchaClient({
      statusCode: 200,
      body: {
        success: true,
        requestId: "replay-request",
        result: { verifyResult: false, verifyCode: "F018" },
      },
    });
    await expect(
      new AliyunCaptchaVerifier(replayClient, config).verify({
        captchaVerifyParam: "replayed",
      }),
    ).resolves.toEqual({
      outcome: "rejected",
      reason: "REPLAYED",
      providerRequestId: "replay-request",
    });
  });

  it("separates CAPTCHA provider outage from permission/configuration failure", async () => {
    const outage = new FakeCaptchaClient(
      undefined,
      Object.assign(new Error("provider unavailable"), {
        code: "InternalError",
        requestId: "outage-request",
        statusCode: 500,
      }),
    );
    await expect(
      new AliyunCaptchaVerifier(outage, config).verify({
        captchaVerifyParam: "opaque",
      }),
    ).resolves.toEqual({
      outcome: "unavailable",
      reason: "PROVIDER_SERVER",
      providerRequestId: "outage-request",
    });

    const denied = new FakeCaptchaClient(
      undefined,
      Object.assign(new Error("denied"), {
        code: "Forbidden.RAMUserAccessDenied",
        requestId: "denied-request",
        statusCode: 403,
      }),
    );
    await expect(
      new AliyunCaptchaVerifier(denied, config).verify({
        captchaVerifyParam: "opaque",
      }),
    ).resolves.toEqual({
      outcome: "configuration_error",
      reason: "PERMISSION",
      providerRequestId: "denied-request",
    });

    const bodyOutage = new FakeCaptchaClient({
      statusCode: 200,
      body: {
        success: false,
        code: "InternalError",
        requestId: "body-outage-request",
      },
    });
    await expect(
      new AliyunCaptchaVerifier(bodyOutage, config).verify({
        captchaVerifyParam: "opaque",
      }),
    ).resolves.toEqual({
      outcome: "unavailable",
      reason: "PROVIDER_SERVER",
      providerRequestId: "body-outage-request",
    });
  });

  it("submits one no-retry SMS request with only the code template variable", async () => {
    const fake = new FakeSmsClient({
      statusCode: 200,
      body: { code: "OK", requestId: "sms-request", bizId: "receipt" },
    });
    const delivery = new AliyunSmsChallengeDelivery(fake, config);

    await expect(
      delivery.deliver({
        challengeId: "challenge",
        mobile: "+8613800138000",
        code: "042810",
        expiresAt: new Date("2026-09-20T00:00:00Z"),
      }),
    ).resolves.toEqual({
      outcome: "accepted",
      providerRequestId: "sms-request",
      providerReceiptId: "receipt",
    });
    expect(fake.request).toMatchObject({
      phoneNumbers: "+8613800138000",
      signName: "approved-sign",
      templateCode: "SMS_123456",
      templateParam: '{"code":"042810"}',
    });
    expect(fake.request?.outId).toBeUndefined();
    expect(fake.runtime).toMatchObject({
      autoretry: false,
      maxAttempts: 1,
      connectTimeout: 2500,
      readTimeout: 2500,
    });
    expect(fake.calls).toBe(1);
  });

  it("maps explicit SMS rejection without retry and transport timeout to unknown", async () => {
    const rejected = new FakeSmsClient({
      statusCode: 200,
      body: {
        code: "isv.SMS_SIGNATURE_ILLEGAL",
        requestId: "rejected-request",
      },
    });
    await expect(
      new AliyunSmsChallengeDelivery(rejected, config).deliver({
        challengeId: "challenge",
        mobile: "+8613800138000",
        code: "246810",
        expiresAt: new Date(),
      }),
    ).rejects.toMatchObject<Partial<ChallengeDeliveryRejectedError>>({
      reason: "SIGNATURE",
      providerRequestId: "rejected-request",
    });
    expect(rejected.calls).toBe(1);

    const timeout = new FakeSmsClient(
      undefined,
      Object.assign(new Error("connect ETIMEDOUT"), {
        code: "ETIMEDOUT",
      }),
    );
    await expect(
      new AliyunSmsChallengeDelivery(timeout, config).deliver({
        challengeId: "challenge",
        mobile: "+8613800138000",
        code: "246810",
        expiresAt: new Date(),
      }),
    ).resolves.toEqual({ outcome: "unknown" });
    expect(timeout.calls).toBe(1);

    const nestedNetworkFailure = new FakeSmsClient(
      undefined,
      Object.assign(new TypeError("fetch failed"), {
        cause: { code: "ECONNRESET" },
      }),
    );
    await expect(
      new AliyunSmsChallengeDelivery(nestedNetworkFailure, config).deliver({
        challengeId: "challenge",
        mobile: "+8613800138000",
        code: "246810",
        expiresAt: new Date(),
      }),
    ).resolves.toEqual({ outcome: "unknown" });
  });
});

class FakeCaptchaClient implements AliyunCaptchaClient {
  calls = 0;
  request?: VerifyIntelligentCaptchaRequest;
  runtime?: RuntimeOptions;

  constructor(
    private readonly response?: Partial<VerifyIntelligentCaptchaResponse>,
    private readonly error?: unknown,
  ) {}

  async verifyIntelligentCaptchaWithOptions(
    request: VerifyIntelligentCaptchaRequest,
    runtime: RuntimeOptions,
  ): Promise<VerifyIntelligentCaptchaResponse> {
    this.calls += 1;
    this.request = request;
    this.runtime = runtime;
    if (this.error) throw this.error;
    return this.response as VerifyIntelligentCaptchaResponse;
  }
}

class FakeSmsClient implements AliyunSmsClient {
  calls = 0;
  request?: SendSmsRequest;
  runtime?: RuntimeOptions;

  constructor(
    private readonly response?: Partial<SendSmsResponse>,
    private readonly error?: unknown,
  ) {}

  async sendSmsWithOptions(
    request: SendSmsRequest,
    runtime: RuntimeOptions,
  ): Promise<SendSmsResponse> {
    this.calls += 1;
    this.request = request;
    this.runtime = runtime;
    if (this.error) throw this.error;
    return this.response as SendSmsResponse;
  }
}
