import {
  Controller,
  ConflictException,
  Header,
  Headers,
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
  ApiHeader,
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
  RechargeNotificationTargetResponse,
  EvaluationReportNotificationTargetResponse,
  EvaluationRetryNotificationTargetResponse,
  NotificationListResponse,
  NotificationReadAllResponse,
  NotificationResponse,
} from "./notification.dto.js";

@ApiTags("notifications")
@ApiExtraModels(
  RechargeNotificationTargetResponse,
  EvaluationReportNotificationTargetResponse,
  EvaluationRetryNotificationTargetResponse,
)
@ApiHeader({
  name: "x-geoeval-account",
  required: false,
  description: "Expected signed-in account, never selects recipient",
})
@RequireAccountRoles("TERMINAL_CUSTOMER")
@Controller("notifications")
export class NotificationController {
  constructor(
    @Inject(NotificationService)
    private readonly notifications: NotificationService,
    @Inject(ReadinessState) private readonly readiness: ReadinessState,
  ) {}

  @Get()
  @Header("Cache-Control", "no-store")
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
    @Headers("x-geoeval-account") expected: string | undefined,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ): Promise<NotificationListResponse> {
    assertAccount(principal.accountId, expected);
    return this.notifications
      .list(principal.accountId, limit, cursor)
      .then((page) => ({
        ...page,
        items: page.items.map(presentNotification),
      }));
  }

  @Put("read-all")
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({ type: NotificationReadAllResponse })
  markAllRead(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
  ): Promise<NotificationReadAllResponse> {
    assertAccount(principal.accountId, expected);
    return this.notifications.markAllRead(principal.accountId);
  }

  @Put(":notificationId/read")
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({ type: NotificationResponse })
  @ApiParam({ name: "notificationId", type: String })
  markRead(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("notificationId") notificationId: string,
  ): Promise<NotificationResponse> {
    assertAccount(principal.accountId, expected);
    return this.notifications
      .markRead(principal.accountId, notificationId)
      .then(presentNotification);
  }

  @Sse("events")
  @ApiProduces("text/event-stream")
  @ApiQuery({ name: "expectedAccountId", required: false, type: String })
  events(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query("expectedAccountId") expected?: string,
  ): Observable<MessageEvent> {
    assertAccount(principal.accountId, expected);
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

function assertAccount(accountId: string, expected: unknown) {
  if (
    expected !== undefined &&
    (typeof expected !== "string" || expected.toLowerCase() !== accountId)
  )
    throw new ConflictException({
      code: "ACCOUNT_CHANGED",
      message: "登录账号已变化，请重新打开通知。",
    });
}
