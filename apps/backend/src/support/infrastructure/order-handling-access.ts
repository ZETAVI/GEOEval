import { Injectable, ConflictException } from "@nestjs/common";
import { createHash } from "node:crypto";
import type {
  Prisma,
  PublicationDelivery,
} from "../../generated/prisma/client.js";
import { requireOrderSupportAdmission } from "../../publication-delivery/domain/order-support.js";
@Injectable()
export class OrderHandlingAccess {
  async record(
    tx: Prisma.TransactionClient,
    actorId: string,
    customerId: string,
    delivery: PublicationDelivery,
    now: Date,
    input: {
      ticketId?: string | undefined;
      expectedTicketRevision?: number | undefined;
      resolveTicket: boolean;
      reason: string;
      idempotencyKey: string;
    },
  ) {
    // Identity and Delivery are held by the application; every order-ticket writer takes Delivery first.
    let ticket = await tx.supportTicket.findFirst({
      where: { publishingOrderId: delivery.orderId, status: "PROCESSING" },
    });
    if (input.ticketId) {
      if (
        !ticket ||
        ticket.id !== input.ticketId ||
        ticket.revision !== input.expectedTicketRevision
      )
        throw new ConflictException("工单已变化，请重新查看客户最新说明");
    } else if (ticket && input.resolveTicket)
      throw new ConflictException(
        "该订单已有待处理工单，请进入原工单确认后处理",
      );
    if (!ticket) {
      requireOrderSupportAdmission(delivery, now, false, false);
      ticket = await tx.supportTicket.create({
        data: {
          customerAccountId: customerId,
          publishingOrderId: delivery.orderId,
          subject: "订单处理",
          status: input.resolveTicket ? "RESOLVED" : "PROCESSING",
        },
      });
    } else {
      if (ticket.revision >= 2147483647)
        throw new ConflictException("工单版本已达上限，请核查");
      ticket = await tx.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: input.resolveTicket ? "RESOLVED" : "PROCESSING",
          revision: { increment: 1 },
        },
      });
    }
    await tx.supportEvent.create({
      data: {
        ticketId: ticket.id,
        actorAccountId: actorId,
        actorRole: "OPERATIONS",
        requestId: input.idempotencyKey,
        requestDigest: createHash("sha256")
          .update(JSON.stringify({ orderId: delivery.orderId, ...input }))
          .digest("hex"),
        action: input.resolveTicket ? "RESOLVE" : "REPLY",
        message: input.reason,
        ticketRevision: ticket.revision,
      },
    });
    return ticket.id;
  }
  async handledTicket(
    tx: Prisma.TransactionClient,
    actorId: string,
    key: string,
  ) {
    return (
      await tx.supportEvent.findUnique({
        where: {
          actorAccountId_requestId: { actorAccountId: actorId, requestId: key },
        },
      })
    )?.ticketId;
  }
}
