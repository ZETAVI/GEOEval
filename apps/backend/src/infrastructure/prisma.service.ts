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
      adapter: new PrismaPg({ connectionString: databaseUrl }),
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
