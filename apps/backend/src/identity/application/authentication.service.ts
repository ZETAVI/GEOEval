import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { randomBytes, randomUUID } from "node:crypto";

import type { ApiConfig } from "../../config/runtime-config.js";
import { SafeTelemetry } from "../../infrastructure/telemetry.js";
import {
  CHALLENGE_DELIVERY,
  ChallengeDeliveryRejectedError,
  type ChallengeDeliveryPort,
} from "../domain/challenge-delivery.port.js";
import {
  CHALLENGE_CODE_GENERATOR,
  type ChallengeCodeGenerator,
} from "../domain/challenge-code-generator.port.js";
import {
  challengeDigest,
  digestsMatch,
  sessionDigest,
} from "../domain/identity.crypto.js";
import {
  ChallengeBudgetLimitError,
  ChallengeRateLimitError,
  ExistingAccountRequiredError,
} from "../domain/identity.errors.js";
import {
  IDENTITY_REPOSITORY,
  type ChallengeBudgetUsage,
  type IdentityRepository,
} from "../domain/identity.repository.js";
import type { AccountView } from "../domain/identity.types.js";
import {
  HUMAN_VERIFICATION,
  type HumanVerificationPort,
} from "../domain/human-verification.port.js";
import { InvalidMobileError, normalizeMobile } from "../domain/mobile.js";
import { HumanVerificationPolicy } from "./human-verification.policy.js";
import { IDENTITY_CONFIG } from "./identity.config.js";

export type ChallengeDelivery = {
  challengeId: string;
  expiresAt: string;
  developmentCode?: string;
};

export type SessionDelivery = {
  account: AccountView;
  token: string;
  expiresAt: Date;
};

type ChallengeRequestObservation = {
  humanVerification: string;
  humanReason: string;
  humanProviderRequestId: string | undefined;
  delivery: string;
  deliveryReason: string;
  deliveryProviderRequestId: string | undefined;
  deliveryProviderReceiptId: string | undefined;
  budgetDayCount: number | undefined;
  budgetMonthCount: number | undefined;
};

