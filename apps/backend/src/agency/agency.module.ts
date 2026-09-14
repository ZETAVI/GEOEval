import { AgencyCustomerController } from "./presentation/customer-service.controller.js";
import { AgencyCustomerService } from "./application/customer-service.js";
import { PostgresCustomerServiceRepository } from "./infrastructure/postgres-customer-service.repository.js";
import { AgencyCustomerIdentityReader } from "../identity/infrastructure/agency-customer-identity-access.js";
import { Module, type DynamicModule } from "@nestjs/common";
import { PostgresAcquisitionRepository } from "./infrastructure/postgres-acquisition.repository.js";
import {
  ACQUISITION_ENABLED,
  AcquisitionController,
} from "./presentation/acquisition.controller.js";

@Module({})
export class AgencyModule {
  static register(
    enabled: boolean,
    intelligence: DynamicModule,
  ): DynamicModule {
    return {
      module: AgencyModule,
      imports: [intelligence],
      controllers: [AcquisitionController, AgencyCustomerController],
      providers: [
        PostgresAcquisitionRepository,
        PostgresCustomerServiceRepository,
        AgencyCustomerService,
        AgencyCustomerIdentityReader,
        { provide: ACQUISITION_ENABLED, useValue: enabled },
      ],
    };
  }
}
