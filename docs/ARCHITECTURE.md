# StudyFlow Technical Architecture

## 1. Technology stack

| Area | Verified implementation |
|---|---|
| Runtime | Node.js `>=20` |
| Backend | Express 5, JavaScript ES modules |
| Database | SQLite through `better-sqlite3` |
| Frontend | Static HTML, CSS, and vanilla JavaScript |
| Sessions | Cookie Parser and SQLite session rows |
| Rate limiting | `express-rate-limit` plus SQLite-backed login-identifier limits |
| PDF processing | `pdf-parse` |
| AI integration | Native `fetch` adapters in application code |
| Tests | Node.js built-in test runner (`node --test`) |

See [`package.json`](../package.json) for the declared dependencies and scripts.

## 2. Project layout

The tree below omits `node_modules/`, the ignored SQLite runtime files in `data/`, and generated operating-system files.

```text
.
├── .env.example
├── .gitignore
├── .vscode/
│   ├── extensions.json
│   └── launch.json
├── config/
│   └── database.js
├── controllers/
│   ├── aiController.js
│   ├── authController.js
│   ├── challengeController.js
│   ├── dataController.js
│   ├── notificationController.js
│   ├── pdfController.js
│   ├── privacyController.js
│   └── userController.js
├── data/                         # Runtime database location; files are git-ignored
├── docs/                         # Project documentation
├── middleware/
│   ├── authMiddleware.js
│   ├── loginIdentifierRateLimit.js
│   ├── originMiddleware.js
│   └── rateLimitMiddleware.js
├── public/
│   ├── logos/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── routes/
│   ├── aiRoutes.js
│   ├── authRoutes.js
│   ├── challengeRoutes.js
│   ├── dataRoutes.js
│   ├── notificationRoutes.js
│   ├── pdfRoutes.js
│   ├── privacyRoutes.js
│   └── userRoutes.js
├── services/
│   ├── aiService.js
│   ├── aiProviderApprovalRegistry.js
│   ├── challengeService.js
│   ├── privacyConsentService.js
│   └── notificationService.js
├── tests/
│   ├── aiService.test.js
│   ├── apiAndUpload.test.js
│   ├── challengeIntegrity.test.js
│   ├── notifications.test.js
│   ├── privacyControls.test.js
│   └── securityControls.test.js
├── utils/
│   ├── authUtils.js
│   └── sessionCleanup.js
├── package-lock.json
├── package.json
├── README.md
└── server.js
```

`server.backup.js` and `services/aiService.js.backup` exist as ignored backup artifacts; they are not the runtime entry point or active AI implementation. Use `server.js` and `services/aiService.js` as the current sources of truth.

## 3. Application structure

- **Frontend:** [`public/index.html`](../public/index.html) contains the authentication UI and app views. [`public/styles.css`](../public/styles.css) defines the visual system and responsive layouts. [`public/app.js`](../public/app.js) handles navigation, rendering, browser interactions, and API calls. Most user records are held in browser memory during the session and persisted through the API.
- **HTTP entry point:** [`server.js`](../server.js) configures proxy trust, cookies, headers, API middleware, static assets, fallback handling, startup, and shutdown.
- **Routes:** `routes/` maps URL/method pairs to middleware and controller functions.
- **Controllers:** `controllers/` validates requests, calls database or service logic, and shapes responses.
- **Services:** `services/challengeService.js` owns challenge generation, scoring, official IST keys, daily replay claims, and temporary-attempt cleanup. `services/notificationService.js` validates event notifications and applies category preferences. `services/privacyConsentService.js` records versioned core-service acceptance. `services/aiService.js` owns provider configuration, request construction, network limits, and response parsing.
- **Database:** [`config/database.js`](../config/database.js) opens the database and creates tables/indexes on startup.
- **Utilities and middleware:** `utils/` contains session/password helpers and cleanup; `middleware/` contains authentication, origin checks, and rate limits.

## 4. Request lifecycle

For API requests:

1. Express applies security headers and parses cookies.
2. `/api` requests enter the API router. `checkOrigin` rejects unsafe methods unless their `Origin` matches the configured `APP_ORIGIN`.
3. The router parses JSON with a 30 MiB body limit.
4. A route applies its authentication and rate-limit middleware as configured.
5. A controller validates input and invokes a service or prepared SQLite statements.
6. The controller returns JSON; errors reaching the global handler are logged by error name/status and returned without stack traces.

Static assets are served from `public/`; unmatched non-API requests fall back to `public/index.html`. There is currently no explicit API 404 handler before that fallback, so an unknown API path may receive the frontend document instead of a JSON error.

## 5. Database architecture

The database path is `STUDYFLOW_DB_PATH`, resolved relative to the project root unless it is absolute. The default is `data/studyflow.db`. Startup creates the parent directory, opens SQLite, enables WAL mode and foreign keys, and uses `CREATE TABLE/INDEX IF NOT EXISTS`; there is no separate migration framework.

### Tables and key fields

