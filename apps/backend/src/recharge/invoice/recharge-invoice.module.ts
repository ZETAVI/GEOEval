import { Module } from "@nestjs/common";
import { PostgresOperationsIdentityReader } from "../../identity/infrastructure/postgres-operations-identity-reader.js";
import { RechargeInvoiceService } from "./application/recharge-invoice.service.js";
import { RechargeInvoiceOrderAccess } from "./infrastructure/recharge-invoice-order-access.js";
import {
  AdminRechargeInvoiceController,
  CustomerRechargeInvoiceController,
  OperationsRechargeInvoiceController,
  RechargeInvoiceApplicationController,
} from "./presentation/recharge-invoice.controller.js";

@Module({
  controllers: [
    RechargeInvoiceApplicationController,
    CustomerRechargeInvoiceController,
    OperationsRechargeInvoiceController,
    AdminRechargeInvoiceController,
  ],
  providers: [
    RechargeInvoiceService,
    RechargeInvoiceOrderAccess,
    PostgresOperationsIdentityReader,
  ],
  exports: [RechargeInvoiceService],
})
export class RechargeInvoiceModule {}
