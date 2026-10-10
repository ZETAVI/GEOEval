import { Inject, Injectable } from "@nestjs/common";

import type { Prisma } from "../../generated/prisma/client.js";
import { sampleWorkRequestedEvent } from "../../geo-intelligence/domain/evaluation-process.events.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import type { SampleAiAttemptRequest } from "../domain/ai-attempt.types.js";
import {
  ExecutionCenterReceiptError,
  type ConsumeExecutionCenterEvent,
  type ConsumedExecutionCenterEvent,
  type ExecutionCenterAttemptIdentity,
  type ExecutionCenterEvent,
  type ExecutionCenterReceipt,
  type ExecutionCenterReceiptRepository,
  type ExecutionCenterSnapshot,
  type ExecutionCenterStoredRequest,
  type ExecutionCenterTaskSnapshot,
  type ReserveExecutionCenterReceipt,
} from "../domain/execution-center-receipt.repository.js";

const includeAttempt = {
  attempt: {
    select: {
      runId: true,
      cycleId: true,
      sampleId: true,
      purpose: true,
      attemptNumber: true,
      executionChannel: true,
      correlationId: true,
      routePolicyId: true,
      providerKey: true,
      requestedModel: true,
      requestPayload: true,
      executionDeadlineAt: true,
      startedAt: true,
    },
  },
} satisfies Prisma.ExecutionCenterReceiptInclude;
type ReceiptRow = Prisma.ExecutionCenterReceiptGetPayload<{
  include: typeof includeAttempt;
}>;
const TERMINAL_STATES = new Set([
  "RESULT_AVAILABLE",
  "FAILED",
  "OUTCOME_UNKNOWN",
  "CANCELLED",
]);
const TERMINAL_EVENTS = new Set([...TERMINAL_STATES, "LATE_RESULT_AVAILABLE"]);

