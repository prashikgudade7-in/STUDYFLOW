# StudyFlow Persistent Project Memory

This file is a durable handoff summary, not a substitute for checking the current source. If code and documentation disagree, verify the code and update the affected documents.

## 1. Project identity

- **Name/version:** StudyFlow 2.0.0.
- **Purpose:** Student study planning, personal learning records, practice, progress tracking, and optional AI-assisted learning.
- **Backend:** Node.js 20+, Express 5, ES modules.
- **Frontend:** HTML, CSS, vanilla JavaScript.
- **Database:** SQLite through `better-sqlite3`.
- **Entry point:** `server.js`.
- **Official challenge timezone:** `Asia/Kolkata` (IST), approved by the project owner. Daily reset is midnight IST; weekly keys are Monday-based; monthly keys follow the IST calendar.
- **Current repository shape:** `config/`, `controllers/`, `middleware/`, `routes/`, `services/`, `utils/`, `public/`, and `tests/`. See [ARCHITECTURE.md](./ARCHITECTURE.md).

## 2. Important technical decisions

- Keep the existing Express + SQLite architecture unless evidence demonstrates a technical need to change it.
- SQLite is configured in `config/database.js`, defaults to `data/studyflow.db`, enables WAL and foreign keys, and creates tables/indexes on startup. It is not a formal migration runner.
- Authentication uses PBKDF2-HMAC-SHA256 password hashes and opaque cookie sessions. Session tokens are hashed in the database; cookies are HttpOnly and SameSite=Lax, and Secure for HTTPS.
- Browser APIs use same-origin cookies. Mutating API requests require the configured origin.
- User records are JSON payloads in the `records` table and are scoped by authenticated user ID in the controller queries.
- AI API keys are entered by users, retained in browser memory for that page session, and sent to the server for calls. Provider/model/Azure endpoint preferences—not keys—are stored in localStorage. Server adapters use approved HTTPS destinations.
- PDF files are parsed in memory; extracted text can be returned to the frontend for revision workflows.
- The challenge question bank/answer keys are in the server-side challenge service. Official scoring and leaderboard keys are generated on the server; attempt submissions are owner-bound, expiring, single-use, and transactional.
- Persisted notifications and per-user category preferences live in SQLite tables with cascading ownership. Only a server-scored official challenge currently emits a notification, atomically with the result; a per-attempt event key prevents duplicates. The drawer uses authenticated, rate-limited APIs and allowlisted actions.
- Notification preferences cover study reminders, daily goals, challenge updates, achievements, and system announcements. Only challenge results currently have a trusted server-side event source; no notifications are fabricated for client-reported study activity or achievements. There is no reminder scheduler or WebSocket service.
- Avoid accidental dependencies on ignored backup files. Active runtime entry/service files are `server.js` and `services/aiService.js`.

## 3. Security findings and current status

### Earlier review baseline (historical)

An earlier security review reported:

- Parameterized SQL queries and per-user record scoping.
- Origin checks and route-specific rate limits.
- PBKDF2 password hashing.
- AI destination restrictions.
- No JWT or webhook implementation at that time.
- No concrete vulnerability met that review's reporting threshold.
- `npm audit --omit=dev` reported zero vulnerabilities at the time of that earlier review.

That result is not a guarantee of production security. Re-check the current code, dependency lockfile, and deployment settings.

### Subsequent findings checked against the current repository

| Finding | Current status | Evidence/context |
|---|---|---|
| Client-controlled official challenge scores/date keys | **Resolved for new submissions** | Server issues attempts, stores answers, scores submissions, derives IST keys, checks ownership/expiry/replay, and rejects legacy result fields. Historical rows are retained and cannot be retroactively verified. |
| Basic notification placeholder | **Resolved** | User-scoped SQLite notifications/preferences, authenticated CRUD/filter APIs, and an accessible drawer are implemented. Official challenge results are the only notification producer until other event sources are server-authoritative. |
| Missing cumulative per-user storage quota | **Confirmed; pending** | A record is capped at 1 MiB, but no cumulative byte/count quota is enforced per account. |
| CSP permits `unsafe-inline` | **Confirmed; pending** | The CSP in `server.js` allows inline scripts and styles. |
| Unknown API path may return frontend fallback | **Confirmed; pending** | No dedicated API 404 handler precedes the static frontend fallback. |
| SQLite backup/recovery policy | **Not implemented in repository** | Durable storage path is configurable, but backup/restore automation and recovery drills are not defined. |
| Production host/proxy behavior | **Needs verification** | Local production-mode health/HSTS coverage exists; no provider is selected or deployed here. |
| Latest production dependency audit | **Verified 2026-11-19** | `npm.cmd audit --omit=dev` reported zero vulnerabilities in this environment. This is time-bound. |

See [TASKS.md](./TASKS.md) for owners' acceptance criteria and status tracking. Do not turn missing optional features (MFA, account recovery, email verification) into vulnerability claims without demonstrated impact or an explicit product requirement.

