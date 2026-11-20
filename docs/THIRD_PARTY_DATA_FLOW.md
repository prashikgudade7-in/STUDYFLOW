# Third-Party Data Flow

Review date: 2026-11-19

## Findings

| Flow | Data sent or exposed | Trigger | Evidence / limits |
|---|---|---|---|
| Browser to Google Fonts | No current flow | None after this review | The Google Fonts links were removed. DM Sans and Manrope are served locally from `public/fonts/` with their SIL Open Font License. |
| Browser to StudyFlow AI endpoint | Provider/model configuration and API key only for a connection test; student prompt/image/document only after frontend approval checks | User explicitly tests a provider or requests an approved AI feature | API keys remain in browser memory, not localStorage. Student-data calls are blocked in the browser and backend while any required category lacks verified approval. |
| StudyFlow server to AI provider | No student content is currently forwarded. A connection test sends only a fixed, non-student prompt and the selected API key. | User explicitly tests a provider, or later uses an approved content category | Ten adapters are configurable, but all provider/category approvals are `PENDING`. The connection-test controller rejects prompt, image, and document fields and constructs the fixed test request server-side. The backend does not fall back to another provider. |
| Browser to StudyFlow PDF endpoint | Base64-encoded PDF in the request | User submits a PDF for text extraction | The server validates the PDF signature, processes it in memory, enforces an endpoint size limit, and returns extracted text. The UI currently limits its upload to 8 MiB; the server endpoint supports up to 20 MiB raw PDF. The endpoint does not intentionally save the PDF as a file. |
| Browser to StudyFlow application | Account data, profile data, study records, challenge answers/results, and session cookie | Account use | StudyFlow stores account, session, study, and challenge data in SQLite. Challenge leaderboard responses are authenticated but include usernames, class, photos, and scores. |
| StudyFlow host/platform | Requests, database file, backups, and operational telemetry depending on deployment | Hosting the service | No hosting provider or deployment access-log configuration is identified in the repository. Owner must verify log retention, backup access, storage region, access controls, and deletion behavior. |

## Local storage and cookies

- First-party cookie: `studyflow_session`, HttpOnly, SameSite=Lax, Secure on HTTPS; persistent for 14 days when “Keep me signed in” is checked, otherwise browser-session lifetime. The server-side session expires within 14 days in both cases.
- Browser localStorage: `studyflow_ai_pref` stores provider, model, and optional Azure endpoint preferences, not the API key.
- No analytics SDK, advertising SDK, tracking pixel, or service worker was found in the frontend.
- Settings provides a JSON export of profile, study records, challenge history/claims, notifications and preferences, recorded core-service acceptance, and browser AI settings. Password-confirmed account deletion and the separate record/history deletion controls operate on the signed-in user's active SQLite data; they cannot erase deployment backups or provider-side copies.
- The signup form records explicit acceptance for core account/study-feature processing. This does not authorize AI processing. New notification preference rows default off; previously stored settings are preserved.
- The optional AI-provider preference is stored in browser localStorage and can be cleared in Settings. There is no per-user student-content consent because all providers remain pending and their processing details have not been verified.
- The server-side [`AI provider approval register`](./AI_PROVIDER_APPROVAL_REGISTER.md) tracks text, image, and document approval separately for each provider. No vendor retention, training, regional processing, or transfer claim has been verified.

## Data-minimization recommendations

1. Do not send sensitive or identifying student material to AI providers unless the operator has approved the provider's terms and informed users.
2. Configure and publish retention for accounts, study records, challenge history, logs, and backups; implement account deletion/export and a verified request channel.
3. Confirm provider locations, retention, training settings, and contractual roles for every configured AI provider.
4. Review deployment logs and backup retention; repository inspection cannot establish host behavior.

Related pages: [Privacy notice](../public/privacy.html), [Cookie notice](../public/cookies.html), [Terms](../public/terms.html).
