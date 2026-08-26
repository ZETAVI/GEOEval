#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_RUN_ID = `e0-${new Date().toISOString().replaceAll(/[-:.]/g, "")}`;
const PROBE_ROUTES = [
  "tokenhub-deepseek",
  "tokenhub-hy3",
  "doubao",
  "qwen",
  "ernie",
];
const PROBE_FIXTURES = ["R01", "R02", "R03"];
const OBJECTIVITY_INSTRUCTION_PROFILE = JSON.parse(
  await readFile(
    new URL(
      "../../apps/backend/geo-intelligence/evaluation-objectivity.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
if (
  typeof OBJECTIVITY_INSTRUCTION_PROFILE.id !== "string" ||
  typeof OBJECTIVITY_INSTRUCTION_PROFILE.version !== "string" ||
  typeof OBJECTIVITY_INSTRUCTION_PROFILE.content !== "string" ||
  !OBJECTIVITY_INSTRUCTION_PROFILE.content.trim()
) {
  throw new Error("Invalid evaluation objectivity instruction profile");
}
const evidenceRoot = path.resolve(
  process.env.E0_EVIDENCE_DIR ?? ".provider-evidence",
);

const fixtures = {
  R00: "这是一次接口资格检查。请只回复：OK",
  R01: [
    "请推荐广州天河区适合安静办公、可以喝手冲咖啡且价格适中的咖啡店，",
    "并简要说明推荐依据。请优先结合当前公开信息。",
  ].join(""),
  R02: [
    "以下是虚构测试资料：星河咖啡实验店位于广州天河区，是一家独立咖啡店，",
    "特点是安静办公区、手冲咖啡和适中价格。请仅根据这些资料，",
    "用两句话客观概括这家店。",
  ].join(""),
  R03: [
    "请根据以下虚构信息输出 Markdown，严格依次包含：二级标题、一个短段落、",
    "三项编号列表、以及两列表格。信息：星河咖啡实验店位于广州天河区，",
    "提供安静办公区、手冲咖啡，价格适中。",
  ].join(""),
};

const routeDefinitions = {
  "tokenhub-models": {
    provider: "tencent-tokenhub",
    serviceClass: "platform",
    credential: "TOKENHUB_API_KEY",
    method: "GET",
    expectedModels: ["deepseek-v4-flash", "hy3"],
    url: () =>
      `${baseUrl("TOKENHUB_BASE_URL", "https://tokenhub.tencentmaas.com/v1")}/models`,
  },
  "tokenhub-deepseek": {
    provider: "tencent-tokenhub",
    serviceClass: "platform",
    credential: "TOKENHUB_API_KEY",
    model: "deepseek-v4-flash",
    method: "POST",
    url: () =>
      `${baseUrl("TOKENHUB_BASE_URL", "https://tokenhub.tencentmaas.com/v1")}/chat/completions`,
    body: (input, fixture, instruction) => ({
      model: "deepseek-v4-flash",
      messages: [
        ...(instruction ? [{ role: "system", content: instruction }] : []),
        { role: "user", content: input },
      ],
      stream: false,
      ...(fixture === "R00"
        ? {}
        : {
            web_search_options: {
              enable: true,
              search_source: "lite",
              user_location: {
                type: "approximate",
                country: "CN",
                region: "Guangdong",
                city: "Guangzhou",
                timezone: "Asia/Shanghai",
              },
            },
          }),
    }),
  },
  "tokenhub-hy3": {
    provider: "tencent-tokenhub",
    serviceClass: "platform",
    credential: "TOKENHUB_API_KEY",
    model: "hy3",
    method: "POST",
    url: () =>
      `${baseUrl("TOKENHUB_BASE_URL", "https://tokenhub.tencentmaas.com/v1")}/responses`,
    body: (input, fixture, instruction) => ({
      model: "hy3",
      input,
      ...(instruction ? { instructions: instruction } : {}),
      stream: false,
      ...(fixture === "R00"
        ? {}
        : {
            tools: [
              {
                type: "web_search",
                search_source: "lite",
                search_context_size: "medium",
                user_location: {
                  type: "approximate",
                  country: "CN",
                  region: "Guangdong",
                  city: "Guangzhou",
                  timezone: "Asia/Shanghai",
                },
              },
            ],
          }),
    }),
  },
  doubao: {
    provider: "volcengine-ark",
    serviceClass: "ark-runtime",
    credential: "ARK_API_KEY",
    model: "doubao-seed-2-0-lite-260428",
    method: "POST",
    url: () =>
      `${baseUrl("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")}/responses`,
    body: (input, fixture, instruction) => ({
      model: "doubao-seed-2-0-lite-260428",
      input,
      ...(instruction ? { instructions: instruction } : {}),
      store: false,
      ...(fixture === "R00" ? { thinking: { type: "disabled" } } : {}),
      ...(fixture === "R00" ? {} : { tools: [{ type: "web_search" }] }),
    }),
  },
  qwen: {
    provider: "alibaba-model-studio",
    serviceClass: "pay-as-you-go",
    credential: "DASHSCOPE_API_KEY",
    model: "qwen3.7-flash",
    method: "POST",
    timeoutMs: 300_000,
    url: () =>
      `${baseUrl("DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")}/responses`,
    body: (input, fixture, instruction) => ({
      model: "qwen3.7-flash",
      input,
      ...(instruction ? { instructions: instruction } : {}),
      ...(fixture === "R00" ? { enable_thinking: false } : {}),
      ...(fixture === "R00" ? {} : { tools: [{ type: "web_search" }] }),
    }),
  },
  ernie: {
    provider: "baidu-qianfan",
    serviceClass: "v2-chat",
    credential: "QIANFAN_API_KEY",
    model: "ernie-4.5-turbo-128k",
    method: "POST",
    url: () =>
      `${baseUrl("QIANFAN_BASE_URL", "https://qianfan.baidubce.com/v2")}/chat/completions`,
    body: (input, fixture, instruction) => ({
      model: "ernie-4.5-turbo-128k",
      messages: [
        ...(instruction ? [{ role: "system", content: instruction }] : []),
        { role: "user", content: input },
      ],
      stream: false,
      ...(fixture === "R00"
        ? {}
        : {
            web_search: {
              enable: true,
              enable_trace: true,
              enable_citation: true,
              search_mode: "auto",
              search_number: 10,
              reference_number: 5,
            },
          }),
    }),
  },
};

function baseUrl(name, fallback) {
  return (process.env[name] || fallback).replace(/\/$/, "");
}

function parseArgs(argv) {
  const options = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      options._.push(value);
      continue;
    }
    const name = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options[name] = true;
      continue;
    }
    options[name] = next;
    index += 1;
  }
  return options;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function allObjects(value, output = []) {
  if (!value || typeof value !== "object") return output;
  output.push(value);
  if (Array.isArray(value)) {
    for (const item of value) allObjects(item, output);
  } else {
    for (const item of Object.values(value)) allObjects(item, output);
  }
  return output;
}

function firstString(objects, keys) {
  for (const object of objects) {
    for (const key of keys) {
      if (typeof object[key] === "string" && object[key].trim()) {
        return object[key];
      }
    }
  }
  return undefined;
}

function extractOutputText(response) {
  if (!response || typeof response !== "object") return undefined;
  if (typeof response.output_text === "string") return response.output_text;
  const chat = response.choices?.[0]?.message?.content;
  if (typeof chat === "string") return chat;
  const parts = allObjects(response)
    .filter(
      (item) => item.type === "output_text" && typeof item.text === "string",
    )
    .map((item) => item.text);
  return parts.length > 0 ? parts.join("") : undefined;
}

function summarizeResponse(response, headers) {
  if (!response || typeof response !== "object") {
    return {
      returnedModel: undefined,
      providerRequestId:
        headers["x-request-id"] ?? headers["x-tt-logid"] ?? undefined,
      outputTextSha256: undefined,
      outputCharacters: 0,
      searchObservation: "unknown",
      sourceCount: 0,
      reasoningEvidence: "not_returned",
      usage: undefined,
      availableModelIds: [],
    };
  }

  const objects = allObjects(response);
  const outputText = extractOutputText(response);
  const sources = objects.filter(
    (item) =>
      (typeof item.url === "string" || typeof item.uri === "string") &&
      (item.type === "url_citation" ||
        item.type === "url" ||
        item.type === "source" ||
        "title" in item ||
        "index" in item),
  );
  const explicitSearchCount =
    response.usage?.x_tools?.web_search?.count ??
    response.usage?.tool_usage?.web_search ??
    response.usage?.web_search_count;
  const searchCallPresent = objects.some(
    (item) =>
      item.type === "web_search_call" ||
      item.delta_tag === "search_status" ||
      Array.isArray(item.search_results),
  );
  const reasoning = firstString(objects, [
    "reasoning_content",
    "reasoning_summary",
    "summary_text",
  ]);

  return {
    returnedModel: response.model,
    providerRequestId:
      response.id ??
      headers["x-request-id"] ??
      headers["x-tt-logid"] ??
      undefined,
    outputTextSha256: outputText ? sha256(outputText) : undefined,
    outputCharacters: outputText?.length ?? 0,
    searchObservation:
      searchCallPresent || sources.length > 0 || explicitSearchCount > 0
        ? "triggered"
        : explicitSearchCount === 0
          ? "not_triggered"
          : "unknown",
    sourceCount: sources.length,
    reasoningEvidence: reasoning ? "returned" : "not_returned",
    usage: response.usage,
    availableModelIds: Array.isArray(response.data)
      ? response.data
          .map((item) => item?.id)
          .filter((item) => typeof item === "string")
      : [],
  };
}

function classifyFailure(status, aborted) {
  if (aborted) return "timeout";
  if (status === 400) return "invalid_request";
  if (status === 401) return "authentication";
  if (status === 403) return "entitlement_or_policy";
  if (status === 404) return "model_or_endpoint";
  if (status === 408 || status === 504) return "timeout";
  if (status === 429) return "rate_limit_or_quota";
  if (status >= 500) return "provider_unavailable";
  return status >= 400 ? "provider_error" : undefined;
}

async function writeProtected(file, contents) {
  await writeFile(file, contents, { encoding: "utf8", mode: 0o600 });
  await chmod(file, 0o600);
}

function publicResult(manifest) {
  return {
    route: manifest.route,
    fixture: manifest.fixture,
    result: manifest.terminalResult,
    httpStatus: manifest.httpStatus,
    failureClass: manifest.failureClass,
    requestedModel: manifest.requestedModel,
    instructionProfile: manifest.instructionProfile,
    returnedModel: manifest.returnedModel,
    identityObservation: manifest.identityObservation,
    durationMs: manifest.durationMs,
    timeoutMs: manifest.timeoutMs,
    outputCharacters: manifest.outputCharacters,
    searchObservation: manifest.searchObservation,
    sourceCount: manifest.sourceCount,
    reasoningEvidence: manifest.reasoningEvidence,
    usage: manifest.usage,
    responseSha256: manifest.responseSha256,
    outputTextSha256: manifest.outputTextSha256,
    evidence: manifest.rawEvidenceDirectory,
  };
}

async function loadProbeResults(runId) {
  const results = [];
  for (const route of PROBE_ROUTES) {
    for (const fixture of PROBE_FIXTURES) {
      const attemptDir = path.join(evidenceRoot, runId, route, fixture);
      const file = path.join(attemptDir, "manifest.json");
      try {
        const manifestText = await readFile(file, "utf8");
        const manifest = JSON.parse(manifestText);
        let result = publicResult(manifest);
        const correctionFile = path.join(
          attemptDir,
          "normalization-correction.json",
        );
        try {
          const correction = JSON.parse(await readFile(correctionFile, "utf8"));
          const validCorrection =
            correction.version === 1 &&
            correction.type === "normalization_correction" &&
            correction.targetManifestSha256 === sha256(manifestText) &&
            correction.responseSha256 === manifest.responseSha256 &&
            correction.field === "sourceCount" &&
            correction.originalValue === manifest.sourceCount &&
            Number.isInteger(correction.correctedValue) &&
            correction.correctedValue >= 0;
          if (!validCorrection) {
            throw new Error(
              `Invalid normalization correction: ${path.relative(process.cwd(), correctionFile)}`,
            );
          }
          result = {
            ...result,
            sourceCount: correction.correctedValue,
            evidenceCorrections: [
              {
                field: correction.field,
                originalValue: correction.originalValue,
                correctedValue: correction.correctedValue,
                record: path.relative(process.cwd(), correctionFile),
              },
            ],
          };
        } catch (error) {
          if (error?.code !== "ENOENT") throw error;
        }
        results.push(result);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
  }
  return results;
}

async function executeRoute(routeName, fixtureName, runId, instructionProfile) {
  const route = routeDefinitions[routeName];
  if (!route) throw new Error(`Unknown route: ${routeName}`);
  const credential = process.env[route.credential];
  if (!credential) {
    return {
      route: routeName,
      fixture: fixtureName,
      result: "blocked",
      failureClass: "missing_credential",
    };
  }
  const input = fixtures[fixtureName];
  if (route.method !== "GET" && !input) {
    throw new Error(`Unknown fixture: ${fixtureName}`);
  }

  const attemptId = randomUUID();
  const attemptDir = path.join(evidenceRoot, runId, routeName, fixtureName);
  await mkdir(attemptDir, { recursive: true, mode: 0o700 });
  await chmod(evidenceRoot, 0o700);
  await chmod(path.join(evidenceRoot, runId), 0o700);
  await chmod(path.join(evidenceRoot, runId, routeName), 0o700);
  await chmod(attemptDir, 0o700);

  const instructionProfileRecord = instructionProfile
    ? {
        id: instructionProfile.id,
        version: instructionProfile.version,
        contentSha256: sha256(instructionProfile.content),
      }
    : undefined;
  const requestBody = route.body?.(
    input,
    fixtureName,
    instructionProfile?.content,
  );
  const requestRecord = {
    attemptId,
    route: routeName,
    fixture: fixtureName,
    provider: route.provider,
    serviceClass: route.serviceClass,
    credentialReference: route.credential,
    method: route.method,
    url: route.url(),
    requestedModel: route.model,
    timeoutMs: route.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    instructionProfile: instructionProfileRecord,
    body: requestBody,
  };
  await writeProtected(
    path.join(attemptDir, "request.json"),
    `${JSON.stringify(requestRecord, null, 2)}\n`,
  );

  const startedAt = new Date();
  let response;
  let rawBody = "";
  let aborted = false;
  let networkError;
  try {
    response = await fetch(route.url(), {
      method: route.method,
      headers: {
        Authorization: `Bearer ${credential}`,
        Accept: "application/json",
        ...(route.method === "POST"
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined,
      signal: AbortSignal.timeout(route.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    rawBody = await response.text();
  } catch (error) {
    aborted = error?.name === "TimeoutError" || error?.name === "AbortError";
    networkError = error instanceof Error ? error.message : String(error);
  }
  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  const parsed = safeJsonParse(rawBody);
  const responseHeaders = Object.fromEntries(response?.headers.entries() ?? []);
  const summary = summarizeResponse(parsed, responseHeaders);
  const expectedModels = route.expectedModels ?? [];
  const missingExpectedModels = expectedModels.filter(
    (model) => !summary.availableModelIds.includes(model),
  );
  const identityObservation =
    expectedModels.length > 0
      ? missingExpectedModels.length === 0
        ? "matched"
        : "mismatched"
      : summary.returnedModel
        ? summary.returnedModel === route.model
          ? "matched"
          : "returned_different_identity"
        : "unknown";
  const failureClass = networkError
    ? (classifyFailure(0, aborted) ?? "network_error")
    : classifyFailure(response?.status ?? 0, false);

  await writeProtected(path.join(attemptDir, "response.body"), rawBody);
  await writeProtected(
    path.join(attemptDir, "response-headers.json"),
    `${JSON.stringify(responseHeaders, null, 2)}\n`,
  );
  const manifest = {
    version: 1,
    attemptId,
    route: routeName,
    fixture: fixtureName,
    provider: route.provider,
    serviceClass: route.serviceClass,
    credentialReference: route.credential,
    requestedModel: route.model,
    instructionProfile: instructionProfileRecord,
    returnedModel: summary.returnedModel,
    identityObservation,
    availableModelCount: summary.availableModelIds.length,
    missingExpectedModels,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs,
    timeoutMs: route.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    httpStatus: response?.status,
    providerRequestId: summary.providerRequestId,
    terminalResult: response?.ok && !networkError ? "observed" : "blocked",
    failureClass,
    networkError: networkError ? sha256(networkError) : undefined,
    responseSha256: sha256(rawBody),
    outputTextSha256: summary.outputTextSha256,
    outputCharacters: summary.outputCharacters,
    searchObservation: summary.searchObservation,
    sourceCount: summary.sourceCount,
    reasoningEvidence: summary.reasoningEvidence,
    usage: summary.usage,
    rawEvidenceDirectory: path.relative(process.cwd(), attemptDir),
  };
  await writeProtected(
    path.join(attemptDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  return {
    route: routeName,
    fixture: fixtureName,
    result: manifest.terminalResult,
    httpStatus: manifest.httpStatus,
    failureClass: manifest.failureClass,
    requestedModel: manifest.requestedModel,
    instructionProfile: manifest.instructionProfile,
    returnedModel: manifest.returnedModel,
    identityObservation: manifest.identityObservation,
    availableModelCount: manifest.availableModelCount,
    missingExpectedModels: manifest.missingExpectedModels,
    durationMs: manifest.durationMs,
    timeoutMs: manifest.timeoutMs,
    outputCharacters: manifest.outputCharacters,
    searchObservation: manifest.searchObservation,
    sourceCount: manifest.sourceCount,
    reasoningEvidence: manifest.reasoningEvidence,
    usage: manifest.usage,
    evidence: manifest.rawEvidenceDirectory,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const command = options._[0];
  const runId = String(
    options["run-id"] ?? process.env.E0_RUN_ID ?? DEFAULT_RUN_ID,
  );
  let work;

  if (command === "plan") {
    const plannedWork = [
      ["tokenhub-models", "R00"],
      ["doubao", "R00"],
      ["qwen", "R00"],
      ["ernie", "R00"],
    ];
    const plan = plannedWork.map(([routeName, fixture]) => {
      const route = routeDefinitions[routeName];
      return {
        route: routeName,
        provider: route.provider,
        method: route.method,
        url: route.url(),
        credentialReference: route.credential,
        requestedModel: route.model,
        timeoutMs: route.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        fixture,
        requestBody: route.body?.(fixtures[fixture], fixture),
      };
    });
    process.stdout.write(`${JSON.stringify({ calls: plan }, null, 2)}\n`);
    return;
  } else if (command === "probe-plan") {
    const plan = PROBE_ROUTES.flatMap((routeName) =>
      PROBE_FIXTURES.map((fixture) => {
        const route = routeDefinitions[routeName];
        return {
          route: routeName,
          provider: route.provider,
          method: route.method,
          url: route.url(),
          credentialReference: route.credential,
          requestedModel: route.model,
          timeoutMs: route.timeoutMs ?? DEFAULT_TIMEOUT_MS,
          fixture,
          requestBody: route.body(fixtures[fixture], fixture),
        };
      }),
    );
    process.stdout.write(`${JSON.stringify({ calls: plan }, null, 2)}\n`);
    return;
  } else if (command === "instruction-plan") {
    const plan = PROBE_ROUTES.map((routeName) => {
      const route = routeDefinitions[routeName];
      return {
        route: routeName,
        provider: route.provider,
        method: route.method,
        url: route.url(),
        credentialReference: route.credential,
        requestedModel: route.model,
        timeoutMs: route.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        fixture: "R02",
        instructionProfile: {
          id: OBJECTIVITY_INSTRUCTION_PROFILE.id,
          version: OBJECTIVITY_INSTRUCTION_PROFILE.version,
          contentSha256: sha256(OBJECTIVITY_INSTRUCTION_PROFILE.content),
        },
        requestBody: route.body(
          fixtures.R02,
          "R02",
          OBJECTIVITY_INSTRUCTION_PROFILE.content,
        ),
      };
    });
    process.stdout.write(`${JSON.stringify({ calls: plan }, null, 2)}\n`);
    return;
  } else if (command === "entitlement") {
    work = [
      ["tokenhub-models", "R00"],
      ["doubao", "R00"],
      ["qwen", "R00"],
      ["ernie", "R00"],
    ];
  } else if (command === "probe") {
    const route = String(options.route ?? "");
    const fixture = String(options.fixture ?? "");
    if (!route || !fixture) {
      throw new Error("probe requires --route and --fixture");
    }
    work = [[route, fixture]];
  } else if (command === "instruction-probe") {
    const route = String(options.route ?? "");
    if (!PROBE_ROUTES.includes(route)) {
      throw new Error("instruction-probe requires one supported --route");
    }
    work = [[route, "R02", OBJECTIVITY_INSTRUCTION_PROFILE]];
  } else if (command === "instruction-batch") {
    work = PROBE_ROUTES.map((route) => [
      route,
      "R02",
      OBJECTIVITY_INSTRUCTION_PROFILE,
    ]);
  } else if (command !== "report") {
    throw new Error(
      "Usage: e0-runner.mjs plan | probe-plan | instruction-plan | entitlement [--run-id ID] | probe --route ROUTE --fixture R01 | instruction-probe --route ROUTE | instruction-batch | report --run-id ID",
    );
  }

  const results = command === "report" ? await loadProbeResults(runId) : [];
  for (const [route, fixture, instructionProfile] of work ?? []) {
    results.push(await executeRoute(route, fixture, runId, instructionProfile));
  }
  if (results.length === 0) {
    throw new Error(`No probe manifests found for run: ${runId}`);
  }
  const runSummary = {
    runId,
    result: results.every((item) => item.result === "observed")
      ? "observed"
      : "partially_blocked",
    results,
  };
  const runDir = path.join(evidenceRoot, runId);
  await mkdir(runDir, { recursive: true, mode: 0o700 });
  await writeProtected(
    path.join(runDir, "summary.json"),
    `${JSON.stringify(runSummary, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(runSummary, null, 2)}\n`);
  if (runSummary.result !== "observed") process.exitCode = 2;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`E0 runner failed: ${message}\n`);
  process.exitCode = 1;
});
