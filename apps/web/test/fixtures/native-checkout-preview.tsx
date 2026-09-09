"use client";

// Browser-only verification fixture. Copied to a temporary route by the preview script.
import { useEffect, useMemo, useRef, useState } from "react";
import * as jsQR from "jsqr";
import type { QRCode } from "jsqr";
// Published UMD function; legacy declarations need a callable boundary under NodeNext.
const decodeImage = jsQR.default as unknown as (
  data: Uint8ClampedArray,
  width: number,
  height: number,
) => QRCode | null;
import { NativeCheckout } from "../../app/recharges/native-checkout.js";
import type {
  NativeCheckoutOrder,
  NativeCheckoutSource,
} from "../../app/recharges/native-checkout-controller.js";

const uri = "weixin://wxpay/bizpayurl/up?pr=QA_LOCAL_NOT_PAYABLE&groupid=00";
type Mode =
  | "pending"
  | "success"
  | "closed"
  | "offline"
  | "slow"
  | "cancel-lost"
  | "expired";
const fixtureKey = "qa.geoeval.native-checkout";
export default function NativeCheckoutPreview() {
  const [ready, setReady] = useState(false);
  const [id, setId] = useState("");
  const [width, setWidth] = useState(760);
  const [message, setMessage] = useState("");
  const [counts, setCounts] = useState({ read: 0, verify: 0, cancel: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const model = useRef({ mode: "pending" as Mode, createdAt: Date.now() });
  useEffect(() => {
    const old = sessionStorage.getItem(fixtureKey);
    if (old) {
      const value = JSON.parse(old);
      model.current = { mode: value.mode, createdAt: value.createdAt };
      setId(value.id);
    } else {
      const next = crypto.randomUUID();
      setId(next);
      sessionStorage.setItem(
        fixtureKey,
        JSON.stringify({ ...model.current, id: next }),
      );
    }
    setReady(true);
  }, []);
  const source = useMemo<NativeCheckoutSource>(() => {
    const order = (): NativeCheckoutOrder => ({
      id,
      amountYuan: 50,
      points: 500,
      status:
        model.current.mode === "success"
          ? "SUCCESSFUL"
          : model.current.mode === "closed"
            ? "CLOSED"
            : "PENDING_PAYMENT",
      paymentExpiresAt: new Date(
        model.current.createdAt + 180_000,
      ).toISOString(),
      canCancel: !["success", "closed"].includes(model.current.mode),
      qr: {
        value: uri,
        expiresAt: new Date(
          model.current.mode === "expired"
            ? Date.now() - 1000
            : model.current.createdAt + 120_000,
        ).toISOString(),
      },
    });
    return {
      async read(_id, signal) {
        setCounts((n) => ({ ...n, read: n.read + 1 }));
        const captured = order(),
          serverTime = new Date().toISOString();
        if (model.current.mode === "slow") {
          await new Promise((resolve) => setTimeout(resolve, 12_000)); // intentionally ignores abort
          return { kind: "ok", order: captured, serverTime };
        }
        await new Promise((resolve) => setTimeout(resolve, 120));
        if (signal.aborted) throw new Error("aborted");
        if (model.current.mode === "offline") return { kind: "unavailable" };
        return {
          kind: "ok",
          order: order(),
          serverTime: new Date().toISOString(),
        };
      },
      async verify() {
        setCounts((n) => ({ ...n, verify: n.verify + 1 }));
        return "accepted";
      },
      async cancel() {
        setCounts((n) => ({ ...n, cancel: n.cancel + 1 }));
        if (model.current.mode === "cancel-lost")
          throw new Error("synthetic unknown response");
        return "accepted"; // ACK intentionally does not change the order status.
      },
    };
  }, [id]);
  function mode(value: Mode) {
    model.current.mode = value;
    sessionStorage.setItem(
      fixtureKey,
      JSON.stringify({ ...model.current, id }),
    );
    setMessage(`合成服务端场景：${value}；请点击充值区的刷新状态。`);
  }
  function reset() {
    model.current = { mode: "pending", createdAt: Date.now() };
    const next = crypto.randomUUID();
    setId(next);
    sessionStorage.setItem(
      fixtureKey,
      JSON.stringify({ ...model.current, id: next }),
    );
    setCounts({ read: 0, verify: 0, cancel: 0 });
    setMessage("已创建新的合成订单。");
  }
  async function decode() {
    const svg = ref.current?.querySelector("svg");
    if (!svg) {
      setMessage("当前没有可解码的二维码。");
      return;
    }
    const serialized = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 480, 480);
    ctx.drawImage(img, 0, 0, 480, 480);
    const result = decodeImage(ctx.getImageData(0, 0, 480, 480).data, 480, 480);
    setMessage(
      result?.data === uri
        ? "独立解码通过：实际 SVG 的内容与原支付动作逐字一致。"
        : "独立解码失败。",
    );
  }
  if (!ready) return <p>正在准备本地预览…</p>;
  return (
    <main style={{ maxWidth: 1120, margin: "32px auto", padding: "0 20px" }}>
      <aside
        style={{
          padding: 18,
          border: "1px dashed #899e91",
          borderRadius: 12,
          marginBottom: 24,
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 18 }}>
          仅本地组件验证 · 合成订单 · 不可真实付款
        </h2>
        <p>
          此临时页面没有客户
          API、商户账户或支付后台。按钮仅模拟服务端读取结果，不代表真实交易。
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={reset}>新待支付订单</button>
          <button onClick={() => mode("success")}>模拟服务端已到账</button>
          <button onClick={() => mode("closed")}>模拟服务端已关闭</button>
          <button onClick={() => mode("offline")}>模拟读取断网</button>
          <button onClick={() => mode("cancel-lost")}>模拟取消响应丢失</button>
          <button onClick={() => mode("slow")}>模拟迟到读取</button>
          <button onClick={() => mode("expired")}>模拟二维码过期</button>
          <button onClick={() => void decode()}>独立解码二维码</button>
          <button onClick={() => setWidth(width === 375 ? 760 : 375)}>
            切换 375px 容器
          </button>
        </div>
        <p aria-live="polite">{message}</p>
        <small>
          读取 {counts.read} 次 · 核验 {counts.verify} 次 · 取消 {counts.cancel}{" "}
          次
        </small>
      </aside>
      <div
        ref={ref}
        style={{
          width,
          maxWidth: "100%",
          margin: "0 auto",
          containerType: "inline-size",
        }}
      >
        <NativeCheckout
          accountId="qa-customer"
          orderId={id}
          source={source}
          onLeave={() =>
            setMessage("离开入口被调用；没有自动提交发布购买，也没有发送取消。")
          }
          onSupport={() =>
            setMessage("此处是测试客服入口；实际联系方式由运营配置。")
          }
        />
      </div>
    </main>
  );
}
