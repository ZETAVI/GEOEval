import { Module, type DynamicModule } from "@nestjs/common";
import { PostgresAcquisitionRepository } from "./infrastructure/postgres-acquisition.repository.js";
import {
  ACQUISITION_ENABLED,
  AcquisitionController,
} from "./presentation/acquisition.controller.js";

@Module({})
export class AgencyModule {
  static register(enabled: boolean): DynamicModule {
    return {
      module: AgencyModule,
      controllers: [AcquisitionController],
      providers: [
        PostgresAcquisitionRepository,
        { provide: ACQUISITION_ENABLED, useValue: enabled },
      ],
    };
  }
}
