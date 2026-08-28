import { Module } from "@nestjs/common";

import { NotificationApplicationModule } from "./notification-application.module.js";
import { NotificationController } from "./presentation/notification.controller.js";

@Module({
  imports: [NotificationApplicationModule],
  controllers: [NotificationController],
})
export class NotificationApiModule {}
