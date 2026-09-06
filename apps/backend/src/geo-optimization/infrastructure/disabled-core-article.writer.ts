import { Injectable } from "@nestjs/common";

import type { WriterRequest, WriterResult } from "../domain/writer.contract.js";
import type { CoreArticleWriter } from "../domain/writer.port.js";

@Injectable()
export class DisabledCoreArticleWriter implements CoreArticleWriter {
  async write(_request: WriterRequest): Promise<WriterResult> {
    throw new Error("Core Article Writer is disabled");
  }
}
