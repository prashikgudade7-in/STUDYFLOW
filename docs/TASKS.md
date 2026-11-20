# StudyFlow Development Roadmap

Status definitions: **DONE** = verified by current code/tests; **IN_PROGRESS** = active phase with work remaining; **PENDING** = not implemented; **BLOCKED** = cannot proceed until a dependency is resolved; **NEEDS_VERIFICATION** = implementation exists but the deployment/runtime behavior has not been verified in its target environment.

Task priorities are planning labels, not security severity classifications.

## 1. Completed work

| Task ID | Task name | Priority | Status | Description | Dependencies | Acceptance criteria / evidence |
|---|---|---:|---|---|---|---|
| DONE-001 | Establish Node/Express and static frontend architecture | P2 | DONE | Build the app entry, API, and browser UI. | — | `server.js`, `package.json`, and `public/` contain the implementation. |
| DONE-002 | Add SQLite persistence and account-scoped records | P1 | DONE | Persist accounts, sessions, and user records. | DONE-001 | `config/database.js` defines the tables; data queries scope operations by `user_id`. |
| DONE-003 | Implement cookie session authentication | P1 | DONE | Authenticate users and manage session lifetime. | DONE-002 | PBKDF2 hashes, hashed session tokens, expiry, logout invalidation, and auth tests are present. |
| DONE-004 | Implement app APIs and frontend integration | P1 | DONE | Connect auth, profile, data, challenge, PDF, and AI workflows. | DONE-001, DONE-002, DONE-003 | Corresponding routes are wired to controllers and the frontend. |
| DONE-005 | Implement AI provider integrations | P2 | DONE | Provide optional, user-configured AI adapters. | DONE-004 | Ten provider adapters and mocked tests are present; tests use no external provider credentials. |
| DONE-006 | Implement PDF text extraction | P2 | DONE | Extract selectable text for revision workflows. | DONE-004 | PDF size/base64/signature checks and extraction are present; malformed payload tests pass. |
| DONE-007 | Add server-side challenge integrity | P1 | DONE | Create attempts and calculate official challenge results server-side. | DONE-002, DONE-004 | Server-owned questions, scoring, ownership, expiry, replay controls, and IST keys are implemented and covered by focused tests. |
| DONE-008 | Verify current automated tests and production dependency audit | P1 | DONE | Run the current project tests and production dependency audit. | — | On 2026-11-19, `npm.cmd test` passed 41/41 and `npm.cmd audit --omit=dev` reported zero vulnerabilities. |
| DONE-009 | Perform an initial security review | P1 | DONE | Record the initial review result without overstating it. | — | Historical review found no issue meeting its reporting threshold; context and subsequent findings are in [MEMORY.md](./MEMORY.md). This is not a security certification. |
| DONE-010 | Add persistent user-scoped notifications | P1 | DONE | Add SQLite notifications and preferences, authenticated APIs, drawer interactions, and verified challenge-result event notifications. | DONE-002, DONE-004, DONE-007 | `notifications.test.js` covers authentication, ownership, filters, read/important/delete/clear, preferences, duplicate prevention, and paging; the official challenge notification is created transactionally. Browser checks cover empty state, challenge event, unread count, preferences persistence, keyboard close/focus, and responsive widths. |

## 2. Current development phase: production readiness and security hardening

| Task ID | Task name | Priority | Status | Description | Dependencies | Acceptance criteria |
|---|---|---:|---|---|---|---|
| CH-001 | Enforce server-side official scoring | P1 | DONE | Calculate official results from persisted answer keys and reject client-calculated fields. | DONE-002, DONE-004 | Ownership/replay and score tests pass; the endpoint does not accept a client score. |
| CH-002 | Apply official IST challenge periods | P1 | DONE | Derive the daily, Monday-based ISO weekly, and monthly keys in `Asia/Kolkata`. | CH-001 | Boundary tests cover IST midnight and calendar transitions. |
| CH-003 | Expire and consume challenge attempts atomically | P1 | DONE | Enforce expiry, date rollover, single-use state, and atomic result creation. | CH-001, DONE-002 | Attempts expire after 180 seconds or at IST date rollover; concurrency test produces one result. |
| OPS-001 | Add per-user storage quotas | P1 | PENDING | Records have a 1 MiB per-record cap but no cumulative user quota. | DONE-002 | Define count/byte limits; enforce them atomically on insert/update; test the boundary and verify another user's quota is unaffected. |
| OPS-002 | Add database abuse and retention controls | P1 | PENDING | Bound record growth and define challenge-attempt retention. | OPS-001 | Establish explicit retention/cleanup rules and tests; preserve user and leaderboard history according to the approved policy. |
| SEC-001 | Tighten the Content Security Policy | P1 | PENDING | Current CSP permits `'unsafe-inline'` for scripts and styles. | — | Migrate inline requirements to safer patterns or nonce/hash policy; verify all views and AI/PDF flows without unintended CSP violations. |
| API-001 | Add explicit API 404 behavior | P2 | PENDING | Unknown `/api/*` paths may reach the static index fallback. | — | Unknown API paths return documented JSON errors; normal SPA and static routes continue to work. |
| OPS-003 | Define and test backup/recovery | P1 | PENDING | Select a backup method compatible with SQLite WAL. | DEP-HOST, DEP-DB | Document consistent backup, restore, and integrity checks; complete a restore drill using an isolated copy. |
| DEP-001 | Verify hosting, proxy, and persistent volume | P1 | NEEDS_VERIFICATION | Verify environment configuration on a selected provider; none is selected in the repository. | DEP-HOST | Confirm `NODE_ENV`, `PORT`, HTTPS `APP_ORIGIN`, exact `TRUST_PROXY`, durable `STUDYFLOW_DB_PATH`, secure cookies, HSTS, health checks, restart persistence, and graceful shutdown. |
| DEP-002 | Establish production logs and monitoring | P2 | PENDING | Define redacted operational logs, health alerting, error monitoring, and retention. | DEP-HOST | Monitoring works in the chosen environment and excludes passwords, tokens, API keys, and student content. |
| SEC-002 | Review optional account protections | P2 | PENDING | Decide product requirements for password reset, email verification, and MFA. | — | Owner-approved scope and threat rationale exist before implementation; absence alone is not classified as a vulnerability. |

