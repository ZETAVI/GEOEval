import type {
  ResolvedAiAttemptRequest,
  AcquisitionAttemptInput,
  StructuredOutputAttemptInput,
} from "../../domain/ai-attempt.types.js";
import type { RealProviderConnection } from "../ai-execution.config.js";
import type { ProviderHttpTransport } from "./provider-http.transport.js";
import {
  executeProviderJsonRequest,
  type ProviderRouteAdapter,
  type ProviderRouteDefinition,
} from "./provider-route.js";

export class TokenHubProviderAdapter implements ProviderRouteAdapter {
  readonly providerKey = "tencent-tokenhub";

  constructor(
    private readonly connection: RealProviderConnection,
    private readonly transport: ProviderHttpTransport,
  ) {}

  execute(
    request: ResolvedAiAttemptRequest,
    definition: ProviderRouteDefinition,
  ) {
    if (definition.protocol === "chat-completions") {
      if (request.purpose !== "EVALUATION_ACQUISITION") {
        throw new Error("TokenHub Chat route received a structured purpose");
      }
      if (request.input.taskKind !== "EVALUATION_ACQUISITION") {
        throw new Error(
          "TokenHub cannot execute a recorded browser acquisition",
        );
      }
      return executeProviderJsonRequest({
        request,
        definition,
        connection: this.connection,
        transport: this.transport,
        path: "/chat/completions",
        body: createTokenHubAcquisitionBody(definition, request.input),
      });
    }
    const body =
      request.purpose === "EVALUATION_ACQUISITION"
        ? (() => {
            if (request.input.taskKind !== "EVALUATION_ACQUISITION") {
              throw new Error(
                "TokenHub cannot execute a recorded browser acquisition",
              );
            }
            return createTokenHubAcquisitionBody(definition, request.input);
          })()
        : createTokenHubStructuredBody(definition, request.input);
    return executeProviderJsonRequest({
      request,
      definition,
      connection: this.connection,
      transport: this.transport,
      path: "/responses",
      body,
    });
  }
}

export function createTokenHubAcquisitionBody(
  definition: ProviderRouteDefinition,
  input: AcquisitionAttemptInput,
) {
  if (definition.protocol === "chat-completions")
    return {
      model: definition.requestedModel,
      messages: [
        { role: "system", content: input.systemInstruction },
        { role: "user", content: input.query },
      ],
      stream: false,
      web_search_options: {
        enable: true,
        search_source: "lite",
        user_location: location(input),
      },
    };
  return {
    model: definition.requestedModel,
    input: input.query,
    instructions: input.systemInstruction,
    stream: false,
    tools: [
      {
        type: "web_search",
        search_source: "lite",
        search_context_size: "medium",
        user_location: location(input),
      },
    ],
  };
}

export function createTokenHubStructuredBody(
  definition: ProviderRouteDefinition,
  input: StructuredOutputAttemptInput,
) {
  return {
    model: definition.requestedModel,
    input: JSON.stringify(input.userContext),
    instructions: input.systemInstruction,
    stream: false,
    text: {
      format: {
        type: "json_schema",
        name: schemaName(input.outputContract.version),
        schema: input.outputContract.jsonSchema,
      },
    },
  };
}

function schemaName(version: string) {
  return version.replaceAll(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

function location(input: {
  province: string;
  city: string;
}): Record<string, string> {
  return {
    type: "approximate",
    country: "CN",
    region: input.province,
    city: input.city,
    timezone: "Asia/Shanghai",
  };
}
