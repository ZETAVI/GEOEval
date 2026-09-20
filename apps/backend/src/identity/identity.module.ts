import {
  Global,
  Module,
  type DynamicModule,
  type Provider,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import type { ApiConfig } from "../config/runtime-config.js";
import { AccessGuard } from "./access/access.guard.js";
import { CsrfGuard } from "./access/csrf.guard.js";
import { AccountGovernanceService } from "./application/account-governance.service.js";
import { AccountDirectoryService } from "./application/account-directory.service.js";
import { AuthenticationService } from "./application/authentication.service.js";
import { HumanVerificationPolicy } from "./application/human-verification.policy.js";
import { IDENTITY_CONFIG } from "./application/identity.config.js";
import { SessionService } from "./application/session.service.js";
import { CHALLENGE_CODE_GENERATOR } from "./domain/challenge-code-generator.port.js";
import { CHALLENGE_DELIVERY } from "./domain/challenge-delivery.port.js";
import { HUMAN_VERIFICATION } from "./domain/human-verification.port.js";
import { IDENTITY_REPOSITORY } from "./domain/identity.repository.js";
import {
  ALIYUN_CAPTCHA_CLIENT,
  ALIYUN_SMS_CLIENT,
  createAliyunCaptchaClient,
  createAliyunSmsClient,
} from "./infrastructure/aliyun-auth-clients.js";
import { AliyunCaptchaVerifier } from "./infrastructure/aliyun-captcha-verifier.js";
import { AliyunSmsChallengeDelivery } from "./infrastructure/aliyun-sms-challenge-delivery.js";
import { DeterministicChallengeCodeGenerator } from "./infrastructure/deterministic-challenge-code-generator.js";
import { DeterministicChallengeDelivery } from "./infrastructure/deterministic-challenge-delivery.js";
import { DisabledHumanVerification } from "./infrastructure/disabled-human-verification.js";
import { PostgresIdentityRepository } from "./infrastructure/postgres-identity.repository.js";
import { PostgresOperationsIdentityReader } from "./infrastructure/postgres-operations-identity-reader.js";
import { SecureChallengeCodeGenerator } from "./infrastructure/secure-challenge-code-generator.js";
import { AccountGovernanceController } from "./presentation/account-governance.controller.js";
import { IdentityController } from "./presentation/identity.controller.js";

@Global()
@Module({})
export class IdentityModule {
  static register(config: ApiConfig): DynamicModule {
    const humanVerificationProviders: Provider[] =
      config.authHumanVerificationMode === "aliyun"
        ? [
            {
              provide: ALIYUN_CAPTCHA_CLIENT,
              useFactory: () => createAliyunCaptchaClient(config),
            },
            AliyunCaptchaVerifier,
            {
              provide: HUMAN_VERIFICATION,
              useExisting: AliyunCaptchaVerifier,
            },
          ]
        : [
            DisabledHumanVerification,
            {
              provide: HUMAN_VERIFICATION,
              useExisting: DisabledHumanVerification,
            },
          ];
    const challengeProviders: Provider[] =
      config.authChallengeMode === "aliyun"
        ? [
            {
              provide: ALIYUN_SMS_CLIENT,
              useFactory: () => createAliyunSmsClient(config),
            },
            SecureChallengeCodeGenerator,
            {
              provide: CHALLENGE_CODE_GENERATOR,
              useExisting: SecureChallengeCodeGenerator,
            },
            AliyunSmsChallengeDelivery,
            {
              provide: CHALLENGE_DELIVERY,
              useExisting: AliyunSmsChallengeDelivery,
            },
          ]
        : [
            DeterministicChallengeCodeGenerator,
            {
              provide: CHALLENGE_CODE_GENERATOR,
              useExisting: DeterministicChallengeCodeGenerator,
            },
            DeterministicChallengeDelivery,
            {
              provide: CHALLENGE_DELIVERY,
              useExisting: DeterministicChallengeDelivery,
            },
          ];
    return {
      module: IdentityModule,
      global: true,
      controllers: [IdentityController, AccountGovernanceController],
      providers: [
        { provide: IDENTITY_CONFIG, useValue: config },
        PostgresIdentityRepository,
        {
          provide: IDENTITY_REPOSITORY,
          useExisting: PostgresIdentityRepository,
        },
        AuthenticationService,
        HumanVerificationPolicy,
        ...humanVerificationProviders,
        ...challengeProviders,
        SessionService,
        AccountGovernanceService,
        AccountDirectoryService,
        PostgresOperationsIdentityReader,
        CsrfGuard,
        AccessGuard,
        { provide: APP_GUARD, useExisting: CsrfGuard },
        { provide: APP_GUARD, useExisting: AccessGuard },
      ],
      exports: [AccountDirectoryService, PostgresOperationsIdentityReader],
    };
  }
}
