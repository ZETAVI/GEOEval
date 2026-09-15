import type { IncomingMessage } from "node:http";
import {
  BadRequestException,
  Controller,
  HttpCode,
  Inject,
  PayloadTooLargeException,
  Post,
  Req,
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

@Controller("recharges/providers/wechat")
export class WechatNotificationController {
  constructor(
    @Inject(ReceivePaymentNotificationService)
    private readonly receive: ReceivePaymentNotificationService,
  ) {}

  @Post("notify")
  @PublicAccess()
  @CsrfExempt()
  @HttpCode(204)
  async notify(@Req() request: RawBodyRequest<IncomingMessage>): Promise<void> {
    const headers = request.headersDistinct;
    const encoding = headers["content-encoding"];
    if (
      encoding &&
      (encoding.length !== 1 || encoding[0]?.toLowerCase() !== "identity")
    )
      throw new UnsupportedMediaTypeException("NOTIFICATION_ENCODING");
    if (
      headers["content-type"]?.length !== 1 ||
      !/^application\/json(?:\s*;|$)/i.test(headers["content-type"][0]!)
    )
      throw new UnsupportedMediaTypeException("NOTIFICATION_CONTENT_TYPE");
    if (!Buffer.isBuffer(request.rawBody))
      throw new ServiceUnavailableException("NOTIFICATION_RAW_BODY_REQUIRED");
    if (request.rawBody.length > 2 * 1024 * 1024)
      throw new PayloadTooLargeException("NOTIFICATION_SIZE");
    const result = await this.receive.receive("WECHAT", {
      headers,
      rawBody: request.rawBody,
    });
    if (result === "UNAUTHENTICATED")
      throw new UnauthorizedException("NOTIFICATION_AUTHENTICATION");
    if (result === "INVALID")
      throw new BadRequestException("NOTIFICATION_INVALID");
    if (result === "RETRY")
      throw new ServiceUnavailableException("NOTIFICATION_RETRY");
  }
}
