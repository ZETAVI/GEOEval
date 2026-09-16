import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import { allocateOrderPointReturn } from "../domain/order-point-return.js";
export type CommissionSource = {
  orderId: string;
  number: number;
  title: string;
  agentId: string;
  customerId: string;
  brandId: string;
  rateBps: number;
  createdAt: Date;
  fundedPoints: number;
  grantedPoints: number;
  returnedFunded: number;
  returnedGranted: number;
  settledAt: Date | null;
};
@Injectable()
export class CommissionSourceAccess {
  projection() {
    return Prisma.sql`SELECT o.id AS "orderId",o.number,o.title,o.account_id AS "customerId",o.brand_id AS "brandId",o.created_at AS "createdAt",a.agent_account_id AS "agentId",a.rate_bps AS "rateBps",-p.funded_delta AS "fundedPoints",-p.granted_delta AS "grantedPoints",COALESCE(r.funded_delta,0) AS "returnedFunded",COALESCE(r.granted_delta,0) AS "returnedGranted",s.settled_at AS "settledAt" FROM publishing_orders o JOIN publishing_order_agency a ON a.order_id=o.id JOIN point_changes p ON p.publishing_order_id=o.id LEFT JOIN order_settlements s ON s.order_id=o.id LEFT JOIN point_changes r ON r.returned_order_id=o.id WHERE a.agent_active AND a.commission_enabled AND a.agent_account_id IS NOT NULL AND a.rate_bps IS NOT NULL`;
  }
  split(granted: number, funded: number, amount: number) {
    return allocateOrderPointReturn({ granted, funded }, amount);
  }
}
