import { defineConfig, env } from "prisma/config";

if (process.env.GEOEVAL_LOCAL_DEFAULTS === "1" && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://geoeval:geoeval_local_only@127.0.0.1:55432/geoeval";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
