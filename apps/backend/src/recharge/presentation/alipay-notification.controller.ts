import type { IncomingMessage } from "node:http";
import {
  BadRequestException,
  Controller,
  HttpCode,
  Inject,
  PayloadTooLargeException,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
  UnsupportedMediaTypeException,
  type RawBodyRequest,
} from "@nestjs/common";
import {
  CsrfExempt,
  PublicAccess,
} from "../../identity/access/access.metadata.js";
import { ReceivePaymentNotificationService } from "../application/receive-payment-notification.service.js";

type AckResponse = {
  status(code: number): AckResponse;
  type(value: string): AckResponse;
  set(name: string, value: string): AckResponse;
  send(value: string): void;
};

@Controller("recharges/providers/alipay")
export class AlipayNotificationController {
  constructor(
    @Inject(ReceivePaymentNotificationService)
    private readonly receive: ReceivePaymentNotificationService,
  ) {}

  @Post("notify")
  @PublicAccess()
  @CsrfExempt()
  @HttpCode(200)
  async notify(
    @Req() request: RawBodyRequest<IncomingMessage>,
    @Res() response: AckResponse,
  ): Promise<void> {
    const headers = request.headersDistinct,
      encoding = headers["content-encoding"];
    if (
      encoding &&
      (encoding.length !== 1 || encoding[0]?.toLowerCase() !== "identity")
    )
      throw new UnsupportedMediaTypeException("NOTIFICATION_ENCODING");
    if (
      headers["content-type"]?.length !== 1 ||
      !/^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(
        headers["content-type"][0]!,
      )
    )
      throw new UnsupportedMediaTypeException("NOTIFICATION_CONTENT_TYPE");
    if (!Buffer.isBuffer(request.rawBody))
      throw new ServiceUnavailableException("NOTIFICATION_RAW_BODY_REQUIRED");
    if (request.rawBody.length > 64 * 1024)
      throw new PayloadTooLargeException("NOTIFICATION_SIZE");
    const result = await this.receive.receive("ALIPAY", {
      headers,
      rawBody: request.rawBody,
    });
    if (result === "UNAUTHENTICATED")
      throw new UnauthorizedException("NOTIFICATION_AUTHENTICATION");
    if (result === "INVALID")
      throw new BadRequestException("NOTIFICATION_INVALID");
    if (result === "RETRY")
      throw new ServiceUnavailableException("NOTIFICATION_RETRY");
    response
      .status(200)
      .type("text/plain")
      .set("Cache-Control", "no-store")
      .send("success");
  }
}
