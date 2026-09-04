import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { randomBytes, randomUUID } from "node:crypto";

import type { ApiConfig } from "../../config/runtime-config.js";
import {
  CHALLENGE_DELIVERY,
  type ChallengeDeliveryPort,
} from "../domain/challenge-delivery.port.js";
import {
  challengeDigest,
  digestsMatch,
  sessionDigest,
} from "../domain/identity.crypto.js";
import { ChallengeRateLimitError } from "../domain/identity.errors.js";
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from "../domain/identity.repository.js";
import type { AccountView } from "../domain/identity.types.js";
import { InvalidMobileError, normalizeMobile } from "../domain/mobile.js";
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

@Injectable()
export class AuthenticationService {
  constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
    @Inject(IDENTITY_CONFIG) private readonly config: ApiConfig,
    @Inject(CHALLENGE_DELIVERY)
    private readonly delivery: ChallengeDeliveryPort,
  ) {}

  async requestChallenge(rawMobile: string): Promise<ChallengeDelivery> {
    const mobile = normalizeMobileForHttp(rawMobile);
    const id = randomUUID();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.config.authChallengePolicy.lifetimeMs,
    );
    const code = this.config.authDeterministicCode;
    try {
      await this.repository.issueChallenge({
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
      });
    } catch (error) {
      if (error instanceof ChallengeRateLimitError) {
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
    const delivery = await this.delivery.deliver({
      challengeId: id,
      mobile,
      code,
      expiresAt,
    });
    return {
      challengeId: id,
      expiresAt: expiresAt.toISOString(),
      ...delivery,
    };
  }

  async completeChallenge(input: {
    challengeId: string;
    mobile: string;
    code: string;
  }): Promise<SessionDelivery> {
    const mobile = normalizeMobileForHttp(input.mobile);
    if (typeof input.code !== "string" || !/^\d{6}$/.test(input.code)) {
      throw new BadRequestException("验证码格式不正确");
    }

    const challenge = await this.repository.findChallenge(input.challengeId);
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
      input.code,
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
    const completed = await this.repository.completeChallenge({
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
