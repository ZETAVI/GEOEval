# Design: Browser Sampling Gateway and Durable Platform Batches

## Outcome and Boundary

- GEO Intelligence remains the owner of the twenty logical samples, accepted
  answers, interpretations, readiness and reports.
- The independent control plane is an external execution dependency. It owns
  browser identities, account writer locks, login recovery, page automation,
  node selection and browser-result verification.
- Background Work delivers stable identifiers and may defer the same job while
  the external task is running; it does not own polling truth.
- AI Execution continues to own append-oriented per-sample attempt evidence.

The integration sends only platform, account alias and one-to-four question
texts. It receives task state and normalized result items. Credentials, Cookies,
Profile IDs, Live View URLs, node IDs and browser implementation metadata never
enter this port.

Provider-API acquisition can transport the versioned objectivity system
instruction. A consumer Web/App surface cannot. Browser-mode attempt evidence
therefore records only what was actually sent: the immutable generated question
identity and external result reference. It does not fabricate a system Prompt
to make the two execution mechanisms look identical.

## Current facts

- One official run has four questions and five platform positions per question.
- The control plane accepts exactly one of `prompt` or `prompts`; a batch accepts
  one to four prompts and requires `Idempotency-Key`.
- A verified result item is complete, assistant-role, non-empty and not a query
  echo. Its completion is `CAPTURED`, `CAPTURED_LATE` or `FAILED`.
- The latest retained real control-plane check captured sixteen of twenty items:
  four platforms completed four of four and Doubao failed four submissions.
  This is useful partial evidence, not a twenty-of-twenty success claim.
- Cold startup was materially longer than collection and therefore must not be
  hidden inside a synchronous HTTP request or elapsed-time progress estimate.

## Chosen lifecycle

### Initialization

When browser-control-plane mode is enabled, the run-start transaction creates
five `EvaluationSamplingBatch` records, one for each platform represented by
the immutable samples. Each record stores:

- run, cycle and platform identity;
- configured control-plane account alias;
- a deterministic SHA-256 idempotency key derived from run and execution-cycle
  identity, question definition/version, platform and account;
- expected/acquired/failed/late counts;
- external task identity and terminal timestamps when known.

The same transaction appends one platform-acquisition Outbox fact per batch.
Repeated run-start delivery cannot create another batch or idempotency key.

### Submit and poll

The first delivery submits the four ordered question texts. After a response,
GEOEval persists the external task ID before deferring the same durable work.
If the submit response is lost, a later delivery repeats the same request with
the same idempotency key; it never invents a new key.

Subsequent deliveries read task status. Non-terminal status returns a short
`DEFERRED` result so BullMQ moves the existing job rather than holding a Worker
for the collection window. Process restart recovery comes from the persisted
batch and still-incomplete Outbox fact, not from memory.

### Result projection

At terminal status, GEOEval fetches the result and matches each item by its
zero-based prompt index to the already ordered sample identities.

- `CAPTURED` and `CAPTURED_LATE` create or recover one successful
  `EVALUATION_ACQUISITION` attempt, accept the Markdown answer as canonical
  evidence, and append interpretation work. Late items remain valid evidence
  and increment the batch late count.
- `FAILED`, a missing index, a non-assistant result, an empty answer or an exact
  query echo create one failed acquisition attempt and exhaust only that sample.
- A terminal task-level failure with no usable items exhausts the unresolved
  samples with the returned stable failure class.
- Successfully accepted samples are never replayed when siblings fail.

The acquisition attempt snapshots only business-relevant provenance: external
task identity, result index, platform, completion status, safe timings and
failure class. It does not store browser credentials or control-plane private
execution payloads.

## Contracts

The inward-facing port supports:

```text
submitBatch(platform, accountId, prompts, idempotencyKey, deadlineMs)
  -> externalTaskId

readBatch(externalTaskId)
  -> RUNNING(status/progress)
   | TERMINAL(taskStatus, items[], failureCode/message)
```

The HTTP adapter maps this port to:

- `POST /api/v1/tasks`;
- `GET /api/v1/tasks/:id/status`;
- `GET /api/v1/tasks/:id/result`.

The adapter validates all remote JSON with a tolerant envelope and strict
business fields. It never logs Authorization values, prompts, answers or raw
remote bodies. An optional bearer token is startup-only secret configuration.

## Failure and recovery

| Failure | Classification | Recovery |
| --- | --- | --- |
| submit response lost | ambiguous transport | repeat same idempotency key |
| status/result temporarily unavailable | transient dependency | defer same job; no new submission |
| auth expired or verification challenge | human action required | mark affected samples unavailable; control plane owns login recovery |
| DOM drift/submission/generation failure | platform execution failure | preserve partial success; no uncertain replay |
| missing/duplicate result index | remote contract failure | reject that item deterministically |
| Worker/process restart | delivery interruption | reconcile persisted batch and Outbox fact |
| control-plane mode misconfigured | startup failure | consume no work |

The external failure vocabulary is bounded to `NETWORK`,
`REGION_RESTRICTED`, `AUTH_EXPIRED`, `VERIFICATION_CHALLENGE`, `DOM_DRIFT`,
`PLATFORM_SUBMISSION_FAILED`, `PLATFORM_GENERATION_FAILED`, `TIMEOUT`,
`ANSWER_ECHOED_QUERY` and `REMOTE_BROWSER_FAILED`; unknown values normalize to
`REMOTE_BROWSER_FAILED` without exposing raw content.

## Configuration and security

- `EVALUATION_SAMPLING_MODE=ai-provider|browser-control-plane` selects the
  acquisition seam; `ai-provider` is the default.
- Browser mode requires an HTTPS control-plane base URL outside tests and a
  non-empty account alias. An optional bearer token remains secret.
- Request timeout, poll interval and collection deadline are bounded startup
  values. The reviewed collection target is 85 seconds; late-capture grace is
  enforced by the control plane.
- No provider key, account credential, login URL, Cookie, Profile or node route
  is stored or logged by GEOEval.

## Migration and rollback

The migration adds a batch status enum and `evaluation_sampling_batches` table;
it does not rewrite historical samples. The table is append-oriented and bound
to one execution cycle. Rollback sets sampling mode to `ai-provider`; code and
schema may remain in place. Removing the table is a later destructive migration
and is not part of rollback.

## Alternatives rejected

- Calling the control plane once per sample loses its four-question page-pool
  batching and makes account locking less efficient.
- Treating external tasks as a second business sample model duplicates GEO
  Intelligence ownership.
- Waiting synchronously for up to 100 seconds consumes Worker capacity and
  recreates the BullMQ lock problem.
- Making accepted evidence point directly to an external task would bypass the
  existing successful-attempt integrity constraint and audit history.
- Copying browser SDKs or account state into GEOEval reverses the approved
  infrastructure boundary.