| Table | Columns / purpose |
|---|---|
| `users` | `id`, `full_name`, `username`, `email`, `password_hash`, `password_salt`, `standard`, `board`, `school`, `photo`, `timezone`, `created_at`. Username and email are unique, case-insensitive. |
| `privacy_consents` | Account-owned core-service purpose, notice version and grant timestamp; unique by user/purpose/version and cascaded on deletion. |
| `sessions` | `token_hash` primary key, `user_id` foreign key, `expires_at`. Expiry index supports cleanup. |
| `records` | `id` primary key, `user_id`, `kind`, JSON text `data`, `created_at`, `updated_at`. Index on `(user_id, kind)`. |
| `challenge_attempts` | Official/practice result rows with user, band, day/week/month keys, score, correct, total, elapsed, official flag, and timestamp. A partial unique index allows one official result per user/day. |
| `challenge_daily_claims` | Minimal `(user_id, day_key, claimed_at)` marker preventing a same-day replay after a user deletes a challenge score. Previous-day markers are removed by cleanup. |
| `challenge_sessions` | `attempt_id`, owner, band, server-calculated date keys, server-side question/answer JSON, official flag, creation/expiry, state, and submission timestamp. A partial unique index allows one pending attempt per user. |
| `login_attempt_limits` | Hashed login identifier, window start, attempt count, and expiry. Expiry index supports cleanup. |
| `notifications` | User-owned event notifications, category, text, priority, read/important flags, allowlisted internal action, and creation time. `(user_id, event_key)` is unique to prevent duplicate event notices; owner/date and unread indexes support listing. |
| `notification_preferences` | One row per user with category opt-ins; newly created rows explicitly default to off, including on existing database files. Previously stored choices are preserved. Cascades on account deletion. |

All user-owned tables reference `users(id)` with `ON DELETE CASCADE`. Foreign-key enforcement is enabled. Challenge submissions use an immediate SQLite transaction to consume an attempt, insert its result, and create its optional notification atomically. Notification event keys are unique per user, so retries cannot duplicate the same event. Login-identifier rate updates also use a transaction. SQLite WAL is enabled, but there is no backup/restore automation or storage quota implementation in the repository.

### Ownership and integrity

Authenticated user IDs are derived from valid sessions rather than request bodies. Record reads, updates, and deletes include the owner ID in their SQL. Challenge session lookup and result creation likewise include the authenticated user ID. Queries use prepared statements; the leaderboard chooses its period column from a fixed whitelist and binds period keys and band values.

Official challenge day/week/month keys use `Asia/Kolkata`, independent of the host local timezone. Weeks are ISO Monday-based. The current weekly leaderboard also queries a legacy Monday-date key so older records remain visible. Legacy challenge history is retained; historic client-submitted values cannot be retroactively verified. Expired challenge-session rows are removed by hourly cleanup; official results are separate and persist until user deletion.

## 6. API reference

All endpoints are mounted under `/api`. `Origin` validation is applied to unsafe methods. “Authenticated” means a valid `studyflow_session` cookie is required.

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| GET | `/healthz` | No | Database `SELECT 1` health check. |
| GET | `/me` | No | Return the current safe user object, or `user: null`. |
| POST | `/signup` | No; signup IP-limited | Validate registration, create account and session. |
| POST | `/login` | No; IP- and identifier-limited | Verify credentials and create session. |
| POST | `/logout` | No | Delete the presented session if present and clear its cookie. |
| POST | `/profile` | Yes | Update the current user's profile. |
| GET | `/data` | Yes | Read the current user's records. |
| POST | `/data` | Yes | Create/update a record of an allowed kind. |
| DELETE | `/data?id=...` | Yes | Delete a record only for the current user. |
| DELETE | `/data` | Yes; deletion-limited | Clear the current user's study records after explicit confirmation. |
| GET | `/account/export` | Yes | Export profile, records, challenge history/claim markers, notifications/preferences and recorded consent; excludes auth secrets and answer keys. |
| DELETE | `/account` | Yes; deletion-limited | Delete the account after password confirmation; owned rows cascade. |
| GET | `/privacy/consent` | Yes | Read the current core-service consent version/record. |
| PUT | `/privacy/consent` | Yes | Record explicit acceptance of the current core-service purpose and notice version. |
| DELETE | `/challenge/history` | Yes; deletion-limited | Delete the user's challenge results/history while retaining only today's minimal replay marker. |
| GET | `/notifications` | Yes; notification-limited | Read the current user's notifications, filtered by `all`, `unread`, `important`, `system`, `study_reminders`, or `challenges`; paged 50 at a time. |
| GET | `/notifications/unread-count` | Yes; notification-limited | Return the current user's unread count. |
| PATCH | `/notifications/:id/read` | Yes; notification-limited | Mark one owned notification as read. |
| PATCH | `/notifications/read-all` | Yes; notification-limited | Mark all current-user notifications as read. |
| PATCH | `/notifications/:id/important` | Yes; notification-limited | Set the important/starred flag on one owned notification. |
| DELETE | `/notifications/:id` | Yes; notification-limited | Delete one owned notification. |
| DELETE | `/notifications` | Yes; notification-limited | Clear all notifications belonging to the current user. |
| GET | `/notifications/preferences` | Yes; notification-limited | Read the current user's category preferences. |
| PUT | `/notifications/preferences` | Yes; notification-limited | Replace all five category preference values with validated booleans. |
| POST | `/challenge/start` | Yes; start-limited | Create or resume an attempt and return public questions. |
| POST | `/challenge` | Yes; submission-limited | Submit attempt ID and answer selections; server calculates the result. |
| GET | `/challenge/status` | Yes | Return current IST completion status and any pending attempt. |
| GET | `/leaderboard` | Yes | Read daily, weekly, or monthly results; optional class band and historical key filter. |
| POST | `/pdf-text` | Yes; PDF-limited | Extract selectable text from a base64-encoded PDF. |
| GET | `/ai/approval-status` | Yes | Read status for each configured provider and content category. |
| POST | `/ai/test-connection` | Yes; AI-limited | Send only a fixed non-student prompt with the selected provider key. |
| POST | `/ai` | Yes; AI-limited | Call a provider only after all student-data categories have valid approval. |

