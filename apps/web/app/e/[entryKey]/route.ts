import { NextResponse, type NextRequest } from "next/server.js";
import {
  entryCookieName,
  entryEnabled,
  resolveEntry,
  webOrigin,
} from "../../acquisition/server.js";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ entryKey: string }> },
) {
  const headers = {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
  };
  if (!entryEnabled())
    return new NextResponse("注册入口暂未开放", { status: 503, headers });
  // A prefetched link is not a human acquisition visit.
  if (
    request.headers.has("next-router-prefetch") ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose")?.includes("prefetch")
  )
    return new NextResponse(null, { status: 204, headers });
  try {
    const { entryKey } = await context.params;
    if (!/^[A-Za-z0-9_-]{32}$/.test(entryKey))
      return new NextResponse("当前入口不可用", { status: 404, headers });
    const source = await resolveEntry(entryKey);
    if (!source.visitToken || !source.expiresAt)
      throw new Error("Missing entry visit");
    const response = NextResponse.redirect(new URL("/enter", webOrigin()), 303);
    for (const [key, value] of Object.entries(headers))
      response.headers.set(key, value);
    response.cookies.set(entryCookieName(), source.visitToken, {
      httpOnly: true,
      secure: webOrigin().startsWith("https:"),
      sameSite: "lax",
      path: "/",
      expires: new Date(source.expiresAt),
    });
    return response;
  } catch {
    return new NextResponse(
      '<meta charset="utf-8"><title>入口暂不可用</title><p>注册入口暂不可用，请重新打开有效链接或稍后重试。</p><a href="/enter?loginOnly=1">已有账号登录</a>',
      {
        status: 503,
        headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }
}
