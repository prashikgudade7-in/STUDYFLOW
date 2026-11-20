# AI Provider Approval Register

Last reviewed: 2026-11-19

No provider has been confirmed approved for processing student data. This register records the current decision state only; it is not legal advice or a claim that vendor terms have been verified.

## Current approval status — VERIFIED

Every listed provider remains **PENDING** independently for text prompts, images, and documents/PDF-derived content. No approval is inferred from integration availability, user-supplied credentials, a connection test, or local PDF extraction. Provider terms, processing/storage regions, retention, subprocessors, and transfer arrangements have not been verified. Hosting, application, database, backup, log locations, and retention are also **PENDING**; no provider region is assumed.

PDF extraction is performed locally by the application, but any extracted text submitted as an AI prompt is student-content processing and remains blocked unless the relevant provider/category approvals are recorded. Images are a separate category and remain blocked as well. A provider connection test is distinct from approval: it sends a fixed non-student prompt and must not contain student prompts, images, PDFs, or extracted text.

## Approval decisions

Each provider requires a separate decision for each data category. Personal information, study records, academic information, and other student content are included in the applicable text, image, or document category. `verificationDate` and evidence references are intentionally blank until the owner completes the review.

| Provider integration | Category | Status | Verification date | Evidence / decision record |
|---|---|---|---|---|
| OpenAI API (`openai`) | Text prompts | PENDING | — | Not yet verified |
| OpenAI API (`openai`) | Images | PENDING | — | Not yet verified |
| OpenAI API (`openai`) | Documents and PDFs | PENDING | — | Not yet verified |
| Google Gemini API (`gemini`) | Text prompts | PENDING | — | Not yet verified |
| Google Gemini API (`gemini`) | Images | PENDING | — | Not yet verified |
| Google Gemini API (`gemini`) | Documents and PDFs | PENDING | — | Not yet verified |
| Anthropic Claude API (`claude`) | Text prompts | PENDING | — | Not yet verified |
| Anthropic Claude API (`claude`) | Images | PENDING | — | Not yet verified |
| Anthropic Claude API (`claude`) | Documents and PDFs | PENDING | — | Not yet verified |
| Azure OpenAI (`azure`) | Text prompts | PENDING | — | Not yet verified |
| Azure OpenAI (`azure`) | Images | PENDING | — | Not yet verified |
| Azure OpenAI (`azure`) | Documents and PDFs | PENDING | — | Not yet verified |
| Perplexity API (`perplexity`) | Text prompts | PENDING | — | Not yet verified |
| Perplexity API (`perplexity`) | Images | PENDING | — | Not yet verified |
| Perplexity API (`perplexity`) | Documents and PDFs | PENDING | — | Not yet verified |
| DeepSeek API (`deepseek`) | Text prompts | PENDING | — | Not yet verified |
| DeepSeek API (`deepseek`) | Images | PENDING | — | Not yet verified |
| DeepSeek API (`deepseek`) | Documents and PDFs | PENDING | — | Not yet verified |
| xAI API (`grok`) | Text prompts | PENDING | — | Not yet verified |
| xAI API (`grok`) | Images | PENDING | — | Not yet verified |
| xAI API (`grok`) | Documents and PDFs | PENDING | — | Not yet verified |
| Mistral API (`mistral`) | Text prompts | PENDING | — | Not yet verified |
| Mistral API (`mistral`) | Images | PENDING | — | Not yet verified |
| Mistral API (`mistral`) | Documents and PDFs | PENDING | — | Not yet verified |
| Cohere API (`cohere`) | Text prompts | PENDING | — | Not yet verified |
| Cohere API (`cohere`) | Images | PENDING | — | Not yet verified |
| Cohere API (`cohere`) | Documents and PDFs | PENDING | — | Not yet verified |
| Fireworks-hosted Meta Llama (`llama`) | Text prompts | PENDING | — | Not yet verified |
| Fireworks-hosted Meta Llama (`llama`) | Images | PENDING | — | Not yet verified |
| Fireworks-hosted Meta Llama (`llama`) | Documents and PDFs | PENDING | — | Not yet verified |

Supported integrations are listed from the current application adapter configuration. This does not confirm that an integration is enabled, contracted, region-pinned, or approved for student information.

## Required review before approval

For each provider and content category, record evidence for:

- Official provider terms and commercial API terms.
- Data Processing Agreement and subprocessors.
- Training and service-improvement use.
- Retention, deletion, and abuse-monitoring practices.
- Processing, storage, and support-access regions.
- International data transfers.
- Applicable age restrictions.
- Security and privacy requirements for student information.

Approval must identify a decision owner, a verification date, and durable evidence references. Recheck when vendor terms, product features, endpoints, regions, or configuration change.

## Enforcement

The server-side registry is implemented in `services/aiProviderApprovalRegistry.js`. Student-data requests are blocked unless every category is `APPROVED` with a valid verification date and non-empty evidence reference. The server requires all categories because a text prompt may contain document-derived or personal data, and it cannot reliably infer content origin from an arbitrary client prompt. Missing or incomplete approval data fails closed. Browser checks and the status API are informational only; backend enforcement is authoritative.

Provider/model/endpoint configuration remains available. The separate connection test ignores and rejects student content and sends only a fixed non-student test prompt. It does not change any student-data approval status.

The live AI API key is supplied for a connection test or an approved request and is not stored in the StudyFlow database. Do not paste student information into provider tests.

**Operational limitation:** approval is currently all-categories-per-provider in backend enforcement, not a user-selectable category consent. Optional AI consent is not currently collected, and no student-content AI processing is enabled. Any future enablement requires evidence-based provider approval, a reviewed disclosure/consent design where applicable, and verified data-handling arrangements.