## 3. Testing roadmap

| Task ID | Task name | Priority | Status | Description | Dependencies | Acceptance criteria |
|---|---|---:|---|---|---|---|
| TEST-001 | Run current Node test suite | P1 | DONE | Execute `npm test` using the available Windows command shim. | — | On 2026-11-19, 41 tests passed with no failures. |
| TEST-002 | Verify core API and security controls | P1 | DONE | Exercise authentication, session, origin, rate-limit, challenge, AI, PDF, and notification behavior. | TEST-001 | Current focused tests pass; tests are listed under `tests/`. |
| TEST-003 | Add record isolation and quota tests | P1 | PENDING | Verify cross-user record access and cumulative-quota enforcement. | OPS-001 | Tests reject cross-user reads/writes and requests beyond the approved quota. |
| TEST-004 | Add API 404 and frontend fallback tests | P2 | PENDING | Cover unknown API paths and normal frontend delivery. | API-001 | Unknown API paths return JSON errors; existing SPA/static routes remain functional. |
| TEST-005 | Add backup/restore and integrity tests | P1 | PENDING | Validate recoverability on isolated database copies. | OPS-003 | Restore succeeds and `PRAGMA integrity_check` reports `ok` for the restored copy. |
| TEST-006 | Add browser-level and accessibility regression checks | P2 | PENDING | Cover primary screens and keyboard/screen-reader behavior. | — | Define supported browsers and accessibility acceptance checklist; automate feasible repeatable checks. |
| TEST-007 | Run production smoke test on selected host | P1 | NEEDS_VERIFICATION | Exercise app through the actual proxy and persistent storage. | DEP-001 | Health, TLS/cookies, static files, auth, record isolation, challenge, and restart persistence are verified. |
| TEST-008 | Verify notification APIs and drawer behavior | P1 | DONE | Test isolated notification storage/API behavior and browser interactions. | DONE-010 | Notification integration tests pass; browser checks verify focus restoration on Escape, responsive drawer widths, challenge result rendering, read state, and persisted preferences. |

## 4. Production deployment roadmap

