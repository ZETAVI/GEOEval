import { CommissionController } from "./agency/presentation/commission.controller.js";
import { AgencyCommissionModule } from "./application/agency-commission.module.js";
import { AgencyWithdrawalModule } from "./agency-withdrawal/agency-withdrawal.module.js";
import { AdminOrderSettlementController } from "./publication-delivery/presentation/admin-order-settlement.controller.js";
import { OrderSettlementModule } from "./application/order-settlement.module.js";
import { OrderSettlementAccess } from "./publishing-commerce/infrastructure/order-settlement-access.js";
import { OrderSupportReader } from "./publishing-commerce/infrastructure/order-support-reader.js";
import { OrderHandlingAccess } from "./support/infrastructure/order-handling-access.js";
import { SupportModule } from "./support/support.module.js";
import { GeoIntelligenceModule } from "./geo-intelligence/geo-intelligence.module.js";
import { AgencyModule } from "./agency/agency.module.js";
import { Module, type DynamicModule } from "@nestjs/common";
import { RechargeAdminModule } from "./recharge/recharge-admin.module.js";
import { RechargeInvoiceModule } from "./recharge/invoice/recharge-invoice.module.js";

import {
  RechargeApiModule,
  type RechargeApiConfiguration,
} from "./recharge/recharge-api.module.js";
import type { ApiConfig } from "./config/runtime-config.js";
import { FoundationController } from "./foundation/foundation.controller.js";
import { FoundationModule } from "./foundation/foundation.module.js";
import { GeoOptimizationModule } from "./geo-optimization/geo-optimization.module.js";
import { HealthController } from "./health.controller.js";
import { IdentityModule } from "./identity/identity.module.js";
import { PersistenceModule } from "./infrastructure/persistence.module.js";
import { MediaSupplyModule } from "./media-supply/media-supply.module.js";
import { TelemetryModule } from "./infrastructure/telemetry.js";
import { NotificationApiModule } from "./notification/notification-api.module.js";
import { ReadinessModule } from "./readiness.module.js";
import { PublishingCommerceModule } from "./publishing-commerce/publishing-commerce.module.js";
import { PublicationDeliveryModule } from "./publication-delivery/publication-delivery.module.js";
import { PublicationDeliveryWorkflowService } from "./application/publication-delivery-workflow.service.js";
import { PublicationResolutionWorkflowService } from "./application/publication-resolution-workflow.service.js";
import { DeliveryResolutionController } from "./publication-delivery/presentation/delivery-resolution.controller.js";
import { DeliveryAssignmentController } from "./publication-delivery/presentation/delivery-assignment.controller.js";
import {
  PublicationWorkController,
  CustomerPublicationResultsController,
} from "./publication-delivery/presentation/publication-work.controller.js";
import { VARIANT_PREPARER } from "./publication-delivery/domain/publication-item.js";
import { MockVariantPreparer } from "./publication-delivery/infrastructure/mock-variant-preparer.js";

@Module({})
export class ApiModule {
  static register(
    config: ApiConfig,
    recharge: RechargeApiConfiguration | null = null,
  ): DynamicModule {
    if (
      config.runtimeEnvironment === "production" &&
      config.agencyAcquisitionEnabled
    )
      throw new Error("AGENCY_ACQUISITION_NOT_READY_FOR_PRODUCTION");
    if (config.runtimeEnvironment === "production" && recharge?.controlled)
      throw new Error("CONTROLLED_RECHARGE_IN_PRODUCTION");
    const intelligence = GeoIntelligenceModule.register(config.storeLocation);
    const optimization = GeoOptimizationModule.register(
      {
        writerMode: config.geoOptimizationWriterMode,
        runtimeEnvironment: config.runtimeEnvironment,
        storeLocation: config.storeLocation,
      },
      intelligence,
    );
    return {
      module: ApiModule,
      imports: [
        PersistenceModule.register(config.databaseUrl),
        TelemetryModule.register(config.telemetryShouldFail),
        IdentityModule.register(config),
        AgencyModule.register(config.agencyAcquisitionEnabled, intelligence),
        optimization,
        MediaSupplyModule,
        PublishingCommerceModule.register(optimization),
        PublicationDeliveryModule,
        NotificationApiModule,
        SupportModule,
        OrderSettlementModule,
        AgencyCommissionModule,
        AgencyWithdrawalModule.register(
          config.agencyWithdrawal ?? { enabled: false, encryptionKeyHex: "" },
        ),
        RechargeApiModule.register(recharge),
        RechargeAdminModule,
        RechargeInvoiceModule,
        ReadinessModule,
        FoundationModule,
      ],
      controllers: [
        CommissionController,
        AdminOrderSettlementController,
        HealthController,
        FoundationController,
        DeliveryAssignmentController,
        DeliveryResolutionController,
        PublicationWorkController,
        CustomerPublicationResultsController,
      ],
      providers: [
        PublicationDeliveryWorkflowService,
        PublicationResolutionWorkflowService,
        OrderSettlementAccess,
        OrderSupportReader,
        OrderHandlingAccess,
        {
          provide: VARIANT_PREPARER,
          useFactory: () =>
            new MockVariantPreparer(config.runtimeEnvironment !== "production"),
        },
      ],
    };
  }
}
