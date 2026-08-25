import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";

import {
  FOUNDATION_REPOSITORY,
  type FoundationRepository,
} from "./foundation/foundation.repository.js";
import {
  WorkProcessor,
  type FoundationJobData,
} from "./foundation/work-processor.js";

export const REDIS_URL = Symbol("REDIS_URL");
const queueName = "geoeval-foundation";

function connectionOptions(redisUrl: string): ConnectionOptions {
  const parsed = new URL(redisUrl);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    ...(parsed.password ? { password: parsed.password } : {}),
    ...(parsed.pathname.length > 1
      ? { db: Number(parsed.pathname.slice(1)) }
      : {}),
  };
}

@Injectable()
export class FoundationWorkerRuntime
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private queue?: Queue<FoundationJobData>;
  private worker?: Worker<FoundationJobData>;
  private relayTimer?: NodeJS.Timeout;

  constructor(
    @Inject(FOUNDATION_REPOSITORY)
    private readonly repository: FoundationRepository,
    private readonly processor: WorkProcessor,
    @Inject(REDIS_URL) private readonly redisUrl: string,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const connection = connectionOptions(this.redisUrl);
    this.queue = new Queue<FoundationJobData>(queueName, { connection });
    this.worker = new Worker<FoundationJobData>(
      queueName,
      (job: Job<FoundationJobData>) => this.processor.apply(job.data),
      { connection, concurrency: 2 },
    );
    this.worker.on("error", (error) => {
      process.stderr.write(
        `${JSON.stringify({
          level: "error",
          process: "worker",
          kind: "queue_error",
          message: error.message,
        })}\n`,
      );
    });

    await this.relayOnce();
    this.relayTimer = setInterval(() => {
      void this.relayOnce().catch((error: unknown) => {
        process.stderr.write(
          `${JSON.stringify({
            level: "error",
            process: "worker",
            kind: "outbox_relay_error",
            message: error instanceof Error ? error.message : "unknown error",
          })}\n`,
        );
      });
    }, 500);
  }

  async relayOnce(): Promise<number> {
    if (!this.queue) {
      return 0;
    }

    const events = await this.repository.findDeliverableOutbox(25);

    for (const event of events) {
      const businessKey = `foundation:${event.id}`;
      await this.queue.add(
        "apply-foundation-effect",
        {
          outboxEventId: event.id,
          recordId: event.recordId,
          businessKey,
          correlationId: event.correlationId,
        },
        {
          jobId: `outbox-${event.id}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      if (event.status === "PENDING") {
        await this.repository.markOutboxDispatched(event.id);
      }
    }

    return events.length;
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.relayTimer) {
      clearInterval(this.relayTimer);
    }
    await this.worker?.close();
    await this.queue?.close();
  }
}