@Injectable()
export class AuthenticationService {
  constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
    @Inject(IDENTITY_CONFIG) private readonly config: ApiConfig,
    @Inject(CHALLENGE_DELIVERY)
    private readonly delivery: ChallengeDeliveryPort,
    @Inject(HUMAN_VERIFICATION)
    private readonly humanVerification: HumanVerificationPort,
    @Inject(HumanVerificationPolicy)
    private readonly humanVerificationPolicy: HumanVerificationPolicy,
    @Inject(CHALLENGE_CODE_GENERATOR)
    private readonly challengeCodeGenerator: ChallengeCodeGenerator,
    @Optional()
    @Inject(SafeTelemetry)
    private readonly telemetry?: SafeTelemetry,
  ) {}

  async requestChallenge(
    rawMobile: string,
    acquisitionVisitToken?: string,
    existingAccountOnly = false,
    captchaVerifyParam?: string,
  ): Promise<ChallengeDelivery> {
    const id = randomUUID();
    const startedAt = Date.now();
    const observation = {
      humanVerification: "NOT_ATTEMPTED",
      humanReason: "NONE",
      delivery: "NOT_ATTEMPTED",
      deliveryReason: "NONE",
      humanProviderRequestId: undefined as string | undefined,
      deliveryProviderRequestId: undefined as string | undefined,
      deliveryProviderReceiptId: undefined as string | undefined,
      budgetDayCount: undefined as number | undefined,
      budgetMonthCount: undefined as number | undefined,
    };
    try {
      return await this.issueChallenge(
        id,
        observation,
        rawMobile,
        acquisitionVisitToken,
        existingAccountOnly,
        captchaVerifyParam,
      );
    } finally {
      if (this.telemetry) {
        await this.telemetry.export({
          name: "identity.challenge.request",
          correlationId: id,
          attributes: {
            humanProvider: this.config.authHumanVerificationMode.toUpperCase(),
            humanOutcome: observation.humanVerification,
            humanReason: observation.humanReason,
            deliveryProvider: this.config.authChallengeMode.toUpperCase(),
            deliveryOutcome: observation.delivery,
            deliveryReason: observation.deliveryReason,
            durationMs: String(Date.now() - startedAt),
            ...(observation.humanProviderRequestId
              ? {
                  humanProviderRequestId: observation.humanProviderRequestId,
                }
              : {}),
            ...(observation.deliveryProviderRequestId
              ? {
                  deliveryProviderRequestId:
                    observation.deliveryProviderRequestId,
                }
              : {}),
            ...(observation.deliveryProviderReceiptId
              ? {
                  deliveryProviderReceiptId:
                    observation.deliveryProviderReceiptId,
                }
              : {}),
            ...(observation.budgetDayCount !== undefined
              ? { budgetDayCount: String(observation.budgetDayCount) }
              : {}),
            ...(observation.budgetMonthCount !== undefined
              ? { budgetMonthCount: String(observation.budgetMonthCount) }
              : {}),
          },
        });
      }
    }
  }

  private async issueChallenge(
    id: string,
    observation: ChallengeRequestObservation,
    rawMobile: string,
    acquisitionVisitToken?: string,
    existingAccountOnly = false,
    captchaVerifyParam?: string,
  ): Promise<ChallengeDelivery> {
    if (typeof existingAccountOnly !== "boolean")
      throw new BadRequestException("登录请求格式不正确");
    if (
      acquisitionVisitToken !== undefined &&
      !this.config.agencyAcquisitionEnabled
    )
      throw new ServiceUnavailableException("入口服务尚未开放");
    if (!this.config.authChallengeSendingEnabled) {
      observation.delivery = "STOPPED";
      throw new ServiceUnavailableException({
        code: "CHALLENGE_SENDING_DISABLED",
        message: "暂时无法获取验证码，请稍后重试",
      });
    }
    const mobile = normalizeMobileForHttp(rawMobile);
    const budget = await this.repository.readChallengeBudget({
      now: new Date(),
      dailyMaximumRequests:
        this.config.authChallengePolicy.dailyMaximumRequests,
      monthlyMaximumRequests:
        this.config.authChallengePolicy.monthlyMaximumRequests,
    });
    if (!budget.available) {
      observation.delivery = "STOPPED";
      observation.deliveryReason = `BUDGET_${budget.exhaustedPeriod}`;
      throw challengeBudgetUnavailable();
    }
    const verification = await this.humanVerification.verify({
      ...(captchaVerifyParam !== undefined ? { captchaVerifyParam } : {}),
    });
    observation.humanReason =
      verification.outcome === "verified" ? "NONE" : verification.reason;
    observation.humanProviderRequestId = verification.providerRequestId;
    const verificationDecision =
      this.humanVerificationPolicy.decide(verification);
    if (verificationDecision.outcome === "deny") {
      observation.humanVerification =
        verificationDecision.reason === "REJECTED"
          ? "REJECTED"
          : verificationDecision.reason === "CONFIGURATION"
            ? "CONFIGURATION_ERROR"
            : "UNAVAILABLE_DENIED";
      if (
        verification.outcome === "rejected" &&
        ["MISSING", "INVALID"].includes(verification.reason)
      ) {
        throw new BadRequestException({
          code: "HUMAN_VERIFICATION_INVALID",
          message: "请重新完成人机验证",
        });
      }
      if (verificationDecision.reason === "REJECTED") {
        throw new HttpException(
          {
            code: "HUMAN_VERIFICATION_REJECTED",
            message: "请重新完成人机验证",
          },
          HttpStatus.FORBIDDEN,
        );
      }
      throw new ServiceUnavailableException({
        code: "HUMAN_VERIFICATION_UNAVAILABLE",
        message: "暂时无法获取验证码，请稍后重试",
      });
    }
    observation.humanVerification = verificationDecision.degraded
      ? "UNAVAILABLE_DEGRADED"
      : "VERIFIED";
    const now = new Date();
    const demoRoute = this.config.authDemoSmsForwarding;
    const recipientMobile =
      demoRoute &&
      now.getTime() < demoRoute.expiresAtMs &&
      demoRoute.sourceMobiles.includes(mobile)
        ? demoRoute.destinationMobile
        : undefined;
    const expiresAt = new Date(
      now.getTime() + this.config.authChallengePolicy.lifetimeMs,
    );
    const code = this.challengeCodeGenerator.generate();
    try {
      const usage = await this.repository.issueChallenge({
        existingAccountOnly:
          existingAccountOnly || recipientMobile !== undefined,
        ...(acquisitionVisitToken !== undefined
          ? { acquisitionVisitToken }
          : {}),
        id,
        mobile,
        codeDigest: challengeDigest(
          this.config.authHashPepper,
          id,
          mobile,
          code,
        ),
        expiresAt,
        now,
        resendIntervalMs: this.config.authChallengePolicy.resendIntervalMs,
        windowMs: this.config.authChallengePolicy.windowMs,
        maximumRequestsPerWindow:
          this.config.authChallengePolicy.maximumRequestsPerWindow,
        dailyMaximumRequests:
          this.config.authChallengePolicy.dailyMaximumRequests,
        monthlyMaximumRequests:
          this.config.authChallengePolicy.monthlyMaximumRequests,
      });
      observation.budgetDayCount = usage.dayCount;
      observation.budgetMonthCount = usage.monthCount;
      warnChallengeBudget(usage, this.config.authChallengePolicy);
    } catch (error) {
      if (error instanceof ChallengeBudgetLimitError) {
        observation.delivery = "STOPPED";
        observation.deliveryReason = `BUDGET_${error.period}`;
        throw challengeBudgetUnavailable();
      }
      if (error instanceof ChallengeRateLimitError) {
        observation.delivery = "RATE_LIMITED";
        observation.deliveryReason = "MOBILE";
        throw new HttpException(
          {
            code: "CHALLENGE_RATE_LIMITED",
            message: error.message,
            retryAfterSeconds: error.retryAfterSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw error;
    }
    const delivery = await this.delivery
      .deliver({
        challengeId: id,
        mobile,
        ...(recipientMobile ? { recipientMobile } : {}),
        code,
        expiresAt,
      })
      .catch((error: unknown) => {
        if (error instanceof ChallengeDeliveryRejectedError) {
          observation.delivery = "REJECTED";
          observation.deliveryReason = error.reason;
          observation.deliveryProviderRequestId = error.providerRequestId;
          throw new ServiceUnavailableException({
            code: "CHALLENGE_DELIVERY_UNAVAILABLE",
            message: "暂时无法发送验证码，请稍后重试",
          });
        }
        observation.delivery = "UNEXPECTED_FAILURE";
        throw error;
      });
    observation.delivery = delivery.outcome.toUpperCase();
    observation.deliveryProviderRequestId = delivery.providerRequestId;
    observation.deliveryProviderReceiptId = delivery.providerReceiptId;
    return {
      challengeId: id,
      expiresAt: expiresAt.toISOString(),
      ...(delivery.developmentCode
        ? { developmentCode: delivery.developmentCode }
        : {}),
    };
  }

  async completeChallenge(input: unknown): Promise<SessionDelivery> {
    const body = objectBody(input);
    const mobile = normalizeMobileForHttp(body.mobile);
    if (
      typeof body.challengeId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        body.challengeId,
      )
    ) {
      throw new BadRequestException("challengeId 格式不正确");
    }
    if (typeof body.code !== "string" || !/^\d{6}$/.test(body.code)) {
      throw new BadRequestException("验证码格式不正确");
    }

    const challenge = await this.repository.findChallenge(body.challengeId);
    const now = new Date();
    if (
      !challenge ||
      challenge.mobile !== mobile ||
      challenge.consumedAt ||
      challenge.supersededAt ||
      challenge.expiresAt <= now ||
      challenge.failedAttempts >=
        this.config.authChallengePolicy.maximumFailedAttempts
    ) {
      throw new UnauthorizedException("验证码无效或已过期，请重新获取");
    }

    const providedDigest = challengeDigest(
      this.config.authHashPepper,
      challenge.id,
      mobile,
      body.code,
    );
    if (!digestsMatch(challenge.codeDigest, providedDigest)) {
      await this.repository.incrementFailedAttempts({
        id: challenge.id,
        maximumFailedAttempts:
          this.config.authChallengePolicy.maximumFailedAttempts,
      });
      throw new UnauthorizedException("验证码不正确");
    }

    const token = randomBytes(32).toString("base64url");
    const completed = await this.repository
      .completeChallenge({
        challengeId: challenge.id,
        mobile,
        sessionDigest: sessionDigest(token),
        customerAbsoluteMs: this.config.authSessionPolicy.customerAbsoluteMs,
        customerIdleMs: this.config.authSessionPolicy.customerIdleMs,
        internalAbsoluteMs: this.config.authSessionPolicy.internalAbsoluteMs,
        internalIdleMs: this.config.authSessionPolicy.internalIdleMs,
        maximumFailedAttempts:
          this.config.authChallengePolicy.maximumFailedAttempts,
        now,
      })
      .catch((error: unknown) => {
        if (error instanceof ExistingAccountRequiredError)
          throw new BadRequestException({
            code: "ACCOUNT_NOT_REGISTERED",
            message: error.message,
          });
        throw error;
      });
    if (!completed) {
      throw new UnauthorizedException("验证码无效或账号不可用，请重新获取");
    }
    return {
      account: completed.account,
      token,
      expiresAt: completed.expiresAt,
    };
  }
}

function challengeBudgetUnavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    code: "CHALLENGE_BUDGET_EXHAUSTED",
    message: "暂时无法获取验证码，请稍后重试",
  });
}

function warnChallengeBudget(
  usage: ChallengeBudgetUsage,
  policy: ApiConfig["authChallengePolicy"],
): void {
  const dailyWarning = Math.ceil(policy.dailyMaximumRequests * 0.8);
  const monthlyWarning = Math.ceil(policy.monthlyMaximumRequests * 0.8);
  const periods = [
    ...(usage.dayCount === dailyWarning ? ["DAY"] : []),
    ...(usage.monthCount === monthlyWarning ? ["MONTH"] : []),
  ];
  if (periods.length === 0) return;
  process.stderr.write(
    `${JSON.stringify({
      level: "warn",
      kind: "identity_challenge_budget",
      periods,
      dayKey: usage.dayKey,
      dayCount: usage.dayCount,
      monthKey: usage.monthKey,
      monthCount: usage.monthCount,
    })}\n`,
  );
}

function objectBody(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null
    ? (input as Record<string, unknown>)
    : {};
}

function normalizeMobileForHttp(input: unknown): string {
  try {
    return normalizeMobile(input);
  } catch (error) {
    if (error instanceof InvalidMobileError) {
      throw new BadRequestException("请输入有效的手机号");
    }
    throw error;
  }
}
