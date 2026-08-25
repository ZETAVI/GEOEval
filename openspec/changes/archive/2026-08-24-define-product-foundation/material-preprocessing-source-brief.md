# Source Brief: Promotional-material preprocessing

- Decision: Whether Alibaba Cloud Model Studio Qwen3.7 Flash is a suitable
  primary model candidate for preparing optional brand materials into writing
  context
- Affected change: `define-product-foundation`
- Researched: 2026-08-19
- Status: Recommended validation candidate; actual company-account behavior,
  representative-material quality, and final architecture remain unverified

## Recommendation

Use `qwen3.7-flash-2026-07-15` as the primary candidate for interpreting images
and already extracted text, then producing the structured material digest needed
by the writing assistant. Its documented image and text inputs, long context,
general image OCR and understanding, Function Calling, and structured output are
a strong fit, while current Beijing pricing supports the intended cost-sensitive
role.

Do not model the capability as "send every raw file directly to Qwen3.7 Flash."
Keep file ingestion and document extraction separate from semantic preparation:

1. validate the uploaded file and extract text and layout through a document
   parser when the source is a PDF or text document;
2. render or extract pages and embedded images when visual meaning matters;
3. use Qwen3.7 Flash to interpret relevant visuals and extracted content and to
   normalize them into one source-linked structured digest;
4. mark conflicting, uncertain, or unreadable content rather than turning it
   into an asserted brand fact.

Alibaba Cloud's dedicated native PDF-understanding interface currently documents
`qwen3.8-max`, not Qwen3.7 Flash. A separate PDF extraction or page-rendering
path is therefore required unless a controlled company-account test proves an
additional supported route. Difficult scanned or visually complex PDFs may need
a separately evaluated fallback, but that should be earned by corpus results
rather than included by default.

## Decision Constraints

- The product needs a reusable writing digest, not a customer-facing knowledge
  base and not an unexamined collection of files.
- Original materials and the relationship between each extracted claim or
  description and its source must remain available.
- Model output must not silently overwrite the structured brand profile or turn
  uncertain material into a confirmed customer fact.
- The model snapshot, region, limits, schema, latency, and cost must be validated
  through the actual Alibaba Cloud account before architecture approval.
- Customer-facing success or failure, source removal or replacement, digest
  reuse, and non-blocking failure behavior are fixed product requirements
  independent of the selected model.

## Evidence

| Claim | Primary source | Date | Design implication |
| --- | --- | --- | --- |
| Qwen3.7 Flash accepts text, images, and video and outputs text; its documented capabilities include Function Calling, structured output, web search, context caching, and batch inference. The stable snapshot is `qwen3.7-flash-2026-07-15`. | [Alibaba Cloud Qwen3.7 Flash model information](https://help.aliyun.com/zh/model-studio/qwen3-7-flash) | Model snapshot 2026-07-15; accessed 2026-08-19 | Pin the snapshot for validation and use structured output for the digest rather than relying on a drifting alias or prose-only response. |
| The vision-model catalog lists a one-million-token context, image OCR and understanding, up to 16 million pixels per image, and up to 256 images for Qwen3.7 Flash. | [Alibaba Cloud vision-model catalog](https://help.aliyun.com/zh/model-studio/vision-model) | Accessed 2026-08-19 | The model is a credible image and long-document-page interpretation candidate, subject to representative tests and request limits. |
| Alibaba Cloud's dedicated PDF-understanding feature currently supports `qwen3.8-max` and processes both PDF text and images. | [Alibaba Cloud PDF-understanding documentation](https://help.aliyun.com/zh/model-studio/pdf-understanding) | Accessed 2026-08-19 | Do not assume Qwen3.7 Flash natively consumes every PDF through this interface; retain a document-extraction and page-rendering boundary. |
| Alibaba's document parsers distinguish electronic text extraction from intelligent or large-model parsing of scanned text and embedded visual content; electronic parsing alone does not parse embedded images or charts. | [Alibaba Cloud data-connection and document-parsing documentation](https://help.aliyun.com/zh/model-studio/data-connection) | Accessed 2026-08-19 | Text extraction alone is insufficient for brochures and image-heavy PDFs; visual pages need an explicit interpretation path. |
| In Beijing, Qwen3.7 Flash is priced by input length, starting at CNY 0.2 per million input tokens and CNY 0.8 per million output tokens for requests up to 32K tokens; higher context tiers cost more, batch is half-price, and cache discounts are available. | [Alibaba Cloud Model Studio pricing](https://help.aliyun.com/zh/model-studio/model-pricing) | Accessed 2026-08-19 | The model is cost-attractive for this role, but preprocessing volume, image tokenization, long-context tiers, and latency still need measurement with real materials. |

## Alternatives

| Option | Fit | Reason |
| --- | --- | --- |
| Document extraction plus pinned Qwen3.7 Flash visual and semantic preparation | Pilot | Best current balance of product fit, structured multimodal capability, traceability, and cost. |
| Directly send every PDF to Qwen3.7 Flash | Reject as an assumption | The dedicated official PDF interface does not currently document this model, and image-heavy documents require explicit coverage. |
| Qwen3.8 Max native PDF understanding for every file | Hold as a fallback candidate | It has documented native PDF support but would add a different model and cost profile before representative failures prove the need. |
| Build a knowledge base and retrieval workflow for each brand | Defer | The immediate need is one prepared writing context, not ongoing retrieval over a large changing corpus. |

## Unknowns and Validation

- Product-design owner: define the compact per-file success or failure display,
  supported-format guidance, and delete, replace, and retry interaction without
  adding a separate digest-confirmation gate.
- Architecture and security owners: define original-file and Markdown-digest
  storage, access, retention, cleanup, source linkage, replacement consistency,
  and protection against an obsolete digest being used after source deletion.
- Provider workstream: verify snapshot access, region, image and document limits,
  structured-schema reliability, concurrency, latency, and observed cost through
  the actual company account.
- Writing workstream: define the smallest digest contract needed by writer Skills
  and test whether source references and uncertainty markers are actually used.
- Validation owner: build a representative corpus containing native PDFs,
  scanned PDFs, brochures with embedded images and tables, standalone images,
  and ordinary text documents, then compare extracted facts and visual meanings
  against human annotations.
