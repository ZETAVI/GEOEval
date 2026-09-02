# Design: Controlled Local Langfuse Diagnostic Content

## Decision

Extend the existing Langfuse follower rather than adding a second telemetry
pipeline or store. The runtime accepts two content modes:

- `metadata-only`: the default in every environment and the only allowed mode
  in production; the Generation observation has no input or output attributes.
- `local-diagnostic`: an explicit development/test-only mode; the Generation
  receives a versioned, purpose-aware input projection and a versioned
  normalized success or failure projection.

The mode is an export policy, not business state. It never participates in
Attempt identity, persistence, retry, acceptance, or report projection.

## Ownership and Data Path

1. Runtime Config validates `AI_TELEMETRY_CONTENT_MODE`, rejects
   `local-diagnostic` in production, and supplies optional release/revision
   tagging to the existing `LangfuseSpanProcessor`.
2. `LangfuseAiAttemptTelemetry` receives the resolved policy. In metadata-only
   mode it preserves the current behavior. In local-diagnostic mode it sets:
   - input: projection schema version, purpose, the exact system instruction and
     its SHA-256 content fingerprint, the task fields required to reproduce the
     Agent request, and the structured output contract version/schema when
     applicable;
   - output: projection schema version plus either the normalized adapter output
     or a failure class/retryability summary.
3. The adapter's explicit projection allowlist is the primary content boundary:
   metadata-only never sets input/output, and its metadata contains only the
   enumerated technical fields. `AiTelemetryRuntime` is the final outbound
   defense. It masks the Langfuse 5.11.0 serialized input, output, and metadata
   values before export. Credential-like nested keys and inline
   bearer/API-key/secret forms, raw Provider envelopes, and reasoning-chain
   fields are always removed. The mask cannot infer a top-level metadata key
   after Langfuse has flattened it, so no unreviewed metadata map is passed to
   the SDK.
4. `SafeAiAttemptTelemetry` and `AiTelemetryRuntime` retain their existing
   best-effort failure handling. Export start, finish, flush, or shutdown failure
   writes only a sanitized warning and cannot change an Attempt.

## Projection Boundary

The diagnostic projection may contain fictional or explicitly controlled local
brand/task content because the mode cannot start in production. It never copies
Provider evidence, response headers, sources, sanitized requests, raw response,
reasoning text, or credentials. Success output uses only `AiAdapterResult.output`,
which is already the provider-neutral normalized result. Failure output uses only
stable classification and retryability.

The projection carries its own schema version. Existing Prompt assets and model
output contracts remain owned by GEO Intelligence; this change reads their
already-resolved content and version fields from the existing request and does
not import GEO internals into AI Execution.

## Langfuse 5.11.0 Interface

The locked SDK supports observation-level `input` and `output` on
`LangfuseGenerationAttributes`, both at `startObservation` and `update`. The SDK
serializes non-string values before the span processor invokes `mask`, so the
mask must parse JSON strings, sanitize recursively, and reserialize them. If
parsing fails, inline secret patterns are still removed; a mask exception must
fail closed rather than pass through the original value. `NodeSDK.shutdown()`
is retained to flush batched export on Worker shutdown.

## Alternatives

- Always export content: rejected because it silently authorizes production
  customer-data transfer and contradicts #39/#44.
- Reuse a single permissive mask in all environments: rejected because a
  production configuration mistake could expose content.
- Export complete Provider requests/responses: rejected because the Attempt
  envelope already owns protected evidence and may contain credentials,
  sources, raw envelopes, or reasoning content.
- Add Prompt management or a telemetry database: rejected because neither is
  needed to make the existing local Generation useful.

## Risks and Reversal

- A new nested credential key could escape a denylist. The controlled projection
  minimizes this risk, tests serialized nested payloads and inline secret forms,
  and keeps raw/provider/reasoning fields denied in both modes.
- Large structured contexts can make local traces expensive. This first slice
  deliberately captures only explicitly enabled local/test observations; size
  limits or retention policy belong to a later evidence-backed change.
- Reversal is configuration-first: return to `metadata-only` or disable
  telemetry. Code rollback removes the private mode and projections without a
  migration or business-data repair.

## Reconciliation

Before this change is presented as complete, the accepted environment,
projection, masking, and non-blocking behavior moves into the current
evaluation-evidence spec. The implementation and tests remain the executable
owners; this design is archived only after later merge/close authorization.

## Architecture Review

- Revision: proposal/design/delta created for Issue #44 on 2026-09-02.
- Result: `ready` after clarifying that the adapter allowlist, not the
  value-only Langfuse mask callback, is the primary content policy.
- Ownership: Runtime Config owns environment policy; the AI Execution telemetry
  adapter owns projections; the OTel runtime owns export hygiene and lifecycle;
  PostgreSQL Attempt owners remain unchanged.
- Dependency direction: no import from GEO Intelligence internals, Provider
  adapter, persistence, or Worker scheduler is introduced. Existing resolved
  request/result contracts are sufficient.
- Residual risk: a future projection field may contain a new secret shape. The
  changed action is to extend the controlled projection/mask tests before adding
  that field; production remains protected by the startup guard and metadata-only
  default.
- Findings after correction: no remaining `must-fix` or `should-fix` item.