@Injectable()
export class PostgresExecutionCenterReceiptRepository implements ExecutionCenterReceiptRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async reserve(
    input: ReserveExecutionCenterReceipt,
  ): Promise<ExecutionCenterReceipt> {
    validateReservation(input);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const existing = await transaction.executionCenterReceipt.findUnique({
          where: { attemptId: input.attemptId },
          include: includeAttempt,
        });
        if (existing) return assertSameReservation(existing, input);
        const attempt = await transaction.aiExecutionAttempt.findUnique({
          where: { id: input.attemptId },
          select: {
            executionTransport: true,
            executionChannel: true,
            status: true,
          },
        });
        if (
          !attempt ||
          attempt.executionTransport !== "EXECUTION_CENTER" ||
          attempt.executionChannel !== "API" ||
          attempt.status !== "STARTED"
        ) {
          throw new ExecutionCenterReceiptError("INVALID_RECEIPT_REQUEST");
        }
        const receipt = await transaction.executionCenterReceipt.create({
          data: {
            attemptId: input.attemptId,
            centerRef: input.centerRef,
            callerRequestRef: input.callerRequestRef,
            idempotencyKey: input.idempotencyKey,
            requestFingerprint: input.requestFingerprint,
            request: input.request as Prisma.InputJsonValue,
            deadlineAt: input.deadlineAt,
          },
          include: includeAttempt,
        });
        return mapReceipt(receipt);
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await this.prisma.executionCenterReceipt.findUnique({
        where: { attemptId: input.attemptId },
        include: includeAttempt,
      });
      if (existing) return assertSameReservation(existing, input);
      throw new ExecutionCenterReceiptError("RECEIPT_CONFLICT");
    }
  }

  async findByAttempt(
    attemptId: string,
  ): Promise<ExecutionCenterReceipt | null> {
    const receipt = await this.prisma.executionCenterReceipt.findUnique({
      where: { attemptId },
      include: includeAttempt,
    });
    return receipt ? mapReceipt(receipt) : null;
  }

  async findByRequest(
    identity: ExecutionCenterAttemptIdentity,
  ): Promise<ExecutionCenterReceipt | null> {
    const receipt = await this.prisma.executionCenterReceipt.findFirst({
      where: { attempt: { ...identity, executionChannel: "API" } },
      include: includeAttempt,
    });
    return receipt ? mapReceipt(receipt) : null;
  }

  async recordAccepted(
    receiptId: string,
    accepted: { taskId: string; itemId: string },
  ): Promise<ExecutionCenterReceipt> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const receipt = await lockReceipt(transaction, receiptId);
        return mapReceipt(await bindTask(transaction, receipt, accepted));
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      throw new ExecutionCenterReceiptError("EXECUTION_IDENTITY_MISMATCH");
    }
  }

  async readCursor(centerRef: string): Promise<number> {
    const cursor = await this.prisma.executionCenterCursor.findUnique({
      where: { centerRef },
    });
    return cursor ? Number(cursor.cursor) : 0;
  }

  async consumeEvent(
    input: ConsumeExecutionCenterEvent,
  ): Promise<ConsumedExecutionCenterEvent> {
    const event = safeEvent(input.event);
    if (!identifier(input.centerRef) || !cursor(input.expectedCursor, true)) {
      throw new ExecutionCenterReceiptError("INVALID_EXECUTION_EVENT");
    }
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const saved = await transaction.executionCenterInbox.findUnique({
          where: {
            centerRef_cursor: {
              centerRef: input.centerRef,
              cursor: BigInt(event.cursor),
            },
          },
        });
        if (saved)
          return duplicateResult(
            transaction,
            input.centerRef,
            event,
            saved.event,
          );
        if (event.cursor <= input.expectedCursor) {
          throw new ExecutionCenterReceiptError("CURSOR_CONFLICT");
        }
        await transaction.executionCenterCursor.createMany({
          data: [{ centerRef: input.centerRef }],
          skipDuplicates: true,
        });
        // Cursor is global on the producer, so gaps for this caller are legal.
        // CAS prevents a concurrent receiver from skipping an unseen event.
        const advanced = await transaction.executionCenterCursor.updateMany({
          where: {
            centerRef: input.centerRef,
            cursor: BigInt(input.expectedCursor),
          },
          data: { cursor: BigInt(event.cursor) },
        });
        if (advanced.count !== 1) {
          const concurrent = await transaction.executionCenterInbox.findUnique({
            where: {
              centerRef_cursor: {
                centerRef: input.centerRef,
                cursor: BigInt(event.cursor),
              },
            },
          });
          if (concurrent) {
            return duplicateResult(
              transaction,
              input.centerRef,
              event,
              concurrent.event,
            );
          }
          throw new ExecutionCenterReceiptError("CURSOR_CONFLICT");
        }
        let row = await transaction.executionCenterReceipt.findUnique({
          where: {
            centerRef_callerRequestRef: {
              centerRef: input.centerRef,
              callerRequestRef: event.callerRequestRef,
            },
          },
          include: includeAttempt,
        });
        let queuedResume = false;
        if (row) {
          row = await lockReceipt(transaction, row.id);
          if (event.channel !== "api") {
            throw new ExecutionCenterReceiptError(
              "EXECUTION_IDENTITY_MISMATCH",
            );
          }
          row = await bindTask(transaction, row, event);
          if (input.snapshot) {
            if (input.snapshot.channel !== "api")
              throw new ExecutionCenterReceiptError(
                "EXECUTION_IDENTITY_MISMATCH",
              );
            const captured = await captureSnapshot(
              transaction,
              row,
              input.snapshot,
            );
            row = captured.row;
            queuedResume = captured.queuedResume;
          } else if (TERMINAL_EVENTS.has(event.type) && row.state !== "READY") {
            // Advancing without a retrievable result would lose the completion.
            throw new ExecutionCenterReceiptError("TERMINAL_SNAPSHOT_REQUIRED");
          }
          if (TERMINAL_EVENTS.has(event.type) && row.state !== "READY") {
            throw new ExecutionCenterReceiptError("TERMINAL_SNAPSHOT_REQUIRED");
          }
        }
        const webBatchId =
          event.channel === "web"
            ? geoWebBatchId(event.callerRequestRef)
            : null;
        const webTerminal = webBatchId && TERMINAL_EVENTS.has(event.type);
        if (webTerminal) {
          assertWebTerminalSnapshot(event, input.snapshot);
          const metadata = input.snapshot!.metadata;
          const correlationId =
            record(metadata) && uuid(metadata.correlationId)
              ? metadata.correlationId
              : webBatchId;
          const resume = await transaction.productOutboxEvent.createMany({
            data: [
              {
                businessKey: `execution-web-result:${input.centerRef}:${event.cursor}`,
                aggregateType: "execution_web_notification",
                aggregateId: webBatchId,
                eventType: "evaluation.browser.result.received",
                payload: { centerRef: input.centerRef, cursor: event.cursor },
                correlationId,
              },
            ],
            skipDuplicates: true,
          });
          queuedResume = resume.count === 1;
        }
        await transaction.executionCenterInbox.create({
          data: {
            centerRef: input.centerRef,
            cursor: BigInt(event.cursor),
            event: event as unknown as Prisma.InputJsonValue,
            ...(webTerminal
              ? { snapshot: input.snapshot as Prisma.InputJsonValue }
              : {}),
          },
        });
        return {
          cursor: event.cursor,
          duplicate: false,
          queuedResume,
          receipt: row ? mapReceipt(row) : null,
        };
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      throw new ExecutionCenterReceiptError("EXECUTION_IDENTITY_MISMATCH");
    }
  }

  async readNotification(
    centerRef: string,
    sequence: number,
  ): Promise<{
    event: ExecutionCenterEvent;
    snapshot: ExecutionCenterTaskSnapshot | null;
  } | null> {
    if (!identifier(centerRef) || !cursor(sequence, false))
      throw new ExecutionCenterReceiptError("INVALID_EXECUTION_EVENT");
    const row = await this.prisma.executionCenterInbox.findUnique({
      where: { centerRef_cursor: { centerRef, cursor: BigInt(sequence) } },
    });
    return row
      ? {
          event: safeEvent(row.event as unknown as ExecutionCenterEvent),
          snapshot: row.snapshot as ExecutionCenterTaskSnapshot | null,
        }
      : null;
  }

  async recordSnapshot(
    receiptId: string,
    snapshot: ExecutionCenterSnapshot,
  ): Promise<ExecutionCenterReceipt> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const receipt = await lockReceipt(transaction, receiptId);
        return mapReceipt(
          (await captureSnapshot(transaction, receipt, snapshot)).row,
        );
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      throw new ExecutionCenterReceiptError("EXECUTION_IDENTITY_MISMATCH");
    }
  }

  async listReconciliationCandidates(input: {
    limit: number;
    afterId?: string;
  }): Promise<ExecutionCenterReceipt[]> {
    if (
      !Number.isSafeInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > 1_000
    ) {
      throw new ExecutionCenterReceiptError("INVALID_RECEIPT_REQUEST");
    }
    const rows = await this.prisma.executionCenterReceipt.findMany({
      where: {
        OR: [
          { state: { in: ["RESERVING", "WAITING"] } },
          { state: "READY", attempt: { purpose: "EVALUATION_ACQUISITION" } },
        ],
        attempt: {
          status: "STARTED",
          executionTransport: "EXECUTION_CENTER",
          executionChannel: "API",
        },
        ...(input.afterId ? { id: { gt: input.afterId } } : {}),
      },
      orderBy: { id: "asc" },
      take: input.limit,
      include: includeAttempt,
    });
    return rows.map(mapReceipt);
  }
}

