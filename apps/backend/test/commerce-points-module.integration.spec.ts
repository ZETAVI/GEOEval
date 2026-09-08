import { Module } from "@nestjs/common";
import { ModulesContainer, NestFactory } from "@nestjs/core";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createApiApp } from "../src/api-app.js";
import { IdentityModule } from "../src/identity/identity.module.js";
import { PersistenceModule } from "../src/infrastructure/persistence.module.js";
import { CommercePointsModule } from "../src/publishing-commerce/commerce-points.module.js";
import { PointAccountService } from "../src/publishing-commerce/application/point-account.service.js";
import { POINT_ACCOUNT_REPOSITORY } from "../src/publishing-commerce/domain/point-account.js";
import { PostgresPointAccountRepository } from "../src/publishing-commerce/infrastructure/postgres-point-account.repository.js";
import {
  PointAdminController,
  PointCustomerController,
} from "../src/publishing-commerce/presentation/point-account.controller.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();

class PointsConsumer {
  constructor(readonly points: PointAccountService) {}
}
class PointsConsumerModule {}
Module({
  imports: [CommercePointsModule],
  providers: [
    {
      provide: PointsConsumer,
      inject: [PointAccountService],
      useFactory: (points: PointAccountService) => new PointsConsumer(points),
    },
  ],
})(PointsConsumerModule);
class PointsConsumerHost {}
Module({
  imports: [
    PersistenceModule.register(config.databaseUrl),
    IdentityModule.register(config),
    PointsConsumerModule,
  ],
})(PointsConsumerHost);

describe("independent Commerce points assembly", () => {
  it("injects the public service into a real consumer without the publishing graph", async () => {
    const app = await NestFactory.createApplicationContext(PointsConsumerHost, {
      logger: false,
      abortOnError: false,
    });
    try {
      const consumer = app
        .select(PointsConsumerModule)
        .get(PointsConsumer, { strict: true });
      const owner = app.select(CommercePointsModule);
      expect(consumer.points).toBe(
        owner.get(PointAccountService, { strict: true }),
      );
      expect(owner.get(POINT_ACCOUNT_REPOSITORY, { strict: true })).toBe(
        owner.get(PostgresPointAccountRepository, { strict: true }),
      );
      // This is a real isolated DB read, not a substitute provider. It creates no wallet.
      expect(await consumer.points.customerBalance(randomUUID())).toEqual({
        balance: 0,
        revision: 0,
      });
      const graph = [...app.get(ModulesContainer).values()].map(
        (module) => module.metatype.name,
      );
      for (const unrelated of [
        "PublishingCommerceModule",
        "PublicationDeliveryModule",
        "MediaSupplyModule",
        "GeoOptimizationModule",
      ])
        expect(graph).not.toContain(unrelated);
    } finally {
      await app.close();
    }
  });

  it("registers each points service and controller once in the complete API", async () => {
    const app = await createApiApp(config, false);
    try {
      await app.init();
      const modules = [...app.get(ModulesContainer).values()];
      for (const token of [
        PointAccountService,
        PostgresPointAccountRepository,
        POINT_ACCOUNT_REPOSITORY,
      ])
        expect(
          modules
            .filter((module) => module.providers.has(token))
            .map((module) => module.metatype),
        ).toEqual([CommercePointsModule]);
      for (const controller of [PointAdminController, PointCustomerController])
        expect(
          modules
            .filter((module) => module.controllers.has(controller))
            .map((module) => module.metatype),
        ).toEqual([CommercePointsModule]);
    } finally {
      await app.close();
    }
  });
});
