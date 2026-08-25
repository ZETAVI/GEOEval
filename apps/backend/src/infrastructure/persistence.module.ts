import { Global, Module, type DynamicModule } from "@nestjs/common";

import { PrismaService } from "./prisma.service.js";

@Global()
@Module({})
export class PersistenceModule {
  static register(databaseUrl: string): DynamicModule {
    return {
      module: PersistenceModule,
      providers: [
        {
          provide: PrismaService,
          useFactory: () => new PrismaService(databaseUrl),
        },
      ],
      exports: [PrismaService],
    };
  }
}
