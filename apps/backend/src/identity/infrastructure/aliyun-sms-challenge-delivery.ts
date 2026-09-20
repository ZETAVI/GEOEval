import { Inject, Injectable } from "@nestjs/common";
import { SendSmsRequest } from "@alicloud/dysmsapi20170525";

import type { ApiConfig } from "../../config/runtime-config.js";
import { IDENTITY_CONFIG } from "../application/identity.config.js";
import {
  ChallengeDeliveryRejectedError,
  type ChallengeDeliveryPort,
  type ChallengeDeliveryRejection,
  type ChallengeDeliveryResult,
} from "../domain/challenge-delivery.port.js";
import {
  ALIYUN_SMS_CLIENT,
  type AliyunSmsClient,
  aliyunRuntime,
} from "./aliyun-auth-clients.js";
import {
  aliyunErrorView,
  isAliyunInvocationUnavailable,
} from "./aliyun-error.js";

@Injectable()
export class AliyunSmsChallengeDelivery implements ChallengeDeliveryPort {
  constructor(
    @Inject(ALIYUN_SMS_CLIENT) private readonly client: AliyunSmsClient,
    @Inject(IDENTITY_CONFIG) private readonly config: ApiConfig,
  ) {}

  async deliver(input: {
    challengeId: string;
    mobile: string;
    code: string;
    expiresAt: Date;
  }): Promise<ChallengeDeliveryResult> {
    try {
      const response = await this.client.sendSmsWithOptions(
        new SendSmsRequest({
          phoneNumbers: input.mobile,
          signName: this.config.authAliyun.smsSignName,
          templateCode: this.config.authAliyun.smsTemplateCode,
          templateParam: JSON.stringify({ code: input.code }),
        }),
        aliyunRuntime(this.config),
      );
      if (response.body?.code === "OK")
        return {
          outcome: "accepted",
          ...(response.body.requestId
            ? { providerRequestId: response.body.requestId }
            : {}),
          ...(response.body.bizId
            ? { providerReceiptId: response.body.bizId }
            : {}),
        };
      if (response.statusCode !== undefined && response.statusCode >= 500) {
        return {
          outcome: "unknown",
          ...(response.body?.requestId
            ? { providerRequestId: response.body.requestId }
            : {}),
        };
      }
      throw new ChallengeDeliveryRejectedError(
        rejectionFor(response.body?.code),
        response.body?.requestId,
      );
    } catch (error) {
      if (error instanceof ChallengeDeliveryRejectedError) throw error;
      const details = aliyunErrorView(error);
      if (isAliyunInvocationUnavailable(details)) {
        return {
          outcome: "unknown",
          ...(details.requestId
            ? { providerRequestId: details.requestId }
            : {}),
        };
      }
      throw new ChallengeDeliveryRejectedError(
        rejectionFor(details.code),
        details.requestId,
      );
    }
  }
}

function rejectionFor(code?: string): ChallengeDeliveryRejection {
  const signal = code ?? "";
  if (/accesskey|signaturedoesnotmatch|securitytoken|credential/i.test(signal))
    return "CREDENTIAL";
  if (/forbidden|ram|accessdenied/i.test(signal)) return "PERMISSION";
  if (/qualification/i.test(signal)) return "QUALIFICATION";
  if (/sms[_\s.-]*signature|signname/i.test(signal)) return "SIGNATURE";
  if (/template/i.test(signal)) return "TEMPLATE";
  if (/amount|balance|notenough|arrears|overdue/i.test(signal))
    return "BALANCE";
  if (/limit|throttl|quota|rate/i.test(signal)) return "RATE_LIMIT";
  return "PROVIDER_REJECTED";
}
