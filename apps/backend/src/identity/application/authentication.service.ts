import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { randomBytes, randomUUID } from "node:crypto";

import type { ApiConfig } from "../../config/runtime-config.js";
import {
  challengeDigest,
  digestsMatch,
  sessionDigest,
} from "../domain/identity.crypto.js";
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from "../domain/identity.repository.js";
import type { AccountView } from "../domain/identity.types.js";
import { IDENTITY_CONFIG } from "./identity.config.js";

const challengeLifetimeMs = 5 * 60 * 1000;
const maximumFailedAttempts = 5;

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
  ) {}

  async requestChallenge(rawMobile: string): Promise<ChallengeDelivery> {
    const mobile = normalizeMobile(rawMobile);
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + challengeLifetimeMs);
    const code = this.config.authDeterministicCode;
    await this.repository.createChallenge({
      id,
      mobile,
      codeDigest: challengeDigest(this.config.authHashPepper, id, mobile, code),
      expiresAt,
    });
    return {
      challengeId: id,
      expiresAt: expiresAt.toISOString(),
      ...(this.config.runtimeEnvironment === "production"
        ? {}
        : { developmentCode: code }),
    };
  }

  async completeChallenge(input: {
    challengeId: string;
    mobile: string;
    code: string;
  }): Promise<SessionDelivery> {
    const mobile = normalizeMobile(input.mobile);
    if (typeof input.code !== "string" || !/^\d{6}$/.test(input.code)) {
      throw new BadRequestException("验证码格式不正确");
    }

    const challenge = await this.repository.findChallenge(input.challengeId);
    const now = new Date();
    if (
      !challenge ||
      challenge.mobile !== mobile ||
      challenge.consumedAt ||
      challenge.expiresAt <= now ||
      challenge.failedAttempts >= maximumFailedAttempts
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
      await this.repository.incrementFailedAttempts(challenge.id);
      throw new UnauthorizedException("验证码不正确");
    }

    const token = randomBytes(32).toString("base64url");
    const completed = await this.repository.completeChallenge({
      challengeId: challenge.id,
      mobile,
      sessionDigest: sessionDigest(token),
      ...this.config.authSessionPolicy,
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

export function normalizeMobile(input: string): string {
  if (typeof input !== "string") {
    throw new BadRequestException("请输入有效的手机号");
  }
  const compact = input.trim().replace(/[\s()-]/g, "");
  if (/^1\d{10}$/.test(compact)) return `+86${compact}`;
  if (/^\+\d{8,15}$/.test(compact)) return compact;
  throw new BadRequestException("请输入有效的手机号");
}
