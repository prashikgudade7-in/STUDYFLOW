# StudyFlow Student Data Inventory

Review date: 19 November 2026

## Scope and limits

This is a repository-based inventory, not a network, production-host, or legal audit. It describes the inspected application code and its SQLite schema. Hosting, backups, operational telemetry, and any production database outside this workspace were not available for inspection.

## Data handled

| Category | Fields / examples | Purpose and location | Retention and disclosure |
|---|---|---|---|
| Account and profile | Name, username, email, password (stored as PBKDF2 hash and salt), class, board, optional school, photo, timezone, creation time | `users` in SQLite; account access, profile display, class-appropriate features | Until account deletion; authenticated leaderboard responses also expose username, class, optional photo and scores to signed-in users |
| Authentication and security | Random session token in an HttpOnly cookie; only its SHA-256 hash and expiry in `sessions`; short-lived hashed login identifiers in `login_attempt_limits`; request IP in in-memory rate limiters | Session validation, brute-force and abuse controls | Sessions expire within 14 days; login-limit hashes are retained for 15 minutes and cleaned periodically. Raw tokens, passwords and hashes are excluded from exports and logs |
| Study records and history | Free-form JSON records for tasks, timetable, events, sessions, goals, saved words and achievements; IDs and timestamps | `records`, scoped by `user_id`; provide planner, progress, practice and dashboard features | No general record-retention schedule. A user can delete an individual record, clear all their records, or delete their account |
| Challenge attempts and leaderboard | Server-generated question sets/answer keys in temporary attempt rows; official answers, score, elapsed time, class band and IST date keys in result rows; daily replay marker | `challenge_sessions`, `challenge_attempts`, `challenge_daily_claims`; run and score challenges, enforce one official result per IST day, and display leaderboards | Attempt question sets are removed by hourly cleanup after expiry. Official results remain until challenge-history or account deletion. A current-day anti-replay marker remains until the IST date changes and cleanup runs |
| Notifications | Server-generated type, title, message, priority, read/important state, safe action route and creation time | `notifications`; show user-owned in-app updates | Retained until user deletion or notification clearing. Every query is scoped to the signed-in user |
| Notification preferences | Five category booleans and update time | `notification_preferences`; let users choose which event notifications may be saved | New preference rows default to off. Existing rows are not rewritten during initialization |
| Consent record | Core-service purpose, notice version and Unix timestamp | `privacy_consents`; record affirmative account/study-feature data-use acceptance | Deleted with the account. No AI-provider consent is recorded while no provider has been approved |
| PDF uploads | Base64 PDF request body; extracted selectable text | In-memory PDF endpoint for user-requested revision; no intentional PDF-file persistence | Request is size/signature checked; text is returned to the browser. The extracted text is not automatically sent to AI |
| AI prompts, responses and images | Browser form content and transient request data; an API key may be supplied for a connection test or a later approved feature | AI request endpoint currently rejects student content for every provider because approvals are pending. A provider test sends a fixed, non-student prompt and the user-supplied key | Prompt/image/document content and API keys are not intentionally stored in SQLite. Provider-side handling of the connection-test key and fixed prompt has not been verified |
| Browser preferences | `studyflow_ai_pref` localStorage object: selected provider, model and optional endpoint; no API key | Remember user-selected AI connection settings | Remains in that browser until cleared; Settings can clear it. Account export includes these settings in the client-generated JSON |
| Logs and analytics | Application logs contain error class/name and HTTP status; rate-limiters use request IP in memory | Operational error reporting and abuse prevention | No analytics/advertising SDK, tracking pixel or application request-body logger was found. Hosting/CDN/access logs and their retention are unknown |
| Cookies | `studyflow_session`, HttpOnly, SameSite=Lax, Secure on HTTPS | Authenticate signed-in features | Browser-session or persistent cookie; database session expires within 14 days |

## Data minimization observations

- Registration requires name, username, email, password, class and board. School and profile photo are optional.
- Study record JSON is user-authored and can contain free-form text; users should avoid putting unnecessary sensitive information in it.
- The database stores password hashes rather than passwords and session hashes rather than raw session tokens.
- No date of birth or age is collected. Classes 7–12 can include minors; the application therefore cannot determine whether an account belongs to a child.
- Student prompts, images and documents are blocked from AI-provider requests until approval. Do not treat a successful provider connection test as permission to send student content.
- No student records are intentionally sent to an AI provider by current production routes.

## Export boundaries

`GET /api/account/export` returns the requesting user's profile, records, completed challenge history, current daily claim markers, notifications, notification preferences and recorded core-service consent. The client adds browser AI-provider preferences. It does not disclose password hashes/salts, session tokens/hashes, login-limit hashes, or stored question answer keys. Those exclusions are security controls, not evidence that every infrastructure copy has been erased.

## Storage and isolation

SQLite is configured with foreign keys enabled and WAL journaling. User-owned rows reference `users(id)` with cascading deletion. Application queries reviewed here parameterize values and scope user-owned records by the authenticated account ID. The database path is local/configurable; production hosting, storage region, encryption-at-rest and backup controls are not known.

## Related documents

- [Consent management design](./CONSENT_MANAGEMENT_DESIGN.md)
- [User data rights](./USER_DATA_RIGHTS.md)
- [Data deletion policy](./DATA_DELETION_POLICY.md)
- [Implementation status and legal review](./STUDENT_PRIVACY_IMPLEMENTATION.md)
