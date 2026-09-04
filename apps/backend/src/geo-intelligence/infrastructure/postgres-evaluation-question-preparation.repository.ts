import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import { parseEvaluationBrandSnapshot } from "../domain/evaluation-brand-snapshot.js";
import { questionGenerationRequestedEvent } from "../domain/evaluation-question-preparation.events.js";
import type { EvaluationQuestionPreparationRepository } from "../domain/evaluation-question-preparation.repository.js";
import type {
  AcceptGeneratedEvaluationQuestionsInput,
  EnsureEvaluationQuestionPreparationOutcome,
  EvaluationQuestionPreparationContext,
  EvaluationQuestionPreparationFailure,
  EvaluationQuestionPreparationInput,
  EvaluationQuestionPreparationView,
  RetryEvaluationQuestionPreparationOutcome,
} from "../domain/evaluation-question-preparation.types.js";

const MAXIMUM_ATTEMPTS = 3;

@Injectable()
export class PostgresEvaluationQuestionPreparationRepository implements EvaluationQuestionPreparationRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async find(input: {
    accountId: string;
    brandId: string;
    inputFingerprint: string;
  }): Promise<EvaluationQuestionPreparationView | undefined> {
    const preparation =
      await this.prisma.evaluationQuestionPreparation.findFirst({
        where: input,
      });
    return preparation ? mapPreparation(preparation) : undefined;
  }

  async ensure(
    input: EvaluationQuestionPreparationInput,
  ): Promise<EnsureEvaluationQuestionPreparationOutcome> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const definition = await transaction.evaluationDefinition.findFirst({
          where: {
            accountId: input.accountId,
            brandId: input.brandId,
            inputFingerprint: input.inputFingerprint,
          },
          select: { id: true },
        });
        if (definition) return { kind: "DEFINITION_EXISTS" };

        const existing =
          await transaction.evaluationQuestionPreparation.findUnique({
            where: {
              brandId_inputFingerprint: {
                brandId: input.brandId,
                inputFingerprint: input.inputFingerprint,
              },
            },
          });
        if (existing) {
          if (existing.accountId !== input.accountId) {
            throw new Error("Question preparation ownership is inconsistent");
          }
          return { kind: "PREPARATION", preparation: mapPreparation(existing) };
        }

        const preparation =
          await transaction.evaluationQuestionPreparation.create({
            data: {
              accountId: input.accountId,
              brandId: input.brandId,
              inputFingerprint: input.inputFingerprint,
              brandSnapshot: input.brandSnapshot as Prisma.InputJsonValue,
              instructionId: input.instruction.id,
              instructionVersion: input.instruction.version,
              instructionHash: input.instruction.contentHash,
              instructionContent: input.instruction.content,
              outputContractVersion: input.outputContract.version,
              outputContractSchema: input.outputContract
                .jsonSchema as Prisma.InputJsonValue,
              correlationId: input.correlationId,
            },
          });
        await transaction.productOutboxEvent.create({
          data: questionGenerationRequestedEvent({
            preparationId: preparation.id,
            sequence: preparation.currentSequence,
            attemptNumber: 1,
            correlationId: preparation.correlationId,
          }),
        });
        return {
          kind: "PREPARATION",
          preparation: mapPreparation(preparation),
        };
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await this.find({
        accountId: input.accountId,
        brandId: input.brandId,
        inputFingerprint: input.inputFingerprint,
      });
      if (existing) return { kind: "PREPARATION", preparation: existing };
      const definition = await this.prisma.evaluationDefinition.findFirst({
        where: {
          accountId: input.accountId,
          brandId: input.brandId,
          inputFingerprint: input.inputFingerprint,
        },
        select: { id: true },
      });
      if (definition) return { kind: "DEFINITION_EXISTS" };
      throw error;
    }
  }

  async getContext(
    preparationId: string,
    sequence: number,
  ): Promise<EvaluationQuestionPreparationContext | undefined> {
    const preparation =
      await this.prisma.evaluationQuestionPreparation.findFirst({
        where: {
          id: preparationId,
          currentSequence: sequence,
          status: "PREPARING",
        },
      });
    if (!preparation) return undefined;
    if (!isRecord(preparation.outputContractSchema)) {
      throw new Error("Question preparation output contract is unreadable");
    }
    return {
      id: preparation.id,
      accountId: preparation.accountId,
      brandId: preparation.brandId,
      inputFingerprint: preparation.inputFingerprint,
      brandSnapshot: parseEvaluationBrandSnapshot(preparation.brandSnapshot),
      status: preparation.status,
      currentSequence: preparation.currentSequence,
      instruction: {
        id: preparation.instructionId,
        version: preparation.instructionVersion,
        contentHash: preparation.instructionHash,
        content: preparation.instructionContent,
      },
      outputContract: {
        version: preparation.outputContractVersion,
        jsonSchema: preparation.outputContractSchema,
      },
      correlationId: preparation.correlationId,
    };
  }

  async accept(input: AcceptGeneratedEvaluationQuestionsInput): Promise<void> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        const preparation =
          await transaction.evaluationQuestionPreparation.findFirst({
            where: {
              id: input.preparationId,
              currentSequence: input.sequence,
              status: "PREPARING",
            },
          });
        if (!preparation) return;
        const attempt = await transaction.aiQuestionGenerationAttempt.findFirst(
          {
            where: {
              id: input.attemptId,
              preparationId: preparation.id,
              sequence: input.sequence,
              status: "SUCCEEDED",
            },
            select: { id: true },
          },
        );
        if (!attempt) {
          throw new Error(
            "Accepted question set has no successful generation attempt",
          );
        }

        await transaction.evaluationDefinition.create({
          data: {
            accountId: preparation.accountId,
            brandId: preparation.brandId,
            inputFingerprint: preparation.inputFingerprint,
            brandSnapshot: preparation.brandSnapshot as Prisma.InputJsonValue,
            questionGeneratorId: preparation.instructionId,
            questionGeneratorVersion: preparation.instructionVersion,
            questionGeneratorHash: preparation.instructionHash,
            platformPolicy: input.platforms as Prisma.InputJsonValue,
            objectivityProfileId: input.objectivityProfile.id,
            objectivityProfileVersion: input.objectivityProfile.version,
            objectivityProfileHash: input.objectivityProfile.contentHash,
            objectivityProfileContent: input.objectivityProfile.content,
            questionPreparationId: preparation.id,
            acceptedQuestionGenerationAttemptId: attempt.id,
            questions: { create: input.questions },
          },
        });
        const transitioned =
          await transaction.evaluationQuestionPreparation.updateMany({
            where: {
              id: preparation.id,
              currentSequence: input.sequence,
              status: "PREPARING",
            },
            data: { status: "READY" },
          });
        if (transitioned.count !== 1) {
          throw new Error("Question preparation changed during acceptance");
        }
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const definition = await this.prisma.evaluationDefinition.findFirst({
        where: {
          questionPreparationId: input.preparationId,
          acceptedQuestionGenerationAttemptId: input.attemptId,
        },
        select: { id: true },
      });
      if (!definition) throw error;
      await this.prisma.evaluationQuestionPreparation.updateMany({
        where: { id: input.preparationId, status: "PREPARING" },
        data: { status: "READY" },
      });
    }
  }

  async scheduleRetry(
    input: EvaluationQuestionPreparationFailure,
  ): Promise<void> {
    const nextAttemptNumber = input.attemptNumber + 1;
    if (nextAttemptNumber > MAXIMUM_ATTEMPTS) {
      throw new Error("Question-generation retry exceeds the route policy");
    }
    await this.prisma.$transaction(async (transaction) => {
      const preparation =
        await transaction.evaluationQuestionPreparation.findFirst({
          where: {
            id: input.preparationId,
            currentSequence: input.sequence,
            status: "PREPARING",
          },
        });
      if (!preparation) return;
      await requireFailedAttempt(transaction, input);
      await transaction.productOutboxEvent.createMany({
        data: [
          questionGenerationRequestedEvent({
            preparationId: input.preparationId,
            sequence: input.sequence,
            attemptNumber: nextAttemptNumber,
            correlationId: input.correlationId,
          }),
        ],
        skipDuplicates: true,
      });
    });
  }

  async exhaust(input: EvaluationQuestionPreparationFailure): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await requireFailedAttempt(transaction, input);
      await transaction.evaluationQuestionPreparation.updateMany({
        where: {
          id: input.preparationId,
          currentSequence: input.sequence,
          status: "PREPARING",
        },
        data: { status: "PLEASE_RETRY" },
      });
    });
  }

  async retry(input: {
    accountId: string;
    preparationId: string;
  }): Promise<RetryEvaluationQuestionPreparationOutcome> {
    return this.prisma.$transaction(async (transaction) => {
      const preparation =
        await transaction.evaluationQuestionPreparation.findFirst({
          where: { id: input.preparationId, accountId: input.accountId },
        });
      if (!preparation) return { kind: "NOT_FOUND" };
      if (preparation.status === "PREPARING") {
        return { kind: "DUPLICATE", preparation: mapPreparation(preparation) };
      }
      if (preparation.status !== "PLEASE_RETRY") {
        return { kind: "NOT_RETRYABLE" };
      }

      const nextSequence = preparation.currentSequence + 1;
      const transitioned =
        await transaction.evaluationQuestionPreparation.updateMany({
          where: {
            id: preparation.id,
            accountId: input.accountId,
            status: "PLEASE_RETRY",
            currentSequence: preparation.currentSequence,
          },
          data: { status: "PREPARING", currentSequence: nextSequence },
        });
      const current =
        await transaction.evaluationQuestionPreparation.findUniqueOrThrow({
          where: { id: preparation.id },
        });
      if (transitioned.count === 0) {
        return current.status === "PREPARING"
          ? { kind: "DUPLICATE", preparation: mapPreparation(current) }
          : { kind: "NOT_RETRYABLE" };
      }
      await transaction.productOutboxEvent.create({
        data: questionGenerationRequestedEvent({
          preparationId: current.id,
          sequence: current.currentSequence,
          attemptNumber: 1,
          correlationId: current.correlationId,
        }),
      });
      return { kind: "STARTED", preparation: mapPreparation(current) };
    });
  }

  async reconcile(limit: number): Promise<number> {
    const preparations =
      await this.prisma.evaluationQuestionPreparation.findMany({
        where: { status: "PREPARING", definition: null },
        orderBy: { updatedAt: "asc" },
        take: limit,
        include: {
          attempts: {
            select: {
              id: true,
              sequence: true,
              attemptNumber: true,
              status: true,
              retryable: true,
              failureClass: true,
            },
          },
        },
      });
    let recovered = 0;
    for (const preparation of preparations) {
      const latest = preparation.attempts
        .filter((attempt) => attempt.sequence === preparation.currentSequence)
        .sort((left, right) => right.attemptNumber - left.attemptNumber)[0];
      if (
        latest?.status === "FAILED" &&
        (latest.retryable !== true || latest.attemptNumber >= MAXIMUM_ATTEMPTS)
      ) {
        await this.exhaust({
          preparationId: preparation.id,
          sequence: preparation.currentSequence,
          attemptId: latest.id,
          attemptNumber: latest.attemptNumber,
          failureClass: latest.failureClass ?? "QUESTION_GENERATION_FAILED",
          reason: "Question-generation route policy exhausted",
          correlationId: preparation.correlationId,
        });
        recovered += 1;
        continue;
      }
      const attemptNumber =
        latest?.status === "FAILED" && latest.retryable === true
          ? latest.attemptNumber + 1
          : (latest?.attemptNumber ?? 1);
      const result = await this.prisma.productOutboxEvent.createMany({
        data: [
          questionGenerationRequestedEvent({
            preparationId: preparation.id,
            sequence: preparation.currentSequence,
            attemptNumber,
            correlationId: preparation.correlationId,
          }),
        ],
        skipDuplicates: true,
      });
      recovered += result.count;
    }
    return recovered;
  }
}

async function requireFailedAttempt(
  transaction: Prisma.TransactionClient,
  input: EvaluationQuestionPreparationFailure,
): Promise<void> {
  const attempt = await transaction.aiQuestionGenerationAttempt.findFirst({
    where: {
      id: input.attemptId,
      preparationId: input.preparationId,
      sequence: input.sequence,
      attemptNumber: input.attemptNumber,
      status: "FAILED",
    },
    select: { id: true },
  });
  if (!attempt) {
    throw new Error("Question-generation failure has no failed attempt");
  }
}

function mapPreparation(preparation: {
  id: string;
  brandId: string;
  inputFingerprint: string;
  status: "PREPARING" | "READY" | "PLEASE_RETRY";
  currentSequence: number;
  updatedAt: Date;
}): EvaluationQuestionPreparationView {
  return {
    id: preparation.id,
    brandId: preparation.brandId,
    inputFingerprint: preparation.inputFingerprint,
    status: preparation.status,
    currentSequence: preparation.currentSequence,
    updatedAt: preparation.updatedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
