import CaptchaModule, {
  type VerifyIntelligentCaptchaRequest,
  type VerifyIntelligentCaptchaResponse,
} from "@alicloud/captcha20230305";
import SmsModule, {
  type SendSmsRequest,
  type SendSmsResponse,
} from "@alicloud/dysmsapi20170525";
import { $OpenApiUtil } from "@alicloud/openapi-core";
import { RuntimeOptions } from "@darabonba/typescript";

import type { ApiConfig } from "../../config/runtime-config.js";

export const ALIYUN_CAPTCHA_CLIENT = Symbol("ALIYUN_CAPTCHA_CLIENT");
export const ALIYUN_SMS_CLIENT = Symbol("ALIYUN_SMS_CLIENT");

export interface AliyunCaptchaClient {
  verifyIntelligentCaptchaWithOptions(
    request: VerifyIntelligentCaptchaRequest,
    runtime: RuntimeOptions,
  ): Promise<VerifyIntelligentCaptchaResponse>;
}

export interface AliyunSmsClient {
  sendSmsWithOptions(
    request: SendSmsRequest,
    runtime: RuntimeOptions,
  ): Promise<SendSmsResponse>;
}

export function createAliyunCaptchaClient(
  config: ApiConfig,
): AliyunCaptchaClient {
  const CaptchaClient =
    resolveAliyunClientConstructor<AliyunCaptchaClient>(CaptchaModule);
  return new CaptchaClient(
    aliyunConfig(config, config.authAliyun.captchaEndpoint, "cn-shanghai"),
  );
}

export function createAliyunSmsClient(config: ApiConfig): AliyunSmsClient {
  const SmsClient = resolveAliyunClientConstructor<AliyunSmsClient>(SmsModule);
  return new SmsClient(
    aliyunConfig(config, config.authAliyun.smsEndpoint, "cn-hangzhou"),
  );
}

export function aliyunRuntime(config: ApiConfig): RuntimeOptions {
  return new RuntimeOptions({
    autoretry: false,
    maxAttempts: 1,
    connectTimeout: config.authAliyun.requestTimeoutMs,
    readTimeout: config.authAliyun.requestTimeoutMs,
    keepAlive: true,
  });
}

function aliyunConfig(
  config: ApiConfig,
  endpoint: string,
  regionId: "cn-hangzhou" | "cn-shanghai",
): $OpenApiUtil.Config {
  return new $OpenApiUtil.Config({
    accessKeyId: config.authAliyun.accessKeyId,
    accessKeySecret: config.authAliyun.accessKeySecret,
    endpoint,
    protocol: "HTTPS",
    regionId,
    connectTimeout: config.authAliyun.requestTimeoutMs,
    readTimeout: config.authAliyun.requestTimeoutMs,
  });
}

type AliyunClientConstructor<T> = new (config: $OpenApiUtil.Config) => T;

function resolveAliyunClientConstructor<T>(
  moduleValue: unknown,
): AliyunClientConstructor<T> {
  if (typeof moduleValue === "function")
    return moduleValue as AliyunClientConstructor<T>;
  if (
    typeof moduleValue === "object" &&
    moduleValue !== null &&
    "default" in moduleValue &&
    typeof moduleValue.default === "function"
  ) {
    return moduleValue.default as AliyunClientConstructor<T>;
  }
  throw new Error("Alibaba Cloud SDK client export is unavailable");
}
