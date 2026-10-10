export const EXECUTION_CENTER_RECEIPT_REPOSITORY = Symbol(
  "EXECUTION_CENTER_RECEIPT_REPOSITORY",
);

export type ExecutionCenterAttemptIdentity = {
  cycleId: string;
  sampleId: string;
  purpose: "EVALUATION_ACQUISITION" | "EVALUATION_INTERPRETATION";
  attemptNumber: number;
};

export type ExecutionCenterStoredRequest = Record<string, unknown> & {
  contractVersion: "execution.v1";
  callerRequestRef: string;
  channel: "api";
  deadlineAt: number;
  items: Array<{ itemId: string }>;
};

export type ExecutionCenterSnapshot = Record<string, unknown> & {
  taskId: string;
  callerRequestRef: string;
  contractVersion: "execution.v1";
  channel: "api";
  deadlineAt: number;
  items: Array<
    Record<string, unknown> & {
      itemId: string;
      state: string;
      result?: Record<string, unknown>;
      error?: Record<string, unknown>;
    }
  >;
};

/** Safe execution.v1 notification only. Complete native output is in snapshot. */
export type ExecutionCenterEvent = {
  cursor: number;
  seq?: number;
  taskId: string;
  itemId: string;
  callerRequestRef: string;
  channel: "api" | "web";
  type: string;
  at: number;
  physicalAttemptId?: string;
  stage?: string;
  code?: string;
  contentChars?: number;
  receivedBytes?: number;
};

export type ExecutionCenterReceipt = {
  id: string;
  attemptId: string;
  centerRef: string;
  callerRequestRef: string;
  idempotencyKey: string;
  requestFingerprint: string;
  request: ExecutionCenterStoredRequest;
  deadlineAt: Date;
  taskId: string | null;
  itemId: string | null;
  state: "RESERVING" | "WAITING" | "READY";
  snapshot: ExecutionCenterSnapshot | null;
  createdAt: Date;
  updatedAt: Date;
  readyAt: Date | null;
  business: ExecutionCenterAttemptIdentity & {
    runId: string;
    correlationId: string;
  };
};

export type ReserveExecutionCenterReceipt = {
  attemptId: string;
  centerRef: string;
  callerRequestRef: string;
  idempotencyKey: string;
  requestFingerprint: string;
  request: ExecutionCenterStoredRequest;
  deadlineAt: Date;
};

export type ConsumeExecutionCenterEvent = {
  centerRef: string;
  expectedCursor: number;
  event: ExecutionCenterEvent;
  snapshot?: ExecutionCenterSnapshot;
};

export type ConsumedExecutionCenterEvent = {
  cursor: number;
  duplicate: boolean;
  queuedResume: boolean;
  receipt: ExecutionCenterReceipt | null;
};

export class ExecutionCenterReceiptError extends Error {
  constructor(
    readonly code:
      | "RECEIPT_CONFLICT"
      | "RECEIPT_NOT_FOUND"
      | "INVALID_RECEIPT_REQUEST"
      | "INVALID_EXECUTION_EVENT"
      | "EXECUTION_IDENTITY_MISMATCH"
      | "TERMINAL_SNAPSHOT_REQUIRED"
      | "CURSOR_CONFLICT",
  ) {
    // Deliberately never include native requests, responses, or identifiers.
    super(code);
  }
}

/** Owns durable correlation and transactional recovery, not model interpretation. */
export interface ExecutionCenterReceiptRepository {
  reserve(
    input: ReserveExecutionCenterReceipt,
  ): Promise<ExecutionCenterReceipt>;
  findByAttempt(attemptId: string): Promise<ExecutionCenterReceipt | null>;
  findByRequest(
    identity: ExecutionCenterAttemptIdentity,
  ): Promise<ExecutionCenterReceipt | null>;
  recordAccepted(
    receiptId: string,
    accepted: { taskId: string; itemId: string },
  ): Promise<ExecutionCenterReceipt>;
  readCursor(centerRef: string): Promise<number>;
  consumeEvent(
    input: ConsumeExecutionCenterEvent,
  ): Promise<ConsumedExecutionCenterEvent>;
  recordSnapshot(
    receiptId: string,
    snapshot: ExecutionCenterSnapshot,
  ): Promise<ExecutionCenterReceipt>;
  /** Stable keyset paging: a hundred old waits cannot hide later candidates. */
  listReconciliationCandidates(input: {
    limit: number;
    afterId?: string;
  }): Promise<ExecutionCenterReceipt[]>;
}
