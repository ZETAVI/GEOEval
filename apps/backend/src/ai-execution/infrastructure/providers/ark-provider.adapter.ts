import type {
  AcquisitionAttemptInput,
  ResolvedAiAttemptRequest,
} from "../../domain/ai-attempt.types.js";
import type { RealProviderConnection } from "../ai-execution.config.js";
import type { ProviderHttpTransport } from "./provider-http.transport.js";
import {
  executeProviderJsonRequest,
  type ProviderRouteAdapter,
  type ProviderRouteDefinition,
} from "./provider-route.js";

export class ArkProviderAdapter implements ProviderRouteAdapter {
  readonly providerKey = "volcengine-ark";

  constructor(
    private readonly connection: RealProviderConnection,
    private readonly transport: ProviderHttpTransport,
  ) {}

  execute(request: ResolvedAiAttemptRequest, route: ProviderRouteDefinition) {
    if (request.purpose !== "EVALUATION_ACQUISITION") {
      throw new Error("Ark sampling route received a structured purpose");
    }
    if (request.input.taskKind !== "EVALUATION_ACQUISITION") {
      throw new Error("Ark cannot execute a recorded browser acquisition");
    }
    return executeProviderJsonRequest({
      request,
      definition: route,
      connection: this.connection,
      transport: this.transport,
      path: "/responses",
      body: createArkAcquisitionBody(route, request.input),
    });
  }
}

export function createArkAcquisitionBody(
  route: ProviderRouteDefinition,
  input: AcquisitionAttemptInput,
) {
  return {
    model: route.requestedModel,
    input: input.query,
    instructions: input.systemInstruction,
    store: false,
    tools: [{ type: "web_search" }],
  };
}
