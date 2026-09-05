import {
  ForbiddenException,
  Inject,
  Injectable,
  UnsupportedMediaTypeException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { ApiConfig } from "../../config/runtime-config.js";
import { IDENTITY_CONFIG } from "../application/identity.config.js";
import { CSRF_EXEMPT } from "./access.metadata.js";
import type { IdentityHttpRequest } from "./identity-http.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(IDENTITY_CONFIG) private readonly config: ApiConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<IdentityHttpRequest>();
    if (safeMethods.has(request.method.toUpperCase())) return true;
    const isExempt = this.reflector.getAllAndOverride<boolean>(CSRF_EXEMPT, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isExempt) return true;

    const contentType = header(request, "content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("application/json")) {
      throw new UnsupportedMediaTypeException({
        code: "JSON_CONTENT_TYPE_REQUIRED",
        message: "状态变更请求必须使用 application/json",
      });
    }
    if (header(request, "x-geoeval-request") !== "1") {
      throw new ForbiddenException({
        code: "APPLICATION_HEADER_REQUIRED",
        message: "缺少应用请求标识",
      });
    }
    const origin = header(request, "origin");
    if (!origin || !this.config.corsOrigins.includes(origin)) {
      throw new ForbiddenException({
        code: "ORIGIN_FORBIDDEN",
        message: "请求来源不受信任",
      });
    }
    return true;
  }
}

function header(
  request: IdentityHttpRequest,
  name: string,
): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}
