import {
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";
import type { ExecutionCenterReceiptRepository } from "../domain/execution-center-receipt.repository.js";
import type { DelegatedParserExecutionService } from "../application/delegated-parser-execution.service.js";
import type { ExecutionCenterClient } from "./execution-center.client.js";

@Injectable()
export class ExecutionCenterEventRuntime
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly controller = new AbortController();
  private running?: Promise<void>;
  private reconciliation?: Promise<void>;
  constructor(
    private readonly receipts: ExecutionCenterReceiptRepository,
    private readonly client: ExecutionCenterClient | null,
    private readonly parser: DelegatedParserExecutionService,
    private readonly centerRef: string | undefined,
  ) {}
  onApplicationBootstrap(): void {
    if (this.client && this.centerRef) this.running = this.run();
    // Local READY facts can still close when new transport/credentials are disabled.
    this.reconciliation = this.reconcile();
  }
  async onModuleDestroy(): Promise<void> {
    this.controller.abort();
    await this.running;
    await this.reconciliation;
  }
  private async run(): Promise<void> {
    const client = this.client!;
    const centerRef = this.centerRef!;
    while (!this.controller.signal.aborted) {
      try {
        let cursor = await this.receipts.readCursor(centerRef);
        await client.events(
          cursor,
          async (event) => {
            const ownedChannel =
              event.channel === "api" ||
              /^geo:web:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                event.callerRequestRef,
              );
            const snapshot =
              ownedChannel &&
              [
                "RESULT_AVAILABLE",
                "FAILED",
                "OUTCOME_UNKNOWN",
                "CANCELLED",
                "LATE_RESULT_AVAILABLE",
              ].includes(event.type)
                ? await client.readTask(event.taskId)
                : undefined;
            const committed = await this.receipts.consumeEvent({
              centerRef,
              expectedCursor: cursor,
              event,
              ...(snapshot ? { snapshot } : {}),
            });
            cursor = committed.cursor;
            if (committed.receipt)
              await this.parser.consumeReadyAcquisition(committed.receipt);
          },
          this.controller.signal,
        );
      } catch {
        // No raw payload or credentials are logged. The durable cursor is the recovery authority.
      }
      if (!this.controller.signal.aborted)
        await pause(500, this.controller.signal);
    }
  }
  private async reconcile(): Promise<void> {
    while (!this.controller.signal.aborted) {
      try {
        await this.parser.reconcile(this.controller.signal);
      } catch {
        /* durable receipts remain */
      }
      if (!this.controller.signal.aborted)
        await pause(5000, this.controller.signal);
    }
  }
}
function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
    if (signal.aborted) finish();
  });
}
