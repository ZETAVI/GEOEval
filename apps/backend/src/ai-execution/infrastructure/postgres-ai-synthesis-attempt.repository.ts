import { Inject, Injectable } from "@nestjs/common";

import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import type { AiSynthesisAttemptRepository } from "../domain/ai-synthesis-attempt.repository.js";
import type {
  AiAdapterResult,
  StoredAiAttempt,
  SynthesisAiAttemptRequest,
} from "../domain/ai-attempt.types.js";

@Injectable()
export class PostgresAiSynthesisAttemptRepository implements AiSynthesisAttemptRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async begin(request: SynthesisAiAttemptRequest): Promise<StoredAiAttempt> {
    try {
      const attempt = await this.prisma.aiSynthesisAttempt.create({
        data: {
          runId: request.runId,
          cycleId: request.cycleId,
          attemptNumber: request.attemptNumber,
          routePolicyId: request.routePolicyId,
          providerKey: request.providerKey,
          requestedModel: request.requestedModel,
          requestPayload: request.input as Prisma.InputJsonValue,
          correlationId: request.correlationId,
        },
      });
      return mapAttempt(attempt);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const attempt = await this.prisma.aiSynthesisAttempt.findUniqueOrThrow({
        where: {
          cycleId_attemptNumber: {
            cycleId: request.cycleId,
            attemptNumber: request.attemptNumber,
          },
        },
      });
      return mapAttempt(attempt);
    }
  }

  async finish(
    attemptId: string,
    result: AiAdapterResult,
    latencyMs: number,
  ): Promise<StoredAiAttempt> {
    await this.prisma.aiSynthesisAttempt.updateMany({
      where: { id: attemptId, status: "STARTED" },
      data:
        result.kind === "SUCCEEDED"
          ? {
              status: "SUCCEEDED",
              responseEnvelope: result.output as Prisma.InputJsonValue,
              ...(result.usage
                ? { usage: result.usage as Prisma.InputJsonValue }
                : {}),
              latencyMs,
              finishedAt: new Date(),
              failureClass: null,
              retryable: null,
            }
          : {
              status: "FAILED",
              failureClass: result.failureClass,
              retryable: result.retryable,
              latencyMs,
              finishedAt: new Date(),
            },
    });
    return mapAttempt(
      await this.prisma.aiSynthesisAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      }),
    );
  }
}

function mapAttempt(attempt: {
  id: string;
  status: "STARTED" | "SUCCEEDED" | "FAILED";
  responseEnvelope: Prisma.JsonValue | null;
  failureClass: string | null;
  retryable: boolean | null;
}): StoredAiAttempt {
  return {
    id: attempt.id,
    status: attempt.status,
    responseEnvelope: isRecord(attempt.responseEnvelope)
      ? attempt.responseEnvelope
      : null,
    failureClass: attempt.failureClass,
    retryable: attempt.retryable,
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