async function lockReceipt(
  transaction: Prisma.TransactionClient,
  receiptId: string,
): Promise<ReceiptRow> {
  await transaction.$queryRaw`
    SELECT id FROM execution_center_receipts WHERE id = ${receiptId}::uuid FOR UPDATE
  `;
  const receipt = await transaction.executionCenterReceipt.findUnique({
    where: { id: receiptId },
    include: includeAttempt,
  });
  if (!receipt) throw new ExecutionCenterReceiptError("RECEIPT_NOT_FOUND");
  return receipt;
}

async function bindTask(
  transaction: Prisma.TransactionClient,
  receipt: ReceiptRow,
  accepted: { taskId: string; itemId: string },
): Promise<ReceiptRow> {
  const expectedItemId = mapReceipt(receipt).request.items[0]!.itemId;
  if (
    !identifier(accepted.taskId) ||
    accepted.itemId !== expectedItemId ||
    (receipt.taskId !== null && receipt.taskId !== accepted.taskId) ||
    (receipt.itemId !== null && receipt.itemId !== accepted.itemId)
  ) {
    throw new ExecutionCenterReceiptError("EXECUTION_IDENTITY_MISMATCH");
  }
  return transaction.executionCenterReceipt.update({
    where: { id: receipt.id },
    data: {
      taskId: accepted.taskId,
      itemId: accepted.itemId,
      ...(receipt.state === "RESERVING" ? { state: "WAITING" } : {}),
    },
    include: includeAttempt,
  });
}