## 4. Project constraints

- Preserve existing architecture and user data; prefer additive schema changes.
- Keep code changes surgical and preserve unrelated dirty/staged work.
- Never expose secrets, tokens, student content, or real credentials.
- Use isolated test databases and mocked provider credentials.
- Do not deploy, publish, or commit without explicit permission.
- Do not make security-certification claims.
- Keep challenge periods fixed to approved IST, regardless of a profile timezone or host timezone.

## 5. Current development position

**Latest verified phase:** Production readiness and security hardening.

Completed:

- Server-side official challenge generation/scoring, attempt expiration, ownership checks, replay protection, atomic result insertion, and IST leaderboard keys.
- User-scoped notification storage, APIs, preferences, accessible responsive drawer, and transactional official challenge notifications.
- Current test suite: 41 passed, 0 failed on 2026-11-19.
- Current production-only dependency audit: zero findings on 2026-11-19.

Pending or requiring verification:

- Cumulative per-user record quotas and bounded data retention.
- CSP hardening and explicit JSON API 404 handling.
- SQLite backup/restore procedure and recovery drill.
- Hosting-provider reverse proxy, TLS, durable volume, and restart verification.
- Production logging/monitoring and full browser/accessibility regression coverage.

The notification implementation changed the database initialization, challenge service, API routes/controllers, rate limits, frontend, tests, and the four project documents `ARCHITECTURE.md`, `PRD.md`, `TASKS.md`, and `MEMORY.md`. The worktree also contains earlier unrelated staged and unstaged changes; inspect `git status` before attributing the entire diff.

## 6. Unknowns to verify before production

- Hosting provider, domain, TLS termination details, and exact trusted proxy setting.
- Durable-volume guarantees and the operational backup/restore process.
- Per-user record quota, challenge-attempt retention, and broader student-data retention policy.
- Production monitoring, alerting, log retention, and incident response.
- Accessibility conformance and browser support matrix.
- Provider-specific privacy/retention terms for AI prompts, images, and extracted PDF text.
- Capacity/performance requirements and whether a single SQLite-backed process is sufficient.

Mark unverified details as **NEEDS_VERIFICATION** in [TASKS.md](./TASKS.md), not as facts.

## 8. India legal and privacy status (reviewed 2026-11-19)

- Official Gazette commencement schedules were verified: DPDP Act G.S.R. 843(E) and DPDP Rules G.S.R. 846(E), both published 13 November 2025, commence in tranches on 13 November 2025, 13 November 2026, and 13 May 2027. Do not say the entire Act or Rules are currently in force. See [INDIA_LEGAL_COMPLIANCE_AUDIT.md](./INDIA_LEGAL_COMPLIANCE_AUDIT.md) for precise provisions and primary-source links.
- Section 44(2), which repeals IT Act section 43A, is scheduled for 13 May 2027. Counsel must assess current IT Act/SPDI applicability conditionally. CERT-In's 180-day India-resident log direction requires coverage analysis and operational verification; it does not prove that the database or backups must be hosted in India.
- Registration accepts classes 7-12 without age/date-of-birth checks or guardian flow. No intended minimum age is established in the reviewed source/owner decisions; under-18 registration is possible. The public privacy notice's 18+ assertion is unsupported by the inspected workflow and must be reconciled, not treated as an approved policy.
- Existing accounts are not backfilled as consented or blocked; no proactive notice/re-acceptance campaign was found. New-account acceptance is versioned. Do not silently mark legacy accounts as consenting. No optional AI consent is collected; student-content AI is backend-blocked.
- All AI provider approvals remain **PENDING** separately for text, images, and PDFs/document-derived content. Connection testing uses a fixed non-student prompt. Locally extracted PDF text remains student content if later sent to an AI provider.
- **PENDING** until documented from actual deployment/provider evidence: hosting provider; application, database, backup, and log regions; backup and log retention; administrative access arrangements.
- No legal-compliance claim is made. Qualified Indian counsel and owner decisions remain necessary. [PRIVACY_POLICY_REVIEW.md](./PRIVACY_POLICY_REVIEW.md), [AI_PROVIDER_APPROVAL_REGISTER.md](./AI_PROVIDER_APPROVAL_REGISTER.md), and [TASKS.md](./TASKS.md) carry the related actions.

## 7. AI handoff instructions

Before significant work, future agents should read:

1. [MEMORY.md](./MEMORY.md)
2. [RULES.md](./RULES.md)
3. [PRD.md](./PRD.md)
4. [ARCHITECTURE.md](./ARCHITECTURE.md)
5. [DESIGN.md](./DESIGN.md)
6. [TASKS.md](./TASKS.md)

Then inspect the relevant current source and `git status`. Old documentation is context, not proof. After a significant change, update the relevant documents, test claims against the implementation, and record any unresolved decision or limitation.
