import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";
import { Queue, Worker, type Job } from "bullmq";

import {
  PRODUCT_OUTBOX_REPOSITORY,
  type ProductOutboxRepository,
} from "./domain/product-outbox.repository.js";
import { ProductWorkProcessor } from "./application/product-work.processor.js";
import { bullmqConnectionOptions } from "./bullmq-connection.js";

export const PRODUCT_REDIS_URL = Symbol("PRODUCT_REDIS_URL");
const PRODUCT_QUEUE_NAME = "geoeval-product";
const RECONCILIATION_SCHEDULER_ID = "evaluation-reconciliation-v1";

type ProductJobData =
  { kind: "OUTBOX"; outboxEventId: string } | { kind: "RECONCILE" };

@Injectable()
export class ProductWorkerRuntime
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private queue?: Queue<ProductJobData>;
  private worker?: Worker<ProductJobData>;
  private relayTimer?: NodeJS.Timeout;
  private relayInFlight: Promise<number> | undefined;

  constructor(
    @Inject(PRODUCT_OUTBOX_REPOSITORY)
    private readonly outbox: ProductOutboxRepository,
    @Inject(ProductWorkProcessor)
    private readonly processor: ProductWorkProcessor,
    @Inject(PRODUCT_REDIS_URL) private readonly redisUrl: string,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const connection = bullmqConnectionOptions(this.redisUrl);
    this.queue = new Queue<ProductJobData>(PRODUCT_QUEUE_NAME, { connection });
    this.worker = new Worker<ProductJobData>(
      PRODUCT_QUEUE_NAME,
      (job: Job<ProductJobData>) => this.process(job.data),
      {
        connection,
        concurrency: 5,
        maxStalledCount: 2,
        stalledInterval: 30_000,
      },
    );
    this.worker.on("error", (error) => this.writeError("queue_error", error));
    this.worker.on("failed", (job, error) =>
      this.writeError("job_failed", error, job?.id),
    );
    await this.queue.upsertJobScheduler(
      RECONCILIATION_SCHEDULER_ID,
      { every: 5_000 },
      {
        name: "reconcile-evaluation-work",
        data: { kind: "RECONCILE" },
        opts: {
          attempts: 5,
          backoff: { type: "exponential", delay: 500, jitter: 0.5 },
          removeOnComplete: { count: 20 },
          removeOnFail: { count: 100 },
        },
      },
    );
    await this.runRelay();
    this.relayTimer = setInterval(() => {
      void this.runRelay().catch((error: unknown) =>
        this.writeError("product_outbox_relay_error", error),
      );
    }, 500);
  }

  async relayOnce(): Promise<number> {
    if (!this.queue) return 0;
    const events = await this.outbox.findDeliverable(100);
    for (const event of events) {
      await this.queue.add(
        "apply-product-event",
        { kind: "OUTBOX", outboxEventId: event.id },
        {
          jobId: `product-outbox-${event.id}`,
          attempts: 5,
          backoff: { type: "exponential", delay: 250, jitter: 0.5 },
          removeOnComplete: { count: 1_000 },
          removeOnFail: { count: 5_000 },
        },
      );
      if (event.status === "PENDING") {
        await this.outbox.markDispatched(event.id);
      }
    }
    return events.length;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.relayTimer) clearInterval(this.relayTimer);
    await this.relayInFlight?.catch(() => undefined);
    await this.worker?.close();
    await this.queue?.close();
  }

  private runRelay(): Promise<number> {
    if (this.relayInFlight) return this.relayInFlight;
    const operation = this.relayOnce().finally(() => {
      if (this.relayInFlight === operation) this.relayInFlight = undefined;
    });
    this.relayInFlight = operation;
    return operation;
  }

  private process(data: ProductJobData): Promise<void | number> {
    return data.kind === "OUTBOX"
      ? this.processor.apply(data.outboxEventId)
      : this.processor.reconcile();
  }

  private writeError(kind: string, error: unknown, jobId?: string): void {
    process.stderr.write(
      `${JSON.stringify({
        level: "error",
        process: "product-worker",
        kind,
        jobId,
        message: error instanceof Error ? error.message : "unknown error",
      })}\n`,
    );
  }
}
