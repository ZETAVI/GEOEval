import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
/** Read projection only: commission cannot change delivery or agreed returns. */
@Injectable()
export class DeliveryCommissionAccess {
  projection() {
    return Prisma.sql`SELECT order_id,status,agreed_return_points FROM publication_deliveries`;
  }
}
