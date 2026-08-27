import type { ConnectionOptions } from "bullmq";

export function bullmqConnectionOptions(redisUrl: string): ConnectionOptions {
  const parsed = new URL(redisUrl);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    ...(parsed.username ? { username: parsed.username } : {}),
    ...(parsed.password ? { password: parsed.password } : {}),
    ...(parsed.protocol === "rediss:" ? { tls: {} } : {}),
    ...(parsed.pathname.length > 1
      ? { db: Number(parsed.pathname.slice(1)) }
      : {}),
  };
}
