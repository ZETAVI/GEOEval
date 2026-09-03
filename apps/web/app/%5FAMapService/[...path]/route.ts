import { NextResponse } from "next/server.js";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };
const allowedProxyPaths = new Set(["v3/assistant/inputtips", "v3/place/text"]);

export async function GET(request: Request, context: RouteContext) {
  const securityCode = process.env.AMAP_JS_SECURITY_CODE?.trim();
  if (!securityCode) {
    return NextResponse.json(
      { message: "地图安全代理暂未配置" },
      { status: 503 },
    );
  }
  const { path } = await context.params;
  if (!validPath(path) || request.url.length > 4_096) {
    return NextResponse.json({ message: "地图代理路径无效" }, { status: 400 });
  }

  const incoming = new URL(request.url);
  const target = new URL(
    `/${path.map(encodeURIComponent).join("/")}`,
    "https://restapi.amap.com",
  );
  for (const [name, value] of incoming.searchParams) {
    if (name.toLowerCase() !== "jscode")
      target.searchParams.append(name, value);
  }
  target.searchParams.set("jscode", securityCode);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const upstream = await fetch(target, {
      signal: controller.signal,
      headers: { accept: request.headers.get("accept") ?? "application/json" },
      cache: "no-store",
    });
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "地图服务暂时不可用" },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

function validPath(path: string[]): boolean {
  const syntacticallyValid =
    path.length > 0 &&
    path.length <= 12 &&
    path.every(
      (segment) =>
        segment !== "." &&
        segment !== ".." &&
        /^[A-Za-z0-9._~-]+$/.test(segment),
    );
  return syntacticallyValid && allowedProxyPaths.has(path.join("/"));
}
