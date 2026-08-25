import { createServer, request } from "node:http";

const listenPort = Number(process.env.PROXY_PORT ?? 3100);
const upstream = new URL(process.env.WEB_UPSTREAM ?? "http://127.0.0.1:3200");

const server = createServer((incoming, outgoing) => {
  const proxyRequest = request(
    {
      hostname: upstream.hostname,
      port: upstream.port,
      path: incoming.url,
      method: incoming.method,
      headers: {
        ...incoming.headers,
        host: upstream.host,
        "x-forwarded-host": incoming.headers.host ?? "",
        "x-forwarded-proto": "http",
      },
    },
    (response) => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(outgoing);
    },
  );
  proxyRequest.on("error", (error) => {
    outgoing.writeHead(502, { "content-type": "application/json" });
    outgoing.end(JSON.stringify({ error: error.message }));
  });
  incoming.pipe(proxyRequest);
});

server.listen(listenPort, "127.0.0.1", () => {
  process.stdout.write(
    `${JSON.stringify({
      level: "info",
      process: "reverse-proxy",
      port: listenPort,
      upstream: upstream.origin,
    })}\n`,
  );
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