async function captureSnapshot(
  transaction: Prisma.TransactionClient,
  receipt: ReceiptRow,
  snapshot: ExecutionCenterSnapshot,
): Promise<{ row: ReceiptRow; queuedResume: boolean }> {
  const request = mapReceipt(receipt).request;
  if (
    !record(snapshot) ||
    snapshot.contractVersion !== "execution.v1" ||
    snapshot.channel !== "api" ||
    snapshot.callerRequestRef !== receipt.callerRequestRef ||
    snapshot.deadlineAt !== receipt.deadlineAt.getTime() ||
    !Array.isArray(snapshot.items) ||
    snapshot.items.length !== 1 ||
    !record(snapshot.items[0]) ||
    snapshot.items[0].itemId !== request.items[0]!.itemId ||
    typeof snapshot.items[0].state !== "string"
  ) {
    throw new ExecutionCenterReceiptError("EXECUTION_IDENTITY_MISMATCH");
  }
  const bound = await bindTask(transaction, receipt, {
    taskId: snapshot.taskId,
    itemId: snapshot.items[0].itemId,
  });
  // First terminal snapshot is immutable, including UNKNOWN with a late body.
  if (
    bound.state === "READY" ||
    !TERMINAL_STATES.has(snapshot.items[0].state)
  ) {
    return { row: bound, queuedResume: false };
  }
  if (snapshot.items[0].state === "RESULT_AVAILABLE") {
    const result = snapshot.items[0].result;
    if (
      !record(result) ||
      result.kind !== "api" ||
      result.transportStatus !== "RESPONSE_RECEIVED" ||
      !Number.isInteger(result.httpStatus) ||
      (result.httpStatus as number) < 100 ||
      (result.httpStatus as number) > 599 ||
      !["utf8", "base64"].includes(result.bodyEncoding as string) ||
      typeof result.rawBody !== "string" ||
      !record(result.safeHeaders)
    ) {
      throw new ExecutionCenterReceiptError("EXECUTION_IDENTITY_MISMATCH");
    }
  }
  const row = await transaction.executionCenterReceipt.update({
    where: { id: bound.id },
    data: {
      state: "READY",
      snapshot: snapshot as Prisma.InputJsonValue,
      readyAt: new Date(),
    },
    include: includeAttempt,
  });
  const event = sampleWorkRequestedEvent(row.attempt);
  const resume = await transaction.productOutboxEvent.createMany({
    data: [{ ...event, businessKey: `execution-result:${row.attemptId}` }],
    skipDuplicates: true,
  });
  return { row, queuedResume: resume.count === 1 };
}

async function duplicateResult(
  transaction: Prisma.TransactionClient,
  centerRef: string,
  event: ExecutionCenterEvent,
  saved: Prisma.JsonValue,
): Promise<ConsumedExecutionCenterEvent> {
  if (JSON.stringify(saved) !== JSON.stringify(event)) {
    // JSONB key order is not meaningful; compare the safe projection instead.
    if (
      !record(saved) ||
      JSON.stringify(safeEvent(saved as unknown as ExecutionCenterEvent)) !==
        JSON.stringify(event)
    ) {
      throw new ExecutionCenterReceiptError("INVALID_EXECUTION_EVENT");
    }
  }
  const current = await transaction.executionCenterCursor.findUniqueOrThrow({
    where: { centerRef },
  });
  const receipt = await transaction.executionCenterReceipt.findUnique({
    where: {
      centerRef_callerRequestRef: {
        centerRef,
        callerRequestRef: event.callerRequestRef,
      },
    },
    include: includeAttempt,
  });
  return {
    cursor: Number(current.cursor),
    duplicate: true,
    queuedResume: false,
    receipt: receipt ? mapReceipt(receipt) : null,
  };
}

function safeEvent(event: ExecutionCenterEvent): ExecutionCenterEvent {
  if (
    !record(event) ||
    !cursor(event.cursor, false) ||
    (event.seq !== undefined && event.seq !== event.cursor) ||
    !identifier(event.taskId) ||
    !identifier(event.itemId) ||
    !identifier(event.callerRequestRef) ||
    !["api", "web"].includes(event.channel) ||
    !/^[A-Z][A-Z0-9_]{0,63}$/.test(event.type) ||
    !cursor(event.at, true)
  ) {
    throw new ExecutionCenterReceiptError("INVALID_EXECUTION_EVENT");
  }
  const safe: ExecutionCenterEvent = {
    cursor: event.cursor,
    seq: event.cursor,
    taskId: event.taskId,
    itemId: event.itemId,
    callerRequestRef: event.callerRequestRef,
    channel: event.channel,
    type: event.type,
    at: event.at,
  };
  for (const field of ["physicalAttemptId", "stage", "code"] as const) {
    const value = event[field];
    if (value !== undefined) {
      if (!identifier(value)) {
        throw new ExecutionCenterReceiptError("INVALID_EXECUTION_EVENT");
      }
      safe[field] = value;
    }
  }
  for (const field of ["contentChars", "receivedBytes"] as const) {
    const value = event[field];
    if (value !== undefined) {
      if (!cursor(value, true)) {
        throw new ExecutionCenterReceiptError("INVALID_EXECUTION_EVENT");
      }
      safe[field] = value;
    }
  }
  return safe;
}

