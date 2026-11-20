# StudyFlow Consent Management Design

Review date: 19 November 2026

## Decision

StudyFlow records a narrowly scoped affirmative choice for core account and study-feature data use. New registration requires an unchecked checkbox. The server records the purpose, notice version and UTC Unix timestamp in the same SQLite transaction as account creation. Existing users can record acceptance from Settings; existing accounts are not silently backfilled.

This technical control is not a legal conclusion that the current draft notice is complete or that consent is the correct legal basis for every processing purpose. Operator identity, contact details, retention, child-user handling, hosting and legal applicability remain unresolved.

## Purpose and scope

The recorded purpose is `core_service`: use account and user-submitted study information to create and operate the account and deliver features requested by the user. It does not authorize AI processing, advertising, analytics, unrelated profiling, or third-party disclosure.

The current version is `2026-11-19-v1`. A revised purpose or notice requires a deliberate version change and an owner/counsel decision about renewed acceptance. Do not fabricate consent for pre-existing accounts.

## User experience

- Registration checkbox is required and not preselected; its text describes the core purpose and links to the draft Privacy notice.
- Settings shows whether the current notice version has a recorded acceptance. Existing accounts without a record may affirmatively accept there.
- Core account processing is necessary to provide the account. The separate account-deletion flow requires the current password and deletes the account and its consent record; this is the current withdrawal route for core processing.
- Notification category preferences are a separate feature choice and default off for newly created preference rows. They are not represented as legal consent.
- No optional AI consent is requested or stored. All AI providers remain pending, student content is blocked, provider terms/regions/retention are unverified, and a future consent must identify the actual provider and processing purpose before it can be informed.
- Browser/OS notification permission remains separate from in-app notification preferences.

## Persistence and APIs

`privacy_consents` contains an account-owned row with:

- `user_id`
- `purpose` (`core_service`)
- `version`
- `granted_at` (UTC Unix seconds)

The `(user_id, purpose, version)` uniqueness constraint makes repeated acceptance idempotent. Foreign-key cascading removes the record on account deletion.

- `GET /api/privacy/consent` returns the current version and the requesting user's record.
- `PUT /api/privacy/consent` accepts only `{ "accepted": true }`; the server supplies the purpose, version and timestamp.
- Registration also writes the same record atomically with the account row.
- `GET /api/account/export` includes consent records.
- `DELETE /api/account` requires authentication and password confirmation and cascades the consent record.

All API routes run under the application's same-origin middleware. User IDs are taken from the authenticated session, never the request body.

## AI fail-closed boundary

The server-side provider registry remains authoritative and every text/image/document category is pending. The content endpoint fails before provider fetch. The connection-test route rejects submitted prompts, images and documents and constructs a fixed non-student prompt server-side. A provider connection test still transmits the supplied API key and fixed test prompt to that provider; the provider's handling is not verified.

No per-user AI consent control is offered while the exact provider, processing region, terms and retention are unknown. Before enabling student-content processing, implement and test a separate, optional, unchecked, provider- and purpose-specific consent, a withdrawal control, and a backend preference gate. Do not convert an AI connection test or core-service consent into student-content consent.

## Legacy accounts and rollout

Existing accounts are not assigned a synthetic consent timestamp. Settings can record the current version, but login and existing features are not blocked for accounts without it. Before public operation, the owner and counsel must decide whether to require notice/acceptance for legacy accounts, when, and how to handle users who decline. Do not silently call legacy users consented.

## Legal references and limitations

Consent requirements depend on the operator's legal status, data category, purposes and provision commencement:

- The [Digital Personal Data Protection Act, 2023](https://www.indiacode.nic.in/handle/123456789/22067?view_type=browse) and its commencement notifications must be checked provision by provision.
- The [MeitY Data Protection Framework](https://www.meity.gov.in/data-protection-framework) and the [e-Gazette of India](https://egazette.gov.in/) are official places to verify the Rules and commencement notices.
- The [Information Technology Act, 2000](https://www.indiacode.nic.in/) and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 may be relevant depending on operator coverage and data handled.

On the review date, MeitY and India Code pages could not be retrieved by the available web tools (HTTP 403 / unavailable response). The exact current commencement status and overlap with the SPDI Rules are therefore **not independently verified here**. Qualified Indian counsel must check the current Gazette texts before treating this implementation as legally sufficient.
