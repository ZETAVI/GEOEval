import type { ResolvedAiAttemptRequest } from "../../domain/ai-attempt.types.js";
import type { RealProviderConnection } from "../ai-execution.config.js";
import type { ProviderHttpTransport } from "./provider-http.transport.js";
import {
  executeProviderJsonRequest,
  type ProviderRouteAdapter,
  type ProviderRouteDefinition,
} from "./provider-route.js";

export class QianfanProviderAdapter implements ProviderRouteAdapter {
  readonly providerKey = "baidu-qianfan";

  constructor(
    private readonly connection: RealProviderConnection,
    private readonly transport: ProviderHttpTransport,
  ) {}

  execute(request: ResolvedAiAttemptRequest, route: ProviderRouteDefinition) {
    if (request.purpose !== "EVALUATION_ACQUISITION") {
      throw new Error("Qianfan sampling route received a structured purpose");
    }
    return executeProviderJsonRequest({
      request,
      definition: route,
      connection: this.connection,
      transport: this.transport,
      path: "/chat/completions",
      body: {
        model: route.requestedModel,
        messages: [
          { role: "system", content: request.input.systemInstruction },
          { role: "user", content: request.input.query },
        ],
        stream: false,
        web_search: {
          enable: true,
          enable_trace: true,
          enable_citation: true,
          search_mode: "auto",
          search_number: 10,
          reference_number: 5,
        },
      },
    });
  }
}
