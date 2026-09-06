import type { WriterRequest, WriterResult } from "./writer.contract.js";

export const CORE_ARTICLE_WRITER = Symbol("CORE_ARTICLE_WRITER");

export interface CoreArticleWriter {
  write(request: WriterRequest): Promise<WriterResult>;
}
