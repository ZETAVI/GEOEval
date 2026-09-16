import {
  Inject,
  Injectable,
  type OnModuleInit,
  type OnApplicationShutdown,
  Logger,
} from "@nestjs/common";
import { FinalOrderSettlementService } from "./final-order-settlement.service.js";
export const ORDER_SETTLEMENT_ENABLED = Symbol("ORDER_SETTLEMENT_ENABLED");
@Injectable()
export class OrderSettlementRuntime
  implements OnModuleInit, OnApplicationShutdown
{
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | undefined;
  private stopped = false;
  private cursor: string | null = null;
  private readonly logger = new Logger(OrderSettlementRuntime.name);
  constructor(
    @Inject(FinalOrderSettlementService)
    private readonly service: FinalOrderSettlementService,
    @Inject(ORDER_SETTLEMENT_ENABLED) private readonly enabled: boolean,
  ) {}
  onModuleInit() {
    if (this.enabled) this.schedule(0);
  }
  private schedule(ms: number) {
    if (!this.stopped)
      this.timer = setTimeout(() => {
        this.running = this.batch().finally(() => {
          this.running = undefined;
          this.schedule(10000);
        });
      }, ms);
  }
  async batch() {
    try {
      const candidates = await this.service.candidates(this.cursor);
      if (!candidates.length) {
        this.cursor = null;
        return;
      }
      for (const { orderId } of candidates) {
        if (this.stopped) break;
        try {
          await this.service.settle(orderId);
        } catch (e) {
          this.logger.error({
            event: "order_settlement_failed",
            orderId,
            error: e instanceof Error ? e.message : "Unknown error",
          });
        }
        this.cursor = orderId;
      }
    } catch (e) {
      this.logger.error({
        event: "order_settlement_scan_failed",
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }
  async onApplicationShutdown() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    await this.running;
  }
}
