import {
  Injectable,
  ServiceUnavailableException,
  type BeforeApplicationShutdown,
} from "@nestjs/common";
import { Subject, type Observable } from "rxjs";

@Injectable()
export class ReadinessState implements BeforeApplicationShutdown {
  private ready = true;
  private readonly stopping = new Subject<void>();

  get shutdown$(): Observable<void> {
    return this.stopping.asObservable();
  }

  assertReady(): { status: "ready" } {
    if (!this.ready) {
      throw new ServiceUnavailableException("Process is shutting down");
    }
    return { status: "ready" };
  }

  async beforeApplicationShutdown(): Promise<void> {
    this.ready = false;
    this.stopping.next();
    this.stopping.complete();
    const graceMilliseconds = Number(
      process.env.GEOEVAL_SHUTDOWN_GRACE_MS ?? "500",
    );
    await new Promise((resolve) => setTimeout(resolve, graceMilliseconds));
  }
}
