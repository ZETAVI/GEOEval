import {
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ExecutionCenterSamplingCoordinator } from "../application/execution-center-sampling.coordinator.js";
import type { EvaluationProcessRepository } from "../domain/evaluation-process.repository.js";

/** Timers only wake durable work; DB deadlines, not timers, are the authority. */
export class ExecutionCenterSamplingRuntime
  implements OnModuleInit, OnModuleDestroy
{
  private timers: Array<ReturnType<typeof setInterval>> = [];
  private stopped = true;
  private budget: Promise<unknown> | null = null;
  private web: Promise<unknown> | null = null;
  private controller = new AbortController();
  private readonly logger = new Logger(ExecutionCenterSamplingRuntime.name);
  constructor(
    private readonly repository: EvaluationProcessRepository,
    private readonly coordinator: ExecutionCenterSamplingCoordinator,
    private readonly options = { budgetIntervalMs: 250, webIntervalMs: 5_000 },
  ) {}
  onModuleInit() {
    if (!this.stopped) return;
    this.stopped = false;
    this.controller = new AbortController();
    const budgetTick = () => {
      if (this.stopped || this.budget) return;
      this.budget = this.repository
        .reconcileSamplingWindows(100)
        .catch(() => this.logger.warn("SAMPLING_BUDGET_RECONCILIATION_FAILED"))
        .finally(() => {
          this.budget = null;
        });
    };
    const webTick = () => {
      if (this.stopped || this.web) return;
      this.web = this.coordinator
        .reconcileWeb(100, this.controller.signal)
        .catch(() => this.logger.warn("SAMPLING_WEB_RECONCILIATION_FAILED"))
        .finally(() => {
          this.web = null;
        });
    };
    budgetTick();
    webTick();
    this.timers = [
      setInterval(budgetTick, this.options.budgetIntervalMs),
      setInterval(webTick, this.options.webIntervalMs),
    ];
    this.timers.forEach((timer) => timer.unref());
  }
  async onModuleDestroy() {
    this.stopped = true;
    this.controller.abort();
    this.timers.forEach(clearInterval);
    this.timers = [];
    let timeout: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      Promise.allSettled([this.budget, this.web].filter(Boolean)),
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, 2_000);
      }),
    ]);
    if (timeout) clearTimeout(timeout);
  }
}
