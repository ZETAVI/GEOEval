import {
  Controller,
  Get,
  Inject,
  Param,
  Put,
  Query,
  Sse,
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

import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
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
@RequireAccountRoles("TERMINAL_CUSTOMER")
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
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ): Promise<NotificationListResponse> {
    return this.notifications
      .list(principal.accountId, limit, cursor)
      .then((page) => ({
        ...page,
        items: page.items.map(presentNotification),
      }));
  }

  @Put("read-all")
  @ApiOkResponse({ type: NotificationReadAllResponse })
  markAllRead(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<NotificationReadAllResponse> {
    return this.notifications.markAllRead(principal.accountId);
  }

  @Put(":notificationId/read")
  @ApiOkResponse({ type: NotificationResponse })
  @ApiParam({ name: "notificationId", type: String })
  markRead(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("notificationId") notificationId: string,
  ): Promise<NotificationResponse> {
    return this.notifications
      .markRead(principal.accountId, notificationId)
      .then(presentNotification);
  }

  @Sse("events")
  @ApiProduces("text/event-stream")
  events(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Observable<MessageEvent> {
    return timer(0, 2_000).pipe(
      switchMap(() => from(this.notifications.revision(principal.accountId))),
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
