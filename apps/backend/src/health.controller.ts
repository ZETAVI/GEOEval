import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { ReadinessState } from "./readiness.js";
import { PublicAccess } from "./identity/access/access.metadata.js";

@ApiTags("health")
@PublicAccess()
@Controller("health")
export class HealthController {
  constructor(
    @Inject(ReadinessState) private readonly readiness: ReadinessState,
  ) {}

  @Get("live")
  @ApiOkResponse({ schema: { example: { status: "live" } } })
  live(): { status: "live" } {
    return { status: "live" };
  }

  @Get("ready")
  @ApiOkResponse({ schema: { example: { status: "ready" } } })
  ready(): { status: "ready" } {
    return this.readiness.assertReady();
  }
}
