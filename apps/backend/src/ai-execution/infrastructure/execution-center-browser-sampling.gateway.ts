import type {
  ExecutionCenterWebStoredRequest,
  ExecutionCenterWebTaskSnapshot,
} from "../domain/execution-center-receipt.repository.js";
import {
  ExecutionCenterClient,
  ExecutionCenterClientError,
} from "./execution-center.client.js";

export const EXECUTION_CENTER_WEB_GATEWAY = Symbol(
  "EXECUTION_CENTER_WEB_GATEWAY",
);

/** Native execution.v1 gateway; legacy browser v1 transport remains separate. */
export interface ExecutionCenterWebGateway {
  submitBatch(input: {
    idempotencyKey: string;
    request: Record<string, unknown>;
  }): Promise<ExecutionCenterWebTaskSnapshot>;
  readBatch(taskId: string): Promise<ExecutionCenterWebTaskSnapshot>;
}

export class ExecutionCenterBrowserSamplingGateway implements ExecutionCenterWebGateway {
  constructor(private readonly client: ExecutionCenterClient | null) {}
  async submitBatch(input: {
    idempotencyKey: string;
    request: Record<string, unknown>;
  }) {
    if (!this.client)
      throw new ExecutionCenterClientError("CHANNEL_UNAVAILABLE");
    if (input.request.channel !== "web")
      throw new ExecutionCenterClientError("INVALID_REQUEST");
    return this.client.submitWeb(
      input.idempotencyKey,
      input.request as ExecutionCenterWebStoredRequest,
    );
  }
  async readBatch(taskId: string) {
    if (!this.client)
      throw new ExecutionCenterClientError("CHANNEL_UNAVAILABLE");
    return this.client.readWeb(taskId);
  }
}
