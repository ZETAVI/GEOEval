import { afterEach, describe, expect, it, vi } from "vitest";
import type { NotificationInbox } from "../src/recharge/application/notification-inbox.js";
import { ReceivePaymentNotificationService } from "../src/recharge/application/receive-payment-notification.service.js";
import { WechatPayGateway } from "../src/recharge/infrastructure/wechat/wechat-pay.gateway.js";
import { wechatFixture } from "./wechat-pay.fixture.js";

const fixture = wechatFixture();
const verifier = new WechatPayGateway(fixture.config());
const unused = async () => {
  throw new Error("UNUSED");
};
function service(accept: NotificationInbox["accept"]) {
  return new ReceivePaymentNotificationService(verifier, {
    accept,
    getReceipt: unused,
    listPending: unused,
    listConflicts: unused,
  });
}

describe("notification acknowledgement budget", () => {
  afterEach(() => vi.useRealTimers());

  it("times out without claiming cancellation; a late durable result is safe on retry", async () => {
    vi.useFakeTimers();
    let finish!: () => void;
    let durable = false;
    const receiver = service(async () => {
      if (durable) return "DUPLICATE";
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      durable = true;
      return "RECORDED";
    });
    const result = receiver.receive(fixture.notification());
    await vi.advanceTimersByTimeAsync(3500);
    expect(await result).toBe("RETRY");
    expect(durable).toBe(false);
    finish();
    await Promise.resolve();
    expect(await receiver.receive(fixture.notification())).toBe("ACCEPTED");
  });

  it("acknowledges a persisted conflict as delivery acceptance", async () => {
    expect(
      await service(async () => "CONFLICT_RECORDED").receive(
        fixture.notification(),
      ),
    ).toBe("ACCEPTED");
  });

  it("an unknown commit outcome requests retry without leaking diagnostics", async () => {
    expect(
      await service(async () => {
        throw new Error("sensitive detail");
      }).receive(fixture.notification()),
    ).toBe("RETRY");
  });

  it("does not touch persistence before authentication", async () => {
    const accept = vi.fn(unused);
    const input = fixture.notification();
    input.headers["wechatpay-signature"] = ["invalid"];
    expect(await service(accept).receive(input)).toBe("UNAUTHENTICATED");
    expect(accept).not.toHaveBeenCalled();
  });
});
