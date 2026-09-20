import { Inject, Injectable } from "@nestjs/common";
import { VerifyIntelligentCaptchaRequest } from "@alicloud/captcha20230305";

import type { ApiConfig } from "../../config/runtime-config.js";
import { IDENTITY_CONFIG } from "../application/identity.config.js";
import type {
  HumanVerificationPort,
  HumanVerificationRejection,
  HumanVerificationResult,
} from "../domain/human-verification.port.js";
import {
  ALIYUN_CAPTCHA_CLIENT,
  type AliyunCaptchaClient,
  aliyunRuntime,
} from "./aliyun-auth-clients.js";
import {
  aliyunErrorView,
  isAliyunInvocationUnavailable,
} from "./aliyun-error.js";

@Injectable()
export class AliyunCaptchaVerifier implements HumanVerificationPort {
  constructor(
    @Inject(ALIYUN_CAPTCHA_CLIENT)
    private readonly client: AliyunCaptchaClient,
    @Inject(IDENTITY_CONFIG) private readonly config: ApiConfig,
  ) {}

  async verify(input: {
    captchaVerifyParam?: string;
  }): Promise<HumanVerificationResult> {
    if (input.captchaVerifyParam === undefined)
      return { outcome: "rejected", reason: "MISSING" };
    if (
      input.captchaVerifyParam.length < 1 ||
      input.captchaVerifyParam.length > 8192
    )
      return { outcome: "rejected", reason: "INVALID" };

    try {
      const response = await this.client.verifyIntelligentCaptchaWithOptions(
        new VerifyIntelligentCaptchaRequest({
          captchaVerifyParam: input.captchaVerifyParam,
          sceneId: this.config.authAliyun.captchaSceneId,
        }),
        aliyunRuntime(this.config),
      );
      const body = response.body;
      if (!body) {
        return { outcome: "unavailable", reason: "PROVIDER_SERVER" };
      }
      if (body.success === true && body.result?.verifyResult === true) {
        return {
          outcome: "verified",
          ...(body.requestId ? { providerRequestId: body.requestId } : {}),
        };
      }
      if (body.success === true && body.result?.verifyResult === false) {
        return {
          outcome: "rejected",
          reason: rejectionFor(body.result.verifyCode),
          ...(body.requestId ? { providerRequestId: body.requestId } : {}),
        };
      }
      return responseFailure(response.statusCode, body.code, body.requestId);
    } catch (error) {
      const details = aliyunErrorView(error);
      if (isAliyunInvocationUnavailable(details)) {
        return {
          outcome: "unavailable",
          reason: /timeout|timedout|etimedout/i.test(
            `${details.code ?? ""} ${details.name ?? ""} ${details.message ?? ""}`,
          )
            ? "TIMEOUT"
            : details.statusCode !== undefined && details.statusCode >= 500
              ? "PROVIDER_SERVER"
              : "NETWORK",
          ...(details.requestId
            ? { providerRequestId: details.requestId }
            : {}),
        };
      }
      return {
        outcome: "configuration_error",
        reason: configurationErrorFor(details.statusCode, details.code),
        ...(details.requestId ? { providerRequestId: details.requestId } : {}),
      };
    }
  }
}

function responseFailure(
  statusCode?: number,
  code?: string,
  requestId?: string,
): HumanVerificationResult {
  if (statusCode !== undefined && statusCode >= 500) {
    return {
      outcome: "unavailable",
      reason: "PROVIDER_SERVER",
      ...(requestId ? { providerRequestId: requestId } : {}),
    };
  }
  if (code === "MissingParameter" || code === "InvalidParameter") {
    return {
      outcome: "rejected",
      reason: "INVALID",
      ...(requestId ? { providerRequestId: requestId } : {}),
    };
  }
  return {
    outcome: "configuration_error",
    reason: configurationErrorFor(statusCode, code),
    ...(requestId ? { providerRequestId: requestId } : {}),
  };
}

function rejectionFor(verifyCode?: string): HumanVerificationRejection {
  if (verifyCode === "F002" || verifyCode === "F003" || verifyCode === "F013")
    return "INVALID";
  if (verifyCode === "F008" || verifyCode === "F018") return "REPLAYED";
  if (verifyCode === "F012" || verifyCode === "F020") return "SCENE_MISMATCH";
  return "RISK_REJECTED";
}

function configurationErrorFor(
  statusCode?: number,
  code?: string,
): "CREDENTIAL" | "PERMISSION" | "ACCOUNT" | "REQUEST" {
  const signal = code ?? "";
  if (/accesskey|signaturedoesnotmatch|securitytoken|credential/i.test(signal))
    return "CREDENTIAL";
  if (
    statusCode === 403 ||
    /forbidden|ramuseraccessdenied|accessdenied/i.test(signal)
  )
    return "PERMISSION";
  if (/account|arrears|overdue/i.test(signal)) return "ACCOUNT";
  return "REQUEST";
}
