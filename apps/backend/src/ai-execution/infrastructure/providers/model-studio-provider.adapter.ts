import type {
  ResolvedAiAttemptRequest,
  StructuredOutputAttemptInput,
} from "../../domain/ai-attempt.types.js";
import type { RealProviderConnection } from "../ai-execution.config.js";
import type { ProviderHttpTransport } from "./provider-http.transport.js";
import {
  executeProviderJsonRequest,
  type ProviderRouteAdapter,
  type ProviderRouteDefinition,
} from "./provider-route.js";

export class ModelStudioProviderAdapter implements ProviderRouteAdapter {
  readonly providerKey = "alibaba-model-studio";

  constructor(
    private readonly connection: RealProviderConnection,
    private readonly transport: ProviderHttpTransport,
  ) {}

  execute(
    request: ResolvedAiAttemptRequest,
    definition: ProviderRouteDefinition,
  ) {
    if (request.purpose === "EVALUATION_ACQUISITION") {
      return executeProviderJsonRequest({
        request,
        definition,
        connection: this.connection,
        transport: this.transport,
        path: "/responses",
        body: {
          model: definition.requestedModel,
          input: request.input.query,
          instructions: request.input.systemInstruction,
          tools: [{ type: "web_search" }],
        },
      });
    }
    if (definition.protocol !== "chat-completions") {
      throw new Error(
        "Model Studio structured route requires Chat Completions",
      );
    }
    return executeProviderJsonRequest({
      request,
      definition,
      connection: this.connection,
      transport: this.transport,
      path: "/chat/completions",
      body: structuredChatBody(definition, request.input),
    });
  }
}

function structuredChatBody(
  definition: ProviderRouteDefinition,
  input: StructuredOutputAttemptInput,
) {
  return {
    model: definition.requestedModel,
    messages: [
      { role: "system", content: input.systemInstruction },
      { role: "user", content: JSON.stringify(input.userContext) },
    ],
    enable_thinking: true,
    ...(definition.structuredReasoningEffort
      ? { reasoning_effort: definition.structuredReasoningEffort }
      : {}),
    response_format: {
      type: "json_schema",
      json_schema: {
        name: input.outputContract.version
          .replaceAll(/[^a-zA-Z0-9_-]/g, "_")
          .slice(0, 64),
        strict: true,
        schema: input.outputContract.jsonSchema,
      },
    },
  };
}
