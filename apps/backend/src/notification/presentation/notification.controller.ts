import {
  Controller,
  Get,
  Inject,
  Param,
  Put,
  Query,
  Req,
  Sse,
  UseGuards,
  type MessageEvent,
} from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import {
  distinctUntilChanged,
  from,
  map,
  switchMap,
  takeUntil,
  timer,
} from "rxjs";
import type { Observable } from "rxjs";

import type { AuthenticatedRequest } from "../../identity/presentation/session-http.js";
import { SessionGuard } from "../../identity/presentation/session.guard.js";
import { ReadinessState } from "../../readiness.js";
import { NotificationService } from "../application/notification.service.js";
import type { NotificationView } from "../domain/notification.types.js";
import {
  EvaluationReportNotificationTargetResponse,
  EvaluationRetryNotificationTargetResponse,
  NotificationListResponse,
  NotificationReadAllResponse,
  NotificationResponse,
} from "./notification.dto.js";

@ApiTags("notifications")
@ApiExtraModels(
  EvaluationReportNotificationTargetResponse,
  EvaluationRetryNotificationTargetResponse,
)
@UseGuards(SessionGuard)
@Controller("notifications")
export class NotificationController {
  constructor(
    @Inject(NotificationService)
    private readonly notifications: NotificationService,
    @Inject(ReadinessState) private readonly readiness: ReadinessState,
  ) {}

  @Get()
  @ApiOkResponse({ type: NotificationListResponse })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    minimum: 1,
    maximum: 20,
  })
  @ApiQuery({ name: "cursor", required: false, type: String })
  list(
    @Req() request: AuthenticatedRequest,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ): Promise<NotificationListResponse> {
    return this.notifications
      .list(request.geoevalAccount!.id, limit, cursor)
      .then((page) => ({
        ...page,
        items: page.items.map(presentNotification),
      }));
  }

  @Put("read-all")
  @ApiOkResponse({ type: NotificationReadAllResponse })
  markAllRead(
    @Req() request: AuthenticatedRequest,
  ): Promise<NotificationReadAllResponse> {
    return this.notifications.markAllRead(request.geoevalAccount!.id);
  }

  @Put(":notificationId/read")
  @ApiOkResponse({ type: NotificationResponse })
  @ApiParam({ name: "notificationId", type: String })
  markRead(
    @Req() request: AuthenticatedRequest,
    @Param("notificationId") notificationId: string,
  ): Promise<NotificationResponse> {
    return this.notifications
      .markRead(request.geoevalAccount!.id, notificationId)
      .then(presentNotification);
  }

  @Sse("events")
  @ApiProduces("text/event-stream")
  events(@Req() request: AuthenticatedRequest): Observable<MessageEvent> {
    return timer(0, 2_000).pipe(
      switchMap(() =>
        from(this.notifications.revision(request.geoevalAccount!.id)),
      ),
      map((revision) => ({
        key: `${revision.latestNotificationId ?? "none"}:${revision.unreadCount}`,
        revision,
      })),
      distinctUntilChanged((left, right) => left.key === right.key),
      map(({ revision }) => ({
        type: "refresh",
        data: {
          latestNotificationId: revision.latestNotificationId,
          unreadCount: revision.unreadCount,
        },
      })),
      takeUntil(this.readiness.shutdown$),
    );
  }
}

function presentNotification(
  notification: NotificationView,
): NotificationResponse {
  return notification;
}