| Task ID | Task name | Priority | Status | Description | Dependencies | Acceptance criteria |
|---|---|---:|---|---|---|---|
| DEP-ENV | Configure production environment | P1 | PENDING | Provide production `NODE_ENV`, dynamic `PORT`, HTTPS `APP_ORIGIN`, exact `TRUST_PROXY`, and durable `STUDYFLOW_DB_PATH` through the host environment. `.env.example` contains placeholders; the app does not load `.env` itself. | DEP-HOST | App starts with host-provided values; no secret is committed; production origin validation passes. |
| DEP-TLS | Verify HTTPS and secure cookies | P1 | NEEDS_VERIFICATION | Validate TLS termination and cookie behavior on the chosen host. | DEP-ENV | Browser/API checks confirm HTTPS, Secure/HttpOnly/SameSite=Lax cookie attributes, and production HSTS. |
| DEP-PROXY | Configure reverse proxy trust | P1 | NEEDS_VERIFICATION | Configure only actual trusted proxy addresses or known hop count. | DEP-ENV | Forwarded client IP/protocol handling is correct; no blanket proxy trust is enabled. |
| DEP-DB | Verify persistent SQLite storage | P1 | NEEDS_VERIFICATION | Confirm database and WAL sidecars use durable storage. | DEP-ENV | Data survives restart/redeploy; storage lifecycle and capacity are documented. |
| DEP-BACKUP | Enable host backup and restore workflow | P1 | PENDING | Enable the approved backup method on the selected platform and confirm it covers the durable SQLite volume. | DEP-DB, OPS-003 | A documented host backup can be restored to an isolated copy and passes an integrity check. |
| DEP-OBS | Configure logs, monitoring, and alerts | P2 | PENDING | Establish operational visibility without recording sensitive data. | DEP-001 | Monitoring works in the chosen environment and excludes passwords, tokens, API keys, and student content. |
| DEP-HOST | Select host and domain | P1 | PENDING | Choose a platform and document runtime, storage, TLS, and proxy behavior. | — | Owner-approved provider and domain settings are recorded without secrets. |
| DEP-GO | Authorize final deployment | P1 | BLOCKED | Deploy only after explicit project-owner approval and readiness checks. | DEP-TLS, DEP-PROXY, DEP-DB, DEP-BACKUP, DEP-OBS | Written authorization exists and deployment uses the verified configuration. |
| DEP-SMOKE | Verify deployed production application | P1 | BLOCKED | Test the application only after an authorized deployment. | DEP-GO | Health, static files, auth, ownership, challenge, configured AI/PDF, persistence, and recovery checks pass. |

## 5. Future proposals

| Task ID | Task name | Priority | Status | Description | Dependencies | Acceptance criteria |
|---|---|---:|---|---|---|---|
| FUT-001 | Evaluate MFA, email verification, and account recovery | P2 | PENDING | Consider additional account features based on product and threat-model needs. | SEC-002 | Product owner approves scope and measurable security/usability requirements. |
| FUT-002 | Define student-data privacy and retention | P1 | PENDING | Decide data lifecycle and third-party AI provider disclosures. | — | Approved policy covers records, prompts/uploads, challenge data, logs, and backups. |
| FUT-003 | Establish performance objectives and capacity tests | P2 | PENDING | Define measurable service goals and test current deployment assumptions. | DEP-HOST | Objectives and test thresholds are documented and results are repeatable. |
| FUT-004 | Add accessibility and browser visual regression tests | P2 | PENDING | Automate checks for supported browsers and accessible interactions. | TEST-006 | Supported-browser matrix and accessibility criteria are approved and tested. |
| FUT-005 | Reassess database architecture against measured needs | P3 | PENDING | Consider alternatives only if measured requirements exceed SQLite deployment capabilities. | FUT-003 | A documented capacity/operational requirement justifies any proposed migration. |

## 6. Task tracking conventions

Each task should have a unique ID, concise name, priority, one of the defined statuses, a bounded description, actual dependencies, and verifiable acceptance criteria. Update status only after evidence exists. Keep proposals separate from committed product requirements in [PRD.md](./PRD.md).

## 7. India legal and operational reassessment (2026-11-19)

The Gazette-based DPDP commencement schedule is recorded in [INDIA_LEGAL_COMPLIANCE_AUDIT.md](./INDIA_LEGAL_COMPLIANCE_AUDIT.md). The scheduled 13 May 2027 commencement of sections 3-17 and Rules 3, 5-16 is not a statement that all obligations are currently in force. IT Act section 43A and applicable SPDI requirements need counsel assessment until the scheduled repeal date. These documentation findings do not establish compliance.

| Task ID | Task name | Priority | Status | Description | Dependencies | Acceptance criteria |
|---|---|---:|---|---|---|---|
| PRIV-AGE | Decide student age and guardian workflow | P1 | PENDING | No intended minimum age is established; registration accepts classes 7-12 without age or guardian checks. Public privacy copy currently asserts 18+ without matching account-flow evidence. | Owner decision, qualified counsel | Document the intended audience; assess current/future legal duties; reconcile public notice and implement/test any approved safeguards. |
| PRIV-LEGACY | Define legacy notice and consent-change process | P1 | PENDING | Existing accounts are not backfilled, proactively notified, or blocked when consent text changes; no optional AI consent is collected. | Owner decision, qualified counsel | Define notice/versioning and when re-acceptance is required; do not infer consent for existing accounts; test the approved workflow. |
| PRIV-HOST | Verify hosting, regions, retention, and administrator access | P1 | PENDING | Hosting provider, application/database/backup/log regions, backup/log retention, and administrative access arrangements remain unknown. | DEP-HOST, provider evidence | Record each value from actual deployment/provider evidence and counsel review; do not publish assumed locations or retention. |
| PRIV-AI | Record provider approval separately for each content type | P1 | PENDING | All provider approvals remain pending for text, images, and PDFs/document-derived content. Student-content requests remain backend-blocked. | Vendor evidence, owner approval, qualified counsel | Record evidence and verification date per provider/category; retain fail-closed enforcement and test student-content blocking before any enablement. |
