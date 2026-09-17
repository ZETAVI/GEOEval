import type { RechargeSingleChannelApiConfiguration } from "../src/recharge/recharge-api.module.js";
import { WechatPayGateway } from "../src/recharge/infrastructure/wechat/wechat-pay.gateway.js";
import { wechatFixture } from "./wechat-pay.fixture.js";

/** Ephemeral keys and controlled transport; never loaded by the ordinary API entry point. */
export function rechargeApiFixture() {
  const protocol = wechatFixture();
  let calls = 0;
  const orders = new Map<string, { amount: number; state: string }>();
  const gateway = new WechatPayGateway(protocol.config(), async (request) => {
    calls++;
    if (request.path.endsWith("/native")) {
      const body = JSON.parse(request.body.toString());
      if (!orders.has(body.out_trade_no))
        orders.set(body.out_trade_no, {
          amount: body.amount.total,
          state: "NOTPAY",
        });
      return protocol.response({
        code_url: `weixin://wxpay/bizpayurl/up?pr=CONTROLLED_N2_${body.out_trade_no}`,
      });
    }
    const no = decodeURIComponent(
      request.path.split("out-trade-no/")[1]!.split(/[?/]/)[0]!,
    );
    const order = orders.get(no);
    if (!order) return protocol.response({ code: "ORDER_NOT_EXIST" }, 404);
    if (request.path.endsWith("/close")) {
      order.state = "CLOSED";
      return protocol.response({}, 204);
    }
    return protocol.response(
      protocol.trade({
        out_trade_no: no,
        transaction_id: no,
        trade_state: order.state,
        amount: {
          total: order.amount,
          currency: "CNY",
          payer_total: order.amount,
          payer_currency: "CNY",
        },
      }),
    );
  });
  const configuration: RechargeSingleChannelApiConfiguration = {
    recharge: {
      merchantId: protocol.order.merchantId,
      appId: protocol.order.appId,
      minAmountYuan: 1,
      maxAmountYuan: 100,
      maxActiveOrders: 3,
      paymentWindowSeconds: 600,
    },
    preparation: {
      description: "受控积分充值测试",
      notifyUrl: protocol.config().notifyUrl,
      createEnabled: true,
    },
    channel: {
      merchantId: protocol.order.merchantId,
      appId: protocol.order.appId,
      notifyUrl: protocol.config().notifyUrl,
      gateway,
    },
    recovery: {
      initiationEnabled: true,
      minimumDispatchWindowMs: 80_000,
      leaseMs: 30_000,
      queryIntervalMs: 5_000,
      retryDelayMs: 10_000,
      maxFailures: 3,
      slowRetryDelayMs: 60_000,
    },
    verifier: gateway,
    controlled: true,
    shortcutAmounts: [1, 10, 50],
    supportMessage: "受控测试环境：二维码不能付款；如遇问题请保留充值单号。",
  };
  return {
    configuration,
    protocol,
    gateway,
    calls: () => calls,
    setState: (value: string, no?: string) => {
      for (const [key, order] of orders)
        if (!no || key === no) order.state = value;
    },
  };
}
