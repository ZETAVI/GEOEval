# Source Brief: Langfuse JS/TS v5 Controlled Observation Content

## Recommendation

Use the already locked `@langfuse/tracing` and `@langfuse/otel` 5.11.0
observation-level input/output interfaces. Keep the existing batched
OpenTelemetry runtime, add content only through an explicit local/test policy,
and make the final mask aware that Langfuse supplies serialized attribute
values. Confidence is high for the locked package boundary.

## Decision Constraints

- Production and default configuration must remain metadata-only.
- The implementation must not call a Provider or add Prompt management.
- Credentials, raw Provider envelopes, and reasoning chains must remain masked
  even when local diagnostic content is enabled.
- Export or shutdown failure must remain downstream of business Attempt state.

## Evidence

| Claim | Primary source | Version/date | Design implication |
| --- | --- | --- | --- |
| JS/TS v5 supports observation-level input/output and recommends placing new input/output on the root observation rather than deprecated trace IO | [Langfuse SDK overview](https://langfuse.com/docs/observability/sdk/overview), [JS/TS v4 to v5](https://langfuse.com/docs/observability/sdk/upgrade-path/js-v4-to-v5) | Current docs accessed 2026-09-02 | Keep the existing Generation observation and set its attributes directly. |
| `LangfuseGenerationAttributes` accepts `input`/`output`; `startObservation(..., {asType: "generation"})` returns an updateable Generation | Installed `@langfuse/tracing` type declarations selected by `pnpm-lock.yaml` | 5.11.0 inspected 2026-09-02 | No dependency or API migration is required. |
| The tracing package serializes non-string input/output before placing them on OTel attributes | Installed `@langfuse/tracing` `dist/index.mjs` and source map (`src/attributes.ts`) | 5.11.0 inspected 2026-09-02 | Tests and mask logic must exercise stringified JSON, not only objects. |
| The JS/TS span-processor mask runs on the stringified input, output, and metadata values before export | [Langfuse advanced features](https://langfuse.com/docs/observability/sdk/advanced-features) and installed `@langfuse/otel` processor | 5.11.0/current docs accessed 2026-09-02 | Parse, recursively sanitize, and reserialize JSON; also mask inline secret forms. |
| The processor supports environment and release tags, batched export, `forceFlush`, and graceful `shutdown` | Installed `@langfuse/otel` type declarations; [Langfuse instrumentation](https://langfuse.com/docs/observability/sdk/instrumentation) | 5.11.0/current docs accessed 2026-09-02 | Pass optional release/revision at runtime and retain `NodeSDK.shutdown()` for Worker exit. |
| The configured Langfuse Cloud project stores the controlled projection as Generation I/O and exposes it through Observations API v2 | Credentialed fictional smoke plus [Observations API v2](https://langfuse.com/docs/api-and-data-platform/features/observations-api) | `us.cloud.langfuse.com`, 2026-09-02 | Account, route, release, metadata-only, local-diagnostic, and final mask behavior are observed rather than inferred from configuration. |

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| Observation-level input/output on the existing Generation | Adopt | Exact locked API, smallest change, and consistent with v5 observations-first guidance. |
| Deprecated trace-level IO | Reject | Adds no value for one-Generation traces and is explicitly legacy. |
| Full automatic instrumentation or Prompt management | Reject | Broadens scope and data handling without addressing the local diagnostic gate. |
| Complete Provider request/response export | Reject | Duplicates protected Attempt evidence and creates credential/raw/reasoning exposure. |

## Unknowns and Validation

- Langfuse UI presentation can drift independently of the SDK. The live
  Observations API v2 read-back proves stored Generation I/O and metadata, but a
  signed-in visual UI inspection remains not run and is not required for the
  non-UI telemetry contract.
- Project-specific retention and access control are not approved. Therefore the
  mode remains unavailable in production rather than inferred from account
  configuration.

## Reuse and Refresh Boundary

- Reusable while: the project remains on `@langfuse/tracing` and
  `@langfuse/otel` 5.11.0, keeps the same OTel processor route, and the decision
  remains local/test-only content capture.
- Refresh when: either package version changes, the Langfuse server/route or
  account changes, production content/retention is proposed, or the projection
  starts including Provider evidence or new sensitive fields.
