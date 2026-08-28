import { Global, Module } from "@nestjs/common";

import { ReadinessState } from "./readiness.js";

@Global()
@Module({ providers: [ReadinessState], exports: [ReadinessState] })
export class ReadinessModule {}
