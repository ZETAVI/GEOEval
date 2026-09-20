import {
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnApplicationShutdown
{
  constructor(databaseUrl: string) {
    super({
      // Prisma PG serializes DateTime values as UTC fields without an offset.
      // PostgreSQL must interpret those fields in UTC; presentation and channel
      // formatting remain explicitly Asia/Shanghai at their owning boundaries.
      adapter: new PrismaPg({
        connectionString: databaseUrl,
        options: "-c TimeZone=UTC",
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    if (process.env.GEOEVAL_SKIP_DATABASE_CONNECT !== "1") {
      await this.$connect();
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.$disconnect();
  }
}
