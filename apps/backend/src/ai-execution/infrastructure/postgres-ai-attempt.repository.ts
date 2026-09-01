import { Inject, Injectable } from "@nestjs/common";

import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import type { AiAttemptRepository } from "../domain/ai-attempt.repository.js";
import {
  appendSemanticRejection,
  buildAttemptEnvelope,
  type AiSemanticRejection,
} from "../domain/ai-attempt.envelope.js";
import type {
  AiAdapterResult,
  BegunAiAttempt,
  ResolvedSampleAiAttemptRequest,
  StoredAiAttempt,
} from "../domain/ai-attempt.types.js";

@Injectable()
export class PostgresAiAttemptRepository implements AiAttemptRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async begin(
    request: ResolvedSampleAiAttemptRequest,
    ambiguityTimeoutMs: number,
  ): Promise<BegunAiAttempt> {
    try {
      const attempt = await this.prisma.aiExecutionAttempt.create({
        data: {
          runId: request.runId,
          cycleId: request.cycleId,
          sampleId: request.sampleId,
          purpose: request.purpose,
          attemptNumber: request.attemptNumber,
          routePolicyId: request.routePolicyId,
          providerKey: request.providerKey,
          requestedModel: request.requestedModel,
          requestPayload: request.input as Prisma.InputJsonValue,
          correlationId: request.correlationId,
        },
      });
      return { kind: "ACQUIRED", attempt: mapAttempt(attempt) };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const attempt = await this.prisma.aiExecutionAttempt.findUniqueOrThrow({
        where: {
          cycleId_sampleId_purpose_attemptNumber: {
            cycleId: request.cycleId,
            sampleId: request.sampleId,
            purpose: request.purpose,
            attemptNumber: request.attemptNumber,
          },
        },
      });
      return this.resolveExisting(
        mapAttempt(attempt),
        request,
        ambiguityTimeoutMs,
      );
    }
  }

  async finish(
    attemptId: string,
    result: AiAdapterResult,
    latencyMs: number,
  ): Promise<StoredAiAttempt> {
    await this.prisma.aiExecutionAttempt.updateMany({
      where: { id: attemptId, status: "STARTED" },
      data:
        result.kind === "SUCCEEDED"
          ? {
              status: "SUCCEEDED",
              responseEnvelope: buildAttemptEnvelope(
                result,
              ) as Prisma.InputJsonValue,
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
              responseEnvelope: buildAttemptEnvelope(
                result,
              ) as Prisma.InputJsonValue,
              failureClass: result.failureClass,
              retryable: result.retryable,
              ...(result.usage
                ? { usage: result.usage as Prisma.InputJsonValue }
                : {}),
              latencyMs,
              finishedAt: new Date(),
            },
    });
    const attempt = await this.prisma.aiExecutionAttempt.findUniqueOrThrow({
      where: { id: attemptId },
    });
    return mapAttempt(attempt);
  }

  async rejectSemantics(
    attemptId: string,
    rejection: AiSemanticRejection,
  ): Promise<StoredAiAttempt> {
    const current = await this.prisma.aiExecutionAttempt.findUniqueOrThrow({
      where: { id: attemptId },
    });
    if (current.status === "SUCCEEDED") {
      if (!isRecord(current.responseEnvelope)) {
        throw new Error("Succeeded AI attempt has no readable envelope");
      }
      await this.prisma.aiExecutionAttempt.updateMany({
        where: { id: attemptId, status: "SUCCEEDED" },
        data: {
          status: "FAILED",
          failureClass: rejection.failureClass,
          retryable: true,
          responseEnvelope: appendSemanticRejection(
            current.responseEnvelope,
            rejection,
          ) as Prisma.InputJsonValue,
        },
      });
    }
    return mapAttempt(
      await this.prisma.aiExecutionAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      }),
    );
  }

  private async resolveExisting(
    attempt: StoredAiAttempt,
    request: ResolvedSampleAiAttemptRequest,
    ambiguityTimeoutMs: number,
  ): Promise<BegunAiAttempt> {
    if (attempt.status !== "STARTED") {
      return { kind: "TERMINAL", attempt };
    }
    const now = new Date();
    const resumeAt = new Date(attempt.startedAt.getTime() + ambiguityTimeoutMs);
    if (resumeAt.getTime() > now.getTime()) {
      return { kind: "DEFERRED", attempt, resumeAt };
    }
    await this.prisma.aiExecutionAttempt.updateMany({
      where: {
        id: attempt.id,
        status: "STARTED",
        startedAt: { lte: new Date(now.getTime() - ambiguityTimeoutMs) },
      },
      data: {
        status: "FAILED",
        failureClass: "AMBIGUOUS_INTERRUPTION",
        retryable: true,
        finishedAt: now,
        latencyMs: Math.max(0, now.getTime() - attempt.startedAt.getTime()),
        responseEnvelope: buildAttemptEnvelope({
          kind: "FAILED",
          failureClass: "AMBIGUOUS_INTERRUPTION",
          retryable: true,
          evidence: {
            providerKey: request.providerKey,
            serviceClass: request.serviceClass,
            protocol: request.protocol,
            failure: { kind: "AMBIGUOUS_INTERRUPTION" },
          },
        }) as Prisma.InputJsonValue,
      },
    });
    const resolved = mapAttempt(
      await this.prisma.aiExecutionAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
      }),
    );
    if (resolved.status === "STARTED") {
      return {
        kind: "DEFERRED",
        attempt: resolved,
        resumeAt: new Date(resolved.startedAt.getTime() + ambiguityTimeoutMs),
      };
    }
    return { kind: "TERMINAL", attempt: resolved };
  }
}

function mapAttempt(attempt: {
  id: string;
  status: "STARTED" | "SUCCEEDED" | "FAILED";
  responseEnvelope: Prisma.JsonValue | null;
  failureClass: string | null;
  retryable: boolean | null;
  startedAt: Date;
}): StoredAiAttempt {
  return {
    id: attempt.id,
    status: attempt.status,
    responseEnvelope: isRecord(attempt.responseEnvelope)
      ? attempt.responseEnvelope
      : null,
    failureClass: attempt.failureClass,
    retryable: attempt.retryable,
    startedAt: attempt.startedAt,
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
