import type { AiAttemptAdapter } from "../../domain/ai-attempt.adapter.js";
import type {
  AiAdapterResult,
  AiAttemptRequest,
  ResolvedAiAttemptRequest,
  ResolvedAiRoute,
} from "../../domain/ai-attempt.types.js";
import type { RealAiExecutionConfig } from "../ai-execution.config.js";
import { ArkProviderAdapter } from "./ark-provider.adapter.js";
import { ModelStudioProviderAdapter } from "./model-studio-provider.adapter.js";
import { ProviderHttpTransport } from "./provider-http.transport.js";
import { REAL_AI_ROUTES } from "./real-route.catalog.js";
import type {
  ProviderRouteAdapter,
  ProviderRouteDefinition,
} from "./provider-route.js";
import { QianfanProviderAdapter } from "./qianfan-provider.adapter.js";
import { TokenHubProviderAdapter } from "./tokenhub-provider.adapter.js";

type RegisteredRoute = {
  definition: ProviderRouteDefinition;
  adapter: ProviderRouteAdapter;
};

export class RealAiAttemptAdapter implements AiAttemptAdapter {
  private readonly routes = new Map<string, RegisteredRoute>();

  constructor(config: RealAiExecutionConfig) {
    const transport = new ProviderHttpTransport(config.requestTimeoutMs);
    const adapters: ProviderRouteAdapter[] = [
      new TokenHubProviderAdapter(config.tokenHub, transport),
      new ArkProviderAdapter(config.ark, transport),
      new ModelStudioProviderAdapter(config.modelStudio, transport),
      new QianfanProviderAdapter(config.qianfan, transport),
    ];
    const adaptersByProvider = new Map(
      adapters.map((adapter) => [adapter.providerKey, adapter]),
    );
    if (adaptersByProvider.size !== adapters.length) {
      throw new Error("Real AI provider adapters contain duplicate providers");
    }
    for (const definition of REAL_AI_ROUTES) {
      const adapter = adaptersByProvider.get(definition.providerKey);
      if (!adapter) {
        throw new Error(
          `No provider adapter for real AI route ${definition.routePolicyId}`,
        );
      }
      this.routes.set(definition.routePolicyId, { definition, adapter });
    }
  }

  resolve(request: AiAttemptRequest): ResolvedAiRoute {
    const route = this.requiredRoute(request);
    return {
      providerKey: route.definition.providerKey,
      serviceClass: route.definition.serviceClass,
      protocol: route.definition.protocol,
      requestedModel: route.definition.requestedModel,
    };
  }

  execute(request: ResolvedAiAttemptRequest): Promise<AiAdapterResult> {
    const route = this.requiredRoute(request);
    if (
      request.providerKey !== route.definition.providerKey ||
      request.serviceClass !== route.definition.serviceClass ||
      request.protocol !== route.definition.protocol
    ) {
      throw new Error(
        `Resolved AI route changed before execution: ${request.routePolicyId}`,
      );
    }
    return route.adapter.execute(request, route.definition);
  }

  private requiredRoute(request: AiAttemptRequest): RegisteredRoute {
    const route = this.routes.get(request.routePolicyId);
    if (!route) {
      throw new Error(`Unsupported real AI route ${request.routePolicyId}`);
    }
    if (route.definition.purpose !== request.purpose) {
      throw new Error(
        `AI route ${request.routePolicyId} does not support ${request.purpose}`,
      );
    }
    if (route.definition.requestedModel !== request.requestedModel) {
      throw new Error(
        `AI route ${request.routePolicyId} rejects model ${request.requestedModel}`,
      );
    }
    return route;
  }
}