function validateReservation(input: ReserveExecutionCenterReceipt): void {
  if (
    !identifier(input.centerRef) ||
    !identifier(input.callerRequestRef) ||
    !identifier(input.idempotencyKey) ||
    !/^[a-f0-9]{64}$/.test(input.requestFingerprint) ||
    !(input.deadlineAt instanceof Date) ||
    !Number.isSafeInteger(input.deadlineAt.getTime()) ||
    !record(input.request) ||
    input.request.contractVersion !== "execution.v1" ||
    input.request.channel !== "api" ||
    input.request.callerRequestRef !== input.callerRequestRef ||
    input.request.deadlineAt !== input.deadlineAt.getTime() ||
    !Array.isArray(input.request.items) ||
    input.request.items.length !== 1 ||
    !identifier(input.request.items[0]?.itemId)
  ) {
    throw new ExecutionCenterReceiptError("INVALID_RECEIPT_REQUEST");
  }
}

function assertSameReservation(
  row: ReceiptRow,
  input: ReserveExecutionCenterReceipt,
): ExecutionCenterReceipt {
  if (
    row.centerRef !== input.centerRef ||
    row.callerRequestRef !== input.callerRequestRef ||
    row.idempotencyKey !== input.idempotencyKey ||
    row.requestFingerprint !== input.requestFingerprint ||
    row.deadlineAt.getTime() !== input.deadlineAt.getTime()
  ) {
    throw new ExecutionCenterReceiptError("RECEIPT_CONFLICT");
  }
  return mapReceipt(row);
}

function mapReceipt(row: ReceiptRow): ExecutionCenterReceipt {
  return {
    id: row.id,
    attemptId: row.attemptId,
    centerRef: row.centerRef,
    callerRequestRef: row.callerRequestRef,
    idempotencyKey: row.idempotencyKey,
    requestFingerprint: row.requestFingerprint,
    request: row.request as ExecutionCenterStoredRequest,
    deadlineAt: row.deadlineAt,
    taskId: row.taskId,
    itemId: row.itemId,
    state: row.state,
    snapshot: row.snapshot as ExecutionCenterSnapshot | null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    readyAt: row.readyAt,
    originalAttempt: {
      providerKey: row.attempt.providerKey,
      startedAt: row.attempt.startedAt,
      request: {
        runId: row.attempt.runId,
        cycleId: row.attempt.cycleId,
        sampleId: row.attempt.sampleId,
        purpose: row.attempt.purpose,
        attemptNumber: row.attempt.attemptNumber,
        executionChannel: "API",
        ...(row.attempt.executionDeadlineAt
          ? { deadlineAt: row.attempt.executionDeadlineAt.getTime() }
          : {}),
        routePolicyId: row.attempt.routePolicyId,
        requestedModel: row.attempt.requestedModel,
        correlationId: row.attempt.correlationId,
        input: row.attempt.requestPayload,
      } as SampleAiAttemptRequest,
    },
    business: {
      runId: row.attempt.runId,
      cycleId: row.attempt.cycleId,
      sampleId: row.attempt.sampleId,
      purpose: row.attempt.purpose,
      attemptNumber: row.attempt.attemptNumber,
      correlationId: row.attempt.correlationId,
      executionChannel: "API",
    },
  };
}

function uuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
function geoWebBatchId(value: string): string | null {
  const suffix = value.startsWith("geo:web:")
    ? value.slice("geo:web:".length)
    : "";
  return uuid(suffix) ? suffix : null;
}
function assertWebTerminalSnapshot(
  event: ExecutionCenterEvent,
  snapshot: ExecutionCenterTaskSnapshot | undefined,
): void {
  if (
    !snapshot ||
    snapshot.channel !== "web" ||
    snapshot.contractVersion !== "execution.v1" ||
    snapshot.taskId !== event.taskId ||
    snapshot.callerRequestRef !== event.callerRequestRef ||
    !Array.isArray(snapshot.items) ||
    snapshot.items.length < 1 ||
    snapshot.items.length > 4 ||
    new Set(snapshot.items.map((item) => item.itemId)).size !==
      snapshot.items.length ||
    !snapshot.items.some(
      (item) => item.itemId === event.itemId && TERMINAL_STATES.has(item.state),
    )
  ) {
    throw new ExecutionCenterReceiptError("TERMINAL_SNAPSHOT_REQUIRED");
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function identifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,127}$/.test(value)
  );
}
function cursor(value: unknown, allowZero: boolean): value is number {
  return (
    Number.isSafeInteger(value) && (value as number) >= (allowZero ? 0 : 1)
  );
}
function isUniqueViolation(error: unknown): boolean {
  return record(error) && error.code === "P2002";
}
