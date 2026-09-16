import { Module, type DynamicModule } from "@nestjs/common";
import { PostgresOrderReturnAccess } from "../publishing-commerce/infrastructure/postgres-order-return-access.js";
import { OrderSettlementAccess } from "../publishing-commerce/infrastructure/order-settlement-access.js";
import { DeliverySupportAccess } from "../publication-delivery/infrastructure/delivery-support-access.js";
import { SupportSettlementAccess } from "../support/infrastructure/support-settlement-access.js";
import { FinalOrderSettlementService } from "./final-order-settlement.service.js";
import {
  OrderSettlementRuntime,
  ORDER_SETTLEMENT_ENABLED,
} from "./order-settlement.runtime.js";
@Module({
  providers: [
    PostgresOrderReturnAccess,
    OrderSettlementAccess,
    DeliverySupportAccess,
    SupportSettlementAccess,
    FinalOrderSettlementService,
  ],
  exports: [FinalOrderSettlementService],
})
export class OrderSettlementModule {
  static register(enabled: boolean): DynamicModule {
    return {
      module: OrderSettlementModule,
      providers: [
        OrderSettlementRuntime,
        { provide: ORDER_SETTLEMENT_ENABLED, useValue: enabled },
      ],
    };
  }
}
