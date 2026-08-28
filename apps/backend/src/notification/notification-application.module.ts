import { Module } from "@nestjs/common";

import { NotificationEventHandler } from "./application/notification-event.handler.js";
import { NotificationService } from "./application/notification.service.js";
import { NOTIFICATION_REPOSITORY } from "./domain/notification.repository.js";
import { PostgresNotificationRepository } from "./infrastructure/postgres-notification.repository.js";

@Module({
  providers: [
    PostgresNotificationRepository,
    {
      provide: NOTIFICATION_REPOSITORY,
      useExisting: PostgresNotificationRepository,
    },
    NotificationEventHandler,
    NotificationService,
  ],
  exports: [NotificationEventHandler, NotificationService],
})
export class NotificationApplicationModule {}