Rate-limit settings are configured in `middleware/rateLimitMiddleware.js`: login 10/15 minutes, signup 5/hour, AI 20/15 minutes, PDF 5/15 minutes, challenge submission 10/15 minutes, challenge start 5/15 minutes, and notifications 120/15 minutes per IP. The additional login identifier limiter allows 10 failures per 15-minute window using SQLite. The IP limiters use the default in-process store.

## 7. Notification behavior

The notification drawer fetches current-user data when opened and refreshes the bell count after authenticated operations. It supports unread/important/type filters, read and important flags, individual deletion, clear-all, and category preferences. Responses are owner-scoped and non-cacheable where they contain private data. Notification content is inserted into the DOM with text nodes; action routes are restricted to a small internal allowlist.

Currently, only a successfully scored **official server-side challenge** creates a persisted notification, in the same SQLite transaction as the result and attempt consumption. A stable per-attempt event key prevents duplicates. Practice rounds do not create notifications. The app does not yet have trusted server-side focus-session timing, a reminder scheduler, a verified achievement engine, or a system-announcement authoring flow, so those notification categories are preferences only and do not produce fabricated events. No WebSocket service is used; opening the drawer fetches current data.

## 8. Authentication and session flow

Passwords are hashed with PBKDF2-HMAC-SHA256, 240,000 iterations, 32-byte output, and a random 16-byte salt. A random 36-byte session token is returned in a cookie; only its SHA-256 hash is stored in SQLite. The cookie is HttpOnly, SameSite=Lax, scoped to `/`, and expires after 14 days. It is marked Secure when the request is secure or the configured public origin is HTTPS. With TLS terminated at a proxy, proxy trust must be configured accurately. Cleanup runs at startup and hourly; logout invalidates the session immediately.

## 9. AI and PDF flows

The browser holds the user's AI key in JavaScript memory; provider/model/Azure endpoint preferences are stored in localStorage. `services/aiProviderApprovalRegistry.js` tracks text, image, and document decisions separately for each provider. All categories currently default to `PENDING`; the backend requires documented approvals for every category before it sends student data. Client-supplied category labels do not bypass the complete approval check because text prompts may include document-derived information. The connection-test route rejects student content and constructs a fixed non-student prompt server-side. The service uses fixed HTTPS destinations for supported providers. Azure's resource hostname is validated against `*.openai.azure.com`; redirects are rejected, calls time out after 65 seconds, and responses are capped at 2 MiB. Provider-specific retention, training, and data-region practices remain unverified.

PDF content is base64-encoded in a JSON request, size/signature checked, parsed in memory by `pdf-parse`, and returned as at most 60,000 extracted text characters. PDF files are not written to an uploads directory by this controller.

## 10. Production and deployment architecture

The app is a Node.js process intended to serve both API and static frontend. `PORT` defaults to 3000 and is validated. `APP_ORIGIN` must be a valid origin; in production it must use HTTPS. `TRUST_PROXY` accepts known proxy IP/CIDR entries or a hop count and explicitly rejects `true`. The deployment edge should terminate HTTPS and forward requests from only the configured trusted proxy.

Production HSTS is sent with `max-age=31536000`. The CSP is currently configured in `server.js` and permits `'unsafe-inline'` scripts/styles. Database persistence depends on the hosting provider mounting durable storage at the configured path; ephemeral filesystems are unsuitable. Shutdown handles SIGINT/SIGTERM by stopping cleanup, closing the HTTP server, and closing SQLite.

The repository does not define a hosting platform, container, CI deployment workflow, backup service, monitoring system, or multi-instance coordination. A single-process deployment with a durable SQLite volume is the simplest fit for the current architecture; suitability and provider-specific details remain to be verified.

## 11. Architecture principles

- Keep route mapping, HTTP validation, domain/service logic, and persistence responsibilities separate.
- Preserve the existing Express/SQLite and static frontend architecture unless a demonstrated need justifies a change.
- Treat browser data as untrusted; derive authorization, official challenge results, and official periods on the server.
- Keep database changes additive and preserve user data.
- Consult [RULES.md](./RULES.md) before modifying code and update [TASKS.md](./TASKS.md) when project status changes.
