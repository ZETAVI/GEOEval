import { cookies } from "next/headers.js";
import { NextResponse, type NextRequest } from "next/server.js";
import {
  entryBackend,
  entryCookieName,
  entryEnabled,
  webOrigin,
} from "../../../acquisition/server.js";

export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!entryEnabled())
    return NextResponse.json(
      { message: "入口服务尚未开放" },
      { status: 503, headers },
    );
  if (
    request.headers.get("origin") !== webOrigin() ||
    request.headers.get("x-geoeval-request") !== "1" ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    return NextResponse.json(
      { message: "请求来源不受信任" },
      { status: 403, headers },
    );
  try {
    const reader = request.body?.getReader();
    if (!reader)
      return NextResponse.json(
        { message: "请求格式不正确" },
        { status: 400, headers },
      );
    let raw = "",
      length = 0;
    const decoder = new TextDecoder();
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > 12 * 1024) {
        await reader.cancel();
        return NextResponse.json(
          { message: "请求过大" },
          { status: 413, headers },
        );
      }
      raw += decoder.decode(part.value, { stream: true });
    }
    raw += decoder.decode();
    if (raw.length > 12 * 1024)
      return NextResponse.json(
        { message: "请求过大" },
        { status: 413, headers },
      );
    const body = JSON.parse(raw) as {
      captchaVerifyParam?: unknown;
      mobile?: unknown;
    };
    if (typeof body.mobile !== "string" || body.mobile.length > 30)
      return NextResponse.json(
        { message: "手机号格式不正确" },
        { status: 400, headers },
      );
    if (
      body.captchaVerifyParam !== undefined &&
      (typeof body.captchaVerifyParam !== "string" ||
        body.captchaVerifyParam.length < 1 ||
        body.captchaVerifyParam.length > 8192)
    )
      return NextResponse.json(
        { message: "安全验证结果不正确" },
        { status: 400, headers },
      );
    const acquisitionVisitToken = (await cookies()).get(
      entryCookieName(),
    )?.value;
    if (
      !acquisitionVisitToken ||
      !/^[A-Za-z0-9_-]{43}$/.test(acquisitionVisitToken)
    )
      return NextResponse.json(
        { message: "请刷新页面后重新获取验证码" },
        { status: 409, headers },
      );
    const response = await entryBackend("identity/challenges", {
      mobile: body.mobile,
      ...(body.captchaVerifyParam
        ? { captchaVerifyParam: body.captchaVerifyParam }
        : {}),
      acquisitionVisitToken,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status, headers });
  } catch {
    return NextResponse.json(
      { message: "暂时无法获取验证码，请稍后重试" },
      { status: 503, headers },
    );
  }
}
