import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Sse,
} from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { from, map, switchMap, takeUntil, timer, type Observable } from "rxjs";

import {
  CreateFoundationRecordRequest,
  FoundationBacklogResponse,
  FoundationRecordResponse,
} from "./foundation.dto.js";
import { FoundationService } from "./foundation.service.js";
import { ReadinessState } from "../readiness.js";

type RefreshMessage = {
  data: {
    recordId: string;
    status: string;
    correlationId: string;
  };
  type: "refresh";
};

@ApiTags("foundation")
@Controller("foundation")
export class FoundationController {
  constructor(
    private readonly foundation: FoundationService,
    private readonly readiness: ReadinessState,
  ) {}

  @Post("records")
  @HttpCode(201)
  @ApiCreatedResponse({ type: FoundationRecordResponse })
  create(
    @Body() input: CreateFoundationRecordRequest,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<FoundationRecordResponse> {
    return this.foundation.createRecord({ name: input.name }, correlationId);
  }

  @Get("outbox/backlog")
  @ApiOkResponse({ type: FoundationBacklogResponse })
  backlog(): Promise<FoundationBacklogResponse> {
    return this.foundation.getBacklog();
  }

  @Get("records/:id")
  @ApiOkResponse({ type: FoundationRecordResponse })
  get(@Param("id") id: string): Promise<FoundationRecordResponse> {
    return this.foundation.getRecord(id);
  }

  @Sse("records/:id/events")
  events(@Param("id") id: string): Observable<RefreshMessage> {
    return timer(0, 1000).pipe(
      takeUntil(this.readiness.shutdown$),
      switchMap(() => from(this.foundation.getRecord(id))),
      map((record) => ({
        type: "refresh" as const,
        data: {
          recordId: record.id,
          status: record.status,
          correlationId: record.correlationId,
        },
      })),
    );
  }
}
