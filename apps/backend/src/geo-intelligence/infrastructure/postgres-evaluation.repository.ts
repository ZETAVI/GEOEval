import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";

import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import type { EvaluationRepository } from "../domain/evaluation.repository.js";
import type {
  EvaluationBrandSnapshot,
  EvaluationDefinitionInput,
  EvaluationDefinitionView,
  EvaluationPlatformPolicy,
  EvaluationRunView,
  StartEvaluationOutcome,
} from "../domain/evaluation.types.js";

const definitionInclude = {
  questions: { orderBy: { ordinal: "asc" as const } },
  run: { include: { _count: { select: { samples: true } } } },
} as const;

@Injectable()
export class PostgresEvaluationRepository implements EvaluationRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findDefinition(input: {
    accountId: string;
    brandId: string;
    inputFingerprint: string;
  }): Promise<EvaluationDefinitionView | undefined> {
    const definition = await this.prisma.evaluationDefinition.findFirst({
      where: input,
      include: definitionInclude,
    });
    return definition ? mapDefinition(definition) : undefined;
  }

  async createDefinition(
    input: EvaluationDefinitionInput,
  ): Promise<EvaluationDefinitionView> {
    try {
      const definition = await this.prisma.evaluationDefinition.create({
        data: {
          accountId: input.accountId,
          brandId: input.brandId,
          inputFingerprint: input.inputFingerprint,
          brandSnapshot: input.brandSnapshot as Prisma.InputJsonValue,
          questionGeneratorId: input.questionGenerator.id,
          questionGeneratorVersion: input.questionGenerator.version,
          questionGeneratorHash: input.questionGenerator.contentHash,
          platformPolicy: input.platforms as Prisma.InputJsonValue,
          objectivityProfileId: input.objectivityProfile.id,
          objectivityProfileVersion: input.objectivityProfile.version,
          objectivityProfileHash: input.objectivityProfile.contentHash,
          questions: { create: input.questions },
        },
        include: definitionInclude,
      });
      return mapDefinition(definition);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await this.findDefinition({
        accountId: input.accountId,
        brandId: input.brandId,
        inputFingerprint: input.inputFingerprint,
      });
      if (!existing) throw error;
      return existing;
    }
  }

  async startRun(input: {
    accountId: string;
    definitionId: string;
  }): Promise<StartEvaluationOutcome> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const definition = await transaction.evaluationDefinition.findFirst({
          where: { id: input.definitionId, accountId: input.accountId },
          include: {
            questions: { orderBy: { ordinal: "asc" } },
            run: { include: { _count: { select: { samples: true } } } },
            brand: {
              select: { evaluationFingerprint: true, status: true },
            },
          },
        });
        if (!definition) return { kind: "NOT_FOUND" };
        if (definition.run) {
          return definition.run.status === "EVALUATING"
            ? { kind: "DUPLICATE", run: mapRun(definition.run) }
            : { kind: "ALREADY_USED" };
        }
        if (
          definition.brand.status !== "ACTIVE" ||
          definition.brand.evaluationFingerprint !== definition.inputFingerprint
        ) {
          return { kind: "STALE" };
        }
        const active = await transaction.evaluationRun.findFirst({
          where: { brandId: definition.brandId, status: "EVALUATING" },
          select: { id: true },
        });
        if (active) return { kind: "ACTIVE_OTHER" };

        const correlationId = randomUUID();
        const sampleInputs = definition.questions.flatMap((question) =>
          parsePlatforms(definition.platformPolicy).map((platform) => ({
            definitionId: definition.id,
            questionId: question.id,
            platformKey: platform.key,
            platformLabel: platform.label,
          })),
        );
        if (sampleInputs.length !== 20) {
          throw new Error(
            "Evaluation definition does not contain 20 positions",
          );
        }
        const run = await transaction.evaluationRun.create({
          data: {
            accountId: definition.accountId,
            brandId: definition.brandId,
            definitionId: definition.id,
            inputFingerprint: definition.inputFingerprint,
            correlationId,
          },
        });
        await transaction.evaluationSample.createMany({
          data: sampleInputs.map((sample) => ({ ...sample, runId: run.id })),
        });
        await transaction.productOutboxEvent.create({
          data: {
            businessKey: `evaluation-run:${run.id}:start`,
            aggregateType: "evaluation_run",
            aggregateId: run.id,
            eventType: "evaluation.run.started",
            payload: {
              runId: run.id,
              definitionId: definition.id,
              brandId: definition.brandId,
            },
            correlationId,
          },
        });
        const started = await transaction.evaluationRun.findUniqueOrThrow({
          where: { id: run.id },
          include: { _count: { select: { samples: true } } },
        });
        return { kind: "STARTED", run: mapRun(started) };
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await this.prisma.evaluationRun.findUnique({
        where: { definitionId: input.definitionId },
        include: { _count: { select: { samples: true } } },
      });
      if (existing?.accountId === input.accountId) {
        return existing.status === "EVALUATING"
          ? { kind: "DUPLICATE", run: mapRun(existing) }
          : { kind: "ALREADY_USED" };
      }
      const definition = await this.prisma.evaluationDefinition.findFirst({
        where: { id: input.definitionId, accountId: input.accountId },
      });
      if (!definition) return { kind: "NOT_FOUND" };
      return { kind: "ACTIVE_OTHER" };
    }
  }
}

const snapshotSchema = z.object({
  companyName: z.string(),
  primaryIndustry: z.string(),
  secondaryIndustry: z.string(),
  characteristicOne: z.string(),
  characteristicTwo: z.string(),
  province: z.string(),
  city: z.string(),
  district: z.string(),
});

const platformSchema = z.array(
  z.object({
    key: z.string(),
    label: z.string(),
    routePolicyId: z.string(),
    model: z.string(),
    searchMode: z.literal("AUTO"),
  }),
);

function parseSnapshot(value: Prisma.JsonValue): EvaluationBrandSnapshot {
  return snapshotSchema.parse(value);
}

function parsePlatforms(value: Prisma.JsonValue): EvaluationPlatformPolicy[] {
  return platformSchema.parse(value);
}

function mapDefinition(definition: {
  id: string;
  accountId: string;
  brandId: string;
  inputFingerprint: string;
  brandSnapshot: Prisma.JsonValue;
  questionGeneratorId: string;
  questionGeneratorVersion: string;
  questionGeneratorHash: string;
  platformPolicy: Prisma.JsonValue;
  objectivityProfileId: string;
  objectivityProfileVersion: string;
  objectivityProfileHash: string;
  createdAt: Date;
  questions: Array<{
    id: string;
    kind:
      | "BRAND_DIRECTED"
      | "INDUSTRY_RECOMMENDATION"
      | "CHARACTERISTIC_ONE"
      | "CHARACTERISTIC_TWO";
    ordinal: number;
    content: string;
  }>;
  run: {
    id: string;
    definitionId: string;
    brandId: string;
    status: "EVALUATING" | "COMPLETED" | "PLEASE_RETRY";
    correlationId: string;
    startedAt: Date;
    updatedAt: Date;
    _count: { samples: number };
  } | null;
}): EvaluationDefinitionView {
  return {
    id: definition.id,
    accountId: definition.accountId,
    brandId: definition.brandId,
    inputFingerprint: definition.inputFingerprint,
    brandSnapshot: parseSnapshot(definition.brandSnapshot),
    questionGenerator: {
      id: definition.questionGeneratorId,
      version: definition.questionGeneratorVersion,
      contentHash: definition.questionGeneratorHash,
    },
    objectivityProfile: {
      id: definition.objectivityProfileId,
      version: definition.objectivityProfileVersion,
      contentHash: definition.objectivityProfileHash,
    },
    platforms: parsePlatforms(definition.platformPolicy),
    questions: definition.questions,
    run: definition.run ? mapRun(definition.run) : null,
    createdAt: definition.createdAt,
  };
}

function mapRun(run: {
  id: string;
  definitionId: string;
  brandId: string;
  status: "EVALUATING" | "COMPLETED" | "PLEASE_RETRY";
  correlationId: string;
  startedAt: Date;
  updatedAt: Date;
  _count: { samples: number };
}): EvaluationRunView {
  return {
    id: run.id,
    definitionId: run.definitionId,
    brandId: run.brandId,
    status: run.status,
    expectedSampleCount: run._count.samples,
    correlationId: run.correlationId,
    startedAt: run.startedAt,
    updatedAt: run.updatedAt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
